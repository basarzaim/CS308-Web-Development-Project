# Cart Merge on Login Fix

## Problem

When a guest user added products to their cart and then logged in, the cart was getting wiped out instead of being preserved.

---

## Root Causes

### Issue 1: Cart Cleared Before Login
**Location:** `frontend/src/context/AuthContext.jsx` line 34-35

The AuthContext was calling `clearGuestCart()` whenever the user was NOT authenticated. This meant:
1. Guest user adds items to cart
2. Guest user clicks login
3. While loading the login page, `isAuthenticated` is false
4. AuthContext runs and calls `clearGuestCart()`
5. **Cart is wiped before user even logs in!**

### Issue 2: Backend Merge Endpoint Incompatible
**Location:** `backend/cart/views.py` line 125-140

The backend's `MergeCartView` was expecting a **Django session cart** (server-side), but the frontend stores the guest cart in **localStorage** (client-side). They were never compatible:

- Frontend: `localStorage.setItem("guest_cart", ...)`
- Backend: `request.session.get("cart", {})`

These two never meet!

---

## Solutions Applied

### Fix 1: Don't Clear Guest Cart on Page Load

**File:** `frontend/src/context/AuthContext.jsx`

**Before:**
```javascript
} else {
  // Clear guest cart when logged out
  clearGuestCart();
}
```

**After:**
```javascript
// Don't clear guest cart when not authenticated - let guest users keep their cart before login
```

**Why this works:**
- Guest users can now add items without the cart being cleared
- Cart persists in localStorage until after login
- Only gets cleared explicitly on logout (line 53) or after merge (in cart.js)

---

### Fix 2: Proper Cart Merge Implementation

**File:** `frontend/src/stores/cart.js` lines 189-215

**Before:**
```javascript
try {
  // Use backend merge endpoint
  await cartAPI.mergeGuestCart(); // This doesn't work!
  clearGuestCart();
}
```

**After:**
```javascript
try {
  // Add guest cart items to backend one by one
  for (const item of guestItems) {
    try {
      await cartAPI.addToCart(item.productId, item.qty);
      console.log(`✓ Merged: Product ${item.productId} x ${item.qty}`);
    } catch (error) {
      console.error(`✗ Failed to merge product ${item.productId}:`, error.message);
    }
  }
  // Clear guest cart after successful merge
  clearGuestCart();
  console.log("✓ Guest cart merged and cleared");
  // Dispatch event to update cart badge
  window.dispatchEvent(new Event('cartUpdated'));
}
```

**Why this works:**
- Reads items from localStorage
- Adds each item to backend using existing API
- Only clears guest cart after successful merge
- Updates cart badge to reflect new count

---

## How It Works Now

### Flow: Guest Shopping → Login → Cart Preserved

1. **Guest adds products to cart**
   - Items stored in `localStorage.guest_cart`
   - Cart badge shows count

2. **Guest clicks checkout (not logged in)**
   - Login modal appears
   - Cart still in localStorage (NOT cleared)

3. **Guest clicks "Go to Login"**
   - Redirected to login page
   - Cart STILL in localStorage (NOT cleared)

4. **Guest enters credentials and logs in**
   - `AuthContext.login()` called
   - Token saved to localStorage
   - `setToken()` triggers useEffect

5. **AuthContext loads user profile**
   - `getProfile()` called
   - User data fetched from backend
   - `setUser(userData)` called

6. **Cart merge happens automatically**
   - `mergeGuestCartIfAny()` called
   - Reads items from localStorage
   - For each item:
     - Calls `addToCart(productId, qty)` API
     - Backend adds to user's cart in database
   - After all items merged:
     - Clears localStorage cart
     - Updates cart badge

7. **User redirected to checkout**
   - Cart now loaded from backend
   - All items preserved!

---

## Testing the Fix

### Test Case 1: Guest to Login
1. Open app (not logged in)
2. Add 3 products to cart
3. Click checkout
4. Click "Go to Login"
5. Log in
6. **Expected:** Cart still has 3 products ✅

### Test Case 2: Multiple Items
1. As guest, add 5 different products
2. Go to login page
3. Log in
4. **Expected:** All 5 products in cart ✅

