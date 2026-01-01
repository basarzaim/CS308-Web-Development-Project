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
from .utils import generate_invoice_pdf, update_stock_after_order
from django.conf import settings


def send_order_confirmation_email(order):
    """
    Send order confirmation email to customer with PDF invoice.
    Runs in background thread to avoid blocking request.
    """
    import threading

    def send_email_async():
        try:
            subject = f"Order Confirmation - Order #{order.id}"

            items_text = "\n".join([
                f"- {item.product.name} x {item.quantity} = ${float(item.unit_price * item.quantity):.2f}"
                for item in order.items.all()
            ])

            discount_text = ""
            if order.discount_percentage and order.discount_percentage > 0:
                discount_amount = (order.total_price * order.discount_percentage) / 100
                discount_text = f"\nDiscount ({order.discount_percentage}%): -${float(discount_amount):.2f}"

            final_total = order.discounted_total_price()

            message = f"""
Hello {order.shipping_name or order.user.username},

Thank you for your order!

Order Number: #{order.id}
Order Date: {order.created_at.strftime('%B %d, %Y at %I:%M %p')}
Status: {order.get_status_display()}

Items:
{items_text}

Subtotal: ${float(order.total_price):.2f}{discount_text}
Total: ${float(final_total):.2f}

Your invoice is attached as a PDF.

Best regards,
CS308 E-Commerce Team
            """

            pdf_buffer = generate_invoice_pdf(order)

            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[order.user.email],
            )

            email.attach(
                filename=f"invoice_{order.id}.pdf",
                content=pdf_buffer.read(),
                mimetype="application/pdf"
            )

            email.send(fail_silently=True)

        except Exception as e:
            print(f"Order email failed: {e}")

    threading.Thread(target=send_email_async, daemon=True).start()


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        items_data = request.data.get("items") or []
        shipping_data = request.data.get("shipping", {})
        use_cart = not items_data and user is not None

        with transaction.atomic():

            # ---------------- CART CHECKOUT ----------------
            if use_cart:
                cart_items = CartItem.objects.filter(user=user).select_related("product")
                if not cart_items.exists():
                    return Response({"error": "Your cart is empty."}, status=400)

                for item in cart_items:
                    if item.product.stock < item.quantity:
                        return Response(
                            {"error": f"Not enough stock for: {item.product.name}"},
                            status=400,
                        )

                order = Order.objects.create(
                    user=user,
                    total_price=0,
                    shipping_name=shipping_data.get('full_name', ''),
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

                order.total_price = total
                order.save()

                # ✅ CENTRALIZED STOCK UPDATE
                update_stock_after_order(order)

                cart_items.delete()
                send_order_confirmation_email(order)

                return Response(OrderSerializer(order).data, status=201)

            # ---------------- DIRECT ITEMS CHECKOUT ----------------
            normalized = []
            for raw in items_data:
                pid = raw.get("product_id") or raw.get("productId")
                qty = int(raw.get("quantity") or raw.get("qty") or 1)

                if not pid:
                    return Response({"error": "product_id is required"}, status=400)

                product = get_object_or_404(Product, pk=int(pid))
                qty = max(1, qty)

                if product.stock < qty:
                    return Response(
                        {"error": f"Not enough stock for: {product.name}"},
                        status=400,
                    )

                normalized.append((product, qty))

            if not normalized:
                return Response({"error": "Your cart is empty."}, status=400)

            order = Order.objects.create(
                user=user,
                total_price=0,
                shipping_name=shipping_data.get('full_name', ''),
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

            order.total_price = total
            order.save()

            # ✅ CENTRALIZED STOCK UPDATE
            update_stock_after_order(order)

            send_order_confirmation_email(order)
            return Response(OrderSerializer(order).data, status=201)


# ===================== OTHER VIEWS (UNCHANGED) =====================

class OrderCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)

        if order.status != 'processing':
            return Response({"error": "Cannot cancel order."}, status=400)

        order.status = 'cancelled'
        order.save()
        return Response({"message": "Order cancelled successfully."}, status=200)


class OrderReturnView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)

        if order.status != 'delivered':
            return Response({"error": "Order not delivered."}, status=400)

        if not order.delivered_at:
            return Response({"error": "Delivery date missing."}, status=400)

        if (timezone.now() - order.delivered_at).days > 30:
            return Response({"error": "Return period expired."}, status=400)

        order.status = 'return_requested'
        order.save()
        return Response({"message": "Return request submitted."}, status=200)


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items__product")


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items__product")


class AdminOrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return Order.objects.all().select_related("user").prefetch_related("items__product")
