from django.urls import path
from .views import CheckoutView, OrderCancelView, OrderReturnView, admin_update_order_status,ApplyDiscountView
from .views import SendInvoiceView


urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path("admin/update-status/<int:order_id>/", admin_update_order_status),
    path('<int:pk>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    path('<int:pk>/return/', OrderReturnView.as_view(), name='order-return'),
    path('<int:pk>/apply-discount/', ApplyDiscountView.as_view(), name='apply-discount'),
    path("<int:pk>/send-invoice/", SendInvoiceView.as_view(), name="send-invoice"),
    path("<int:pk>/send-invoice/", SendInvoiceView.as_view(), name="send-invoice"),


]
