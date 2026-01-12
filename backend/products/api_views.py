# backend/products/api_views.py
from django.db.models import Count          # 🔹 EK
from rest_framework import viewsets, status
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.views import APIView    # 🔹 EK
from rest_framework.response import Response  # 🔹 EK
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.shortcuts import get_object_or_404

from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]  # Allow read access to everyone, write requires auth

    # Allow read operations for all authenticated users, restrict write operations to Product Managers

    #  Search
    filter_backends = [SearchFilter, OrderingFilter]

    # search: ?search=iphone
    search_fields = ["name", "description"]

    # sort: ?ordering=price , ?ordering=-price , ?ordering=-rating
    ordering_fields = ["price", "name", "stock", "warranty", "rating", "rating_sort"]

    def get_queryset(self):
        # Optimize: annotate rating at queryset level to avoid N+1 queries
        from django.db.models import Avg, Value
        from django.db.models.functions import Coalesce

        queryset = Product.objects.select_related('category').all().annotate(
            rating=Avg('reviews__score'),
            # Add a field for sorting: null ratings get -1 so they appear last when descending
            rating_sort=Coalesce(Avg('reviews__score'), Value(-1.0))
        )

        # CATEGORY FILTER
        category = self.request.query_params.get("category")
        if category:
            # Try to filter by category slug first, then by ID
            try:
                category_obj = Category.objects.get(slug=category)
                queryset = queryset.filter(category=category_obj)
            except Category.DoesNotExist:
                try:
                    category_obj = Category.objects.get(id=int(category))
                    queryset = queryset.filter(category=category_obj)
                except (Category.DoesNotExist, ValueError):
                    # If category doesn't exist, return empty queryset
                    queryset = queryset.none()

        # PRICE FILTER
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")

        if min_price is not None:
            queryset = queryset.filter(price__gte=min_price)

        if max_price is not None:
            queryset = queryset.filter(price__lte=max_price)

        # STOCK FILTER
        in_stock = self.request.query_params.get("in_stock")
        if in_stock == "true":
            queryset = queryset.filter(stock__gt=0)
        elif in_stock == "false":
            queryset = queryset.filter(stock=0)

        # WARRANTY FILTER
        min_warranty = self.request.query_params.get("min_warranty")
        if min_warranty is not None:
            queryset = queryset.filter(warranty__gte=min_warranty)

        return queryset

    def check_product_manager_permission(self):
        """Check if user is Product Manager"""
        user = self.request.user
        user_role = getattr(user, "role", None)
        # Also allow Django staff (superusers) to perform these operations
        return user.is_staff or user_role == "Product Manager"

    def check_sales_or_product_manager_permission(self):
        """Check if user is Product Manager or Sales Manager (for price updates)"""
        user = self.request.user
        user_role = getattr(user, "role", None)
        # Also allow Django staff (superusers) to perform these operations
        return user.is_staff or user_role == "Product Manager" or user_role == "Sales Manager"

    def create(self, request, *args, **kwargs):
        if not self.check_product_manager_permission():
            return Response(
                {"detail": "Only Product Manager can create products."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not self.check_sales_or_product_manager_permission():
            return Response(
                {"detail": "Only Product Manager or Sales Manager can update products."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self.check_sales_or_product_manager_permission():
            return Response(
                {"detail": "Only Product Manager or Sales Manager can update products."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not self.check_product_manager_permission():
            return Response(
                {"detail": "Only Product Manager can delete products."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class CategoryListAPIView(APIView):
    """
    GET /api/categories/  -> [
      { "id": 1, "slug": "phones", "name": "Phones", "product_count": 5 },
      ...
    ]
    POST /api/categories/ -> Create new category (Product Manager only)
    DELETE /api/categories/{id}/ -> Delete category (Product Manager only)
    """
    permission_classes = [IsAuthenticatedOrReadOnly]  # Allow read access to everyone

    def check_product_manager_permission(self):
        """Check if user is Product Manager"""
        user = self.request.user
        user_role = getattr(user, "role", None)
        # Also allow Django staff (superusers) to perform these operations
        return user.is_staff or user_role == "Product Manager"

    def get(self, request, *args, **kwargs):
        # Get all categories with product counts
        categories = Category.objects.annotate(
            product_count=Count('product')
        ).order_by('name')

        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        if not self.check_product_manager_permission():
            return Response(
                {"detail": "Only Product Manager can create categories."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            category = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, category_id=None, *args, **kwargs):
        if not self.check_product_manager_permission():
            return Response(
                {"detail": "Only Product Manager can delete categories."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            category = Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            return Response(
                {"detail": "Category not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if category has products
        product_count = category.product_set.count()
        if product_count > 0:
            return Response(
                {"detail": f"Cannot delete category '{category.name}' because it contains {product_count} product(s). Move or delete the products first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delete the category
        category_name = category.name
        category.delete()

        return Response({
            "message": f"Category '{category_name}' deleted successfully."
        }, status=status.HTTP_200_OK)
