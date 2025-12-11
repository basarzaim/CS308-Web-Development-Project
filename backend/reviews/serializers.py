from rest_framework import serializers
from .models import Comment, Rating

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='customer.username') # show user name "basar" instead of user ID "3"
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'product', 'product_id', 'product_name', 'author', 'body', 'status', 'created_at'] 
        read_only_fields = ['author', 'status', 'product', 'product_id', 'product_name'] # read-only for the safety purposes

class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ['id', 'score']

    def validate_score(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Score must be between 1 and 5.")
        return value