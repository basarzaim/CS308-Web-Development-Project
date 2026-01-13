from django.urls import path
from .views import (
    CheckoutView,
    OrderCancelView,
    OrderReturnView,
    ApproveReturnView,
    DenyReturnView,
    ApplyDiscountView,
    OrderListView,
    OrderDetailView,
    AdminOrderListView,
    AdminOrderStatusUpdateView,
    admin_update_order_status,
    SendInvoiceView,
    DownloadInvoiceView,
    SalesAnalyticsView,
)

urlpatterns = [
    # User-facing endpoints
    path("", OrderListView.as_view(), name="order-list"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("<int:pk>/cancel/", OrderCancelView.as_view(), name="order-cancel"),
    path("<int:pk>/return/", OrderReturnView.as_view(), name="order-return"),
    path("<int:pk>/apply-discount/", ApplyDiscountView.as_view(), name="apply-discount"),
    path("<int:pk>/send-invoice/", SendInvoiceView.as_view(), name="send-invoice"),
    path("<int:pk>/download-invoice/", DownloadInvoiceView.as_view(), name="download-invoice"),

    # Admin endpoints
    path("admin/", AdminOrderListView.as_view(), name="admin-order-list"),
    path("<int:pk>/status/", AdminOrderStatusUpdateView.as_view(), name="admin-order-status"),
    # Legacy admin status update path (kept for compatibility)
    path("admin/update-status/<int:order_id>/", admin_update_order_status),
    path("<int:pk>/send-invoice/", SendInvoiceView.as_view(), name="send-invoice"),
    
    # Sales Manager return management endpoints
    path("<int:pk>/approve-return/", ApproveReturnView.as_view(), name="approve-return"),
    path("<int:pk>/deny-return/", DenyReturnView.as_view(), name="deny-return"),

    # Sales Manager Analytics (Requirement #11)
    path("analytics/", SalesAnalyticsView.as_view(), name="sales-analytics"),
]
