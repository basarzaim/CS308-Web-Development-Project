from rest_framework import serializers
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
    rating = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "price", "stock", "warranty", "description", "rating", "image"]

    def get_rating(self, obj):
        """Calculate average rating from reviews"""
        ratings = obj.reviews.all()
        if not ratings.exists():
            return None
        avg = sum(r.score for r in ratings) / ratings.count()
        return round(avg, 1)
