from django.contrib.auth.models import User
from django.db import transaction
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

class RegisterView(APIView):
    permission_classes = []

    @transaction.atomic
    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        name = (request.data.get("name") or "").strip()

        if not email or not password or not name:
            return Response({"message": "name, email, password required"}, status=400)
        if User.objects.filter(username=email).exists():
            return Response({"message": "email already in use"}, status=400)

        user = User.objects.create_user(username=email, email=email, password=password, first_name=name)
        refresh = RefreshToken.for_user(user)
        return Response({"access": str(refresh.access_token), "refresh": str(refresh)}, status=201)
