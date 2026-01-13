from rest_framework import serializers
from .models import Wishlist


class WishlistSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_price = serializers.DecimalField(
        source="product.price",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    product_image = serializers.SerializerMethodField()
    product_rating = serializers.SerializerMethodField()
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    has_discount = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()
    original_price = serializers.DecimalField(
        source="price_when_added",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = Wishlist
        fields = [
            "id",
            "product",
            "product_id",
            "product_name",
            "product_price",
            "product_image",
            "product_rating",
            "price_when_added",
            "original_price",
            "has_discount",
            "discount_amount",
            "discount_percentage",
            "created_at",
            "updated_at",
        ]

    def get_has_discount(self, obj):
        """Check if product price has decreased since adding to wishlist"""
        if obj.price_when_added is None:
            return False
        # Compare prices as floats to avoid Decimal comparison issues
        try:
            return float(obj.product.price) < float(obj.price_when_added)
        except (ValueError, TypeError):
            return False

    def get_discount_amount(self, obj):
        """Calculate discount amount in dollars"""
        if obj.price_when_added is None or not self.get_has_discount(obj):
            return None
        return float(obj.price_when_added - obj.product.price)

    def get_discount_percentage(self, obj):
        """Calculate discount percentage"""
        if obj.price_when_added is None or not self.get_has_discount(obj):
            return None
        from decimal import Decimal
        if obj.price_when_added == 0:
            return None
        discount_pct = ((obj.price_when_added - obj.product.price) / obj.price_when_added) * Decimal("100")
        return round(float(discount_pct), 1)

    def get_product_image(self, obj):
        """Get product image URL"""
        if obj.product.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.product.image.url)
            return obj.product.image.url
        return None

    def get_product_rating(self, obj):
        """Get product rating if available"""
        # Calculate average rating from reviews if available
        try:
            from reviews.models import Comment
            from django.db.models import Avg
            rating = Comment.objects.filter(
                product=obj.product,
                status='approved'
            ).aggregate(Avg('rating'))['rating__avg']
            if rating is not None:
                return round(float(rating), 1)
        except Exception:
            pass
        return None