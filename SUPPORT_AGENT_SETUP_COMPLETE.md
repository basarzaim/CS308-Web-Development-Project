# Support Agent Role - Setup Complete ✅

## What Was Done

### 1. Updated User Model ✅
**File:** `backend/users/models.py`

Added `'Support Agent'` to `ROLE_CHOICES`:
```python
ROLE_CHOICES = [
    ('Customer', 'Customer'),
    ('Product Manager', 'Product Manager'),
    ('Sales Manager', 'Sales Manager'),
    ('Support Agent', 'Support Agent'),  # NEW!
]
```

Also increased `max_length` from 20 to 50 to accommodate longer role names.

### 2. Created Database Migration ✅
**Migration:** `users/migrations/0005_alter_customer_role.py`

Applied successfully - Support Agent role is now in the database.

### 3. Created Support Agent User ✅
**Script:** `backend/create_support_agent.py`

Created test user:
- Username: `supportagent`
- Email: `support@example.com`
- Password: `support123`
- Role: `Support Agent`

---

## How to Use

### View in Django Admin

1. **Start Django server** (if not running):
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Open Django Admin:**
   ```
   http://localhost:8000/admin
   ```

3. **Login as admin:**
   - Username: `admin`
   - Password: `admin`

4. **Navigate to Users:**
   - Click "Customers" or "Users"
   - You should see the role dropdown with **4 options**:
     - Customer
     - Product Manager
     - Sales Manager
     - **Support Agent** ← NEW!

5. **Edit any user:**
   - Click on a user
   - Scroll to "Role Information" section
   - Select "Support Agent" from dropdown
   - Save

---

## Test Support Agent Login

### Quick Test (2 minutes)

1. **Open frontend:**
   ```
   http://localhost:3000/login
   ```

2. **Login as Support Agent:**
   - Username: `supportagent` (or email: `support@example.com`)
   - Password: `support123`

3. **Verify Navigation:**
   - ✅ Should see: **Support Chat** tab only
   - ❌ Should NOT see: Comments, Orders, Stock, Analytics, Discounts

4. **Click Support Chat:**
   - Should navigate to `/admin/chat`
   - Should show the support dashboard

---

## Create Additional Support Agents

### Method 1: Via Django Admin (GUI)

1. Go to http://localhost:8000/admin
2. Users → Add User
3. Fill in details
4. Set Role to "Support Agent"
5. Save

### Method 2: Via Script

Run the create_support_agent.py script again with different details:

Edit `backend/create_support_agent.py`:
```python
username = 'supportagent2'  # Change this
email = 'support2@example.com'  # Change this
password = 'support456'  # Change this
```

Then run:
```bash
cd backend
python create_support_agent.py
```

### Method 3: Via Django Shell

```bash
cd backend
python manage.py shell
```

```python
from users.models import Customer

user = Customer.objects.create_user(
    username='supportagent3',
    email='support3@example.com',
    password='support789',
    first_name='Jane',
    last_name='Support'
)
user.role = 'Support Agent'
user.save()

print(f"Created: {user.username} with role: {user.role}")
exit()
```

---

## Update Existing Users to Support Agent

### Via Django Admin

1. Go to http://localhost:8000/admin
2. Users → Select user
3. Change "Role" to "Support Agent"
4. Save

### Via Django Shell

```bash
cd backend
python manage.py shell
```

```python
from users.models import Customer

# Update by username
user = Customer.objects.get(username='someuser')
user.role = 'Support Agent'
user.save()

# Or update by email
user = Customer.objects.get(email='user@example.com')
user.role = 'Support Agent'
user.save()

print(f"Updated {user.username} to {user.role}")
exit()
```

---

## Verify Role is Working

### Check User Object

```bash
cd backend
python manage.py shell
```

```python
from users.models import Customer

# Get Support Agent user
user = Customer.objects.get(username='supportagent')

# Check role
print(f"Username: {user.username}")
print(f"Email: {user.email}")
print(f"Role: {user.role}")
print(f"Is Staff: {user.is_staff}")

# Verify role choices
print("\nAvailable roles:")
for choice in Customer.ROLE_CHOICES:
    print(f"  - {choice[0]}")

exit()
```

Expected output:
```
Username: supportagent
Email: support@example.com
Role: Support Agent
Is Staff: False

Available roles:
  - Customer
  - Product Manager
  - Sales Manager
  - Support Agent
```

---

## Permission Summary

### Support Agent Can:
- ✅ View products (as customer)
- ✅ Make orders (as customer)
- ✅ Access Support Chat dashboard
- ✅ Respond to customer inquiries

### Support Agent Cannot:
- ❌ Moderate comments
- ❌ Manage orders
- ❌ Update stock
- ❌ View analytics
- ❌ Manage discounts

This ensures **security** - Support Agents have minimal privileges needed for their job.

---

## Troubleshooting

### Issue: Role not showing in Django admin dropdown

**Solution:**
1. Restart Django server
2. Hard refresh Django admin page (Ctrl+Shift+R)
3. Clear browser cache
4. Verify migration ran: `python manage.py migrate`

### Issue: User created but role not saved

**Solution:**
```bash
cd backend
python manage.py shell
```

```python
from users.models import Customer
user = Customer.objects.get(username='supportagent')
user.role = 'Support Agent'
user.save()
print(f"Role updated to: {user.role}")
exit()
```

### Issue: Frontend not showing Support Chat tab

**Solution:**
1. Logout and login again
2. Check user object in frontend console:
   ```javascript
   console.log(user)
   // Should show: role: "Support Agent"
   ```
3. Clear localStorage: `localStorage.clear()`
4. Hard refresh (Ctrl+Shift+R)

---

## Test All Roles

### Complete Test Sequence (5 minutes)

1. **Product Manager:**
   ```
   Login: productmanager / pm123456
   Expected: 3 tabs (Comments, Orders, Stock)
   ```

2. **Sales Manager:**
   ```
   Login: salesmanager / sm123456
   Expected: 2 tabs (Analytics, Discounts)
   ```

3. **Support Agent:**
   ```
   Login: supportagent / support123
   Expected: 1 tab (Support Chat)
   ```

4. **Admin:**
   ```
   Login: admin / admin
   Expected: ALL tabs visible
   ```

---

## Files Modified

### Backend
- ✅ `backend/users/models.py` - Added Support Agent to ROLE_CHOICES
- ✅ `backend/users/migrations/0005_alter_customer_role.py` - Migration
- ✅ `backend/create_support_agent.py` - User creation script

### Documentation
- ✅ `SUPPORT_AGENT_SETUP_COMPLETE.md` - This file

---

## Status

✅ **Support Agent role is now available in Django admin**
✅ **Test user created: supportagent / support123**
✅ **Frontend RBAC already configured**
✅ **Migration applied successfully**
✅ **Ready to use!**

---

**Setup Time:** 2 minutes
**Last Updated:** 2026-01-13
**Status:** COMPLETE ✅
