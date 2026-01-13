from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from django.shortcuts import get_object_or_404
from products.models import Product
from orders.models import Order, OrderItem
from .models import Comment, Rating
from .serializers import CommentSerializer, RatingSerializer

class ProductCommentView(generics.ListCreateAPIView): #viewing comments
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly] # guests can read, but only logged-in users can write

    def get_queryset(self):
        # find which product is commented, and only return approved comments
        # Optimize: use select_related to avoid N+1 queries
        product_id = self.kwargs['product_id']
        return Comment.objects.filter(
            product_id=product_id, 
            status='approved'
        ).select_related('customer', 'product').order_by('-created_at')
    
    def perform_create(self, serializer):
        # we grab the information from the request and URL instead of directly pulling from user
        product_id = self.kwargs['product_id']
        product = get_object_or_404(Product, pk=product_id)

        # REQUIREMENT #5: Check if user has purchased and received this product
        # User must have a delivered order containing this product before commenting
        has_delivered_order = OrderItem.objects.filter(
            order__user=self.request.user,
            order__status='delivered',
            product=product
        ).exists()

        if not has_delivered_order:
            raise ValidationError({
                "error": "You can only comment on products you have purchased and received. "
                         "Please wait until your order is delivered."
            })

        serializer.save(customer=self.request.user, product=product)

class ProductRatingView(generics.CreateAPIView):
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated] # only logged in users

    def perform_create(self, serializer):
        product_id = self.kwargs['product_id']
        product = get_object_or_404(Product, pk=product_id)

        # Check if user already rated this product
        if Rating.objects.filter(product=product, customer=self.request.user).exists():
            raise ValidationError("You have already rated this product!")

        # REQUIREMENT #5: Check if user has purchased and received this product
        # User must have a delivered order containing this product before rating
        has_delivered_order = OrderItem.objects.filter(
            order__user=self.request.user,
            order__status='delivered',
            product=product
        ).exists()

        if not has_delivered_order:
            raise ValidationError({
                "error": "You can only rate products you have purchased and received. "
                         "Please wait until your order is delivered."
            })

        serializer.save(customer=self.request.user, product=product)


# Admin moderation views
class PendingCommentsView(generics.ListAPIView):
    """Admin endpoint to fetch all pending comments"""
    serializer_class = CommentSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return Comment.objects.filter(status='pending').select_related('product', 'customer').order_by('-created_at')


class UpdateCommentStatusView(generics.UpdateAPIView):
    """Admin endpoint to update comment status (approve/reject)"""
    serializer_class = CommentSerializer
    permission_classes = [IsAdminUser]
    queryset = Comment.objects.all()

    def patch(self, request, *args, **kwargs):
        comment = self.get_object()
        new_status = request.data.get('status')

        if new_status not in ['pending', 'approved', 'rejected']:
            return Response(
                {"error": "Invalid status. Must be 'pending', 'approved', or 'rejected'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        comment.status = new_status
        comment.save()

        serializer = self.get_serializer(comment)
        return Response(serializer.data, status=status.HTTP_200_OK)