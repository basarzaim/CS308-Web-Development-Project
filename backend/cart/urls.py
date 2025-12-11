from django.urls import path
from .views import (
    AddToCartView,
    ListCartView,
    UpdateCartItemView,
    RemoveCartItemView,
    RemoveCartItemByProductView,
    ClearCartView,
    MergeCartView,
)

urlpatterns = [
    path('add/', AddToCartView.as_view(), name='cart-add'),
    path('', ListCartView.as_view(), name='cart-list'),
    path('clear/', ClearCartView.as_view(), name='cart-clear'),
    path('<int:item_id>/', UpdateCartItemView.as_view(), name='cart-update'),
    path('<int:item_id>/remove/', RemoveCartItemView.as_view(), name='cart-remove'),
    path('product/<int:product_id>/remove/', RemoveCartItemByProductView.as_view(), name='cart-remove-by-product'),
    path('merge/', MergeCartView.as_view(), name='cart-merge'),
]
