# Pagination Fix - Dynamic Page Size

## Overview

Fixed the issue where selecting "8 per page" in the product list was showing 10-12 items instead. The frontend can now dynamically control the number of items displayed per page.

---

## Problem

The Django REST Framework pagination was configured with a hardcoded `PAGE_SIZE: 12` and used the default `PageNumberPagination` class, which **doesn't support** the `page_size` query parameter. This meant the frontend's `page_size` parameter was being ignored.

**User Report:**
> "When we select 8 per page on products page it still shows 10 items"

---

## Root Cause

### Before (backend/config/settings.py):
```python
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 12,  # ❌ Fixed page size, no query param support
}
```

**Why It Failed:**
- `PageNumberPagination` only uses the `PAGE_SIZE` setting
- It **does not** read the `page_size` query parameter
- Frontend was sending `?page_size=8` but backend ignored it
- Always returned 12 items per page

---

## Solution

Created a custom pagination class that enables the `page_size_query_param`:

### 1. Created Custom Pagination Class

**File:** `backend/config/pagination.py`

```python
from rest_framework.pagination import PageNumberPagination

class DynamicPageSizePagination(PageNumberPagination):
    """
    Pagination class that allows clients to set the page size via query parameter.

    Usage:
    - Default page size: 12 items
    - Client can override: ?page_size=8
    - Maximum allowed: 100 items per page
    """
    page_size = 12  # Default when no query param provided
    page_size_query_param = 'page_size'  # ✅ Enable ?page_size=N
    max_page_size = 100  # Prevent abuse
```

### 2. Updated Settings

**File:** `backend/config/settings.py`

```python
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'config.pagination.DynamicPageSizePagination',
    # ✅ Removed 'PAGE_SIZE': 12 (now defined in pagination class)
}
```

---

## How It Works Now

### Frontend Request:
```javascript
// In ProductList.jsx
const params = {
  page: 1,
  page_size: 8,  // ✅ This now works!
  search: "laptop",
  category: "laptops"
};
```

### Backend Response:
```json
{
  "count": 45,
  "next": "http://localhost:8000/api/products/?page=2&page_size=8",
  "previous": null,
  "results": [
    // ✅ Exactly 8 products returned
    { "id": 1, "name": "Product 1", ... },
    { "id": 2, "name": "Product 2", ... },
    ...
  ]
}
```

---

## Available Page Sizes

The frontend offers these options (all now working correctly):

| Selection | Items Displayed | Query Param |
|-----------|----------------|-------------|
| 8 per page | 8 | `?page_size=8` |
| 12 per page (default) | 12 | `?page_size=12` |
| 16 per page | 16 | `?page_size=16` |
| 24 per page | 24 | `?page_size=24` |
| 36 per page | 36 | `?page_size=36` |

**Maximum Allowed:** 100 items per page (prevents abuse)

---

## Testing

### Test 1: Default Page Size (12)
1. Go to `/products`
2. Don't select any page size (uses default)
3. **Expected:** Shows 12 products per page

### Test 2: Select 8 Per Page
1. Go to `/products`
2. Click "Show" dropdown
3. Select "8 per page"
4. **Expected:** Shows exactly 8 products per page

### Test 3: Select 36 Per Page
1. Go to `/products`
2. Click "Show" dropdown
3. Select "36 per page"
4. **Expected:** Shows 36 products per page (if enough products exist)

### Test 4: Change Page Size Mid-Browse
1. Browse to page 2 with 12 per page
2. Change to 8 per page
3. **Expected:**
   - Resets to page 1
   - Shows 8 products
   - Pagination numbers recalculate

---

## API Endpoint Testing

### Direct API Call:

```bash
# Default (12 items)
curl http://localhost:8000/api/products/

# 8 items per page
curl http://localhost:8000/api/products/?page_size=8

# 24 items per page
curl http://localhost:8000/api/products/?page_size=24

# With other filters
curl http://localhost:8000/api/products/?page_size=8&category=laptops&search=mac
```

---

## Code Changes

### Files Modified:

1. **backend/config/pagination.py** (NEW)
   - Created `DynamicPageSizePagination` class
   - Enables `page_size_query_param`
   - Sets `max_page_size` to 100

2. **backend/config/settings.py**
   - Changed `DEFAULT_PAGINATION_CLASS` to custom class
   - Removed `PAGE_SIZE` setting (now in pagination class)

### Files NOT Modified:

- **frontend/src/pages/ProductList.jsx** - Already sending `page_size` correctly
- **backend/products/api_views.py** - Already using ViewSet pagination correctly

---

## How Django REST Framework Pagination Works

### Before (Default Pagination):
```
User selects "8 per page"
    ↓
Frontend: ?page_size=8
    ↓
Backend: PageNumberPagination (ignores page_size param)
    ↓
Backend: Uses settings.PAGE_SIZE = 12
    ↓
Response: 12 items ❌
```

### After (Custom Pagination):
```
User selects "8 per page"
    ↓
Frontend: ?page_size=8
    ↓
Backend: DynamicPageSizePagination (reads page_size param)
    ↓
Backend: Uses param value = 8
    ↓
Response: 8 items ✅
```

---

## Query Parameter Details

### Supported Parameters:

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `page` | Page number | `?page=2` |
| `page_size` | Items per page | `?page_size=8` |
| `search` | Search query | `?search=laptop` |
| `category` | Filter by category | `?category=laptops` |
| `ordering` | Sort order | `?ordering=-price` |

### Combined Example:
```
GET /api/products/?page=2&page_size=8&category=laptops&ordering=price
```
Returns:
- Page 2
- 8 items per page
- Only laptops
- Sorted by price ascending

---

## Configuration Options

### In DynamicPageSizePagination Class:

```python
class DynamicPageSizePagination(PageNumberPagination):
    page_size = 12  # Default when no param provided

    page_size_query_param = 'page_size'  # Query param name
    # Change to 'size' if you want ?size=8 instead

    max_page_size = 100  # Maximum allowed
    # Prevents users from doing ?page_size=999999
```

---

## Security & Performance

### Protection Against Abuse:

1. **Maximum Page Size:** 100 items
   - User can't request `?page_size=999999`
   - Prevents database overload

2. **Validation:**
   - DRF automatically validates `page_size` is a positive integer
   - Invalid values fall back to default (12)

3. **Database Efficiency:**
   - Uses `LIMIT` and `OFFSET` in SQL queries
   - Only fetches requested number of items

### Example SQL Query:
```sql
-- When ?page_size=8&page=2
SELECT * FROM products_product
ORDER BY id
LIMIT 8 OFFSET 8;
```

---

## Restart Required?

**No restart needed!** Django automatically detects:
- New Python files (`pagination.py`)
- Settings changes (`settings.py`)

Just refresh your frontend, and it should work immediately.

### If Issues Persist:
```bash
# Restart Django dev server
cd backend
python manage.py runserver
```

---

## Summary

✅ Created custom pagination class with `page_size_query_param`
✅ Updated settings to use new pagination class
✅ Frontend can now control page size dynamically
✅ Default is 12 items, with options: 8, 12, 16, 24, 36
✅ Maximum 100 items per page for security
✅ No frontend changes needed - already sending correct parameter

**User Issue Resolved:**
"8 per page" now shows exactly 8 items ✅

---

## Files Modified

1. `backend/config/pagination.py` - Created custom pagination class
2. `backend/config/settings.py` - Updated DEFAULT_PAGINATION_CLASS
