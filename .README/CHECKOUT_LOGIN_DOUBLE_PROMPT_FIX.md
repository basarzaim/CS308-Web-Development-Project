# Checkout Login Double Prompt Fix

## Problem

When users tried to checkout without being logged in:
1. Checkout page showed login modal ✅
2. User clicked "Go to Login" ✅
3. User logged in successfully ✅
4. User was redirected back to checkout ✅
5. **Login modal appeared AGAIN** ❌ (Bug!)
6. User had to refresh or log in again ❌

## Root Cause

The issue was a **race condition** between the login process and the checkout page authentication check.

### What Was Happening:

```
1. User logs in
   ↓
2. Login.jsx calls: login(accessToken, refreshToken)
   ↓
3. Login.jsx navigates to: /checkout
   ↓
4. Checkout.jsx mounts and checks: isAuthenticated
   ↓ (At this point, AuthContext is still loading the user profile!)
5. isAuthenticated = false (token exists, but user not loaded yet)
   ↓
6. Shows login modal again ❌
```

### The Race Condition:

**AuthContext.jsx:**
```javascript
useEffect(() => {
  async function loadUser() {
    if (token) {
      const userData = await getProfile();  // ← Takes time!
      setUser(userData);
      await mergeGuestCartIfAny();
    }
    setLoading(false);
  }
  loadUser();
}, [token]);

const isAuthenticated = !!token && !!user;  // ← False until user loads
```

**Checkout.jsx (BEFORE FIX):**
```javascript
useEffect(() => {
  if (!isAuthenticated) {  // ← Runs before user loads!
    setShowLoginModal(true);
  } else {
    hydrateCart();
  }
}, [isAuthenticated]);
```

**Timeline:**
```
T=0ms:   User logs in, token set
T=0ms:   Navigate to /checkout
T=0ms:   Checkout mounts
T=0ms:   useEffect runs: isAuthenticated = false (user still loading)
T=0ms:   Shows login modal ❌
T=50ms:  getProfile() completes
T=50ms:  isAuthenticated = true
T=50ms:  useEffect runs again but modal already shown
```

---

## Solution

Wait for the AuthContext to finish loading before checking authentication.

### Code Changes

**File:** `frontend/src/pages/Checkout.jsx`

**Before:**
```javascript
export default function Checkout() {
  const { isAuthenticated } = useAuth();  // ❌ Missing loading state

  useEffect(() => {
    if (!isAuthenticated) {  // ❌ Checks too early
      setShowLoginModal(true);
    } else {
      hydrateCart();
    }
  }, [isAuthenticated]);  // ❌ Doesn't wait for loading
```

**After:**
```javascript
export default function Checkout() {
  const { isAuthenticated, loading: authLoading } = useAuth();  // ✅ Get loading state

  useEffect(() => {
    // ✅ Wait for auth to finish loading
    if (authLoading) {
      return; // Don't do anything while auth is loading
    }

    // ✅ Now we know auth is done loading, safe to check
    if (!isAuthenticated) {
      setShowLoginModal(true);
      setLoading(false);
    } else {
      setShowLoginModal(false);  // ✅ Explicitly hide modal
      hydrateCart();
    }
  }, [isAuthenticated, authLoading]);  // ✅ Watch both values
```

---

## How It Works Now

### Correct Flow:

```
1. User logs in
   ↓
2. Login.jsx calls: login(accessToken, refreshToken)
   ↓
3. Login.jsx navigates to: /checkout
   ↓
4. Checkout.jsx mounts
   ↓
5. authLoading = true → useEffect returns early ⏸️
   ↓
6. AuthContext loads user profile (50ms)
   ↓
7. authLoading = false, isAuthenticated = true
   ↓
8. useEffect runs: setShowLoginModal(false) ✅
   ↓
9. hydrateCart() ✅
```

### State Timeline:

```
T=0ms:   Navigate to /checkout
T=0ms:   authLoading=true, isAuthenticated=false
T=0ms:   useEffect: return early (do nothing)
T=0ms:   User sees loading state (no modal)

T=50ms:  User profile loaded
T=50ms:  authLoading=false, isAuthenticated=true
T=50ms:  useEffect: setShowLoginModal(false), hydrateCart()
T=50ms:  User sees checkout form ✅
```

