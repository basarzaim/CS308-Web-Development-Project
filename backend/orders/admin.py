from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'unit_price')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'total_price', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('id', 'user__email', 'user__username')
    readonly_fields = ('created_at', 'total_price')
    inlines = [OrderItemInline]

    fieldsets = (
        ('Order Info', {
            'fields': ('user', 'status', 'total_price', 'created_at')
        }),
        ('Shipping Info', {
            'fields': ('shipping_name', 'shipping_address', 'shipping_city', 'shipping_phone', 'shipping_notes')
        }),
    )


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'product', 'quantity', 'unit_price')
    list_filter = ('order',)
    search_fields = ('order__id', 'product__name')
