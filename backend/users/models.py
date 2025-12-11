from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

class Customer(AbstractUser):
    # username, first_name, last_name, email, password,

    ROLE_CHOICES = [
        ('Customer', 'Customer'),
        ('Product Manager', 'Product Manager'),
        ('Sales Manager', 'Sales Manager'),
    ]

    # 'email unique
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Customer')


    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

