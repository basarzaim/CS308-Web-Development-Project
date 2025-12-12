# Admin Navigation Fix - Hide Admin Links from Regular Users

## Overview

"Moderate Comments" and "Manage Orders" navigation links are now hidden from regular users. Only staff members and users with Product Manager or Sales Manager roles can see these links.

---

## Changes Made

### 1. Backend: Updated UserProfileSerializer (backend/users/serializers.py)

**Added `role` and `is_staff` fields to profile response:**

```python
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("id", "email", "username", "first_name", "last_name", "role", "is_staff")
        read_only_fields = ("id", "email", "role", "is_staff")
```

**What changed:**
- ❌ Removed non-existent fields: `phone`, `address`, `taxID`, `home_address`
- ✅ Added `role` field (Customer, Product Manager, Sales Manager)
- ✅ Added `is_staff` field (Django admin status)

---

### 2. Frontend: Updated Admin Check (frontend/src/utils/admin.js)

**Before:**
```javascript
export function isAdmin(user) {
  return true; // Visible to everyone for now
}
```

**After:**
```javascript
export function isAdmin(user) {
  if (!user) return false;

  // Check if user is staff (Django admin)
  if (user.is_staff === true) return true;

  // Check if user has Product Manager or Sales Manager role
  if (user.role === 'Product Manager' || user.role === 'Sales Manager') return true;

  return false;
}
```

**What changed:**
- ✅ Returns `false` for regular users
- ✅ Returns `true` for Django staff users (`is_staff=True`)
- ✅ Returns `true` for Product Managers
- ✅ Returns `true` for Sales Managers

---

## Who Can See Admin Links?

### ✅ **Can See** (Admin Links Visible)

1. **Django Staff Users**
   - Users with `is_staff=True` in Django admin
   - Full access to Django admin panel

2. **Product Managers**
   - Users with `role='Product Manager'`
   - Can manage products and moderate comments

3. **Sales Managers**
   - Users with `role='Sales Manager'`
   - Can apply discounts and manage orders

### ❌ **Cannot See** (Admin Links Hidden)

1. **Regular Customers**
   - Users with `role='Customer'`
   - No admin privileges

2. **Unauthenticated Users**
   - Not logged in
   - No user object exists

---

## Navigation Behavior

### Regular User View:
```
Home | Products | My Orders | Wishlist | Checkout | Profile | Logout
```

### Admin/Manager View:
```
Home | Products | My Orders | Moderate Comments | Manage Orders | Wishlist | Checkout | Profile | Logout
```

---

## API Response Example

### Profile Endpoint: GET /api/users/profile/

**Regular User:**
```json
{
  "id": 1,
  "email": "customer@example.com",
  "username": "customer",
  "first_name": "John",
  "last_name": "Doe",
  "role": "Customer",
  "is_staff": false
}
```

**Product Manager:**
```json
{
  "id": 2,
  "email": "manager@example.com",
  "username": "product_mgr",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "Product Manager",
  "is_staff": false
}
```

**Django Staff:**
```json
{
  "id": 3,
  "email": "admin@example.com",
  "username": "admin",
  "first_name": "Admin",
  "last_name": "User",
  "role": "Customer",
  "is_staff": true
}
```

---

## How It Works

### 1. User Logs In
```javascript
// Login successful
login(accessToken, refreshToken);
```

### 2. Profile Data Fetched
```javascript
// AuthContext.jsx
const userData = await getProfile();
setUser(userData);
```

### 3. Navigation Checks Admin Status
```javascript
// App.jsx
{isAdmin(user) && <Link to="/admin/comments">Moderate Comments</Link>}
{isAdmin(user) && <Link to="/admin/orders">Manage Orders</Link>}
```

### 4. isAdmin Function Evaluates
```javascript
// utils/admin.js
if (user.is_staff === true) return true;
if (user.role === 'Product Manager') return true;
if (user.role === 'Sales Manager') return true;
return false;
```

---

## Testing

### Test 1: Regular Customer

1. **Create regular user** with role='Customer'
2. **Login**
3. **Check navigation**
4. **Expected:** No "Moderate Comments" or "Manage Orders" links

### Test 2: Product Manager

1. **Create user** with role='Product Manager'
2. **Login**
3. **Check navigation**
4. **Expected:** Both admin links visible

### Test 3: Sales Manager

1. **Create user** with role='Sales Manager'
2. **Login**
3. **Check navigation**
4. **Expected:** Both admin links visible

### Test 4: Django Staff

1. **Create superuser** with `python manage.py createsuperuser`
2. **Login**
3. **Check navigation**
4. **Expected:** Both admin links visible

### Test 5: Unauthenticated User

1. **Logout**
2. **Check navigation**
3. **Expected:** No admin links visible

---

## Creating Test Users

### Via Django Shell:

```python
from users.models import Customer

# Create Product Manager
pm = Customer.objects.create_user(
    email='pm@test.com',
    username='product_mgr',
    password='test123',
    role='Product Manager'
)

# Create Sales Manager
sm = Customer.objects.create_user(
    email='sm@test.com',
    username='sales_mgr',
    password='test123',
    role='Sales Manager'
)

# Create Regular Customer
customer = Customer.objects.create_user(
    email='customer@test.com',
    username='customer',
    password='test123',
    role='Customer'
)

# Create Staff User
staff = Customer.objects.create_user(
    email='staff@test.com',
    username='staff',
    password='test123',
    is_staff=True
)
```

### Via Django Admin:

1. Go to http://localhost:8000/admin/
2. Login with superuser
3. Go to **Customers**
4. Click on any user
5. Change **Role** dropdown
6. Or check **Staff status** checkbox
7. Save

---

## Protected Routes

The navigation links are hidden, but users could still try to access the URLs directly. Make sure to protect the routes on the backend:

### Backend Protection (Already Implemented):

```python
# CommentModeration endpoint
permission_classes = [IsAdminUser]  # Only staff users

# AdminOrders endpoint
permission_classes = [IsAdminUser]  # Only staff users
```

### Frontend Protection (Recommended):

Add route guards in App.jsx:

```javascript
// Protected route component
function AdminRoute({ children }) {
  const { user } = useAuth();
  return isAdmin(user) ? children : <Navigate to="/products" replace />;
}

// Usage
<Route path="/admin/comments" element={
  <AdminRoute>
    <CommentModeration />
  </AdminRoute>
} />
```

---

## Summary

✅ Admin links hidden from regular users
✅ Only staff, Product Managers, and Sales Managers see admin links
✅ Profile API returns `role` and `is_staff` fields
✅ isAdmin() function properly checks user permissions
✅ Clean navigation experience based on user role

---

## Files Modified

1. `backend/users/serializers.py` - Updated UserProfileSerializer
2. `frontend/src/utils/admin.js` - Fixed isAdmin() function
