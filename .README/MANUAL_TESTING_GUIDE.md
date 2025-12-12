# Manual Testing Guide - Step by Step

This guide shows you exactly how to manually test all the new features.

---

## **METHOD 1: Using Django Shell (Recommended)**

### Step 1: Open Django Shell

```bash
cd backend
python manage.py shell
```

---

### Test 1: Add Role to a User

```python
from users.models import Customer

# Get an existing user
user = Customer.objects.first()
print(f"Current user: {user.email}")
print(f"Current role: {user.role}")

# Change the role to Product Manager
user.role = 'Product Manager'
user.save()
print(f"New role: {user.role}")

# Verify it saved
user.refresh_from_db()
print(f"Verified role: {user.role}")
```

**Expected Output:**
```
Current user: someone@example.com
Current role: Customer
New role: Product Manager
Verified role: Product Manager
```

---

### Test 2: Create a New User with a Role

```python
from users.models import Customer

# Create a Sales Manager
sales_manager = Customer.objects.create_user(
    email='salesmanager@test.com',
    username='sales_manager',
    password='testpass123',
    first_name='Sales',
    last_name='Manager',
    role='Sales Manager'
)

print(f"Created: {sales_manager.email}")
print(f"Role: {sales_manager.role}")
print(f"Can login: Yes (password is 'testpass123')")

# Create a Product Manager
product_manager = Customer.objects.create_user(
    email='productmanager@test.com',
    username='product_manager',
    password='testpass123',
    first_name='Product',
    last_name='Manager',
    role='Product Manager'
)

print(f"\nCreated: {product_manager.email}")
print(f"Role: {product_manager.role}")
```

---

### Test 3: View All Users and Their Roles

```python
from users.models import Customer

# List all users with their roles
print("All Users and Roles:")
print("-" * 50)
for user in Customer.objects.all():
    print(f"{user.email:30} | Role: {user.role}")
```

**Expected Output:**
```
All Users and Roles:
--------------------------------------------------
user1@example.com              | Role: Customer
salesmanager@test.com          | Role: Sales Manager
productmanager@test.com        | Role: Product Manager
```

---

### Test 4: Check Product Fields

```python
from products.models import Product

# Get existing product
product = Product.objects.first()

# Check new fields exist
print(f"Product: {product.name}")
print(f"Has model field: {hasattr(product, 'model')}")
print(f"Has serial_number field: {hasattr(product, 'serial_number')}")
print(f"Has distributor field: {hasattr(product, 'distributor')}")

# Update a product with new fields
product.model = 'XPS-15-2024'
product.serial_number = 'SN123456789'
product.distributor = 'Dell Corporation'
product.save()

print(f"\nUpdated product:")
print(f"Model: {product.model}")
print(f"Serial: {product.serial_number}")
print(f"Distributor: {product.distributor}")
```

---

### Test 5: Create Product with All Fields

```python
from products.models import Product

# Create a new product with all fields
laptop = Product.objects.create(
    name='Dell XPS 15 2024',
    price=1499.99,
    stock=25,
    warranty=24,
    category='laptops',
    description='High-performance laptop for professionals',
    model='XPS-15-9530',
    serial_number='DELLXPS2024001',
    distributor='Dell Inc.'
)

print(f"Created: {laptop.name}")
print(f"Model: {laptop.model}")
print(f"Serial: {laptop.serial_number}")
print(f"Distributor: {laptop.distributor}")
print(f"Price: ${laptop.price}")
print(f"Stock: {laptop.stock}")
```

---

### Test 6: Check Order Shipping Fields

```python
from orders.models import Order

# Get an existing order
order = Order.objects.first()

if order:
    print(f"Order #{order.id}")
    print(f"Has shipping_name: {hasattr(order, 'shipping_name')}")
    print(f"Has shipping_address: {hasattr(order, 'shipping_address')}")
    print(f"Has shipping_city: {hasattr(order, 'shipping_city')}")
    print(f"Has shipping_phone: {hasattr(order, 'shipping_phone')}")

    print(f"\nShipping Info:")
    print(f"Name: {order.shipping_name}")
    print(f"Address: {order.shipping_address}")
    print(f"City: {order.shipping_city}")
    print(f"Phone: {order.shipping_phone}")
else:
    print("No orders exist yet. Create one via checkout to test.")
```

---

### Test 7: Create Order with Shipping Info

```python
from orders.models import Order, OrderItem
from products.models import Product
from users.models import Customer

# Get a user and product
user = Customer.objects.first()
product = Product.objects.first()

# Create an order with shipping information
order = Order.objects.create(
    user=user,
    total_price=999.99,
    shipping_name='John Doe',
    shipping_address='123 Main Street, Apt 4B',
    shipping_city='New York',
    shipping_phone='555-1234'
)

# Add an item to the order
OrderItem.objects.create(
    order=order,
    product=product,
    quantity=1,
    unit_price=product.price
)

print(f"Created Order #{order.id}")
print(f"Shipping to: {order.shipping_name}")
print(f"Address: {order.shipping_address}")
print(f"City: {order.shipping_city}")
print(f"Phone: {order.shipping_phone}")
print(f"Total: ${order.total_price}")
```

