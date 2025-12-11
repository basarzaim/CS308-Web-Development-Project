from rest_framework import serializers
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
    rating = serializers.FloatField(read_only=True, allow_null=True)

    class Meta:
        model = Product
        fields = ["id", "name", "price", "stock", "warranty", "description", "rating", "image", "category", "model", "serial_number", "distributor"]

    def to_representation(self, instance):
        """Round rating to 1 decimal place"""
        data = super().to_representation(instance)
        if data.get('rating') is not None:
            data['rating'] = round(data['rating'], 1)
        return data
