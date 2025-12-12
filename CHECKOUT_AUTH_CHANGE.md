# Checkout Authentication Requirement

## What Changed

The checkout functionality now **requires users to be logged in** before they can place an order.

---

## Technical Changes

### File: `backend/orders/views.py`

**Before:**
```python
class CheckoutView(APIView):
    def post(self, request):
        """
        Accepts either:
        - items array in the request body (guest or client-provided checkout)
        - or uses authenticated user's server cart (CartItem).
        """
        user = request.user if request.user.is_authenticated else None
```

**After:**
```python
class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Accepts either:
        - items array in the request body (authenticated user checkout)
        - or uses authenticated user's server cart (CartItem).
        """
        user = request.user
```

---

## What This Means

### ✅ **Before (Guest Checkout Allowed)**
- Unauthenticated users could checkout
- Orders could be created with `user=None`
- No way to track who placed the order

### ✅ **After (Login Required)**
- Users **must be logged in** to checkout
- All orders are associated with a user account
- Better order tracking and customer management
- Unauthenticated requests get `401 Unauthorized` response

---

## API Behavior

### Unauthenticated Request

**Request:**
```bash
POST http://localhost:8000/api/orders/checkout/
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
**Status Code:** 401 Unauthorized

---

### Authenticated Request

**Request:**
```bash
POST http://localhost:8000/api/orders/checkout/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "items": [...],
  "shipping": {...}
}
```

**Response:**
```json
{
  "id": 1,
  "user": 5,
  "total_price": "999.99",
  "status": "processing",
  "shipping_name": "John Doe",
  ...
}
```
**Status Code:** 201 Created

---

## Frontend Impact

The frontend will need to:

1. **Check if user is logged in** before showing checkout
2. **Redirect to login page** if user tries to checkout without being logged in
3. **Include authentication token** in checkout API request

### Example Frontend Check

```javascript
// In your checkout component
if (!isAuthenticated) {
  // Redirect to login
  navigate('/login', {
    state: { from: '/checkout', message: 'Please log in to complete your order' }
  });
  return;
}

// Proceed with checkout
await createOrder({ items, shipping, customer, payment, totals });
```

---

## Benefits

1. ✅ **Better Security** - Know who is placing orders
2. ✅ **Order History** - Users can view their past orders
3. ✅ **Customer Support** - Easier to help customers with their orders
4. ✅ **Fraud Prevention** - Prevent anonymous abuse
5. ✅ **Email Notifications** - Can send order confirmation emails
6. ✅ **Returns & Refunds** - Track return requests by user

---

## Testing

### Test 1: Unauthenticated Request (Should Fail)

```bash
curl -X POST http://localhost:8000/api/orders/checkout/ \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":1,"quantity":1}]}'
```

**Expected:** `401 Unauthorized`

### Test 2: Authenticated Request (Should Succeed)

```bash
# First, login
TOKEN=$(curl -X POST http://localhost:8000/api/products/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}' \
  | jq -r '.access')

# Then, checkout
curl -X POST http://localhost:8000/api/orders/checkout/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"items":[{"product_id":1,"quantity":1}],"shipping":{"full_name":"John Doe","address":"123 Main St","city":"NYC","phone":"555-1234"}}'
```

**Expected:** `201 Created` with order details

---

## Summary

✅ Checkout now requires authentication
✅ All orders are linked to a user account
✅ Better security and order tracking
✅ Frontend needs to check login status before checkout
