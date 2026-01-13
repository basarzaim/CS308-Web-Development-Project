# Quick RBAC Setup Guide (5 Minutes)

## Step 1: Create Test Users (2 minutes)

```bash
cd backend
python create_role_users.py
```

**Expected Output:**
```
✅ Created Product Manager user:
   Username: productmanager
   Password: pm123456

✅ Created Sales Manager user:
   Username: salesmanager
   Password: sm123456

✅ Created Support Agent user:
   Username: supportagent
   Password: support123
```

## Step 2: Assign Roles (2 minutes)

### Method A: Via Django Shell (Recommended)

```bash
cd backend
python manage.py shell
```

```python
from django.contrib.auth.models import User

# Product Manager
pm = User.objects.get(username='productmanager')
pm.role = 'Product Manager'
pm.save()
print(f"✅ {pm.username} role set to: {pm.role}")

# Sales Manager
sm = User.objects.get(username='salesmanager')
sm.role = 'Sales Manager'
sm.save()
print(f"✅ {sm.username} role set to: {sm.role}")

# Support Agent
sa = User.objects.get(username='supportagent')
sa.role = 'Support Agent'
sa.save()
print(f"✅ {sa.username} role set to: {sa.role}")

# Exit
exit()
```

### Method B: Update AuthContext (Alternative)

If your user model doesn't have a `role` field, update your AuthContext to return role from the API:

**File:** `frontend/src/context/AuthContext.jsx`

Add mock role assignment based on username:

```javascript
const getUserInfo = async (token) => {
  const response = await fetch("http://localhost:8000/api/users/me/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const userData = await response.json();

  // Mock role assignment (TEMPORARY)
  if (userData.username === 'productmanager') userData.role = 'Product Manager';
  if (userData.username === 'salesmanager') userData.role = 'Sales Manager';
  if (userData.username === 'supportagent') userData.role = 'Support Agent';

  return userData;
};
```

## Step 3: Test Each Role (1 minute)

### Test 1: Product Manager
```
1. Go to http://localhost:3000/login
2. Login: productmanager / pm123456
3. Check navigation - should see:
   ✅ Moderate Comments
   ✅ Manage Orders
   ✅ Manage Stock
```

### Test 2: Sales Manager
```
1. Logout
2. Login: salesmanager / sm123456
3. Check navigation - should see:
   ✅ Sales Analytics
   ✅ Manage Discounts
```

### Test 3: Support Agent
```
1. Logout
2. Login: supportagent / support123
3. Check navigation - should see:
   ✅ Support Chat (only this!)
```

## Verification Checklist

- [ ] Product Manager sees 3 tabs (Comments, Orders, Stock)
- [ ] Sales Manager sees 2 tabs (Analytics, Discounts)
- [ ] Support Agent sees 1 tab (Support Chat)
- [ ] Admin sees all tabs
- [ ] Navigation updates immediately after login

## Troubleshooting

### Users created but no tabs showing

**Check if role is set:**
```bash
python manage.py shell
```
```python
from django.contrib.auth.models import User
user = User.objects.get(username='productmanager')
print(f"Role: {getattr(user, 'role', 'NOT SET')}")
```

**If "NOT SET":**
- User model might not have `role` field
- Use Method B (AuthContext mock roles)
- Or add role field to User model

### All tabs showing for everyone

**Check:**
1. User is not set as `is_staff=True`
2. Permission functions are imported in App.jsx
3. Hard refresh browser (Ctrl+Shift+R)

### Role not updating after assignment

**Solutions:**
1. Logout and login again
2. Clear browser localStorage: `localStorage.clear()`
3. Restart backend server

## Quick Role Assignment Script

Create `assign_roles.py` in backend:

```python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User

roles = {
    'productmanager': 'Product Manager',
    'salesmanager': 'Sales Manager',
    'supportagent': 'Support Agent',
}

for username, role in roles.items():
    try:
        user = User.objects.get(username=username)
        user.role = role
        user.save()
        print(f"✅ {username} → {role}")
    except User.DoesNotExist:
        print(f"❌ User {username} not found")
```

Run:
```bash
python assign_roles.py
```

---

**Time Required:** 5 minutes
**Status:** Ready to use ✅
