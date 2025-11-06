from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

class Customer(AbstractUser):
    # username, first_name, last_name, email, password,

    # 'email unique
    email = models.EmailField(unique=True)

    taxID = models.CharField(max_length=100, blank=True, null=True)
    home_address = models.TextField(blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username'] 

    def __str__(self):
        return self.email

