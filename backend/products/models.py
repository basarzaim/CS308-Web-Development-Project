from django.db import models


class Category(models.Model):
    """Dynamic category model for products."""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    warranty = models.IntegerField(default=0, help_text="Guarentee time (month)")
    image = models.ImageField(upload_to='products/', blank=True, null=True)

    description = models.TextField(blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, default='')
    serial_number = models.CharField(max_length=100, blank=True, null=True, unique=True)
    distributor = models.CharField(max_length=255, blank=True, default='')

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Main category of the product",
        db_index=True,
    )

    # Discount fields
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Discount percentage (0-100)"
    )
    is_on_sale = models.BooleanField(
        default=False,
        help_text="Is product currently on sale"
    )

    class Meta:
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['price']),
            models.Index(fields=['stock']),
            models.Index(fields=['name']),  # For search
        ]

    def __str__(self):
        return self.name

    def get_discounted_price(self):
        """Calculate price after discount"""
        if self.is_on_sale and self.discount_percentage > 0:
            discount_amount = (self.price * self.discount_percentage) / 100
            return self.price - discount_amount
        return self.price

    def get_savings(self):
        """Calculate amount saved with discount"""
        if self.is_on_sale and self.discount_percentage > 0:
            return (self.price * self.discount_percentage) / 100
        return 0