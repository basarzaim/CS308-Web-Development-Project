# Verification Guide - Backend Fixes

This guide will help you verify all the changes made to fix the requirements.

## 1. Check Database Migrations

Run these commands to see all migrations were applied:

```bash
cd backend
python manage.py showmigrations
```

**Expected Output:**
- `users` app should show `0004_customer_role` as applied `[X]`
- `orders` app should show `0007_order_shipping_address_order_shipping_city_and_more` as applied `[X]`
- `products` app should show `0005_product_distributor_product_model_and_more` as applied `[X]`

---

## 2. Verify Role System in Django Shell

```bash
cd backend
python manage.py shell
```

Then run:

```python
from users.models import Customer

# Check role field exists
customer = Customer.objects.first()
print(f"Customer has role: {hasattr(customer, 'role')}")
print(f"Customer role: {customer.role}")
print(f"Available roles: {Customer.ROLE_CHOICES}")

# Test creating a Product Manager
pm = Customer.objects.create_user(
    email='productmanager@test.com',
    username='pm_test',
    password='testpass123',
    role='Product Manager'
)
print(f"Created Product Manager: {pm.role}")

# Test creating a Sales Manager
sm = Customer.objects.create_user(
    email='salesmanager@test.com',
    username='sm_test',
    password='testpass123',
    role='Sales Manager'
)
print(f"Created Sales Manager: {sm.role}")
```

**Expected Output:**
- Customer has role: True
- Available roles: [('Customer', 'Customer'), ('Product Manager', 'Product Manager'), ('Sales Manager', 'Sales Manager')]
- Created users with correct roles

---

## 3. Verify Order Shipping Fields in Django Shell

```python
from orders.models import Order

# Check shipping fields exist
order = Order.objects.first()
if order:
    print(f"Has shipping_name: {hasattr(order, 'shipping_name')}")
    print(f"Has shipping_address: {hasattr(order, 'shipping_address')}")
    print(f"Has shipping_city: {hasattr(order, 'shipping_city')}")
    print(f"Has shipping_phone: {hasattr(order, 'shipping_phone')}")
else:
    print("No orders yet - create one via checkout to test")
```

**Expected Output:**
- All shipping fields should be True

---

## 4. Verify Product Fields in Django Shell

```python
from products.models import Product

# Check new product fields
product = Product.objects.first()
print(f"Has model: {hasattr(product, 'model')}")
print(f"Has serial_number: {hasattr(product, 'serial_number')}")
print(f"Has distributor: {hasattr(product, 'distributor')}")

# Test creating a product with all fields
new_product = Product.objects.create(
    name='Test Laptop',
    price=999.99,
    stock=10,
    warranty=24,
    category='laptops',
    model='XPS-15-2024',
    serial_number='SN123456789',
    distributor='Dell Corporation'
)
print(f"Created product: {new_product.name}")
print(f"  Model: {new_product.model}")
print(f"  Serial: {new_product.serial_number}")
print(f"  Distributor: {new_product.distributor}")
```

**Expected Output:**
- All fields should be True
- Product created successfully with all new fields

---

## 5. Test via API Endpoints

### 5.1 Start the Backend Server

```bash
cd backend
python manage.py runserver
```

### 5.2 Test User Registration with Role

**Endpoint:** POST http://localhost:8000/api/products/auth/register/

**Request Body:**
```json
{
  "email": "test@example.com",
  "username": "testuser",
  "password": "password123",
  "first_name": "Test",
  "last_name": "User",
  "role": "Product Manager"
}
```

**Expected Response:**
```json
{
  "id": 1,
  "email": "test@example.com",
  "username": "testuser",
  "first_name": "Test",
  "last_name": "User",
  "role": "Product Manager"
}
```

### 5.3 Test User Profile (Get Role)

**Endpoint:** GET http://localhost:8000/api/users/profile/

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Expected Response:**
```json
{
  "id": 1,
  "email": "test@example.com",
  "username": "testuser",
  "first_name": "Test",
  "last_name": "User",
  "role": "Product Manager"
}
```

### 5.4 Test Product List (New Fields)

**Endpoint:** GET http://localhost:8000/api/products/

**Expected Response:**
```json
{
  "results": [
    {
      "id": 1,
      "name": "Product Name",
      "price": "999.99",
      "stock": 10,
      "warranty": 24,
      "description": "...",
      "rating": null,
      "image": "...",
      "category": "laptops",
      "model": "XPS-15-2024",
      "serial_number": "SN123456789",
      "distributor": "Dell Corporation"
    }
  ]
}
```

