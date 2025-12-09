from rest_framework import serializers
from .models import Order, OrderItem
from products.serializers import ProductSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    name = serializers.CharField(source='product.name', read_only=True)
    price = serializers.DecimalField(
        source='unit_price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = OrderItem
        fields = ["id", "product", "quantity", "unit_price", "name", "price"]


class OrderSerializer(serializers.ModelSerializer):
    
    items = OrderItemSerializer(many=True, read_only=True)

    
    discounted_total_price = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "total_price",
            "discount_percentage",          
            "discounted_total_price",       
            "status",
            "created_at",
            "updated_at",
            "delivered_at",
            "items",
        ]
        read_only_fields = [
            "user",
            "created_at",
            "updated_at",
            "delivered_at",
            "discounted_total_price",
        ]

    
    def get_discounted_total_price(self, obj):
        return obj.discounted_total_price()
