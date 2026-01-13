from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from cart.models import CartItem
from products.models import Product
from .models import Order, OrderItem
from .serializers import OrderSerializer
from rest_framework.decorators import api_view, permission_classes
from decimal import Decimal
from django.core.mail import EmailMessage
from .utils import generate_invoice_pdf
from django.conf import settings
from .encryption import (
    validate_credit_card_format, validate_cvv, validate_expiry_date,
    get_last_four_digits
)
from users.permissions import IsSalesManager, IsSalesOrProductManager
import logging

logger = logging.getLogger(__name__)


def send_order_confirmation_email(order):
    """
    Send order confirmation email to customer with order details and PDF invoice attachment.
    Uses threading to avoid blocking the request.
    """
    import threading

    def send_email_async():
        try:
            from django.core.mail import EmailMessage
            from .utils import generate_invoice_pdf

            # Prepare email subject
            subject = f"Order Confirmation - Order #{order.id}"

            # Prepare email body
            items_text = "\n".join([
                f"  - {item.product.name} x {item.quantity} = ${float(item.unit_price * item.quantity):.2f}"
                for item in order.items.all()
            ])

            # Calculate discount if any
            discount_text = ""
            if order.discount_percentage and order.discount_percentage > 0:
                discount_amount = (order.total_price * order.discount_percentage) / 100
                discount_text = f"\nDiscount ({order.discount_percentage}%): -${float(discount_amount):.2f}"

            final_total = order.discounted_total_price()

            message = f"""
Hello {order.shipping_name or order.user.username},

Thank you for your order! Your order has been received and is being processed.

Order Details:
--------------
Order Number: #{order.id}
Order Date: {order.created_at.strftime('%B %d, %Y at %I:%M %p')}
Status: {order.get_status_display()}

Items Ordered:
{items_text}

Order Summary:
--------------
Subtotal: ${float(order.total_price):.2f}{discount_text}
Total: ${float(final_total):.2f}

Shipping Address:
-----------------
{order.shipping_name or 'N/A'}
{order.shipping_address or 'N/A'}
{order.shipping_city or 'N/A'}
Phone: {order.shipping_phone or 'N/A'}

Your invoice is attached as a PDF for your records.

You can track your order status by logging into your account at our website.

Thank you for shopping with us!

Best regards,
CS308 E-Commerce Team

---
This is an automated email. Please do not reply to this message.
If you have any questions, contact us at support@cs308ecommerce.com
            """

            # Generate PDF invoice
            pdf_buffer = generate_invoice_pdf(order)

            # Create email with attachment
            reply_to = getattr(settings, 'EMAIL_REPLY_TO', None)
            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[order.user.email],
                reply_to=[reply_to] if reply_to else None,
            )

            # Attach invoice PDF
            email.attach(
                filename=f"invoice_{order.id}.pdf",
                content=pdf_buffer.read(),
                mimetype="application/pdf"
            )

            # Send email
            email.send(fail_silently=True)
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Order confirmation + invoice sent to {order.user.email} for order {order.id}")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Email failed for order {order.id}: {str(e)}")

    # Send email in background thread so it doesn't block the response
    email_thread = threading.Thread(target=send_email_async)
    email_thread.daemon = True
    email_thread.start()


