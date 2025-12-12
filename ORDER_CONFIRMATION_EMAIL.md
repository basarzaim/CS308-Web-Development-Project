# Order Confirmation Email - Automatic Email on Order Creation

## Overview

When a customer places an order, they now automatically receive an order confirmation email with complete order details, shipping information, and pricing breakdown.

---

## Problem You Had

**Issue:** Mailtrap was configured in settings.py, but emails weren't being sent when orders were created.

**Root Cause:** There was **no code** to actually send emails in the CheckoutView. The email configuration was correct, but the send_mail() function was never called.

---

## Solution

Added automatic email sending when orders are created:
1. Created `send_order_confirmation_email()` function
2. Called it after order creation in both checkout paths
3. Emails are sent to Mailtrap for testing

---

## Changes Made

### 1. Email Configuration (backend/config/settings.py)

**Your existing configuration (already correct):**
```python
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "sandbox.smtp.mailtrap.io"
EMAIL_PORT = 2525
EMAIL_USE_TLS = True

EMAIL_HOST_USER = "6d7963a617fa45"
EMAIL_HOST_PASSWORD = "64b0979d77b310"
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
```

✅ This was already set up correctly - no changes needed

---

### 2. Added Email Function (backend/orders/views.py)

**New Function:**
```python
def send_order_confirmation_email(order):
    """
    Send order confirmation email to customer with order details.
    """
    subject = f"Order Confirmation - Order #{order.id}"

    # Build itemized list
    items_text = "\n".join([
        f"  - {item.product.name} x {item.quantity} = ${float(item.unit_price * item.quantity):.2f}"
        for item in order.items.all()
    ])

    # Include discount if applied
    discount_text = ""
    if order.discount_percentage and order.discount_percentage > 0:
        discount_amount = (order.total_price * order.discount_percentage) / 100
        discount_text = f"\nDiscount ({order.discount_percentage}%): -${float(discount_amount):.2f}"

    final_total = order.discounted_total_price()

    # Email body
    message = f"""
Hello {order.shipping_name or order.user.username},

Thank you for your order! Your order has been received and is being processed.

Order Details:
--------------
Order Number: #{order.id}
Order Date: {order.created_at.strftime('%B %d, %Y at %I:%M %p')}
Status: {order.get_status_display()}

Items Ordered:
{items_text}

Order Summary:
--------------
Subtotal: ${float(order.total_price):.2f}{discount_text}
Total: ${float(final_total):.2f}

Shipping Address:
-----------------
{order.shipping_name or 'N/A'}
{order.shipping_address or 'N/A'}
{order.shipping_city or 'N/A'}
Phone: {order.shipping_phone or 'N/A'}

You can track your order status by logging into your account at our website.

Thank you for shopping with us!

Best regards,
CS308 E-Commerce Team

---
This is an automated email. Please do not reply to this message.
If you have any questions, contact us at support@cs308ecommerce.com
    """

    # Send email
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[order.user.email],
        fail_silently=False,
    )
```

---

### 3. Updated CheckoutView (backend/orders/views.py)

**Added email sending after order creation:**

**Path 1: Cart-based Checkout**
```python
order.total_price = total
order.save()

# clear cart
cart_items.delete()

# ✅ Send order confirmation email
try:
    send_order_confirmation_email(order)
except Exception as e:
    # Log error but don't fail the order creation
    print(f"Failed to send order confirmation email: {e}")

serializer = OrderSerializer(order)
return Response(serializer.data, status=status.HTTP_201_CREATED)
```

**Path 2: Items-based Checkout**
```python
order.total_price = total
order.save()

# ✅ Send order confirmation email
try:
    send_order_confirmation_email(order)
except Exception as e:
    # Log error but don't fail the order creation
    print(f"Failed to send order confirmation email: {e}")

serializer = OrderSerializer(order)
return Response(serializer.data, status=status.HTTP_201_CREATED)
```

**Important:** Email is wrapped in try/except so if email fails, the order is still created successfully.

---

## Email Content

### Subject Line:
```
Order Confirmation - Order #42
```

### Email Body Example:

```
Hello John Doe,

Thank you for your order! Your order has been received and is being processed.

Order Details:
--------------
Order Number: #42
Order Date: December 12, 2025 at 02:30 PM
Status: Processing

Items Ordered:
  - MacBook Pro 2024 x 2 = $2998.00
  - iPhone 15 Pro x 1 = $999.00

Order Summary:
--------------
Subtotal: $3997.00
Discount (10%): -$399.70
Total: $3597.30

Shipping Address:
-----------------
John Doe
123 Main Street, Apartment 5
Istanbul
Phone: +90 555 123 4567

You can track your order status by logging into your account at our website.

Thank you for shopping with us!

Best regards,
CS308 E-Commerce Team

---
This is an automated email. Please do not reply to this message.
If you have any questions, contact us at support@cs308ecommerce.com
```

---

## How to Test with Mailtrap

### 1. Create an Order

**Via Frontend:**
1. Add products to cart
2. Go to checkout
3. Fill in shipping information
4. Click "Place Order"

**Via API:**
```bash
curl -X POST http://localhost:8000/api/orders/checkout/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "shipping": {
      "full_name": "John Doe",
      "address": "123 Main St",
      "city": "Istanbul",
      "phone": "+90 555 123 4567"
    }
  }'
```

---

### 2. Check Mailtrap Inbox

1. Go to https://mailtrap.io/
2. Log in to your account
3. Navigate to your inbox
4. You should see the order confirmation email!

