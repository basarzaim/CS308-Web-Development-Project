from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer

    # 🔍 Search & 🔃 Ordering aktif
    filter_backends = [SearchFilter, OrderingFilter]

    # search: ?search=iphone
    search_fields = ["name", "description"]

    # sort: ?ordering=price , ?ordering=-price
    ordering_fields = ["price", "name", "stock", "warranty"]

    def get_queryset(self):
        queryset = Product.objects.all()

        # ✅ PRICE FILTER
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")

        if min_price is not None:
            queryset = queryset.filter(price__gte=min_price)

        if max_price is not None:
            queryset = queryset.filter(price__lte=max_price)

        # ✅ STOCK FILTER
        in_stock = self.request.query_params.get("in_stock")
        if in_stock == "true":
            queryset = queryset.filter(stock__gt=0)
        elif in_stock == "false":
            queryset = queryset.filter(stock=0)

        # ✅ WARRANTY FILTER
        min_warranty = self.request.query_params.get("min_warranty")
        if min_warranty is not None:
            queryset = queryset.filter(warranty__gte=min_warranty)

        return queryset
