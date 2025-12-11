# backend/products/api_views.py
from django.db.models import Count          # 🔹 EK
from rest_framework import viewsets
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

    # sort: ?ordering=price , ?ordering=-price
    ordering_fields = ["price", "name", "stock", "warranty"]

    def get_queryset(self):
        # Optimize: annotate rating at queryset level to avoid N+1 queries
        from django.db.models import Avg
        queryset = Product.objects.all().annotate(
            rating=Avg('reviews__score')
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
