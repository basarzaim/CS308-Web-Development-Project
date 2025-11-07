from django.db import models
from django.conf import settings
from products.models import Product

class CartItem(models.Model):
    user = models.ForeignKey(                     
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart_items",
        null=True, blank=True                    
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="cart_items"
    )
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("user", "product")    # aynı üründen 2 kayıt olmasın

    def __str__(self):
        owner = self.user.email if self.user else "anonymous"
        return f"{owner}: {self.product.name} x {self.quantity}"
