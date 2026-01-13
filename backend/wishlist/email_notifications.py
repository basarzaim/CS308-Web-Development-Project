"""
Email notifications for wishlist discounts
"""
import logging
import threading
from django.core.mail import EmailMessage
from django.conf import settings
from decimal import Decimal

logger = logging.getLogger(__name__)


def send_wishlist_discount_notification(wishlist_item, old_price, new_price):
    """
    Send email notification to user when a product in their wishlist is discounted.
    
    Args:
        wishlist_item: Wishlist instance
        old_price: Previous price (Decimal)
        new_price: New discounted price (Decimal)
    """
    def send_email_async():
        try:
            user = wishlist_item.user
            product = wishlist_item.product
            
            # Calculate discount percentage
            if wishlist_item.price_when_added:
                original_price = Decimal(str(wishlist_item.price_when_added))
            else:
                original_price = Decimal(str(old_price))
            
            discount_amount = original_price - Decimal(str(new_price))
            discount_percentage = (discount_amount / original_price * 100).quantize(Decimal('0.01'))
            
            # Prepare email subject
            subject = f"🎉 Price Drop Alert: {product.name} is Now on Sale!"
            
            # Prepare email body
            product_url = f"{settings.FRONTEND_URL or 'http://localhost:5173'}/products/{product.id}"
            
            message = f"""
Hello {user.first_name or user.username},

Great news! An item in your wishlist is now on sale!

Product: {product.name}
Original Price: ${float(original_price):.2f}
New Price: ${float(new_price):.2f}
Discount: ${float(discount_amount):.2f} ({float(discount_percentage):.1f}% OFF)

Don't miss out on this great deal! Click the link below to view the product:

{product_url}

You can also view all your wishlist items at:
{settings.FRONTEND_URL or 'http://localhost:5173'}/wishlist

Happy Shopping!

Best regards,
CS308 E-Commerce Team

---
This is an automated email. Please do not reply to this message.
If you have any questions, contact us at support@cs308ecommerce.com
            """
            
            # Create email
            reply_to = getattr(settings, 'EMAIL_REPLY_TO', None)
            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email],
                reply_to=[reply_to] if reply_to else None,
            )
            
            # Send email
            email.send(fail_silently=True)
            logger.info(f"Wishlist discount notification sent to {user.email} for product {product.id} ({product.name})")
            
        except Exception as e:
            logger.error(f"Failed to send wishlist discount email to {wishlist_item.user.email} for product {wishlist_item.product.id}: {str(e)}")
    
    # Send email in background thread so it doesn't block the response
    email_thread = threading.Thread(target=send_email_async)
    email_thread.daemon = True
    email_thread.start()


def notify_wishlist_users_of_discount(product, old_price, new_price):
    """
    Notify all users who have this product in their wishlist about the discount.
    
    Args:
        product: Product instance
        old_price: Previous price (Decimal)
        new_price: New discounted price (Decimal)
    """
    try:
        from .models import Wishlist
        
        # Only send notifications if price actually decreased
        if Decimal(str(new_price)) >= Decimal(str(old_price)):
            return
        
        # Find all wishlist items for this product
        wishlist_items = Wishlist.objects.filter(product=product).select_related('user', 'product')
        
        for item in wishlist_items:
            # Check if there's actually a discount compared to when it was added
            if item.price_when_added:
                original_price = Decimal(str(item.price_when_added))
                new_price_decimal = Decimal(str(new_price))
                
                # Only send notification if new price is lower than when added to wishlist
                if new_price_decimal < original_price:
                    send_wishlist_discount_notification(item, old_price, new_price)
            else:
                # If price_when_added is not set, use old_price as baseline
                if Decimal(str(new_price)) < Decimal(str(old_price)):
                    send_wishlist_discount_notification(item, old_price, new_price)
                    
    except Exception as e:
        logger.error(f"Error notifying wishlist users of discount for product {product.id}: {str(e)}")