### 5.5 Test Checkout with Shipping Info

**Endpoint:** POST http://localhost:8000/api/orders/checkout/

**Request Body:**
```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 999.99
    }
  ],
  "shipping": {
    "full_name": "John Doe",
    "address": "123 Main Street",
    "city": "New York",
    "phone": "555-1234"
  },
  "customer": {},
  "payment": {},
  "totals": {}
}
```

**Expected Response:**
```json
{
  "id": 1,
  "user": null,
  "total_price": "1999.98",
  "discount_percentage": "0.00",
  "discounted_total_price": "1999.98",
  "status": "processing",
  "shipping_name": "John Doe",
  "shipping_address": "123 Main Street",
  "shipping_city": "New York",
  "shipping_phone": "555-1234",
  "created_at": "2025-12-12T...",
  "updated_at": "2025-12-12T...",
  "delivered_at": null,
  "items": [...]
}
```

### 5.6 Test Sales Manager Discount

First, create a Sales Manager user, then:

**Endpoint:** POST http://localhost:8000/api/orders/{order_id}/apply-discount/

**Headers:**
```
Authorization: Bearer <sales_manager_token>
```

**Request Body:**
```json
{
  "discount_percentage": 15
}
```

**Expected Response:**
```json
{
  "id": 1,
  "discount_percentage": "15.00",
  "discounted_total_price": "1699.98",
  ...
}
```

**Test with Regular Customer:**
Should get 403 Forbidden: "Only Sales Manager can apply discount."

---

## 6. Check Modified Files

You can review all modified files:

```bash
git status
git diff
```

**Modified Files:**
1. `backend/users/models.py` - Added role field
2. `backend/users/serializers.py` - Added role to serializers
3. `backend/orders/models.py` - Added shipping fields
4. `backend/orders/serializers.py` - Added shipping to serializer
5. `backend/orders/views.py` - Extract and save shipping data
6. `backend/products/models.py` - Added model, serial_number, distributor
7. `backend/products/serializers.py` - Added new fields to serializer

**New Migration Files:**
1. `backend/users/migrations/0004_customer_role.py`
2. `backend/orders/migrations/0007_order_shipping_address_order_shipping_city_and_more.py`
3. `backend/products/migrations/0005_product_distributor_product_model_and_more.py`

---

## 7. Quick Test Script

Save this as `test_fixes.py` in the backend folder:

```python
from django.core.management import setup_environ
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import Customer
from orders.models import Order
from products.models import Product

print("=" * 50)
print("TESTING ALL FIXES")
print("=" * 50)

# Test 1: Role System
print("\n1. ROLE SYSTEM")
print(f"   Role choices: {Customer.ROLE_CHOICES}")
customer = Customer.objects.first()
if customer:
    print(f"   Customer role field exists: {hasattr(customer, 'role')}")
    print(f"   Customer role: {customer.role}")

# Test 2: Order Shipping
print("\n2. ORDER SHIPPING FIELDS")
order = Order.objects.first()
if order:
    print(f"   shipping_name: {hasattr(order, 'shipping_name')}")
    print(f"   shipping_address: {hasattr(order, 'shipping_address')}")
    print(f"   shipping_city: {hasattr(order, 'shipping_city')}")
    print(f"   shipping_phone: {hasattr(order, 'shipping_phone')}")

# Test 3: Product Fields
print("\n3. PRODUCT FIELDS")
product = Product.objects.first()
if product:
    print(f"   model: {hasattr(product, 'model')}")
    print(f"   serial_number: {hasattr(product, 'serial_number')}")
    print(f"   distributor: {hasattr(product, 'distributor')}")

print("\n" + "=" * 50)
print("ALL TESTS COMPLETED")
print("=" * 50)
```

Run it:
```bash
cd backend
python manage.py shell < test_fixes.py
```

---

## Summary

All 3 major fixes are complete:

✅ **Role System** - Customer model now has role field (Customer, Product Manager, Sales Manager)
✅ **Order Shipping** - Order model now saves shipping_name, shipping_address, shipping_city, shipping_phone
✅ **Product Fields** - Product model now has model, serial_number, distributor fields

All requirements (1-9) are now **fully implemented**!
