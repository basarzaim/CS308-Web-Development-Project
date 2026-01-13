from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.shortcuts import get_object_or_404
from .models import Product
from .serializers import ProductSerializer
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend

class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    #  ?category=Electronics&price=1000
    filterset_fields = ['category', 'stock'] 

    # search bar
    search_fields = ['name', 'description']

    #sort
    ordering_fields = ['price', 'stock', 'created_at']
    ordering = ['id']


class ApplyProductDiscountView(APIView):
    """
    REQUIREMENT #11: Sales Manager Product Discount Management
    Apply discount to products and notify users with product in wishlist
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        from django.core.mail import send_mail
        from django.conf import settings
        import threading

        product_ids = request.data.get('product_ids', [])
        discount_percentage = request.data.get('discount_percentage', 0)

        if not product_ids:
            return Response(
                {"error": "Please provide product_ids"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            discount_percentage = float(discount_percentage)
            if discount_percentage < 0 or discount_percentage > 100:
                return Response(
                    {"error": "Discount must be between 0 and 100"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid discount percentage"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Apply discount to products
        products = Product.objects.filter(id__in=product_ids)

        if not products.exists():
            return Response(
                {"error": "No products found with given IDs"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Update products
        updated_count = 0
        for product in products:
            product.discount_percentage = discount_percentage
            product.is_on_sale = discount_percentage > 0
            product.save()
            updated_count += 1

        # REQUIREMENT #11: Notify users with product in wishlist
        def send_wishlist_notifications():
            from wishlist.models import Wishlist

            print(f"[DISCOUNT] Starting wishlist notifications for {len(products)} products")

            for product in products:
                # Get all users who have this product in wishlist
                wishlist_items = Wishlist.objects.filter(product=product).select_related('user')
                print(f"[DISCOUNT] Product '{product.name}' has {wishlist_items.count()} wishlist users")

                for wishlist_item in wishlist_items:
                    user = wishlist_item.user
                    if not user.email:
                        continue

                    try:
                        original_price = float(product.price)
                        discounted_price = float(product.get_discounted_price())
                        savings = float(product.get_savings())

                        subject = f"🎉 Sale Alert: {product.name} is now {discount_percentage}% off!"

                        message = f"""
Hello {user.username},

Great news! A product in your wishlist is now on sale!

Product: {product.name}
Original Price: ${original_price:.2f}
Sale Price: ${discounted_price:.2f}
You Save: ${savings:.2f} ({discount_percentage}% OFF)

Don't miss out on this amazing deal!

Visit our store to purchase now:
http://localhost:3000/product/{product.id}

This is an automated notification. You're receiving this because "{product.name}" is in your wishlist.

Happy Shopping!
Your E-Commerce Team
                        """.strip()

                        print(f"[DISCOUNT] Sending email to {user.email} for product '{product.name}'")
                        send_mail(
                            subject=subject,
                            message=message,
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[user.email],
                            fail_silently=True,  # Don't crash if email fails
                        )
                        print(f"[DISCOUNT] ✓ Email sent to {user.email}")

                    except Exception as e:
                        print(f"[DISCOUNT] ✗ Failed to send notification to {user.email}: {str(e)}")

        # Send notifications in background thread
        notification_thread = threading.Thread(target=send_wishlist_notifications)
        notification_thread.daemon = True
        notification_thread.start()

        return Response({
            "message": f"Discount applied to {updated_count} product(s)",
            "products_updated": updated_count,
            "discount_percentage": discount_percentage,
            "wishlist_notifications": "Sending notifications to users with products in wishlist"
        }, status=status.HTTP_200_OK)


class RemoveProductDiscountView(APIView):
    """Remove discount from products"""
    permission_classes = [IsAdminUser]

    def post(self, request):
        product_ids = request.data.get('product_ids', [])

        if not product_ids:
            return Response(
                {"error": "Please provide product_ids"},
                status=status.HTTP_400_BAD_REQUEST
            )

        products = Product.objects.filter(id__in=product_ids)

        if not products.exists():
            return Response(
                {"error": "No products found with given IDs"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Remove discount
        updated_count = products.update(
            discount_percentage=0,
            is_on_sale=False
        )

        return Response({
            "message": f"Discount removed from {updated_count} product(s)",
            "products_updated": updated_count
        }, status=status.HTTP_200_OK) 