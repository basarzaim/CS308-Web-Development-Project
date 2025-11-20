from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from cart.models import CartItem
from products.models import Product
from .models import Order, OrderItem
from .serializers import OrderSerializer


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # 1) Fetch all cart items for this user
        cart_items = CartItem.objects.filter(user=user).select_related("product")

        if not cart_items.exists():
            return Response({"error": "Your cart is empty."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 2) Stock validation
        for item in cart_items:
            if item.product.stock < item.quantity:
                return Response(
                    {"error": f"Not enough stock for: {item.product.name}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 3) Create Order
        order = Order.objects.create(user=user)

        # 4) Create OrderItems + 5) Reduce stock
        for item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                unit_price=item.product.price
            )

            # Reduce stock
            item.product.stock -= item.quantity
            item.product.save()

        # 6) Clear the user’s cart
        cart_items.delete()

        # 7) Return order summary
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)