from django.urls import path
from .views import ProductCommentView, ProductRatingView

urlpatterns = [
    # /api/products/5/comments/
    path('products/<int:product_id>/comments/', ProductCommentView.as_view(), name='product-comments'),
    
    # /api/products/5/ratings/
    path('products/<int:product_id>/ratings/', ProductRatingView.as_view(), name='product-ratings'),
]