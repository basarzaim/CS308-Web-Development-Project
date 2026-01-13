from django.db import models
from users.models import Customer
from products.models import Product


class Wishlist(models.Model):
    user = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="wishlist_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    price_when_added = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Price of the product when it was added to wishlist (for discount detection)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "product")

    def __str__(self):
        return f"{self.user.email} - {self.product.name}"
    
    def save(self, *args, **kwargs):
        # Auto-set price_when_added if not set and product exists
        if self.price_when_added is None and self.product_id:
            self.price_when_added = self.product.price
        super().save(*args, **kwargs)