# Backend Issues and Required Fixes

This document explains all the backend issues discovered during testing and what changes are needed to fix them.

---

## Issue 1: Checkout Returns "AnonymousUser" Error

**Problem:**
When trying to checkout, the backend throws an error:
```
TypeError: Cannot cast AnonymousUser to int. Are you trying to use it in place of User?
```

**Root Cause:**
The `CheckoutView` class in `backend/orders/views.py` is missing authentication enforcement. Even though users are logged in on the frontend, the backend treats them as anonymous users.

**Fix Required:**

**File:** `backend/orders/views.py`
**Line:** 16-17

Add `permission_classes` to the CheckoutView:

```python
class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]  # ADD THIS LINE

    def post(self, request):
        user = request.user
        # ... rest of the code
```

**Why This Fix Is Necessary:**
Without `permission_classes = [IsAuthenticated]`, Django REST Framework doesn't enforce authentication, so `request.user` is an `AnonymousUser` object instead of a real Customer object. This causes the database query `CartItem.objects.filter(user=user)` to fail because it can't convert AnonymousUser to an integer for the foreign key lookup.

---

## Issue 2: Order Status Update Endpoint Not Found (404)

**Problem:**
When trying to update order status from the Admin Orders page, the frontend gets 404 errors for:
- `/api/orders/{id}/status/` (PATCH)
- `/api/orders/{id}/status/` (PUT)

**Root Cause:**
The backend only has the URL pattern `/api/orders/admin/update-status/{id}/`, but the frontend expects `/api/orders/{id}/status/`.

**Fix Required:**

**File:** `backend/orders/urls.py`
**Line:** 16 (add new line after line 16)

Add an alternative URL pattern that matches what the frontend expects:

```python
urlpatterns = [
    path('', OrderListView.as_view(), name='order-list'),
    path('all/', AllOrdersView.as_view(), name='all-orders'),
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path("admin/update-status/<int:order_id>/", admin_update_order_status),
    path("<int:order_id>/status/", admin_update_order_status, name='order-update-status'),  # ADD THIS LINE
    path('<int:pk>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    path('<int:pk>/return/', OrderReturnView.as_view(), name='order-return'),
    path('<int:pk>/apply-discount/', ApplyDiscountView.as_view(), name='apply-discount'),
]
```

**Why This Fix Is Necessary:**
The frontend tries multiple endpoint patterns to update order status. By adding this alternative URL, we make the endpoint accessible via the standard REST pattern `/orders/{id}/status/` without breaking the existing `/admin/update-status/{id}/` endpoint.

---

## Issue 3: Login Doesn't Persist (500 Error on /api/users/me/)

**Problem:**
After logging in, users are immediately logged out. The `/api/users/me/` endpoint returns a 500 Internal Server Error.

**Root Cause:**
The `UserProfileSerializer` in `backend/users/serializers.py` tries to serialize fields that don't exist in the Customer model:
- `phone`
- `taxID`
- `home_address`

**Error Message:**
```
Field name `phone` is not valid for model `Customer`.
```

**Fix Required:**

**File:** `backend/users/serializers.py`
**Lines:** 34-38

Update the UserProfileSerializer to only include fields that exist in the Customer model:

```python
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("id", "email", "username", "first_name", "last_name")  # REMOVE: phone, taxID, home_address
        read_only_fields = ("id", "email")
```

**Why This Fix Is Necessary:**
The Customer model (in `backend/users/models.py`) extends AbstractUser and only adds an email field. It doesn't have `phone`, `taxID`, or `home_address` fields. When the serializer tries to access these non-existent fields, Django throws a 500 error, which breaks the `/api/users/me/` endpoint that's called after login to verify the user's session.

---

## Issue 4: Email-Based Authentication Not Working

**Problem:**
Users cannot login with their email address even though the Customer model is configured to use email as the USERNAME_FIELD.

**Root Cause:**
Django's authentication backend is not configured to recognize the custom USERNAME_FIELD setting.

**Fix Required:**

**File:** `backend/config/settings.py`
**Line:** After line 107 (after CORS settings, before REST_FRAMEWORK)

Add the authentication backend configuration:

```python
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',  # This will use USERNAME_FIELD from the model
]
```

**Why This Fix Is Necessary:**
Even though the Customer model specifies `USERNAME_FIELD = 'email'`, Django's default authentication doesn't automatically use this. The ModelBackend needs to be explicitly configured in settings to respect the custom USERNAME_FIELD. Without this, authentication attempts with email fail.

---

## Issue 5: Missing Order Listing Endpoints (404)

**Problem:**
The frontend gets 404 errors when trying to fetch orders:
- `/api/orders/` - User's own orders
- `/api/orders/all/` - All orders (admin view)

