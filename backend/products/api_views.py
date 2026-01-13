# backend/products/api_views.py
from django.db.models import Count          # 🔹 EK
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.views import APIView    # 🔹 EK
from rest_framework.response import Response  # 🔹 EK

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer

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

        queryset = Product.objects.all().annotate(
            rating=Avg('reviews__score'),
            # Add a field for sorting: null ratings get -1 so they appear last when descending
            rating_sort=Coalesce(Avg('reviews__score'), Value(-1.0))
        )

        # CATEGORY FILTER
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

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

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def update_stock(self, request, pk=None):
        """
        Update stock for a specific product.
        PATCH /api/products/{id}/update_stock/
        Body: { "stock": 50 }
        """
        product = self.get_object()
        new_stock = request.data.get('stock')

        if new_stock is None:
            return Response(
                {"error": "Stock value is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            new_stock = int(new_stock)
            if new_stock < 0:
                return Response(
                    {"error": "Stock cannot be negative"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid stock value"},
                status=status.HTTP_400_BAD_REQUEST
            )

        product.stock = new_stock
        product.save(update_fields=['stock'])

        serializer = self.get_serializer(product)
        return Response(serializer.data)


class CategoryListAPIView(APIView):
    """
    GET /api/categories/  -> [
      { "slug": "phones", "name": "Phones", "product_count": 5 },
      ...
    ]
    """

    def get(self, request, *args, **kwargs):
        qs = (
            Product.objects
            .values("category")
            .annotate(product_count=Count("id"))
            .order_by("category")
        )

        # CATEGORY_CHOICES'tan label map'i üretelim
        # Örn: { "phones": "Phones", ... }
        choices_map = dict(Product.CATEGORY_CHOICES)

        data = []
        for row in qs:
            cat = row["category"]
            if not cat:
                continue
            data.append({
                "slug": cat,
                "name": choices_map.get(cat, cat),
                "product_count": row["product_count"],
            })

        return Response(data)
