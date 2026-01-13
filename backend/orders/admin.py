from django.contrib import admin
from .models import Order, OrderItem

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "total_price", "payment_method", "is_paid", "created_at", "delivered_at")
    list_filter = ("status", "payment_method", "is_paid")
    readonly_fields = ("card_number_encrypted", "get_masked_card_display", "created_at", "updated_at", "paid_at", "delivered_at")
    
    fieldsets = (
        ("Order Information", {
            "fields": ("user", "status", "total_price", "discount_percentage")
        }),
        ("Payment Information", {
            "fields": ("payment_method", "is_paid", "paid_at", "get_masked_card_display", "card_expiry_month", "card_expiry_year", "card_holder_name"),
            "description": "Card number is encrypted. Only last 4 digits are shown for security."
        }),
        ("Shipping Information", {
            "fields": ("shipping_name", "shipping_address", "shipping_city", "shipping_phone")
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at", "delivered_at")
        }),
    )
    
    def get_masked_card_display(self, obj):
        """Display masked card number in admin (never show full number)"""
        return obj.get_masked_card_number() or "N/A"
    get_masked_card_display.short_description = "Card Number (Masked)"
    
    def get_readonly_fields(self, request, obj=None):
        """Make encrypted fields read-only - never allow editing encrypted card data"""
        return self.readonly_fields + ("card_number_encrypted",)


# Register your models here.
