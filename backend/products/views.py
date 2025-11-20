from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    # Search & Sort aktif
    filter_backends = [SearchFilter, OrderingFilter]

    # /api/products/products/?search=mac
    search_fields = ["name", "description"]

    # /api/products/products/?ordering=price  OR  -price
    ordering_fields = ["price", "name"]

