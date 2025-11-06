from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Customer

# Register your models here.

class CustomUserAdmin(UserAdmin):
    model = Customer
    fieldsets = UserAdmin.fieldsets + (
        ('Ekstra Alanlar', {'fields': ('taxID', 'home_address')}),
    )

# use this admin model instead of the base one
admin.site.register(Customer, CustomUserAdmin)