**Root Cause:**
These endpoints don't exist in the backend. The urls.py only has checkout, cancel, return, and discount endpoints.

**Fix Required:**

**File:** `backend/orders/views.py`
**Location:** Add at the end of the file (after ApplyDiscountView)

Add two new view classes:

```python
class OrderListView(APIView):
    """Get all orders for the current user"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).order_by('-created_at')
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AllOrdersView(APIView):
    """Get all orders (admin only)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # For now, allow any authenticated user to see all orders for testing
        # In production, you would check for admin/sales manager role
        orders = Order.objects.all().order_by('-created_at')
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
```

**File:** `backend/orders/urls.py`
**Lines:** 2 and 12-13

First, import the new views:

```python
from .views import (
    CheckoutView,
    OrderCancelView,
    OrderReturnView,
    admin_update_order_status,
    ApplyDiscountView,
    OrderListView,      # ADD THIS
    AllOrdersView       # ADD THIS
)
```

Then add the URL patterns:

```python
urlpatterns = [
    path('', OrderListView.as_view(), name='order-list'),      # ADD THIS LINE
    path('all/', AllOrdersView.as_view(), name='all-orders'),  # ADD THIS LINE
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path("admin/update-status/<int:order_id>/", admin_update_order_status),
    path('<int:pk>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    path('<int:pk>/return/', OrderReturnView.as_view(), name='order-return'),
    path('<int:pk>/apply-discount/', ApplyDiscountView.as_view(), name='apply-discount'),
]
```

**Why This Fix Is Necessary:**
The frontend expects to fetch orders via GET requests to `/api/orders/` (user's orders) and `/api/orders/all/` (all orders for admin). Without these endpoints, the Orders and Admin Orders pages cannot display any order data.

---

## Issue 6: Order Serializer Missing Required Fields

**Problem:**
When orders are returned from the API, the frontend expects certain fields that are missing:
- `user` (object with user details for admin view)
- `subtotal` (original price before discount)

**Root Cause:**
The OrderSerializer doesn't include these fields, causing the frontend to display incomplete order information.

**Fix Required:**

**File:** `backend/orders/serializers.py`
**Lines:** 21-33, 60-71

Add the missing fields to the OrderSerializer:

```python
class OrderSerializer(serializers.ModelSerializer):

    items = OrderItemSerializer(many=True, read_only=True)

    # ADD THESE LINES:
    discounted_total_price = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    subtotal = serializers.DecimalField(
        source='total_price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "user",              # ADD THIS
            "total_price",
            "subtotal",          # ADD THIS
            "discount_percentage",
            "discounted_total_price",
            "status",
            "created_at",
            "updated_at",
            "delivered_at",
            "items",
        ]
        read_only_fields = [
            "user",
            "created_at",
            "updated_at",
            "delivered_at",
            "discounted_total_price",
            "subtotal",          # ADD THIS
        ]

    # ADD THESE METHODS:
    def get_discounted_total_price(self, obj):
        return obj.discounted_total_price()

    def get_user(self, obj):
        """Return user info for admin views"""
        if obj.user:
            return {
                "id": obj.user.id,
                "username": obj.user.username,
                "email": obj.user.email
            }
        return None
```

**Why This Fix Is Necessary:**
The frontend's AdminOrders page expects a `user` object to display which customer placed each order. The `subtotal` field is needed to show the original price before any discounts are applied. Without these fields, the admin dashboard cannot display complete order information.

---

## Summary of All Backend Files That Need Changes

1. ✅ **backend/config/settings.py** - Add AUTHENTICATION_BACKENDS
2. ✅ **backend/users/serializers.py** - Remove non-existent fields from UserProfileSerializer
3. ✅ **backend/orders/views.py** - Add permission_classes to CheckoutView, add OrderListView and AllOrdersView
4. ✅ **backend/orders/urls.py** - Add order listing endpoints and status update alias
5. ✅ **backend/orders/serializers.py** - Add user and subtotal fields to OrderSerializer

---

## Testing the Fixes

After making these changes:

1. **Restart the Django server** to ensure all changes are loaded
2. **Test login** - Login should persist across page refreshes
3. **Test checkout** - Add items to cart and checkout should work
4. **Test order listing** - Orders page should display user's orders
5. **Test admin orders** - Manage Orders page should show all orders with user info
6. **Test status updates** - Changing order status should work without 404 errors
7. **Test discount application** - Applying discounts should work (CT6-42)
8. **Test invoice download** - Downloading invoices should work (CT6-44)

---

## Notes

- The `.env` file needs to remain with PostgreSQL credentials (not a code change, just configuration)
- The frontend changes in `AdminOrders.jsx` (status options) should remain to match backend status choices
- After these backend fixes, all three ticket features (CT6-42, CT6-43, CT6-44) should work correctly
