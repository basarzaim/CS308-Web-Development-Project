from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Wishlist
from .serializers import WishlistSerializer
from products.models import Product


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('product')
    
    def list(self, request, *args, **kwargs):
        """Override list to auto-populate price_when_added for legacy items"""
        queryset = self.get_queryset()
        # Auto-populate price_when_added for items that don't have it set
        # This handles legacy items added before the field existed
        items_to_update = []
        for item in queryset:
            if item.price_when_added is None and item.product:
                item.price_when_added = item.product.price
                items_to_update.append(item)
        
        # Bulk update if needed
        if items_to_update:
            Wishlist.objects.bulk_update(items_to_update, ['price_when_added'])
        
        return super().list(request, *args, **kwargs)

    def get_serializer_context(self):
        """Add request to serializer context for building absolute URLs"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        product_id = request.data.get("product")

        if not product_id:
            return Response(
                {"detail": "Product id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        wishlist_item, created = Wishlist.objects.get_or_create(
            user=request.user,
            product=product,
            defaults={'price_when_added': product.price}
        )

        if not created:
            # If item already exists, update price_when_added if it's None
            if wishlist_item.price_when_added is None:
                wishlist_item.price_when_added = product.price
                wishlist_item.save()
            return Response(
                {"detail": "Product already in wishlist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(wishlist_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['delete'], url_path='product/(?P<product_id>[^/.]+)')
    def delete_by_product(self, request, product_id=None):
        """Delete wishlist item by product ID (more efficient than fetching all items first)"""
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            wishlist_item = Wishlist.objects.get(user=request.user, product=product)
            wishlist_item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Wishlist.DoesNotExist:
            return Response(
                {"detail": "Product not in wishlist."},
                status=status.HTTP_404_NOT_FOUND,
            )