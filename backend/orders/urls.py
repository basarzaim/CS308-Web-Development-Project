from django.urls import path
from .views import CheckoutView, list_orders, order_detail, cancel_order, return_order

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('', list_orders, name='list_orders'),  # GET for listing, need to add POST handling here
    path('<int:order_id>/', order_detail, name='order_detail'),
    path('<int:order_id>/cancel/', cancel_order, name='cancel_order'),
    path('<int:order_id>/return/', return_order, name='return_order'),
]
