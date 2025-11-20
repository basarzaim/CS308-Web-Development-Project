from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    # 🔥 Search & Sort aktif
    filter_backends = [SearchFilter, OrderingFilter]

    # search: ?search=iphone
    search_fields = ["name", "description"]

    # sort: ?ordering=price , ?ordering=-price
    ordering_fields = ["price", "name"]