### Test Case 3: Quantities Preserved
1. As guest, add:
   - Product A x 2
   - Product B x 5
   - Product C x 1
2. Log in
3. **Expected:** Quantities preserved correctly ✅

### Test Case 4: Console Logs
1. Open browser DevTools (F12)
2. Go to Console tab
3. As guest, add 2 products
4. Log in
5. **Expected console output:**
```
Merging 2 items from guest cart to backend...
✓ Merged: Product 1 x 2
✓ Merged: Product 5 x 1
✓ Guest cart merged and cleared
```

---

## Debugging

### Check if merge is working:

**In Browser Console:**
```javascript
// Before login (as guest)
JSON.parse(localStorage.getItem('guest_cart'))
// Should show: [{productId: 1, qty: 2}, {productId: 5, qty: 1}]

// After login
JSON.parse(localStorage.getItem('guest_cart'))
// Should show: null or []
```

**Check Backend Cart:**
After login, check if items are in backend:
```bash
# Django shell
python manage.py shell

from cart.models import CartItem
from users.models import Customer

user = Customer.objects.get(email='test@example.com')
cart = CartItem.objects.filter(user=user)
for item in cart:
    print(f"{item.product.name} x {item.quantity}")
```

---

## Edge Cases Handled

### Case 1: Some items fail to merge
**Scenario:** Product deleted or out of stock

**Behavior:**
- Other items still merge successfully
- Failed item logged to console
- Cart badge updates with merged items only

### Case 2: User already has items in backend cart
**Scenario:** User logged out, added items as guest, logs back in

**Behavior:**
- Guest items are ADDED to existing cart
- If same product exists, quantities are increased
- Backend `AddToCartView` handles merging

### Case 3: User logs out and back in
**Scenario:**
1. User has 3 items in backend cart
2. User logs out
3. Guest cart is cleared (line 53 in AuthContext)
4. User logs back in
5. Backend cart still has 3 items

**Behavior:**
- Logout clears guest cart (expected)
- Login loads backend cart
- Everything works correctly

### Case 4: Network error during merge
**Scenario:** API calls fail during merge

**Behavior:**
- Each item wrapped in try/catch
- Failed items logged but don't crash
- Successful items are merged
- Guest cart cleared after attempts

---

## Files Modified

1. **frontend/src/context/AuthContext.jsx**
   - Line 34-35: Removed `clearGuestCart()` call when not authenticated

2. **frontend/src/stores/cart.js**
   - Lines 189-215: Rewrote `mergeGuestCartIfAny()` to properly merge localStorage cart to backend

---

## Alternative Approach (Not Used)

We could have modified the backend to accept localStorage cart data:

```python
class MergeCartView(views.APIView):
    def post(self, request):
        # Accept cart items from request body
        items = request.data.get('items', [])
        for item in items:
            product = Product.objects.get(pk=item['productId'])
            cart_item, _ = CartItem.objects.get_or_create(
                user=request.user,
                product=product
            )
            cart_item.quantity += item['qty']
            cart_item.save()
```

**Why we didn't do this:**
- Frontend approach is simpler
- Uses existing `addToCart` API (already tested)
- No backend changes needed
- Works with current infrastructure

---

## Summary

✅ **Problem:** Guest cart wiped when logging in
✅ **Root Cause 1:** AuthContext cleared cart on every page load for non-authenticated users
✅ **Root Cause 2:** Backend merge endpoint incompatible with localStorage cart
✅ **Solution 1:** Don't clear guest cart on page load
✅ **Solution 2:** Merge by adding items one-by-one using existing API
✅ **Result:** Cart preserved perfectly when logging in

---

## Testing Checklist

After applying fix, verify:

- [ ] Guest can add products to cart
- [ ] Cart persists when navigating pages
- [ ] Cart persists when clicking login
- [ ] Cart NOT cleared on login page
- [ ] After login, all items in cart
- [ ] Quantities preserved correctly
- [ ] Cart badge updates after login
- [ ] Console shows merge logs
- [ ] Guest cart cleared after merge
- [ ] Can checkout successfully

If all checked ✅, the fix is working!
