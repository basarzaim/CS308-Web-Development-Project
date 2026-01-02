# backend/categories/views.py
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = "slug"  
    def get_permissions(self):
        
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        # Write (create/update/delete): admin
        return [IsAdminUser()]