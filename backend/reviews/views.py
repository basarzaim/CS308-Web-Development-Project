from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count
from products.models import Product
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
    
    def perform_create(self,serializer):
        # we grab the information from the request and URL instead of directly pulling from user
        product_id = self.kwargs['product_id']
        product = get_object_or_404(Product, pk=product_id)

        serializer.save(customer=self.request.user, product=product)

class ProductRatingView(generics.GenericAPIView):
    """
    GET: return rating summary (anyone)
    POST: submit rating (authenticated only, one per user/product)
    """
    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, *args, **kwargs):
        product_id = self.kwargs["product_id"]
        product = get_object_or_404(Product, pk=product_id)

        agg = Rating.objects.filter(product=product).aggregate(
            average=Avg("score"), count=Count("id")
        )
        average = agg["average"] or 0
        count = agg["count"] or 0

        user_score = None
        if request.user.is_authenticated:
            user_rating = Rating.objects.filter(
                product=product, customer=request.user
            ).first()
            if user_rating:
                user_score = user_rating.score

        return Response(
            {
                "average": round(float(average), 1) if count else 0,
                "count": count,
                "user_rating": user_score,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required to submit ratings."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        product_id = self.kwargs["product_id"]
        product = get_object_or_404(Product, pk=product_id)

        if Rating.objects.filter(product=product, customer=request.user).exists():
            raise ValidationError("You have already rated this product!")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(customer=request.user, product=product)

        # Return updated summary after creation
        agg = Rating.objects.filter(product=product).aggregate(
            average=Avg("score"), count=Count("id")
        )
        return Response(
            {
                "average": round(float(agg["average"]), 1),
                "count": agg["count"],
                "user_rating": serializer.instance.score,
            },
            status=status.HTTP_201_CREATED,
        )


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