from django.db import models
from django.conf import settings
from products.models import Product

class Comment(models.Model) :
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='comments')
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    body = models.TextField() #content
    status = models.CharField(max_length=10,choices=STATUS_CHOICES, default='pending', db_index=True) #approval logic
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['product', 'status']),  # For product comments with status filter
            models.Index(fields=['status', '-created_at']),  # For pending comments moderation
        ]

    def __str__(self):
        return f"Commeny by {self.customer} on {self.product} ({self.status})"
    
class Rating(models.Model) :
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    score = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('product', 'customer')
        indexes = [
            models.Index(fields=['product']),  # For product rating queries
        ]
    
    def __str__(self):
        return f"{self.score}/5 by {self.customer} on {self.product}"

# Create your models here.
