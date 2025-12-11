# backend/products/api_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .api_views import ProductViewSet, CategoryListAPIView  
from .auth_views import RegisterView


router = DefaultRouter()
router.register(r"", ProductViewSet, basename="product")

urlpatterns = [
    # Specific paths MUST come before router.urls to avoid being caught by ViewSet
    path("categories/", CategoryListAPIView.as_view(), name="category-list"),
    # Auth endpoints
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Router MUST be last
    path("", include(router.urls)),
]
