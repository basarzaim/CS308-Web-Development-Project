from rest_framework import serializers
from .models import Order, OrderItem
from products.serializers import ProductSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    name = serializers.CharField(source='product.name', read_only=True)
    price = serializers.DecimalField(source='unit_price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "quantity", "unit_price", "name", "price"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total = serializers.DecimalField(source='total_price', max_digits=10, decimal_places=2, read_only=True)
    subtotal = serializers.SerializerMethodField()
    shipping = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "status",
            "created_at",
            "total_price",
            "total",
            "subtotal",
            "items",
            "shipping",
        ]
        read_only_fields = ["user", "created_at", "total_price", "items"]

    def get_subtotal(self, obj):
        return obj.total_price

    def get_shipping(self, obj):
        """Return shipping info as an object"""
        if obj.shipping_name or obj.shipping_address:
            return {
                "name": obj.shipping_name,
                "address": obj.shipping_address,
                "city": obj.shipping_city,
                "phone": obj.shipping_phone,
            }
        return None