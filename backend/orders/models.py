from django.db import models
from django.conf import settings
from products.models import Product
from decimal import Decimal
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
        discount_amount = (self.total_price * self.discount_percentage) / Decimal("100")
        return self.total_price - discount_amount


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