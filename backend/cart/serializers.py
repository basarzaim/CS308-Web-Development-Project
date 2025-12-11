from rest_framework import serializers
from .models import CartItem

class CartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ["id", "product", "quantity"]

    def validate(self, data):
        product = data["product"]      
        quantity = data["quantity"]
        if product.stock < quantity:
            raise serializers.ValidationError(
                f"Only {product.stock} units available in stock."
            )
        return data