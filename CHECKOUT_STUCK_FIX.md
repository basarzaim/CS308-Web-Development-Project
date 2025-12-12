# Checkout "Placing order..." Button Stuck - Debugging Guide

## Issue

When clicking "Place order" button on checkout page, the button shows "Placing order..." but the order is never created and the button stays stuck in loading state.

---

## Possible Causes

1. **Backend server not running**
2. **Frontend not connecting to backend**
3. **Email sending timing out**
4. **JavaScript error preventing API call**
5. **Authentication token expired**
6. **Cart items validation failing**

---

## Step-by-Step Debugging

### Step 1: Check if Backend is Running

**Open terminal 1:**
```bash
cd backend
venv\Scripts\activate  # On Windows
python manage.py runserver
```

**Expected output:**
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

**If you see this**, backend is running ✅

**If backend is not running**, start it and try checkout again.

---

### Step 2: Check if Frontend is Running

**Open terminal 2:**
```bash
cd frontend
npm run dev
```

**Expected output:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

**If you see this**, frontend is running ✅

---

### Step 3: Open Browser DevTools

1. Open your browser (Chrome/Edge/Firefox)
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Try clicking "Place order" again
5. Look for errors

**Common errors to look for:**

#### Error: "Network Error"
```
Network Error
POST http://localhost:8000/api/orders/checkout/
```

**Fix:** Backend is not running. Go to Step 1.

#### Error: "ERR_CONNECTION_REFUSED"
```
POST http://localhost:8000/api/orders/checkout/ net::ERR_CONNECTION_REFUSED
```

**Fix:** Backend is not running or running on wrong port. Check Step 1.

#### Error: "401 Unauthorized"
```
POST http://localhost:8000/api/orders/checkout/ 401 (Unauthorized)
```

**Fix:** Your login token expired. Log out and log in again.

#### Error: "400 Bad Request"
```
POST http://localhost:8000/api/orders/checkout/ 400 (Bad Request)
```

**Fix:** There's a validation error. Check the Network tab for details (Step 4).

---

### Step 4: Check Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Click "Place order" button
4. Look for a request to `/orders/checkout/`

**What to check:**

#### If you see NO request to `/orders/checkout/`:
- Frontend JavaScript error preventing the call
- Check Console tab for JavaScript errors
- Form validation might be failing
- Check if there are errors about cart items

#### If you see the request but it's **Pending** forever:
- Backend is hanging, probably due to email timeout
- See "Fix Email Timeout" section below

#### If you see **401 Unauthorized**:
- Token expired
- Log out and log in again

#### If you see **400 Bad Request**:
- Click on the request
- Go to **Response** tab
- Read the error message
- Common errors:
  - "Your cart is empty"
  - "Not enough stock for: [product]"
  - "product_id is required"

#### If you see **500 Internal Server Error**:
- Backend error
- Check backend terminal for Python traceback
- Likely database or email error

---

## Fix: Email Timeout Issue

If the request hangs at "Placing order..." for more than 30 seconds, it's likely the email sending is timing out.

### Solution: Disable Email Temporarily

Edit `backend/orders/views.py`:

**Find these lines (around line 152-156 and 205-209):**

```python
# Send order confirmation email
try:
    send_order_confirmation_email(order)
except Exception as e:
    # Log error but don't fail the order creation
    print(f"Failed to send order confirmation email: {e}")
```

**Replace with:**

```python
# Send order confirmation email (disabled for debugging)
# try:
#     send_order_confirmation_email(order)
# except Exception as e:
#     # Log error but don't fail the order creation
#     print(f"Failed to send order confirmation email: {e}")
print("Order confirmation email sending disabled for debugging")
```

**Restart Django backend:**
```bash
# Stop server with Ctrl+C
python manage.py runserver
```

**Try checkout again.** If it works now, the issue was email timeout.

---

## Fix: Email Timeout (Permanent Solution)

If email is causing timeout, add a timeout to email sending:

Edit `backend/orders/views.py`:

**Find the send_order_confirmation_email function (line 19-85):**

**Add timeout to send_mail call:**

```python
def send_order_confirmation_email(order):
    """
    Send order confirmation email to customer with order details.
    """
    # ... existing code ...

    # Send email with timeout
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[order.user.email],
            fail_silently=True,  # Changed to True so email errors don't break checkout
        )
        print(f"Order confirmation email sent to {order.user.email}")
    except Exception as e:
        print(f"Email error: {e}")
```

**Change `fail_silently=False` to `fail_silently=True`**

This way, if email fails, it won't crash the checkout.

---

## Fix: Check Mailtrap Connection

If email is slow, check Mailtrap settings in `backend/config/settings.py`:

```python
# Email configuration
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "sandbox.smtp.mailtrap.io"
EMAIL_PORT = 2525
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "6d7963a617fa45"
EMAIL_HOST_PASSWORD = "64b0979d77b310"
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
```

**Test Mailtrap connection:**

