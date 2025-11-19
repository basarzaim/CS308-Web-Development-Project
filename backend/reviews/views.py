from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from products.models import Product
from .models import Comment, Rating
from .serializers import CommentSerializer, RatingSerializer

class ProductCommentView(generics.ListCreateAPIView): #viewing comments
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly] # guests can read, but only logged-in users can write

    def get_queryset(self):
        # find which product is commented, and only return approved comments
        product_id = self.kwargs['product_id']
        return Comment.objects.filter(product_id=product_id, status='approved')
    
    def perform_create(self,serializer):
        # we grab the information from the request and URL instead of directly pulling from user
        product_id = self.kwargs['product_id']
        product = get_object_or_404(Product, pk=product_id)

        serializer.save(customer=self.request.user, product=product)

class ProductRatingView(generics.CreateAPIView):
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated] # only logged in users

    def perform_create(self, serializer):
        product_id = self.kwargs['product_id']
        product = get_object_or_404(Product, pk=product_id)

        if Rating.objects.filter(product=product, customer=self.request.user).exists(): #checks if user already rated
            raise ValidationError("You have already rated this product!") #validation error, change here if you want to be able to rate products again,

        serializer.save(customer=self.request.user, product=product)