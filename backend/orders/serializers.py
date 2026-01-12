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
    masked_card_number = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "total_price",
            "discount_percentage",
            "discounted_total_price",
            "status",
            "payment_method",
            "payment_method_display",
            "is_paid",
            "paid_at",
            "masked_card_number",
            "card_last_four",
            "card_expiry_month",
            "card_expiry_year",
            "card_holder_name",
            "shipping_name",
            "shipping_address",
            "shipping_city",
            "shipping_phone",
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
            "masked_card_number",
            "payment_method_display",
        ]
        # Exclude sensitive encrypted fields from serialization
        extra_kwargs = {
            'card_number_encrypted': {'write_only': True},  # Never expose encrypted data
        }

    
    def get_discounted_total_price(self, obj):
        return obj.discounted_total_price()
    
    def get_masked_card_number(self, obj):
        """Return masked card number for display (never expose full number)"""
        return obj.get_masked_card_number()