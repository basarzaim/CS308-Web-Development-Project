from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from cart.models import CartItem
from products.models import Product
from .models import Order, OrderItem
from .serializers import OrderSerializer


class CheckoutView(APIView):
    def post(self, request):
        user = request.user

        cart_items = CartItem.objects.filter(user=user).select_related("product")

        if not cart_items.exists():
            return Response(
                {"error": "Your cart is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for item in cart_items:
            if item.product.stock < item.quantity:
                return Response(
                    {"error": f"Not enough stock for: {item.product.name}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        order = Order.objects.create(user=user, total_price=0)

        total = 0
        for item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                unit_price=item.product.price,
            )
            total += item.product.price * item.quantity

            item.product.stock -= item.quantity
            item.product.save()

        order.total_price = total
        order.save()

        cart_items.delete()

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OrderCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self,request,pk):
        order = get_object_or_404(Order, pk=pk ,user=request.user)

        if order.status != 'processing': #cancel if status is processing
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
        
        if not order.delivered_at:  # Must be within 30 days
            return Response({"error": "Delivery date not found."}, status=status.HTTP_400_BAD_REQUEST)

        days_passed = (timezone.now() - order.delivered_at).days

        if days_passed > 30:
            return Response(
                {"error": f"Return period expired. ({days_passed} days passed, limit is 30)."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = 'return_requested'
        order.save()

        return Response({"message": "Return request submitted. Waiting for approval."}, status=status.HTTP_200_OK)