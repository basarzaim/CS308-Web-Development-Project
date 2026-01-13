from rest_framework import serializers
from .models import Product, Category

class ProductSerializer(serializers.ModelSerializer):
    rating = serializers.FloatField(read_only=True, allow_null=True)
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True, allow_null=True)
    has_discount = serializers.SerializerMethodField()
    discounted_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "price", "original_price", "stock", "warranty", "description", "rating", "image", "category", "category_name", "category_slug", "model", "serial_number", "distributor", "has_discount", "discount_percentage", "is_on_sale", "discounted_price"]

    def get_fields(self):
        """Dynamically exclude category field for partial updates"""
        fields = super().get_fields()
        if self.partial:
            # Remove category field for partial updates to avoid validation issues
            fields.pop('category', None)
        return fields

    def validate_price(self, value):
        """Validate price is positive"""
        if value is not None and value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value


    def get_has_discount(self, obj):
        """Check if product has a discount (original_price exists and is higher than current price)"""
        if obj.original_price is None:
            return False
        try:
            return float(obj.original_price) > float(obj.price)
        except (ValueError, TypeError):
            return False
    
    def get_discounted_price(self, obj):
        """Get the discounted price from the model method"""
        try:
            return float(obj.get_discounted_price())
        except (ValueError, TypeError, AttributeError):
            return float(obj.price)

    def to_representation(self, instance):
        """Round rating to 1 decimal place"""
        data = super().to_representation(instance)
        if data.get('rating') is not None:
            data['rating'] = round(data['rating'], 1)
        return data

    def validate_category(self, value):
        """Allow None/null values for category during partial updates"""
        if self.partial and value is None:
            return value
        return value


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'product_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'product_count']

    def get_product_count(self, obj):
        return obj.product_set.count()
