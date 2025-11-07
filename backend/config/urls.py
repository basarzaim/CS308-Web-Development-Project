from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('products.api_urls')),
    path('api/cart/', include('cart.urls')),
    path('api/users/', include('users.urls')),
]