---

### Test 8: Test Sales Manager Discount

```python
from orders.models import Order
from users.models import Customer

# Get or create a sales manager
sales_manager, created = Customer.objects.get_or_create(
    email='salesmanager@test.com',
    defaults={
        'username': 'sales_manager',
        'first_name': 'Sales',
        'last_name': 'Manager',
        'role': 'Sales Manager'
    }
)
if created:
    sales_manager.set_password('testpass123')
    sales_manager.save()

print(f"Sales Manager: {sales_manager.email}")
print(f"Role: {sales_manager.role}")

# Get an order
order = Order.objects.first()

if order:
    print(f"\nOrder #{order.id}")
    print(f"Original total: ${order.total_price}")

    # Apply discount
    order.discount_percentage = 15
    order.save()

    print(f"Discount: {order.discount_percentage}%")
    print(f"Discounted total: ${order.discounted_total_price()}")
else:
    print("No orders exist to apply discount")
```

---

## **METHOD 2: Using Django Admin Panel**

### Step 1: Create Superuser

In your terminal:
```bash
cd backend
python manage.py createsuperuser
```

Enter:
- **Email**: admin@example.com
- **Username**: admin
- **Password**: admin123 (or your choice)

### Step 2: Start Server

```bash
python manage.py runserver
```

### Step 3: Login to Admin

1. Open browser: http://localhost:8000/admin/
2. Login with your superuser credentials
3. You should see:
   - **Users (Customers)**
   - **Products**
   - **Orders**

### Step 4: Test User Roles

1. Click on **"Customers"**
2. Click on any user
3. Scroll down to find **"Role"** dropdown
4. You should see 3 choices:
   - Customer
   - Product Manager
   - Sales Manager
5. Change the role and click **"Save"**

### Step 5: Test Product Fields

1. Click on **"Products"**
2. Click on any product (or "Add Product")
3. You should see these NEW fields:
   - **Model** (text input)
   - **Serial number** (text input)
   - **Distributor** (text input)
4. Fill them in and save

### Step 6: Test Order Shipping

1. Click on **"Orders"**
2. Click on any order
3. You should see these NEW fields:
   - **Shipping name**
   - **Shipping address**
   - **Shipping city**
   - **Shipping phone**

---

## **METHOD 3: Using API Endpoints (with Postman/curl)**

### Test 1: Register User with Role

**POST** http://localhost:8000/api/products/auth/register/

**Body (JSON):**
```json
{
  "email": "newmanager@test.com",
  "username": "new_manager",
  "password": "password123",
  "first_name": "New",
  "last_name": "Manager",
  "role": "Product Manager"
}
```

**Using curl:**
```bash
curl -X POST http://localhost:8000/api/products/auth/register/ \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"newmanager@test.com\",\"username\":\"new_manager\",\"password\":\"password123\",\"first_name\":\"New\",\"last_name\":\"Manager\",\"role\":\"Product Manager\"}"
```

### Test 2: Login and Get Profile

**POST** http://localhost:8000/api/products/auth/login/

**Body:**
```json
{
  "email": "newmanager@test.com",
  "password": "password123"
}
```

Copy the `access` token from response, then:

**GET** http://localhost:8000/api/users/profile/

**Headers:**
```
Authorization: Bearer <paste_access_token_here>
```

You should see the role in the response!

### Test 3: View Product with New Fields

**GET** http://localhost:8000/api/products/

Response should include:
```json
{
  "results": [
    {
      "id": 1,
      "name": "Product Name",
      "model": "XPS-15-2024",
      "serial_number": "SN123456",
      "distributor": "Dell Inc.",
      ...
    }
  ]
}
```

### Test 4: Checkout with Shipping Info

**POST** http://localhost:8000/api/orders/checkout/

**Body:**
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
  }
}
```

Response should include shipping fields!

---

## **Quick Verification Commands**

Run these in Django shell to verify everything:

```python
# One-line checks
from users.models import Customer
from orders.models import Order
from products.models import Product

print("Role choices:", Customer.ROLE_CHOICES)
print("User has role:", hasattr(Customer.objects.first(), 'role'))
print("Order has shipping:", hasattr(Order.objects.first(), 'shipping_name'))
print("Product has model:", hasattr(Product.objects.first(), 'model'))
```

---

## Summary

You now have 3 ways to test:

1. **Django Shell** - Most powerful, direct database access
2. **Django Admin** - Visual interface, easy to use
3. **API Endpoints** - Test how frontend will interact

Choose whichever method you're most comfortable with!
