from rest_framework import serializers
from .models import Comment, Rating

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='customer.username') # show user name "basar" instead of user ID "3"

    class Meta:
        model = Comment
        fields = ['id', 'product', 'author', 'body', 'status', 'created_at'] 
        read_only_fields = ['author', 'status', 'product'] # read-only for the safety purposes

class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ['id', 'score']

    def validate_score(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Score must be between 1 and 5.")
        return value