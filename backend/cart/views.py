# cart/views.py
from rest_framework import views, permissions, response, status
from django.shortcuts import get_object_or_404
from products.models import Product
from .models import CartItem
from .utils import add_to_session_cart, get_session_cart, clear_session_cart

class AddToCartView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        product_id = request.data.get("product_id")
        qty = int(request.data.get("quantity", 1))
        product = get_object_or_404(Product, pk=product_id)

        if request.user.is_authenticated:
            item, _ = CartItem.objects.get_or_create(
                user=request.user, product=product, defaults={"quantity": 0}
            )
            item.quantity += max(1, qty)
            item.save()
            return response.Response({"message": "added to user cart"}, status=status.HTTP_200_OK)
        else:
            add_to_session_cart(request, product.id, qty)
            return response.Response({"message": "added to session cart"}, status=status.HTTP_200_OK)

class ListCartView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            items = CartItem.objects.filter(user=request.user).select_related("product")
            data = [{
                "id": i.id,
                "product_id": i.product_id,
                "name": i.product.name,
                "price": str(i.product.price),
                "qty": i.quantity,
                "quantity": i.quantity
            } for i in items]
            return response.Response({"cart": data}, status=status.HTTP_200_OK)
        else:
            sc = get_session_cart(request)  # {"1": 2, "5": 1}
            ids = [int(pid) for pid in sc.keys()] or []
            products = {p.id: p for p in Product.objects.filter(id__in=ids)}
            data = [{
                "product_id": int(pid),
                "name": products.get(int(pid)).name if products.get(int(pid)) else None,
                "qty": qty
            } for pid, qty in sc.items()]
            return response.Response({"cart": data}, status=status.HTTP_200_OK)

class UpdateCartItemView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, item_id):
        cart_item = get_object_or_404(CartItem, pk=item_id, user=request.user)
        quantity = request.data.get("quantity")
        
        if quantity is not None:
            qty = int(quantity)
            if qty <= 0:
                cart_item.delete()
                return response.Response({"message": "Item removed"}, status=status.HTTP_200_OK)
            cart_item.quantity = qty
            cart_item.save()
        
        return response.Response({
            "id": cart_item.id,
            "product_id": cart_item.product_id,
            "quantity": cart_item.quantity
        }, status=status.HTTP_200_OK)


class RemoveCartItemView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, item_id):
        cart_item = get_object_or_404(CartItem, pk=item_id, user=request.user)
        cart_item.delete()
        return response.Response({"message": "Item removed"}, status=status.HTTP_200_OK)


class RemoveCartItemByProductView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, product_id):
        cart_item = get_object_or_404(CartItem, product_id=product_id, user=request.user)
        cart_item.delete()
        return response.Response({"message": "Item removed"}, status=status.HTTP_200_OK)


class ClearCartView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        CartItem.objects.filter(user=request.user).delete()
        return response.Response({"message": "Cart cleared"}, status=status.HTTP_200_OK)


class MergeCartView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        sc = get_session_cart(request)
        merged = 0
        for pid_str, qty in sc.items():
            product = get_object_or_404(Product, pk=int(pid_str))
            item, _ = CartItem.objects.get_or_create(
                user=request.user, product=product, defaults={"quantity": 0}
            )
            item.quantity += int(qty)
            item.save()
            merged += 1
        clear_session_cart(request)
        return response.Response({"merged_items": merged}, status=status.HTTP_200_OK)