def send_return_approval_email(order):
    """
    Send return approval email to customer with refund amount.
    Uses threading to avoid blocking the request.
    """
    import threading

    def send_email_async():
        try:
            from django.core.mail import EmailMessage

            # Validate that order has a user with email
            if not order.user:
                logger.error(f"Cannot send return approval email: Order {order.id} has no user")
                return
            
            if not order.user.email:
                logger.error(f"Cannot send return approval email: User {order.user.id} has no email address")
                return

            # Calculate refund amount (what the customer actually paid)
            refund_amount = order.discounted_total_price()

            # Prepare email subject
            subject = f"Return Approved - Order #{order.id}"

            # Prepare email body
            items_text = "\n".join([
                f"  - {item.product.name} x {item.quantity}"
                for item in order.items.all()
            ])

            message = f"""
Hello {order.shipping_name or order.user.username},

Your return request for Order #{order.id} has been approved.

Return Details:
---------------
Order Number: #{order.id}
Original Order Date: {order.created_at.strftime('%B %d, %Y at %I:%M %p')}
Return Approved Date: {timezone.now().strftime('%B %d, %Y at %I:%M %p')}

Items Returned:
{items_text}

Refund Information:
-------------------
Refund Amount: ${float(refund_amount):.2f}

The refund amount has been calculated based on the original purchase price (after any discounts applied at the time of purchase).

Your refund will be processed to your original payment method within 5-10 business days.

All returned items have been restocked and are now available for other customers.

If you have any questions about your return or refund, please contact our support team.

Thank you for your business!

Best regards,
CS308 E-Commerce Team

---
This is an automated email. Please do not reply to this message.
If you have any questions, contact us at support@cs308ecommerce.com
            """

            # Create email
            reply_to = getattr(settings, 'EMAIL_REPLY_TO', None)
            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[order.user.email],
                reply_to=[reply_to] if reply_to else None,
            )

            # Send email
            # Check if email backend is configured
            if not settings.EMAIL_HOST_PASSWORD:
                logger.warning(f"Email not configured (EMAIL_HOST_PASSWORD is empty). Cannot send return approval email for order {order.id}")
                return
            
            result = email.send(fail_silently=True)
            if result:
                logger.info(f"Return approval email sent successfully to {order.user.email} for order {order.id}")
            else:
                logger.error(f"Return approval email failed to send to {order.user.email} for order {order.id} (send() returned False)")
        except Exception as e:
            logger.error(f"Return approval email failed for order {order.id}: {str(e)}", exc_info=True)

    # Send email in background thread so it doesn't block the response
    email_thread = threading.Thread(target=send_email_async)
    email_thread.daemon = True
    email_thread.start()



