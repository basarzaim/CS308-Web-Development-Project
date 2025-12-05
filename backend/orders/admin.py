from django.contrib import admin
from .models import Order, OrderItem

from .models import Order, OrderItem

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "total_price", "created_at", "delivered_at")
    list_filter = ("status",)


# Register your models here.
