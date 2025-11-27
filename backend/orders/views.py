from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes

from cart.models import CartItem
from products.models import Product
from .models import Order, OrderItem
from .serializers import OrderSerializer


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        items_data = request.data.get('items', [])

        if not items_data:
            return Response({"error": "Your cart is empty."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 1) Validate and collect product data
        order_items = []
        total = 0

        for item_data in items_data:
            product_id = item_data.get('product_id') or item_data.get('productId')
            quantity = int(item_data.get('quantity') or item_data.get('qty', 1))

            if not product_id:
                return Response({"error": "Invalid item data"},
                                status=status.HTTP_400_BAD_REQUEST)

            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                return Response({"error": f"Product {product_id} not found"},
                                status=status.HTTP_404_NOT_FOUND)

            # 2) Stock validation
            if product.stock < quantity:
                return Response(
                    {"error": f"Not enough stock for: {product.name}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            order_items.append({
                'product': product,
                'quantity': quantity,
                'unit_price': product.price
            })
            total += product.price * quantity

        # 3) Get shipping information
        shipping_data = request.data.get('shipping', {})

        # 4) Create Order
        order = Order.objects.create(
            user=user,
            total_price=total,
            status='processing',
            shipping_name=shipping_data.get('full_name') or shipping_data.get('name'),
            shipping_address=shipping_data.get('address'),
            shipping_city=shipping_data.get('city'),
            shipping_phone=shipping_data.get('phone'),
            shipping_notes=shipping_data.get('notes'),
        )

        # 4) Create OrderItems and reduce stock
        for item in order_items:
            OrderItem.objects.create(
                order=order,
                product=item['product'],
                quantity=item['quantity'],
                unit_price=item['unit_price']
            )

            # Reduce stock
            item['product'].stock -= item['quantity']
            item['product'].save()

        # 5) Return order summary
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_orders(request):
    """List all orders for the authenticated user"""
    orders = Order.objects.filter(user=request.user).prefetch_related('items__product')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_detail(request, order_id):
    """Get details of a specific order"""
    try:
        order = Order.objects.prefetch_related('items__product').get(
            id=order_id,
            user=request.user
        )
        serializer = OrderSerializer(order)
        return Response(serializer.data)
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    """Cancel an order if it's in pending or processing status"""
    try:
        order = Order.objects.get(id=order_id, user=request.user)

        if order.status not in ['pending', 'processing']:
            return Response(
                {"error": f"Cannot cancel order with status: {order.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Restore stock for cancelled order
        for item in order.items.all():
            item.product.stock += item.quantity
            item.product.save()

        order.status = 'cancelled'
        order.save()

        serializer = OrderSerializer(order)
        return Response(serializer.data)
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def return_order(request, order_id):
    """Request return for a delivered order"""
    try:
        order = Order.objects.get(id=order_id, user=request.user)

        if order.status != 'delivered':
            return Response(
                {"error": "Only delivered orders can be returned"},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'return_requested'
        order.save()

        serializer = OrderSerializer(order)
        return Response(serializer.data)
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"},
            status=status.HTTP_404_NOT_FOUND
        )