class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Accepts either:
        - items array in the request body (authenticated user checkout)
        - or uses authenticated user's server cart (CartItem).
        """
        user = request.user
        items_data = request.data.get("items") or []
        shipping_data = request.data.get("shipping", {})
        totals_data = request.data.get("totals", {})

        # If no items provided, fall back to server cart for authenticated users
        use_cart = not items_data and user is not None

        with transaction.atomic():
            if use_cart:
                cart_items = CartItem.objects.filter(user=user).select_related("product")
                if not cart_items.exists():
                    return Response(
                        {"error": "Your cart is empty."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Validate stock
                for item in cart_items:
                    if item.product.stock < item.quantity:
                        return Response(
                            {"error": f"Not enough stock for: {item.product.name}"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                # Get payment information
                payment_data = request.data.get("payment", {})
                payment_method = payment_data.get("method", "pending")
                
                # Validate and process credit card information if payment method is credit/debit card
                card_number = None
                card_cvv = None
                card_expiry_month = None
                card_expiry_year = None
                card_holder_name = None
                
                if payment_method in ['credit_card', 'debit_card']:
                    # Get credit card information
                    card_data = payment_data.get("card", {})
                    card_number = card_data.get("number", "").strip()
                    card_cvv = card_data.get("cvv", "").strip()
                    card_expiry_month = card_data.get("expiry_month", "").strip()
                    card_expiry_year = card_data.get("expiry_year", "").strip()
                    card_holder_name = card_data.get("holder_name", "").strip()
                    
                    # Validate credit card information
                    if not card_number:
                        return Response(
                            {"error": "Credit card number is required for card payments."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Validate card number format (Luhn algorithm)
                    is_valid, error_msg = validate_credit_card_format(card_number)
                    if not is_valid:
                        return Response(
                            {"error": f"Invalid credit card: {error_msg}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Validate CVV
                    if not card_cvv:
                        return Response(
                            {"error": "CVV is required for card payments."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    is_valid, error_msg = validate_cvv(card_cvv)
                    if not is_valid:
                        return Response(
                            {"error": f"Invalid CVV: {error_msg}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Validate expiry date
                    if not card_expiry_month or not card_expiry_year:
                        return Response(
                            {"error": "Card expiry date (month and year) is required."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    is_valid, error_msg = validate_expiry_date(card_expiry_month, card_expiry_year)
                    if not is_valid:
                        return Response(
                            {"error": f"Invalid expiry date: {error_msg}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Validate cardholder name
                    if not card_holder_name:
                        return Response(
                            {"error": "Cardholder name is required."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                # Get shipping fee from totals, default to 0
                shipping_fee = Decimal(str(totals_data.get('shipping', 0) or 0))
                
                order = Order.objects.create(
                    user=user,
                    total_price=0,
                    shipping_fee=shipping_fee,
                    payment_method=payment_method,
                    shipping_name=shipping_data.get('full_name') or shipping_data.get('name', ''),
                    shipping_address=shipping_data.get('address', ''),
                    shipping_city=shipping_data.get('city', ''),
                    shipping_phone=shipping_data.get('phone', '')
                )
                
                # Store credit card information securely if provided
                if payment_method in ['credit_card', 'debit_card'] and card_number:
                    order.set_card_number(card_number)
                    order.card_expiry_month = card_expiry_month
                    order.card_expiry_year = card_expiry_year
                    order.card_holder_name = card_holder_name
                    # CVV is NOT stored (PCI DSS compliance)
                    order.is_paid = True  # Mark as paid when card info is provided
                    order.paid_at = timezone.now()
                    order.save()
                
                total = Decimal("0")

                for item in cart_items:
                    OrderItem.objects.create(
                        order=order,
                        product=item.product,
                        quantity=item.quantity,
                        unit_price=item.product.price,
                    )
                    total += item.product.price * item.quantity

                    # decrement stock
                    item.product.stock -= item.quantity
                    item.product.save()

                # Total price = subtotal (products) + shipping fee
                order.total_price = total + order.shipping_fee
                order.save()

                # clear cart
                cart_items.delete()

                # Send order confirmation email
                try:
                    send_order_confirmation_email(order)
                except Exception as e:
                    # Log error but don't fail the order creation
                    # IMPORTANT: Never log credit card data - only log error message
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to send order confirmation email for order {order.id}: {str(e)}")

                serializer = OrderSerializer(order)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

            # Fallback: use provided items_data (guest checkout or client-provided payload)
            normalized = []
            for raw in items_data:
                pid = raw.get("product_id") or raw.get("productId")
                qty = int(raw.get("quantity") or raw.get("qty") or 1)
                if not pid:
                    return Response({"error": "product_id is required"}, status=status.HTTP_400_BAD_REQUEST)
                product = get_object_or_404(Product, pk=int(pid))
                qty = max(1, qty)
                if product.stock < qty:
                    return Response(
                        {"error": f"Not enough stock for: {product.name}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                normalized.append((product, qty))

            if not normalized:
                return Response({"error": "Your cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

            # Get payment information
            payment_data = request.data.get("payment", {})
            payment_method = payment_data.get("method", "pending")
            
            # Validate and process credit card information if payment method is credit/debit card
            card_number = None
            card_cvv = None
            card_expiry_month = None
            card_expiry_year = None
            card_holder_name = None
            
            if payment_method in ['credit_card', 'debit_card']:
                # Get credit card information
                card_data = payment_data.get("card", {})
                card_number = card_data.get("number", "").strip()
                card_cvv = card_data.get("cvv", "").strip()
                card_expiry_month = card_data.get("expiry_month", "").strip()
                card_expiry_year = card_data.get("expiry_year", "").strip()
                card_holder_name = card_data.get("holder_name", "").strip()
                
                # Validate credit card information
                if not card_number:
                    return Response(
                        {"error": "Credit card number is required for card payments."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validate card number format (Luhn algorithm)
                is_valid, error_msg = validate_credit_card_format(card_number)
                if not is_valid:
                    return Response(
                        {"error": f"Invalid credit card: {error_msg}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validate CVV
                if not card_cvv:
                    return Response(
                        {"error": "CVV is required for card payments."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                is_valid, error_msg = validate_cvv(card_cvv)
                if not is_valid:
                    return Response(
                        {"error": f"Invalid CVV: {error_msg}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validate expiry date
                if not card_expiry_month or not card_expiry_year:
                    return Response(
                        {"error": "Card expiry date (month and year) is required."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                is_valid, error_msg = validate_expiry_date(card_expiry_month, card_expiry_year)
                if not is_valid:
                    return Response(
                        {"error": f"Invalid expiry date: {error_msg}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validate cardholder name
                if not card_holder_name:
                    return Response(
                        {"error": "Cardholder name is required."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Get shipping fee from totals, default to 0
            shipping_fee = Decimal(str(totals_data.get('shipping', 0) or 0))
            
            # Create order
            order = Order.objects.create(
                user=user,
                total_price=0,
                shipping_fee=shipping_fee,
                payment_method=payment_method,
                shipping_name=shipping_data.get('full_name') or shipping_data.get('name', ''),
                shipping_address=shipping_data.get('address', ''),
                shipping_city=shipping_data.get('city', ''),
                shipping_phone=shipping_data.get('phone', '')
            )
            
            # Store credit card information securely if provided
            if payment_method in ['credit_card', 'debit_card'] and card_number:
                order.set_card_number(card_number)
                order.card_expiry_month = card_expiry_month
                order.card_expiry_year = card_expiry_year
                order.card_holder_name = card_holder_name
                # CVV is NOT stored (PCI DSS compliance)
                order.is_paid = True  # Mark as paid when card info is provided
                order.paid_at = timezone.now()
                order.save()
            
            total = Decimal("0")

            for product, qty in normalized:
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=qty,
                    unit_price=product.price,
                )
                total += product.price * qty
                product.stock -= qty
                product.save()

            # Total price = subtotal (products) + shipping fee
            order.total_price = total + order.shipping_fee
            order.save()

            # Send order confirmation email
            try:
                send_order_confirmation_email(order)
            except Exception as e:
                # Log error but don't fail the order creation
                # IMPORTANT: Never log credit card data - only log error message
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send order confirmation email for order {order.id}: {str(e)}")

            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class OrderCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)

        # Only allow cancellation of orders that are still processing
        if order.status not in ['processing', 'pending']:
            return Response(
                {"error": f"Cannot cancel order. Current status is '{order.get_status_display()}'. Only processing or pending orders can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Restore stock for all items in the order
        with transaction.atomic():
            for item in order.items.all():
                item.product.stock += item.quantity
                item.product.save()

            # Update order status to cancelled
            order.status = 'cancelled'
            order.save()

        return Response({"message": "Order cancelled successfully. Stock has been restored."}, status=status.HTTP_200_OK)


class OrderReturnView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)

        if order.status != 'delivered':
            return Response(
                {"error": "Cannot return an order that has not been delivered."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Use delivered_at if set, otherwise fall back to updated_at or created_at
        # This handles cases where orders were marked as delivered before delivered_at was implemented
        delivery_date = order.delivered_at
        if not delivery_date:
            # Fallback to updated_at or created_at for backward compatibility
            delivery_date = order.updated_at or order.created_at
            if not delivery_date:
                return Response(
                    {"error": "Delivery date not found."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        days_passed = (timezone.now() - delivery_date).days

        if days_passed > 30:
            return Response(
                {"error": f"Return period expired. ({days_passed} days passed, limit is 30)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'return_requested'
        order.save()

        # Return the updated order so frontend can update the UI
        serializer = OrderSerializer(order)
        return Response(
            {
                "message": "Return request submitted. Waiting for approval.",
                "order": serializer.data
            },
            status=status.HTTP_200_OK
        )


class ApproveReturnView(APIView):
    """
    Sales Manager endpoint to approve a return request.
    Changes status from 'return_requested' to 'returned' and restocks products.
    """
    permission_classes = [IsSalesManager]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)

        if order.status != 'return_requested':
            return Response(
                {"error": f"Cannot approve return. Order status is '{order.get_status_display()}', expected 'Return Requested'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Restock products
        with transaction.atomic():
            for item in order.items.all():
                item.product.stock += item.quantity
                item.product.save()

            # Update order status
            order.status = 'returned'
            order.save()

        # Send return approval email with refund amount
        try:
            send_return_approval_email(order)
        except Exception as e:
            # Log error but don't fail the return approval
            logger.error(f"Failed to send return approval email for order {order.id}: {str(e)}")

        serializer = OrderSerializer(order)
        return Response(
            {
                "message": "Return request approved. Products have been restocked and customer has been notified.",
                "order": serializer.data
            },
            status=status.HTTP_200_OK
        )


class DenyReturnView(APIView):
    """
    Sales Manager endpoint to deny a return request.
    Changes status from 'return_requested' back to 'delivered'.
    """
    permission_classes = [IsSalesManager]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)

        if order.status != 'return_requested':
            return Response(
                {"error": f"Cannot deny return. Order status is '{order.get_status_display()}', expected 'Return Requested'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Revert status back to delivered
        order.status = 'delivered'
        order.save()

        serializer = OrderSerializer(order)
        return Response(
            {
                "message": "Return request denied. Order status reverted to 'Delivered'.",
                "order": serializer.data
            },
            status=status.HTTP_200_OK
        )


class ApproveReturnView(APIView):
    """
    Sales Manager endpoint to approve a return request.
    Changes status from 'return_requested' to 'returned' and restocks products.
    """
    permission_classes = [IsSalesManager]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)

        if order.status != 'return_requested':
            return Response(
                {"error": f"Cannot approve return. Order status is '{order.get_status_display()}', expected 'Return Requested'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Restock products
        with transaction.atomic():
            for item in order.items.all():
                item.product.stock += item.quantity
                item.product.save()

            # Update order status
            order.status = 'returned'
            order.save()

        # Send return approval email with refund amount
        try:
            send_return_approval_email(order)
        except Exception as e:
            # Log error but don't fail the return approval
            logger.error(f"Failed to send return approval email for order {order.id}: {str(e)}")

        serializer = OrderSerializer(order)
        return Response(
            {
                "message": "Return request approved. Products have been restocked and customer has been notified.",
                "order": serializer.data
            },
            status=status.HTTP_200_OK
        )


class DenyReturnView(APIView):
    """
    Sales Manager endpoint to deny a return request.
    Changes status from 'return_requested' back to 'delivered'.
    """
    permission_classes = [IsSalesManager]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)

        if order.status != 'return_requested':
            return Response(
                {"error": f"Cannot deny return. Order status is '{order.get_status_display()}', expected 'Return Requested'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Revert status back to delivered
        order.status = 'delivered'
        order.save()

        serializer = OrderSerializer(order)
        return Response(
            {
                "message": "Return request denied. Order status reverted to 'Delivered'.",
                "order": serializer.data
            },
            status=status.HTTP_200_OK
        )


class OrderListView(generics.ListAPIView):
    """List orders for the authenticated user."""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects
            .filter(user=self.request.user)
            .prefetch_related("items__product")
        )


class OrderDetailView(generics.RetrieveAPIView):
    """Retrieve a single order for the authenticated user."""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects
            .filter(user=self.request.user)
            .prefetch_related("items__product")
        )


class AdminOrderListView(generics.ListAPIView):
    """List all orders for Sales Managers and Product Managers."""
    serializer_class = OrderSerializer
    permission_classes = [IsSalesOrProductManager]

    def get_queryset(self):
        return Order.objects.all().select_related("user").prefetch_related("items__product")


class AdminOrderStatusUpdateView(APIView):
    """Update order status (Sales Manager or Product Manager)."""
    permission_classes = [IsSalesOrProductManager]

    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        new_status = request.data.get("status")
        valid = [choice[0] for choice in Order.STATUS_CHOICES]
        if new_status not in valid:
            return Response(
                {"error": f"Invalid status. Must be one of: {valid}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = new_status
        order.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


@api_view(["PUT"])
@permission_classes([IsSalesOrProductManager])
def admin_update_order_status(request, order_id):

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get("status")

    valid = [choice[0] for choice in Order.STATUS_CHOICES]
    if new_status not in valid:
        return Response(
            {"error": f"Invalid status. Must be one of: {valid}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    order.status = new_status
    order.save()

    return Response(
        {"message": "Status updated", "order_id": order_id, "new_status": new_status},
        status=status.HTTP_200_OK
    )




class ApplyDiscountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user

        
        if getattr(user, "role", None) != "Sales Manager":
            return Response(
                {"detail": "Only Sales Manager can apply discount."},
                status=status.HTTP_403_FORBIDDEN
            )

        order = get_object_or_404(Order, pk=pk)

        
        if order.status == "delivered":
            return Response(
                {"detail": "Cannot apply discount to delivered orders."},
                status=status.HTTP_400_BAD_REQUEST
            )

        discount = Decimal(request.data.get("discount_percentage", 0))

        if discount < 0 or discount > 90:
            return Response(
                {"detail": "Discount must be between 0 and 90."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.discount_percentage = discount
        order.save()

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)

class SendInvoiceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)

        # PDF oluştur
        pdf_buffer = generate_invoice_pdf(order)

        # Email oluştur
        reply_to = getattr(settings, 'EMAIL_REPLY_TO', None)
        email = EmailMessage(
            subject=f"Invoice for Order #{order.id}",
            body="Thank you for your purchase. Your invoice is attached.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[request.user.email],
            reply_to=[reply_to] if reply_to else None,
        )

        # PDF'i maile ekle
        email.attach(
            filename=f"invoice_{order.id}.pdf",
            content=pdf_buffer.read(),
            mimetype="application/pdf"
        )

        email.send()

        return Response({"message": "Invoice sent successfully!"})


class DownloadInvoiceView(APIView):
    """
    Download PDF invoice for an order.
    Returns the PDF file directly as a download.
    Allows order owners OR Sales Managers to download.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from django.http import HttpResponse

        # Get the order
        order = get_object_or_404(Order, pk=pk)

        # Check permissions: order owner OR Sales Manager
        user = request.user
        is_owner = order.user == user
        is_sales_manager = getattr(user, "role", None) == "Sales Manager" or user.is_staff

        if not (is_owner or is_sales_manager):
            return Response(
                {"detail": "You can only download invoices for your own orders."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Generate PDF
        pdf_buffer = generate_invoice_pdf(order)

        # Create HTTP response with PDF
        response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{order.id}.pdf"'

        return response


class SalesAnalyticsView(APIView):
    """
    REQUIREMENT #11: Sales Manager Analytics
    Calculate revenue and profit between given dates.
    Returns data for charts and reports.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from datetime import datetime

        # Get date range from query params (default: last 30 days)
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Parse dates
        if start_date:
            try:
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                return Response(
                    {"error": "Invalid start_date format. Use ISO format (YYYY-MM-DD)"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Default: 30 days ago
            from datetime import timedelta
            start_date = timezone.now() - timedelta(days=30)

        if end_date:
            try:
                end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                return Response(
                    {"error": "Invalid end_date format. Use ISO format (YYYY-MM-DD)"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Default: now
            end_date = timezone.now()

        # Filter orders in date range (exclude cancelled and returned)
        orders = Order.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).exclude(
            status__in=['cancelled', 'returned']
        )

        # Calculate total revenue (sum of all order totals after discount)
        total_revenue = Decimal('0.00')
        total_cost = Decimal('0.00')
        order_data = []

        for order in orders:
            # Calculate discounted total
            discounted_total = order.discounted_total_price()
            total_revenue += discounted_total

            # Calculate cost (Requirement #11: Default 50% of sale price)
            # For each item in order, cost = quantity * (unit_price * 0.5)
            order_cost = Decimal('0.00')
            for item in order.items.all():
                # Cost defaults to 50% of sale price
                item_cost = item.unit_price * Decimal('0.5') * item.quantity
                order_cost += item_cost

            total_cost += order_cost

            # Collect per-order data for charts
            order_data.append({
                'id': order.id,
                'date': order.created_at.isoformat(),
                'revenue': float(discounted_total),
                'cost': float(order_cost),
                'profit': float(discounted_total - order_cost),
                'status': order.status
            })

        # Calculate profit
        total_profit = total_revenue - total_cost

        # Calculate statistics
        total_orders = orders.count()
        delivered_orders = orders.filter(status='delivered').count()
        processing_orders = orders.filter(status='processing').count()
        in_transit_orders = orders.filter(status='in-transit').count()

        # Calculate average order value
        average_order_value = total_revenue / total_orders if total_orders > 0 else Decimal('0.00')

        # Group by date for time series chart
        from collections import defaultdict
        daily_data = defaultdict(lambda: {'revenue': Decimal('0.00'), 'cost': Decimal('0.00'), 'orders': 0})

        for order in orders:
            date_key = order.created_at.date().isoformat()
            discounted_total = order.discounted_total_price()

            # Calculate order cost
            order_cost = Decimal('0.00')
            for item in order.items.all():
                order_cost += item.unit_price * Decimal('0.5') * item.quantity

            daily_data[date_key]['revenue'] += discounted_total
            daily_data[date_key]['cost'] += order_cost
            daily_data[date_key]['orders'] += 1

        # Convert to list for chart
        time_series = []
        for date_key in sorted(daily_data.keys()):
            data = daily_data[date_key]
            time_series.append({
                'date': date_key,
                'revenue': float(data['revenue']),
                'cost': float(data['cost']),
                'profit': float(data['revenue'] - data['cost']),
                'orders': data['orders']
            })

        return Response({
            'summary': {
                'total_revenue': float(total_revenue),
                'total_cost': float(total_cost),
                'total_profit': float(total_profit),
                'profit_margin': float((total_profit / total_revenue * 100)) if total_revenue > 0 else 0,
                'total_orders': total_orders,
                'delivered_orders': delivered_orders,
                'processing_orders': processing_orders,
                'in_transit_orders': in_transit_orders,
                'average_order_value': float(average_order_value),
            },
            'time_series': time_series,
            'orders': order_data[:100],  # Limit to 100 most recent for performance
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        })