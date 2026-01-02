from rest_framework import serializers
from django.utils.text import slugify
from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    slug = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Category
        fields = ["id", "slug", "name", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("name cannot be empty.")
        return value

    def validate_slug(self, value):
        value = (value or "").strip()
        if value and len(value) > 50:
            raise serializers.ValidationError("slug must be at most 50 characters.")
        return value

    def create(self, validated_data):
        slug = (validated_data.get("slug") or "").strip()
        if not slug:
            validated_data["slug"] = slugify(validated_data["name"])[:50]
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "slug" in validated_data and not (validated_data["slug"] or "").strip():
            validated_data["slug"] = slugify(validated_data.get("name", instance.name))[:50]
        return super().update(instance, validated_data)
