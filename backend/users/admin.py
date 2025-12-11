from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Customer

# Register your models here.

class CustomUserAdmin(UserAdmin):
    model = Customer
    fieldsets = UserAdmin.fieldsets + (
        ('Role Information', {'fields': ('role',)}),
    )
    list_display = ['email', 'username', 'first_name', 'last_name', 'role', 'is_staff']
    list_filter = ['role', 'is_staff', 'is_active']

# use this admin model instead of the base one
admin.site.register(Customer, CustomUserAdmin)