**Expected in Mailtrap:**
- **From:** 6d7963a617fa45@sandbox.smtp.mailtrap.io
- **To:** customer@example.com (user's email)
- **Subject:** Order Confirmation - Order #42
- **Body:** Full order details

---

### 3. Verify Email Content

Check that the email includes:
- ✅ Customer name
- ✅ Order number
- ✅ Order date and time
- ✅ Order status
- ✅ Itemized product list with quantities and prices
- ✅ Subtotal
- ✅ Discount (if applied)
- ✅ Final total
- ✅ Complete shipping address
- ✅ Phone number

---

## Email Sending Flow

```
1. Customer places order
   ↓
2. CheckoutView creates Order in database
   ↓
3. Order saved successfully
   ↓
4. send_order_confirmation_email(order) called
   ↓
5. Function builds email content
   ↓
6. send_mail() sends to Mailtrap SMTP
   ↓
7. Mailtrap receives email
   ↓
8. Email appears in Mailtrap inbox
```

---

## Error Handling

### Email Fails but Order Succeeds:

```python
try:
    send_order_confirmation_email(order)
except Exception as e:
    print(f"Failed to send order confirmation email: {e}")
```

**What Happens:**
- ✅ Order is created and saved
- ✅ Customer can see order in "My Orders"
- ❌ Email is not sent
- 📝 Error is logged to console

**Why This is Good:**
- Order creation is more important than email
- Customer doesn't lose their order if email fails
- Admin can see the error and investigate

---

## Common Issues & Solutions

### Issue 1: Email Not Appearing in Mailtrap

**Check:**
1. Mailtrap credentials are correct in settings.py
2. No firewall blocking port 2525
3. Django server console for errors

**Debug:**
```bash
# Run Django server and watch console
python manage.py runserver

# Create an order and watch for:
# - Success: No error messages
# - Failure: "Failed to send order confirmation email: ..."
```

---

### Issue 2: Wrong Email Address

**Check Order User Email:**
```python
# Django shell
from orders.models import Order

order = Order.objects.get(id=42)
print(order.user.email)  # Should be a valid email
```

**Fix:**
1. Go to Django admin
2. Edit user
3. Set correct email address

---

### Issue 3: Email Formatting Issues

**Check in Mailtrap:**
- If items not showing: order.items.all() might be empty
- If discount not showing: discount_percentage is 0
- If shipping missing: shipping fields are empty

**Debug:**
```python
# Django shell
from orders.models import Order

order = Order.objects.get(id=42)
print(f"Items: {order.items.count()}")
print(f"Discount: {order.discount_percentage}")
print(f"Shipping: {order.shipping_name}")
```

---

### Issue 4: "Connection Refused" Error

**Error:**
```
ConnectionRefusedError: [Errno 111] Connection refused
```

**Fix:**
Check Mailtrap SMTP settings:
```python
# In settings.py, verify:
EMAIL_HOST = "sandbox.smtp.mailtrap.io"  # NOT "smtp.mailtrap.io"
EMAIL_PORT = 2525  # NOT 587
EMAIL_USE_TLS = True  # Must be True
```

---

## Testing in Django Shell

### Send Test Email:

```python
from django.core.mail import send_mail
from django.conf import settings

send_mail(
    subject='Test Email',
    message='This is a test email from Django.',
    from_email=settings.DEFAULT_FROM_EMAIL,
    recipient_list=['test@example.com'],
    fail_silently=False,
)
```

**Expected:** Email appears in Mailtrap inbox

---

### Send Order Confirmation for Existing Order:

```python
from orders.models import Order
from orders.views import send_order_confirmation_email

# Get an order
order = Order.objects.get(id=42)

# Send email
send_order_confirmation_email(order)
```

**Expected:** Order confirmation email in Mailtrap

---

## Production Configuration

When deploying to production, change email settings:

**For Production (Real Emails):**
```python
# Use actual SMTP provider (e.g., SendGrid, Mailgun, Gmail)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
DEFAULT_FROM_EMAIL = 'CS308 E-Commerce <noreply@cs308.com>'
```

**For Development (Mailtrap):**
```python
# Keep current Mailtrap settings
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "sandbox.smtp.mailtrap.io"
EMAIL_PORT = 2525
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "6d7963a617fa45"
EMAIL_HOST_PASSWORD = "64b0979d77b310"
```

---

## Email Customization

### Change Company Name:
```python
# Line 71 in views.py
Best regards,
Your Company Name Team  # ← Change this
```

### Change Support Email:
```python
# Line 75 in views.py
If you have any questions, contact us at your-support@example.com
```

### Add Logo (HTML Email):
To send HTML emails instead of plain text, use `EmailMessage`:

```python
from django.core.mail import EmailMessage

email = EmailMessage(
    subject=subject,
    body=html_message,  # HTML content
    from_email=settings.DEFAULT_FROM_EMAIL,
    to=[order.user.email],
)
email.content_subtype = 'html'  # Main content is text/html
email.send()
```

---

## Files Modified

1. **backend/orders/views.py**
   - Added `send_order_confirmation_email()` function
   - Updated `CheckoutView` to call email function after order creation
   - Added error handling for email failures

2. **backend/config/settings.py**
   - Already had Mailtrap configuration (no changes needed)

---

## Summary

✅ Automatic order confirmation emails
✅ Sent to customer's email address
✅ Includes complete order details
✅ Shows itemized products with prices
✅ Displays discount if applied
✅ Includes shipping address
✅ Works with Mailtrap for testing
✅ Error handling prevents order failures
✅ Easy to customize content

**Your emails now appear in Mailtrap when orders are created!** 📧
