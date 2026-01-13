from django.db import models
from django.conf import settings
from products.models import Product
from decimal import Decimal
from django.utils import timezone
from .encryption import encrypt_data, decrypt_data, get_last_four_digits, mask_credit_card


class Order(models.Model):
    STATUS_CHOICES = (
        ('processing', 'Processing'),
        ('in-transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('return_requested', 'Return Requested'),
        ('returned', 'Returned'),
    )

    PAYMENT_METHOD_CHOICES = (
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('pending', 'Pending'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='processing'
    )

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    shipping_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Shipping fee for this order"
    )

    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0
    )

    # Payment information
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='pending'
    )
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # Encrypted credit card information (only for credit/debit card payments)
    # Full card number is encrypted, only last 4 digits stored in plain text for display
    card_number_encrypted = models.TextField(blank=True, null=True, help_text="Encrypted credit card number")
    card_last_four = models.CharField(max_length=4, blank=True, null=True, help_text="Last 4 digits for display")
    card_expiry_month = models.CharField(max_length=2, blank=True, null=True, help_text="Expiry month (MM)")
    card_expiry_year = models.CharField(max_length=4, blank=True, null=True, help_text="Expiry year (YYYY)")
    card_holder_name = models.CharField(max_length=255, blank=True, null=True, help_text="Cardholder name")
    # CVV is NOT stored (PCI DSS compliance - never store CVV)

    # Shipping information
    shipping_name = models.CharField(max_length=255, blank=True, default='')
    shipping_address = models.TextField(blank=True, default='')
    shipping_city = models.CharField(max_length=100, blank=True, default='')
    shipping_phone = models.CharField(max_length=20, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    delivered_at = models.DateTimeField(null=True, blank=True)  # 30-day return policy

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),  # For user order lists
            models.Index(fields=['status']),  # For filtering by status
            models.Index(fields=['-created_at']),  # For ordering
        ]

    def __str__(self):
        return f"Order #{self.id} - {self.user} ({self.status})"

    
    def discounted_total_price(self):
        """
        Calculate total price after discount.
        Note: Discount applies only to product subtotal, not shipping fee.
        """
        # Subtotal is total_price - shipping_fee (products only)
        subtotal = self.total_price - self.shipping_fee
        discount_amount = (subtotal * self.discount_percentage) / Decimal("100")
        # Final total = discounted subtotal + shipping fee
        return subtotal - discount_amount + self.shipping_fee
    
    def set_card_number(self, card_number):
        """
        Securely store credit card number (encrypted) and last 4 digits (plain text).
        This method should be called when creating an order with credit card payment.
        """
        if not card_number:
            self.card_number_encrypted = None
            self.card_last_four = None
            return
        
        # Remove spaces and dashes
        card_number = str(card_number).replace(' ', '').replace('-', '')
        
        # Encrypt and store full card number
        self.card_number_encrypted = encrypt_data(card_number)
        
        # Store last 4 digits in plain text for display purposes only
        self.card_last_four = get_last_four_digits(card_number)
    
    def get_masked_card_number(self):
        """Get masked credit card number for display (e.g., **** **** **** 1234)"""
        if self.card_last_four:
            return mask_credit_card(f"0000{self.card_last_four}")
        return None
    
    def get_card_number(self):
        """
        Decrypt and return full card number.
        WARNING: Only use this when absolutely necessary (e.g., for processing refunds).
        Never log or expose this value.
        """
        if not self.card_number_encrypted:
            return None
        
        try:
            return decrypt_data(self.card_number_encrypted)
        except Exception:
            # If decryption fails, return None (don't expose error details)
            return None
    
    def save(self, *args, **kwargs):
        """
        Override save to automatically set delivered_at when status changes to 'delivered'.
        """
        # Check if status is being changed to 'delivered' and delivered_at is not set
        if self.status == 'delivered' and not self.delivered_at:
            # Only set if this is an existing order (has pk) or if we're explicitly setting it
            if self.pk:
                # Check the old status from database
                try:
                    old_order = type(self).objects.get(pk=self.pk)
                    if old_order.status != 'delivered':
                        # Status is changing to 'delivered', set delivered_at
                        self.delivered_at = timezone.now()
                except type(self).DoesNotExist:
                    # New order being created with 'delivered' status (unusual but handle it)
                    self.delivered_at = timezone.now()
            else:
                # New order with 'delivered' status (unusual but handle it)
                self.delivered_at = timezone.now()
        
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    # Purchase-time price after discount (for refund calculation)
    purchase_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Actual price paid per unit (after discount) at purchase time"
    )

    def __str__(self):
        return f"{self.order.id} - {self.product.name} x {self.quantity}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate purchase_price if not set and order has discount
        if self.purchase_price is None and self.order.discount_percentage > 0:
            discount_factor = Decimal("1") - (self.order.discount_percentage / Decimal("100"))
            self.purchase_price = self.unit_price * discount_factor
        elif self.purchase_price is None:
            self.purchase_price = self.unit_price
        super().save(*args, **kwargs)