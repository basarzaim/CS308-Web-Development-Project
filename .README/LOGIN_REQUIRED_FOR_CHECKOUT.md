# Login Required for Checkout - Implementation

## Overview

Users must now be logged in to access the checkout page. If they attempt to checkout without authentication, a popup appears and redirects them to the login page.

---

## Changes Made

### 1. Backend: Checkout Authentication (backend/orders/views.py)

**Added authentication requirement:**
```python
class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]  # ✅ ADDED
```

**Result:**
- Unauthenticated API requests → `401 Unauthorized`
- Only logged-in users can place orders

---

### 2. Frontend: Checkout Page (frontend/src/pages/Checkout.jsx)

**Added login modal and redirect logic:**

```javascript
// Check authentication on page load
useEffect(() => {
  if (!isAuthenticated) {
    setShowLoginModal(true);  // Show popup
  } else {
    hydrateCart();
  }
}, [isAuthenticated]);

// Show modal if not authenticated
if (showLoginModal) {
  return (
    <div className="order-modal-overlay">
      <div className="order-modal">
        <div className="order-modal-icon">!</div>
        <h2>Login Required</h2>
        <p>You need to be logged in to complete your purchase.</p>
        <button onClick={() => navigate('/login', { state: { from: '/checkout' } })}>
          Go to Login
        </button>
        <button onClick={() => navigate('/products')}>
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
```

---

### 3. Frontend: Login Page (frontend/src/pages/Login.jsx)

**Added redirect back to checkout after login:**

```javascript
// Get the page user came from
const from = location.state?.from || "/";

// After successful login
nav(from); // Redirects back to checkout if came from there

// Show info message if redirected from checkout
{from === '/checkout' && (
  <div className="info-message">
    Please log in to complete your purchase
  </div>
)}
```

---

## User Flow

### Scenario 1: Guest User Tries to Checkout

1. **User clicks "Checkout"** or navigates to `/checkout`
2. **Popup appears** with message: "Login Required"
3. **Two options:**
   - "Go to Login" → Redirects to `/login`
   - "Continue Shopping" → Redirects to `/products`
4. **After login** → Automatically redirected back to `/checkout`
5. **User completes checkout** ✅

### Scenario 2: Logged-in User Checkouts

1. **User clicks "Checkout"**
2. **Checkout page loads normally** (no popup)
3. **User completes purchase** ✅

---

## Visual Flow

```
Guest User                          Logged-in User
    |                                     |
    v                                     v
/checkout                             /checkout
    |                                     |
    v                                     v
[Login Popup]                      [Checkout Form]
    |                                     |
    v (clicks "Go to Login")              v
/login (with message)              [Complete Order] ✅
    |
    v (logs in)
/checkout (redirected back)
    |
    v
[Checkout Form]
    |
    v
[Complete Order] ✅
```

---

## Technical Details

### Modal Styling

The login popup uses the existing `.order-modal-overlay` and `.order-modal` classes from Checkout.css:

```css
.order-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.order-modal {
  background: white;
  border-radius: 12px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  text-align: center;
}
```

### Modal Icon Color

The warning icon uses orange color:
```javascript
<div className="order-modal-icon" style={{ backgroundColor: '#f59e0b' }}>!</div>
```

---

## API Response Examples

### Unauthenticated Checkout Attempt

**Request:**
```bash
POST /api/orders/checkout/
Content-Type: application/json

{
  "items": [...],
  "shipping": {...}
}
```

**Response:**
```json
{
  "detail": "Authentication credentials were not provided."
}
```
**Status:** 401 Unauthorized

### Authenticated Checkout

**Request:**
```bash
POST /api/orders/checkout/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json

{
  "items": [...],
  "shipping": {...}
}
```

**Response:**
```json
{
  "id": 123,
  "user": 5,
  "total_price": "999.99",
  "status": "processing",
  ...
}
```
**Status:** 201 Created

---

## Testing

### Test 1: Guest User Checkout Redirect

1. **Logout** (if logged in)
2. **Navigate to** `/checkout`
3. **Expected:** Popup appears with "Login Required" message
4. **Click** "Go to Login"
5. **Expected:** Redirected to `/login` with info message
6. **Login**
7. **Expected:** Automatically redirected back to `/checkout`

### Test 2: Logged-in User Checkout

1. **Login**
2. **Navigate to** `/checkout`
3. **Expected:** Normal checkout page (no popup)
4. **Fill form and submit**
5. **Expected:** Order created successfully

### Test 3: Direct API Call (Unauthenticated)

```bash
curl -X POST http://localhost:8000/api/orders/checkout/ \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":1,"quantity":1}]}'
```

**Expected:** `401 Unauthorized`

---

## Benefits

✅ **Security:** Prevents anonymous orders
✅ **User Management:** All orders linked to user accounts
✅ **Order History:** Users can track their purchases
✅ **Better UX:** Clear messaging about login requirement
✅ **Seamless Flow:** Redirects back to checkout after login
✅ **Cart Preservation:** Cart items remain while user logs in

---

## Files Modified

1. `backend/orders/views.py` - Added authentication requirement
2. `frontend/src/pages/Checkout.jsx` - Added login modal and redirect
3. `frontend/src/pages/Login.jsx` - Added redirect back to checkout

---

## Summary

✅ Checkout now requires authentication
✅ Popup appears for unauthenticated users
✅ Seamless redirect to login and back to checkout
✅ Clear user messaging throughout the flow
✅ Cart items are preserved during login process
