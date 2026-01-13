from rest_framework import serializers
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
    rating = serializers.FloatField(read_only=True, allow_null=True)
    discounted_price = serializers.SerializerMethodField()
    savings = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "price", "stock", "warranty", "description", "rating",
            "image", "category", "model", "serial_number", "distributor",
            "discount_percentage", "is_on_sale", "discounted_price", "savings"
        ]

    def get_discounted_price(self, obj):
        """Get price after discount"""
        return float(obj.get_discounted_price())

    def get_savings(self, obj):
        """Get amount saved"""
        return float(obj.get_savings())

    def to_representation(self, instance):
        """Round rating to 1 decimal place"""
        data = super().to_representation(instance)
        if data.get('rating') is not None:
            data['rating'] = round(data['rating'], 1)
        return data
