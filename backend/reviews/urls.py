from django.urls import path
from .views import (
    ProductCommentView,
    ProductRatingView,
    PendingCommentsView,
    UpdateCommentStatusView,
)

urlpatterns = [
    # /api/products/5/comments/
    path('products/<int:product_id>/comments/', ProductCommentView.as_view(), name='product-comments'),
    
    # /api/products/5/ratings/
    path('products/<int:product_id>/ratings/', ProductRatingView.as_view(), name='product-ratings'),
    
    # Admin moderation endpoints
    # /api/comments/pending/
    path('comments/pending/', PendingCommentsView.as_view(), name='pending-comments'),
    
    # /api/comments/<id>/status/
    path('comments/<int:pk>/status/', UpdateCommentStatusView.as_view(), name='update-comment-status'),
]