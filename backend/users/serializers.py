from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Customer

Customer = get_user_model()

class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "role",
        ]
        read_only_fields = ["id", "email", "username", "role"]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=Customer.ROLE_CHOICES, default='Customer', required=False)

    class Meta:
        model = Customer
        fields = ("id", "email", "username", "password", "first_name", "last_name", "role")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = Customer(**validated_data)
        user.set_password(password)  # 🔒 Şifre burada güvenli şekilde hashleniyor
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("id", "email", "username", "first_name", "last_name", "role", "is_staff")
        read_only_fields = ("id", "email", "role", "is_staff")
