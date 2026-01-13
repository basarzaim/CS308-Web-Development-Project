#!/usr/bin/env python
"""
Quick script to create a Support Agent user
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import Customer

# Create Support Agent
username = 'supportagent'
email = 'support@example.com'
password = 'support123'

if not Customer.objects.filter(username=username).exists():
    user = Customer.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name='Support',
        last_name='Agent'
    )
    user.role = 'Support Agent'
    user.save()

    print("=" * 60)
    print("Support Agent User Created Successfully!")
    print("=" * 60)
    print(f"Username: {username}")
    print(f"Email: {email}")
    print(f"Password: {password}")
    print(f"Role: {user.role}")
    print()
    print("You can now:")
    print("1. Login at: http://localhost:3000/login")
    print("2. Access Support Chat ONLY")
    print("3. Edit role in Django admin: http://localhost:8000/admin")
    print("=" * 60)
else:
    # Update existing user to Support Agent role
    user = Customer.objects.get(username=username)
    user.role = 'Support Agent'
    user.save()

    print("=" * 60)
    print("Existing user updated to Support Agent role")
    print("=" * 60)
    print(f"Username: {username}")
    print(f"Email: {user.email}")
    print(f"Password: (unchanged)")
    print(f"Role: {user.role}")
    print("=" * 60)
