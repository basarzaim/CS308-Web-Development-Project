from django.urls import path
from .views import CheckoutView, OrderCancelView, OrderReturnView, admin_update_order_status

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path("admin/update-status/<int:order_id>/", admin_update_order_status),
    path('<int:pk>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    path('<int:pk>/return/', OrderReturnView.as_view(), name='order-return'),
]
