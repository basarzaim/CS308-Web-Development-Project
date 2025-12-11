from rest_framework import generics
from .models import Product
from .serializers import ProductSerializer


from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend

class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    #  ?category=Electronics&price=1000
    filterset_fields = ['category', 'stock'] 

    # search bar
    search_fields = ['name', 'description']

    #sort 
    ordering_fields = ['price', 'stock', 'created_at']
    ordering = ['id'] 