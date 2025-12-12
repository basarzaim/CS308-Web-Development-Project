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

        # Check if product is out of stock
        if not product.stock or product.stock <= 0:
            return response.Response(
                {"error": "This product is out of stock"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.is_authenticated:
            item, _ = CartItem.objects.get_or_create(
                user=request.user, product=product, defaults={"quantity": 0}
            )
            new_quantity = item.quantity + max(1, qty)

            # Check if new quantity exceeds stock
            if new_quantity > product.stock:
                return response.Response(
                    {"error": f"Only {product.stock} items available in stock. You already have {item.quantity} in your cart."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            item.quantity = new_quantity
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

            # Check if quantity exceeds stock
            if qty > cart_item.product.stock:
                return response.Response(
                    {"error": f"Only {cart_item.product.stock} items available in stock"},
                    status=status.HTTP_400_BAD_REQUEST
                )

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
        # Accept cart items from request body (from localStorage) or fallback to session
        cart_items = request.data.get("items", [])
        merged = 0
        
        # If items are provided in request body (from localStorage)
        if cart_items:
            for item_data in cart_items:
                product_id = item_data.get("productId") or item_data.get("product_id")
                qty = int(item_data.get("qty") or item_data.get("quantity") or 1)
                
                if not product_id:
                    continue
                    
                try:
                    product = get_object_or_404(Product, pk=int(product_id))
                    cart_item, created = CartItem.objects.get_or_create(
                        user=request.user, 
                        product=product, 
                        defaults={"quantity": 0}
                    )
                    new_quantity = cart_item.quantity + qty
                    
                    # Check stock availability
                    if new_quantity > product.stock:
                        # Set to max available stock
                        new_quantity = product.stock
                    
                    cart_item.quantity = new_quantity
                    cart_item.save()
                    merged += 1
                except Exception as e:
                    # Skip items that fail to merge
                    continue
        
        # Also merge from session cart if it exists (for backward compatibility)
        sc = get_session_cart(request)
        if sc:
            for pid_str, qty in sc.items():
                try:
                    product = get_object_or_404(Product, pk=int(pid_str))
                    cart_item, created = CartItem.objects.get_or_create(
                        user=request.user, 
                        product=product, 
                        defaults={"quantity": 0}
                    )
                    new_quantity = cart_item.quantity + int(qty)
                    
                    # Check stock availability
                    if new_quantity > product.stock:
                        new_quantity = product.stock
                    
                    cart_item.quantity = new_quantity
                    cart_item.save()
                    merged += 1
                except Exception:
                    continue
            clear_session_cart(request)
        
        return response.Response({"merged_items": merged}, status=status.HTTP_200_OK)
