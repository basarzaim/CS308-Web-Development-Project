from rest_framework import generics
from .models import CartItem
from .serializers import CartItemSerializer

class CartItemCreateView(generics.CreateAPIView):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer