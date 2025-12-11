from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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

    path('api/orders/', include('orders.urls')),

    # DRF browsable API login/logout
    path('api-auth/', include('rest_framework.urls')),
    # wishlist
    path('api/wishlist/', include('wishlist.api_urls')),

]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)