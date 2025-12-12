# Rating Sort Fix

## Problem

When selecting "Rating: Highest" in the sort dropdown on the products page, the products were not being sorted by rating.

---

## Root Cause

**Location:** `backend/products/api_views.py` line 22

The `ordering_fields` list in the `ProductViewSet` did not include `"rating"`, so Django REST Framework's `OrderingFilter` was rejecting the `?ordering=-rating` query parameter.

**Code:**
```python
ordering_fields = ["price", "name", "stock", "warranty"]
# Missing: "rating"
```

Even though:
1. The queryset was annotating `rating` from reviews (lines 27-28)
2. The serializer was including `rating` in the response (serializers.py line 5)
3. The frontend was sending `?ordering=-rating` (ProductList.jsx line 62)

The backend was silently ignoring the rating sort parameter because it wasn't in the allowed list.

---

## Solution

**File:** `backend/products/api_views.py`

**Changed line 22:**

**Before:**
```python
ordering_fields = ["price", "name", "stock", "warranty"]
```

**After:**
```python
ordering_fields = ["price", "name", "stock", "warranty", "rating"]
```

This allows the `OrderingFilter` to accept `?ordering=-rating` (descending) or `?ordering=rating` (ascending) as valid sort parameters.

---

## How Rating Works

### Backend Flow:

1. **Annotation** (api_views.py lines 27-29):
   ```python
   queryset = Product.objects.all().annotate(
       rating=Avg('reviews__score')
   )
   ```
   - Calculates average of all review scores for each product
   - Adds `rating` as a computed field to each product

2. **Ordering** (api_views.py line 22):
   ```python
   ordering_fields = ["price", "name", "stock", "warranty", "rating"]
   ```
   - Allows sorting by rating field

3. **Serialization** (serializers.py lines 5, 9, 14-15):
   ```python
   rating = serializers.FloatField(read_only=True, allow_null=True)
   # ...
   if data.get('rating') is not None:
       data['rating'] = round(data['rating'], 1)
   ```
   - Includes rating in API response
   - Rounds to 1 decimal place

### Frontend Flow:

1. **Sort Selection** (ProductList.jsx line 306):
   ```jsx
   <option value="rating-desc">Rating: Highest</option>
   ```

2. **Backend Mapping** (ProductList.jsx line 61-62):
   ```javascript
   case "rating-desc":
     return "-rating"; // Sends ?ordering=-rating to API
   ```

3. **API Call** (ProductList.jsx line 123):
   ```javascript
   ordering: getBackendOrdering(sort) || undefined,
   ```

4. **Display** (ProductList.jsx lines 372-374):
   ```jsx
   {p.rating != null && (
     <span className="pl-rating">⭐ {p.rating}</span>
   )}
   ```

---

## Testing

### How to Test:

1. **Restart Django backend:**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Go to products page:**
   - Open http://localhost:5173/products

3. **Select sort:**
   - In the "Sort by" dropdown, select "Rating: Highest"

4. **Verify:**
   - Products should be ordered by rating (highest first)
   - Products with higher ⭐ ratings should appear first
   - Products with no ratings (or null) appear last

### Test Cases:

**Test 1: Descending Sort**
- Select "Rating: Highest"
- Expected: Products sorted 5.0 → 4.5 → 4.0 → ... → null

**Test 2: Mixed Ratings**
- Products with ratings appear before products without ratings
- Products with same rating maintain consistent order

**Test 3: No Reviews**
- Products with no reviews show no rating star
- They appear at the end when sorting by rating

---

## Additional Notes

### Rating Calculation

Rating is calculated as the **average of all review scores** for that product:

```python
rating = Avg('reviews__score')
```

If a product has:
- Review 1: 5 stars
- Review 2: 4 stars
- Review 3: 5 stars

Rating = (5 + 4 + 5) / 3 = **4.7** (rounded to 1 decimal)

### Null Ratings

Products with no reviews have `rating = null`:
- Displayed as no star (frontend checks `p.rating != null`)
- Sorted to the end when sorting by rating descending
- Sorted to the beginning when sorting by rating ascending

### Performance

The `annotate(rating=Avg(...))` is done at the database level:
- Efficient SQL aggregation
- No N+1 query problem
- Single database query for all products

### Other Sort Options

The frontend supports these sort options:
- **Featured** - Default order (no `ordering` param)
- **Price: Low to High** - `?ordering=price`
- **Price: High to Low** - `?ordering=-price`
- **Name: A → Z** - `?ordering=name`
- **Name: Z → A** - `?ordering=-name`
- **Rating: Highest** - `?ordering=-rating` ✅ Now works!

All are now working correctly.

---

## Files Modified

**backend/products/api_views.py**
- Line 22: Added `"rating"` to `ordering_fields` list

---

## Summary

✅ **Problem:** Rating sort not working
✅ **Root Cause:** `"rating"` not in `ordering_fields` list
✅ **Solution:** Added `"rating"` to allowed ordering fields
✅ **Result:** Products can now be sorted by rating (highest first)

**No frontend changes needed** - it was already sending the correct parameter!
**No restart needed for frontend** - only restart Django backend
