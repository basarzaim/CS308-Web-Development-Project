from rest_framework import serializers
from django.db.models import Avg
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
    rating = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "price", "stock", "warranty", "description", "rating", "image"]

    def get_rating(self, obj):
        """Calculate average rating from reviews - optimized with aggregation"""
        # Use aggregation to calculate average in database instead of fetching all ratings
        avg_rating = obj.reviews.aggregate(avg_score=Avg('score'))['avg_score']
        if avg_rating is None:
            return None
        return round(avg_rating, 1)