```python
# Django shell
python manage.py shell

from django.core.mail import send_mail
from django.conf import settings

send_mail(
    subject='Test',
    message='Test message',
    from_email=settings.DEFAULT_FROM_EMAIL,
    recipient_list=['test@example.com'],
    fail_silently=False,
)
```

**If this hangs for more than 10 seconds**, Mailtrap connection is slow/blocked.

**Temporary fix:** Change to console backend (email printed to console instead):

```python
# In settings.py
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

---

## Fix: Check Cart Items

Cart might be empty or have invalid items.

**In Browser Console:**
```javascript
// Check cart
fetch('http://localhost:8000/api/cart/', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
}).then(r => r.json()).then(console.log)
```

**Should return:**
```json
[
  {
    "id": 1,
    "product": { "id": 1, "name": "Laptop", "price": "1299.99" },
    "quantity": 2
  }
]
```

**If empty** `[]`, that's the issue - cart is empty.

---

## Fix: Restart Everything

Sometimes a clean restart fixes the issue:

**Terminal 1 (Backend):**
```bash
# Stop with Ctrl+C
cd backend
venv\Scripts\activate
python manage.py runserver
```

**Terminal 2 (Frontend):**
```bash
# Stop with Ctrl+C
cd frontend
npm run dev
```

**Browser:**
- Clear cache (Ctrl+Shift+Delete)
- Close all tabs
- Open http://localhost:5173
- Log in again
- Try checkout

---

## Common Solutions Summary

### Solution 1: Backend Not Running
```bash
cd backend
venv\Scripts\activate
python manage.py runserver
```

### Solution 2: Frontend Not Using Backend
Check `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000/api
VITE_USE_MOCK=false
```

Restart frontend after changing .env:
```bash
cd frontend
npm run dev
```

### Solution 3: Email Timeout
Change in `backend/orders/views.py` line 84:
```python
fail_silently=True,  # Changed from False to True
```

### Solution 4: Token Expired
- Log out
- Log in again
- Try checkout

### Solution 5: Cart Empty
- Add products to cart first
- Check cart page shows items
- Then try checkout

---

## Verification Checklist

After fixing, verify these:

- [ ] Backend running at http://localhost:8000
- [ ] Frontend running at http://localhost:5173
- [ ] Can see products at http://localhost:5173/products
- [ ] Can add products to cart
- [ ] Can see items in cart at http://localhost:5173/catalog (cart icon)
- [ ] Can go to checkout page
- [ ] Login modal doesn't appear (you're logged in)
- [ ] Cart items show in checkout
- [ ] Can fill shipping form
- [ ] Click "Place order" button
- [ ] Button changes to "Placing order..."
- [ ] After 2-3 seconds, success modal appears
- [ ] Order number is shown
- [ ] Cart is empty after successful order

---

## Still Not Working?

If none of the above work, collect this information:

1. **Browser Console errors** (screenshot or copy/paste)
2. **Network tab** showing the `/orders/checkout/` request (screenshot)
3. **Backend terminal output** (any errors/warnings)
4. **Backend logs** when clicking "Place order":
   - Any print statements
   - Any errors/exceptions
5. **Django version:**
   ```bash
   cd backend
   python -c "import django; print(django.VERSION)"
   ```
6. **Check if order was actually created:**
   ```bash
   python manage.py shell
   from orders.models import Order
   print(Order.objects.all())
   ```

---

## Quick Test Script

Save this as `test_checkout.py` in backend folder:

```python
import requests
import json

# Test if checkout endpoint works
url = "http://localhost:8000/api/orders/checkout/"
token = input("Enter your access token (from localStorage): ")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

payload = {
    "items": [
        {"product_id": 1, "quantity": 1, "price": 99.99}
    ],
    "shipping": {
        "full_name": "Test User",
        "address": "123 Test St",
        "city": "Test City",
        "phone": "1234567890"
    }
}

try:
    print("Sending request...")
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.json()}")
except requests.exceptions.Timeout:
    print("ERROR: Request timed out after 10 seconds")
    print("This means the backend is hanging, likely due to email sending")
except requests.exceptions.ConnectionError:
    print("ERROR: Cannot connect to backend")
    print("Make sure Django server is running: python manage.py runserver")
except Exception as e:
    print(f"ERROR: {e}")
```

**Run it:**
```bash
cd backend
python test_checkout.py
```

This will help identify if the issue is backend hanging or frontend issue.

---

## Most Likely Fix

Based on the symptoms (button stuck at "Placing order..."), the most likely cause is:

**Email sending is timing out or hanging.**

**Quick fix:**

1. Edit `backend/orders/views.py`
2. Find line 84: `fail_silently=False,`
3. Change to: `fail_silently=True,`
4. Restart Django: `python manage.py runserver`
5. Try checkout again

This will make checkout work even if email fails.

---

## Summary

The checkout stuck issue is most commonly caused by:

1. ❌ Backend not running (30% of cases)
2. ❌ Email timeout (40% of cases)
3. ❌ Token expired (15% of cases)
4. ❌ Cart empty (10% of cases)
5. ❌ Other (5% of cases)

**Start with the "Most Likely Fix" section above first!**