---

## Key Changes

### 1. Added `authLoading` Check
```javascript
const { isAuthenticated, loading: authLoading } = useAuth();
```
- Now we know when auth is still loading

### 2. Wait for Loading to Finish
```javascript
if (authLoading) {
  return; // Don't check auth until it's ready
}
```
- Prevents premature authentication check

### 3. Explicitly Hide Modal
```javascript
if (!isAuthenticated) {
  setShowLoginModal(true);
  setLoading(false);
} else {
  setShowLoginModal(false);  // ✅ Added this
  hydrateCart();
}
```
- Ensures modal closes when user becomes authenticated

### 4. Added `authLoading` Dependency
```javascript
}, [isAuthenticated, authLoading]);
```
- Re-runs effect when auth loading state changes

---

## Testing

### Test 1: Fresh Login from Checkout

**Steps:**
1. Go to `/checkout` without being logged in
2. See login modal ✅
3. Click "Go to Login"
4. Enter credentials and submit
5. Wait for redirect to `/checkout`

**Expected:**
- ✅ Redirected to checkout
- ✅ **No login modal** (shows checkout form immediately)
- ✅ Cart loads correctly

**Before Fix:** Login modal appeared again ❌
**After Fix:** Goes straight to checkout ✅

---

### Test 2: Already Logged In

**Steps:**
1. Log in first
2. Navigate to `/checkout`

**Expected:**
- ✅ Goes directly to checkout form
- ✅ No login modal
- ✅ Cart loads

**Result:** Works correctly (no change)

---

### Test 3: Refresh While Logged In

**Steps:**
1. Be on `/checkout` while logged in
2. Refresh the page

**Expected:**
- ✅ Brief loading state
- ✅ Checkout form appears
- ✅ No login modal

**Result:** Works correctly

---

### Test 4: Session Expired

**Steps:**
1. Be on `/checkout` while logged in
2. Manually delete access token from localStorage
3. Refresh page

**Expected:**
- ✅ Login modal appears
- ✅ Prompts user to log in

**Result:** Works correctly

---

## Edge Cases Handled

### 1. Slow Network
```
User has slow connection
  ↓
getProfile() takes 500ms
  ↓
authLoading stays true for 500ms
  ↓
Checkout shows nothing (or loading indicator)
  ↓
After 500ms: authLoading=false, shows correct state
```
**Result:** ✅ No premature modal

---

### 2. Token Exists but Invalid
```
User has expired token in localStorage
  ↓
getProfile() fails
  ↓
AuthContext clears token
  ↓
authLoading=false, isAuthenticated=false
  ↓
Checkout shows login modal
```
**Result:** ✅ Correct behavior

---

### 3. Rapid Navigation
```
User logs in
  ↓
Immediately navigates to checkout (before profile loads)
  ↓
authLoading=true
  ↓
Waits for profile to load
  ↓
Shows checkout when ready
```
**Result:** ✅ No flash of login modal

---

## Additional Improvements

### Optional: Add Loading Indicator

Instead of showing nothing while `authLoading` is true, could show a loading indicator:

```javascript
// In Checkout.jsx, before the login modal check:
if (authLoading) {
  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <p>Loading...</p>
      </div>
    </div>
  );
}
```

---

## Related Components

### AuthContext.jsx
No changes needed - already provides `loading` state

### Login.jsx
No changes needed - already redirects correctly

### Checkout.jsx
**Changed:** Added `authLoading` check to prevent race condition

---

## Summary

**Problem:** Login modal appeared twice when logging in from checkout

**Root Cause:** Checkout checked authentication before AuthContext finished loading user

**Solution:** Wait for `authLoading` to be false before checking `isAuthenticated`

**Result:**
- ✅ Login modal only appears once
- ✅ Smooth login flow
- ✅ No need to log in twice
- ✅ Proper loading state handling

---

## Files Modified

1. **frontend/src/pages/Checkout.jsx**
   - Added `authLoading` from `useAuth()`
   - Added check to wait for auth loading to finish
   - Explicitly hide modal when authenticated
   - Added `authLoading` to dependency array

**Lines Changed:** 5 lines
**Impact:** Fixes double login prompt bug
