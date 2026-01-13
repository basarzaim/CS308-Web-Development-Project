#!/usr/bin/env python
"""
Script to create test users for each role:
- Product Manager
- Sales Manager
- Support Agent
- Admin (superuser)
"""

import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User

def create_test_users():
    """Create test users for each role"""

    # 1. Product Manager
    if not User.objects.filter(username='productmanager').exists():
        pm = User.objects.create_user(
            username='productmanager',
            email='pm@example.com',
            password='pm123456',
            first_name='Product',
            last_name='Manager'
        )
        # Note: Role is stored in the user profile or custom user model
        # For now, we'll just mark them as staff
        pm.is_staff = False  # Not Django admin, but has Product Manager role
        pm.save()
        print("✅ Created Product Manager user:")
        print("   Username: productmanager")
        print("   Password: pm123456")
        print("   Access: Comments, Orders, Stock")
        print()
    else:
        print("⚠️  Product Manager user already exists")
        print()

    # 2. Sales Manager
    if not User.objects.filter(username='salesmanager').exists():
        sm = User.objects.create_user(
            username='salesmanager',
            email='sm@example.com',
            password='sm123456',
            first_name='Sales',
            last_name='Manager'
        )
        sm.is_staff = False
        sm.save()
        print("✅ Created Sales Manager user:")
        print("   Username: salesmanager")
        print("   Password: sm123456")
        print("   Access: Analytics, Discounts")
        print()
    else:
        print("⚠️  Sales Manager user already exists")
        print()

    # 3. Support Agent
    if not User.objects.filter(username='supportagent').exists():
        sa = User.objects.create_user(
            username='supportagent',
            email='support@example.com',
            password='support123',
            first_name='Support',
            last_name='Agent'
        )
        sa.is_staff = False
        sa.save()
        print("✅ Created Support Agent user:")
        print("   Username: supportagent")
        print("   Password: support123")
        print("   Access: Support Chat only")
        print()
    else:
        print("⚠️  Support Agent user already exists")
        print()

    # 4. Admin (if doesn't exist)
    if not User.objects.filter(username='admin').exists():
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin',
            first_name='Admin',
            last_name='User'
        )
        print("✅ Created Admin user:")
        print("   Username: admin")
        print("   Password: admin")
        print("   Access: Full access to everything")
        print()
    else:
        print("⚠️  Admin user already exists")
        print()

    print("=" * 60)
    print("IMPORTANT: Role Assignment")
    print("=" * 60)
    print()
    print("Since roles are managed in the frontend via user.role field,")
    print("you need to assign roles through your user profile system.")
    print()
    print("If using Django User model with a 'role' field, update like:")
    print()
    print("  python manage.py shell")
    print("  >>> from django.contrib.auth.models import User")
    print("  >>> pm = User.objects.get(username='productmanager')")
    print("  >>> pm.role = 'Product Manager'")
    print("  >>> pm.save()")
    print()
    print("Or update your AuthContext to return role from API.")
    print()
    print("=" * 60)

if __name__ == '__main__':
    print()
    print("=" * 60)
    print("Creating Test Users for Role-Based Access Control")
    print("=" * 60)
    print()

    create_test_users()

    print()
    print("=" * 60)
    print("Summary of Created Users")
    print("=" * 60)
    print()
    print("Role              | Username        | Password   | Access")
    print("-" * 60)
    print("Product Manager   | productmanager  | pm123456   | Comments, Orders, Stock")
    print("Sales Manager     | salesmanager    | sm123456   | Analytics, Discounts")
    print("Support Agent     | supportagent    | support123 | Support Chat")
    print("Admin (superuser) | admin           | admin      | Full Access")
    print()
    print("✅ Setup complete! You can now test role-based access.")
    print()
