from django.urls import path
from .views import CheckoutView, OrderCancelView, OrderReturnView

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('<int:pk>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    path('<int:pk>/return/', OrderReturnView.as_view(), name='order-return'),
]
