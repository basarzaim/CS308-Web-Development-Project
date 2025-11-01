from django.urls import path
from .views import CartItemCreateView

urlpatterns = [
    path('add/', CartItemCreateView.as_view(), name='cart-add'),
]