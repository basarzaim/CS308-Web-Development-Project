from rest_framework import serializers
from .models import Customer


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Customer
        fields = ("id", "email", "username", "password", "first_name", "last_name")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = Customer(**validated_data)
        user.set_password(password)  # 🔒 Şifre burada güvenli şekilde hashleniyor
        user.save()
        return user
