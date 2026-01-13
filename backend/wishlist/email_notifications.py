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
            
            # Check if user has an email address
            if not user.email:
                logger.warning(f"Cannot send wishlist discount notification: User {user.id} has no email address")
                return
            
            # Check if email configuration is set up
            if not settings.EMAIL_HOST_PASSWORD:
                logger.warning(f"Email not configured (EMAIL_HOST_PASSWORD is empty). Cannot send wishlist discount notification for product {product.id}")
                return
            
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
            result = email.send(fail_silently=True)
            if result:
                logger.info(f"Wishlist discount notification sent to {user.email} for product {product.id} ({product.name})")
            else:
                logger.error(f"Wishlist discount email failed to send to {user.email} for product {product.id} ({product.name}) (send() returned False)")
            
        except Exception as e:
            logger.error(f"Failed to send wishlist discount email to {wishlist_item.user.email if wishlist_item.user.email else 'NO_EMAIL'} for product {wishlist_item.product.id}: {str(e)}")
    
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
            logger.debug(f"Price did not decrease for product {product.id} (old: {old_price}, new: {new_price}), skipping notification")
            return
        
        # Find all wishlist items for this product, filtering for users with email addresses
        wishlist_items = Wishlist.objects.filter(
            product=product,
            user__email__isnull=False
        ).exclude(
            user__email=''
        ).select_related('user', 'product')
        
        if not wishlist_items.exists():
            logger.debug(f"No wishlist items with valid email addresses found for product {product.id}")
            return
        
        logger.info(f"Found {wishlist_items.count()} wishlist item(s) for product {product.id} with valid email addresses")
        
        for item in wishlist_items:
            # Check if there's actually a discount compared to when it was added
            if item.price_when_added:
                original_price = Decimal(str(item.price_when_added))
                new_price_decimal = Decimal(str(new_price))
                
                # Only send notification if new price is lower than when added to wishlist
                if new_price_decimal < original_price:
                    logger.info(f"Sending discount notification to user {item.user.id} ({item.user.email}) for product {product.id} (price dropped from {original_price} to {new_price_decimal})")
                    send_wishlist_discount_notification(item, old_price, new_price)
                else:
                    logger.debug(f"Skipping notification for user {item.user.id}: new price {new_price_decimal} is not lower than price_when_added {original_price}")
            else:
                # If price_when_added is not set, use old_price as baseline
                if Decimal(str(new_price)) < Decimal(str(old_price)):
                    logger.info(f"Sending discount notification to user {item.user.id} ({item.user.email}) for product {product.id} (price_when_added not set, using old_price {old_price} as baseline)")
                    send_wishlist_discount_notification(item, old_price, new_price)
                else:
                    logger.debug(f"Skipping notification for user {item.user.id}: new price {new_price} is not lower than old_price {old_price}")
                    
    except Exception as e:
        logger.error(f"Error notifying wishlist users of discount for product {product.id}: {str(e)}", exc_info=True)
