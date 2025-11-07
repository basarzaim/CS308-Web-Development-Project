from django.urls import path
from .views import AddToCartView, ListCartView, MergeCartView

urlpatterns = [
    path('add/', AddToCartView.as_view(), name='cart-add'),
    path('', ListCartView.as_view(), name='cart-list'),
    path('merge/', MergeCartView.as_view(), name='cart-merge'),
]
