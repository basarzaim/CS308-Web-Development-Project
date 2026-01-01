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
            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[order.user.email],
            )

            # Attach invoice PDF
            email.attach(
                filename=f"invoice_{order.id}.pdf",
                content=pdf_buffer.read(),
                mimetype="application/pdf"
            )

            # Send email
            email.send(fail_silently=True)
            print(f"✓ Order confirmation + invoice sent to {order.user.email}")
        except Exception as e:
            print(f"✗ Email failed: {e}")

    # Send email in background thread so it doesn't block the response
    email_thread = threading.Thread(target=send_email_async)
    email_thread.daemon = True
    email_thread.start()



class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        items_data = request.data.get("items") or []
        shipping_data = request.data.get("shipping", {})

        use_cart = not items_data and user is not None

        with transaction.atomic():
            if use_cart:
                cart_items = CartItem.objects.filter(user=user).select_related("product")
                if not cart_items.exists():
                    return Response({"error": "Your cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

                req = {ci.product_id: ci.quantity for ci in cart_items}

                locked = Product.objects.select_for_update().filter(id__in=req.keys())
                locked_by_id = {p.id: p for p in locked}

                missing = set(req.keys()) - set(locked_by_id.keys())
                if missing:
                    return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

                for pid, qty in req.items():
                    p = locked_by_id[pid]
                    if p.stock < qty:
                        return Response(
                            {"error": f"Not enough stock for: {p.name}"},
                            status=status.HTTP_409_CONFLICT,
                        )

                order = Order.objects.create(
                    user=user,
                    total_price=0,
                    shipping_name=shipping_data.get('full_name') or shipping_data.get('name', ''),
                    shipping_address=shipping_data.get('address', ''),
                    shipping_city=shipping_data.get('city', ''),
                    shipping_phone=shipping_data.get('phone', '')
                )

                total = Decimal("0")
                touched_products = []

                for ci in cart_items:
                    p = locked_by_id[ci.product_id]

                    OrderItem.objects.create(
                        order=order,
                        product=p,
                        quantity=ci.quantity,
                        unit_price=p.price,
                    )

                    total += p.price * ci.quantity
                    p.stock -= ci.quantity
                    touched_products.append(p)

                if touched_products:
                    Product.objects.bulk_update(touched_products, ["stock"])

                order.total_price = total
                order.save()

                cart_items.delete()

                transaction.on_commit(lambda: send_order_confirmation_email(order))

                serializer = OrderSerializer(order)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

            req = {}
            for raw in items_data:
                pid = raw.get("product_id") or raw.get("productId")
                qty = int(raw.get("quantity") or raw.get("qty") or 1)
                if not pid:
                    return Response({"error": "product_id is required"}, status=status.HTTP_400_BAD_REQUEST)
                qty = max(1, qty)
                pid = int(pid)
                req[pid] = req.get(pid, 0) + qty

            if not req:
                return Response({"error": "Your cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

            locked = Product.objects.select_for_update().filter(id__in=req.keys())
            locked_by_id = {p.id: p for p in locked}

            missing = set(req.keys()) - set(locked_by_id.keys())
            if missing:
                return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

            for pid, qty in req.items():
                p = locked_by_id[pid]
                if p.stock < qty:
                    return Response(
                        {"error": f"Not enough stock for: {p.name}"},
                        status=status.HTTP_409_CONFLICT,
                    )

            order = Order.objects.create(
                user=user,
                total_price=0,
                shipping_name=shipping_data.get('full_name') or shipping_data.get('name', ''),
                shipping_address=shipping_data.get('address', ''),
                shipping_city=shipping_data.get('city', ''),
                shipping_phone=shipping_data.get('phone', '')
            )

            total = Decimal("0")
            touched_products = []

            for pid, qty in req.items():
                p = locked_by_id[pid]

                OrderItem.objects.create(
                    order=order,
                    product=p,
                    quantity=qty,
                    unit_price=p.price,
                )

                total += p.price * qty
                p.stock -= qty
                touched_products.append(p)

            if touched_products:
                Product.objects.bulk_update(touched_products, ["stock"])

            order.total_price = total
            order.save()

            transaction.on_commit(lambda: send_order_confirmation_email(order))

            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class OrderCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)

        if order.status != 'processing':  
            return Response(
                {"error": "Cannot cancel order. It is already in transit or delivered."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'cancalled'
        order.save()

        return Response({"Order cancelled successfully."}, status=status.HTTP_200_OK)


class OrderReturnView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)

        if order.status != 'delivered':
            return Response(
                {"error": "Cannot return an order that has not been delivered."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not order.delivered_at:  
            return Response(
                {"error": "Delivery date not found."},
                status=status.HTTP_400_BAD_REQUEST
            )

        days_passed = (timezone.now() - order.delivered_at).days

        if days_passed > 30:
            return Response(
                {"error": f"Return period expired. ({days_passed} days passed, limit is 30)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'return_requested'
        order.save()

        return Response(
            {"message": "Return request submitted. Waiting for approval."},
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
    """List all orders for admins."""
    serializer_class = OrderSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return Order.objects.all().select_related("user").prefetch_related("items__product")


class AdminOrderStatusUpdateView(APIView):
    """Update order status (admin only)."""
    permission_classes = [IsAdminUser]

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
@permission_classes([IsAdminUser])
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
        email = EmailMessage(
            subject=f"Invoice for Order #{order.id}",
            body="Thank you for your purchase. Your invoice is attached.",
            to=[request.user.email],
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
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from django.http import HttpResponse

        # Get order for current user only
        order = get_object_or_404(Order, pk=pk, user=request.user)

        # Generate PDF
        pdf_buffer = generate_invoice_pdf(order)

        # Create HTTP response with PDF
        response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{order.id}.pdf"'

        return response