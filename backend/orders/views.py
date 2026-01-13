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
        """
        Accepts either:
        - items array in the request body (authenticated user checkout)
        - or uses authenticated user's server cart (CartItem).
        """
        user = request.user
        items_data = request.data.get("items") or []
        shipping_data = request.data.get("shipping", {})

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

                order = Order.objects.create(
                    user=user,
                    total_price=0,
                    shipping_name=shipping_data.get('full_name') or shipping_data.get('name', ''),
                    shipping_address=shipping_data.get('address', ''),
                    shipping_city=shipping_data.get('city', ''),
                    shipping_phone=shipping_data.get('phone', '')
                )
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

                order.total_price = total
                order.save()

                # clear cart
                cart_items.delete()

                # Send order confirmation email
                try:
                    send_order_confirmation_email(order)
                except Exception as e:
                    # Log error but don't fail the order creation
                    print(f"Failed to send order confirmation email: {e}")

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

            order = Order.objects.create(
                user=user,
                total_price=0,
                shipping_name=shipping_data.get('full_name') or shipping_data.get('name', ''),
                shipping_address=shipping_data.get('address', ''),
                shipping_city=shipping_data.get('city', ''),
                shipping_phone=shipping_data.get('phone', '')
            )
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

            order.total_price = total
            order.save()

            # Send order confirmation email
            try:
                send_order_confirmation_email(order)
            except Exception as e:
                # Log error but don't fail the order creation
                print(f"Failed to send order confirmation email: {e}")

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

        order.status = 'cancelled'
        order.save()

        return Response({"message": "Order cancelled successfully."}, status=status.HTTP_200_OK)


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