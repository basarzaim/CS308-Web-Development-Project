from django.shortcuts import render
from rest_framework import generics, permissions
from .models import Customer
from .serializers import RegisterSerializer


class RegisterView(generics.CreateAPIView):
    queryset = Customer.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

# Create your views here.
