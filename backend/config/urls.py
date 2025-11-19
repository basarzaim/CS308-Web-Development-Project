from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Products endpointleri
    path('api/products/', include('products.api_urls')),

    # Cart endpointleri
    path('api/cart/', include('cart.urls')),

    path('api/users/', include('users.urls')),

    # Users (Register/Login vb.)
    path('api/auth/', include('users.api_urls')),

    # reviews
    path('api/', include('reviews.urls')),

]