from django.db import models

class Product(models.Model):

    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    warranty = models.IntegerField(default=0, help_text="Guarentee time (month)")
    image = models.ImageField(upload_to='products/', blank=True, null=True)

    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name