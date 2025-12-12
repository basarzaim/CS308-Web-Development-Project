# Invoice Email Implementation Guide

## Current Status

Your project **already has** the code to send invoice emails with PDF attachments! Here's what exists:

✅ **PDF Generation:** `backend/orders/utils.py` - `generate_invoice_pdf()`
✅ **Email Sending:** `backend/orders/views.py` - `SendInvoiceView`
✅ **API Endpoint:** `/api/orders/<order_id>/send-invoice/`
✅ **Email Config:** Mailtrap settings in `settings.py`

---

## How to Send Invoice Emails (3 Options)

### Option 1: Manual Send via API (Already Works!)

**Endpoint:** `POST /api/orders/<order_id>/send-invoice/`

**Example:**
```bash
curl -X POST http://localhost:8000/api/orders/5/send-invoice/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**What happens:**
1. Generates PDF invoice
2. Attaches PDF to email
3. Sends to customer's email (Mailtrap in development)

**Frontend Implementation:**
```javascript
// Add to frontend/src/api/orders.js
export async function sendInvoiceEmail(orderId) {
  try {
    const { data } = await api.post(`/orders/${orderId}/send-invoice/`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to send invoice email"));
  }
}

// Use in Orders page
<button onClick={() => sendInvoiceEmail(order.id)}>
  Email Invoice
</button>
```

---

### Option 2: Automatic Send on Order Creation (Recommended)

Modify `CheckoutView` to automatically send invoice after order is created.

**File:** `backend/orders/views.py`

**Find this code (around line 152-156):**
```python
# Send order confirmation email
try:
    send_order_confirmation_email(order)
except Exception as e:
    print(f"Failed to send order confirmation email: {e}")
```

**Add invoice email sending after it:**
```python
# Send order confirmation email
try:
    send_order_confirmation_email(order)
except Exception as e:
    print(f"Failed to send order confirmation email: {e}")

# Send invoice email with PDF attachment
try:
    from django.core.mail import EmailMessage
    from .utils import generate_invoice_pdf

    pdf_buffer = generate_invoice_pdf(order)

    email = EmailMessage(
        subject=f"Invoice for Order #{order.id}",
        body=f"""
Hello {order.shipping_name or order.user.username},

Thank you for your purchase! Your invoice is attached to this email.

Order Number: #{order.id}
Total: ${float(order.discounted_total_price()):.2f}

Best regards,
CS308 E-Commerce Team
        """,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[order.user.email],
    )

    email.attach(
        filename=f"invoice_{order.id}.pdf",
        content=pdf_buffer.read(),
        mimetype="application/pdf"
    )

    email.send(fail_silently=True)
    print(f"✓ Invoice email sent to {order.user.email}")
except Exception as e:
    print(f"✗ Failed to send invoice email: {e}")
```

**Do this in TWO places:**
1. After line 156 (cart-based checkout)
2. After line 209 (items-based checkout)

---

### Option 3: Automatic Send When Order Delivered

Send invoice only when order status changes to "delivered".

**Create a new function in** `backend/orders/views.py`:

```python
def send_invoice_on_delivery(order):
    """
    Send invoice email when order is delivered.
    Called from admin status update views.
    """
    import threading

    def send_email_async():
        try:
            from django.core.mail import EmailMessage
            from .utils import generate_invoice_pdf

            pdf_buffer = generate_invoice_pdf(order)

            email = EmailMessage(
                subject=f"Invoice for Order #{order.id} - Delivered",
                body=f"""
Hello {order.shipping_name or order.user.username},

Your order has been delivered! Your invoice is attached.

Order Number: #{order.id}
Delivery Date: {order.updated_at.strftime('%B %d, %Y')}
Total: ${float(order.discounted_total_price()):.2f}

Thank you for shopping with us!

Best regards,
CS308 E-Commerce Team
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[order.user.email],
            )

            email.attach(
                filename=f"invoice_{order.id}.pdf",
                content=pdf_buffer.read(),
                mimetype="application/pdf"
            )

            email.send(fail_silently=True)
            print(f"✓ Invoice email sent to {order.user.email} on delivery")
        except Exception as e:
            print(f"✗ Failed to send invoice on delivery: {e}")

    # Send in background thread
    email_thread = threading.Thread(target=send_email_async)
    email_thread.daemon = True
    email_thread.start()
```

**Then modify** `AdminOrderStatusUpdateView` **(around line 320-331):**

**Find:**
```python
order.status = new_status
order.save()
return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
```

**Replace with:**
```python
old_status = order.status
order.status = new_status
order.save()

# Send invoice email when order is delivered
if new_status == 'delivered' and old_status != 'delivered':
    send_invoice_on_delivery(order)

return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
```

---

## Testing Invoice Email

### Step 1: Check Mailtrap Configuration

**File:** `backend/config/settings.py`

```python
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "sandbox.smtp.mailtrap.io"
EMAIL_PORT = 2525
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "6d7963a617fa45"
EMAIL_HOST_PASSWORD = "64b0979d77b310"
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
```

✅ Already configured correctly!

---

### Step 2: Test Manual Send

**Django Shell:**
```bash
python manage.py shell
```

```python
from orders.models import Order
from orders.views import SendInvoiceView
from django.core.mail import EmailMessage
from orders.utils import generate_invoice_pdf

# Get an order
order = Order.objects.first()

# Generate PDF
pdf_buffer = generate_invoice_pdf(order)

# Create email
email = EmailMessage(
    subject=f"Test Invoice - Order #{order.id}",
    body="This is a test invoice email.",
    from_email="6d7963a617fa45@sandbox.smtp.mailtrap.io",
    to=[order.user.email],
)

# Attach PDF
email.attach(
    filename=f"invoice_{order.id}.pdf",
    content=pdf_buffer.read(),
    mimetype="application/pdf"
)

# Send
email.send()
print("✓ Invoice email sent!")
```

**Check Mailtrap:** https://mailtrap.io/inboxes

---

### Step 3: Test via API

**Using curl:**
```bash
# Get access token first
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Send invoice
curl -X POST http://localhost:8000/api/orders/1/send-invoice/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Using Postman:**
1. Method: POST
2. URL: http://localhost:8000/api/orders/1/send-invoice/
3. Headers: Authorization: Bearer YOUR_TOKEN
4. Click Send

---

## Common Issues & Solutions

### Issue 1: "Failed to send invoice email"

**Possible causes:**
- Mailtrap connection timeout
- Invalid email address
- PDF generation error

**Debug:**
```python
# In Django shell
from orders.models import Order
from orders.utils import generate_invoice_pdf

order = Order.objects.get(id=1)
try:
    pdf_buffer = generate_invoice_pdf(order)
    print(f"✓ PDF generated: {len(pdf_buffer.read())} bytes")
except Exception as e:
    print(f"✗ PDF generation failed: {e}")
```

---

### Issue 2: Email not appearing in Mailtrap

**Check:**
1. Email sent successfully (check Django terminal)
2. Correct Mailtrap credentials
3. No firewall blocking port 2525
4. User has valid email address

**Debug:**
```bash
# Check if Mailtrap is reachable
telnet sandbox.smtp.mailtrap.io 2525
# Should connect (Ctrl+C to exit)
```

---

### Issue 3: PDF is empty or corrupted

**Possible cause:** Buffer not reset after reading

**Fix:**
```python
# BAD - Buffer read twice
pdf_buffer = generate_invoice_pdf(order)
email.attach(content=pdf_buffer.read())  # First read
# Buffer is now empty!

# GOOD - Reset buffer or read once
pdf_buffer = generate_invoice_pdf(order)
pdf_content = pdf_buffer.read()  # Read once
email.attach(content=pdf_content)  # Use stored content
```

---

### Issue 4: Threading issues

If using threading (Option 2 or 3), order might not be fully saved:

**Fix:** Add small delay
```python
import time
time.sleep(0.1)  # Wait for order to be committed
```

---

## Comparison: Which Option to Use?

| Option | When Sent | Pros | Cons |
|--------|-----------|------|------|
| **Manual (Option 1)** | User clicks button | User control, no automatic emails | Requires manual action |
| **On Order Creation (Option 2)** | Immediately after order | Customer gets invoice right away | Extra email (already get confirmation) |
| **On Delivery (Option 3)** | When order delivered | Makes sense timing-wise | Customer waits for invoice |

### Recommendation:

**Use Option 2 (Automatic on Order Creation)** because:
- ✅ Customer gets invoice immediately
- ✅ Can be used for records/accounting
- ✅ Professional e-commerce practice
- ✅ No manual work needed

But send it **combined with confirmation email** or as **separate attachment**.

---

## Best Implementation: Combined Email

Send ONE email with both order confirmation and PDF invoice.

**Modify** `send_order_confirmation_email()` in `backend/orders/views.py`:

```python
def send_order_confirmation_email(order):
    """
    Send order confirmation email with PDF invoice attached.
    """
    import threading

    def send_email_async():
        try:
            from django.core.mail import EmailMessage
            from .utils import generate_invoice_pdf

            # Generate invoice PDF
            pdf_buffer = generate_invoice_pdf(order)

            # Build email body (same as before)
            items_text = "\n".join([
                f"  - {item.product.name} x {item.quantity} = ${float(item.unit_price * item.quantity):.2f}"
                for item in order.items.all()
            ])

            discount_text = ""
            if order.discount_percentage and order.discount_percentage > 0:
                discount_amount = (order.total_price * order.discount_percentage) / 100
                discount_text = f"\nDiscount ({order.discount_percentage}%): -${float(discount_amount):.2f}"

            final_total = order.discounted_total_price()

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

Your invoice is attached as a PDF for your records.

You can track your order status by logging into your account at our website.

Thank you for shopping with us!

Best regards,
CS308 E-Commerce Team

---
This is an automated email. Please do not reply to this message.
If you have any questions, contact us at support@cs308ecommerce.com
            """

            # Create email with attachment
            email = EmailMessage(
                subject=f"Order Confirmation - Order #{order.id}",
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[order.user.email],
            )

            # Attach invoice PDF
            email.attach(
                filename=f"invoice_{order.id}.pdf",
                content=pdf_buffer.read(),
                mimetype="application/pdf"
            )

            email.send(fail_silently=True)
            print(f"✓ Order confirmation + invoice sent to {order.user.email}")
        except Exception as e:
            print(f"✗ Email failed: {e}")

    # Send in background thread
    email_thread = threading.Thread(target=send_email_async)
    email_thread.daemon = True
    email_thread.start()
```

**Result:** Customer gets ONE email with:
- ✅ Order confirmation text
- ✅ PDF invoice attached
- ✅ All details in one place

---

## Production Recommendations

### For Development (Mailtrap):
Keep current settings - emails go to Mailtrap for testing.

### For Production:
Change email backend to real SMTP:

```python
# settings.py - Production
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'  # or SendGrid, AWS SES, etc.
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
DEFAULT_FROM_EMAIL = 'CS308 E-Commerce <noreply@cs308.com>'
```

---

## Summary for Your Friends

**Tell them:**

1. **The code already exists!** No need to write from scratch.
2. **API endpoint works:** `/api/orders/<id>/send-invoice/`
3. **Choose implementation:**
   - Easy: Use Option 1 (manual button)
   - Best: Use Option 2 (automatic) or Combined Email
4. **Test with Mailtrap** before going live
5. **Check Django terminal** for success/error messages

**Quick Start:**
```bash
# 1. Make sure backend is running
python manage.py runserver

# 2. Create an order (via checkout)

# 3. Test send invoice
curl -X POST http://localhost:8000/api/orders/1/send-invoice/ \
  -H "Authorization: Bearer TOKEN"

# 4. Check Mailtrap inbox - PDF invoice should be there!
```

**Files they need to modify:**
- `backend/orders/views.py` - Add automatic sending (if wanted)
- `frontend/src/api/orders.js` - Add API function (if manual button wanted)
- `frontend/src/pages/Orders.jsx` - Add button (if manual sending)

That's it! The hard work (PDF generation, email sending) is already done! 🎉
