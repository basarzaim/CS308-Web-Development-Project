# Out of Stock Product Handling

## Overview

The "Add to Cart" button is now disabled when a product is out of stock. Users can see the product details but cannot add it to their cart.

---

## Changes Made

### File: frontend/src/pages/Product.jsx

**1. Added Stock Check Variable:**
```javascript
const isOutOfStock = !product.stock || product.stock <= 0;
const stockLabel = isOutOfStock
  ? "Out of stock"
  : `${product.stock} in stock`;
```

**2. Updated Add to Cart Button:**
```javascript
<button
  type="button"
  className="primary-btn"
  onClick={handleAddToCart}
  disabled={isOutOfStock}                    // ✅ Disabled when out of stock
  style={isOutOfStock ? {
    opacity: 0.5,                            // ✅ Grayed out appearance
    cursor: 'not-allowed',                   // ✅ Shows forbidden cursor
    backgroundColor: '#ccc'                  // ✅ Gray background
  } : {}}
>
  {isOutOfStock ? "Out of Stock" : "Add to cart"}  // ✅ Dynamic button text
</button>
```

---

## Behavior

### When Product Has Stock (stock > 0):
```
┌────────────────────┐
│  MacBook Pro 2024  │
│  $1,499.00         │
│  15 in stock       │
│ ┌────────────────┐ │
│ │ Add to cart    │ │  ← Blue, clickable
│ └────────────────┘ │
└────────────────────┘
```

**Button State:**
- ✅ Enabled (clickable)
- ✅ Blue background
- ✅ Normal cursor
- ✅ Text: "Add to cart"

---

### When Product is Out of Stock (stock = 0):
```
┌────────────────────┐
│  MacBook Pro 2024  │
│  $1,499.00         │
│  Out of stock      │
│ ┌────────────────┐ │
│ │ Out of Stock   │ │  ← Gray, not clickable
│ └────────────────┘ │
└────────────────────┘
```

**Button State:**
- ❌ Disabled (not clickable)
- ⚫ Gray background (#ccc)
- 🚫 "Not allowed" cursor
- 📝 Text: "Out of Stock"
- 👻 50% opacity (semi-transparent)

---

## Visual States

### In Stock Button:
```css
background: blue (default primary-btn style)
cursor: pointer
opacity: 1
text: "Add to cart"
```

### Out of Stock Button:
```css
background: #ccc (gray)
cursor: not-allowed
opacity: 0.5
text: "Out of Stock"
disabled: true
```

---

## Stock Display

The stock information is shown in the product meta row:

**Stock > 0:**
```
$1,499.00 | 15 in stock | Warranty: 24 months
```

**Stock = 0:**
```
$1,499.00 | Out of stock | Warranty: 24 months
```

---

## User Experience

### Customer Viewing Out of Stock Product:

1. **Navigate to product page**
   - Product details still visible
   - Price still shown
   - Description still readable

2. **See "Out of stock" label**
   - Clear indication of availability
   - Shown with price and warranty info

3. **Attempt to add to cart**
   - Button is grayed out
   - Cursor changes to "not allowed" 🚫
   - Click has no effect (button disabled)
   - Text says "Out of Stock" instead of "Add to cart"

4. **User actions:**
   - Can still rate the product
   - Can still comment on the product
   - Cannot add to cart
   - May wish to check back later

---

## Backend Integration

The frontend checks the `stock` field from the product API response:

**API Response Example:**
```json
{
  "id": 1,
  "name": "MacBook Pro 2024",
  "price": "1499.00",
  "stock": 0,        ← Checked by frontend
  "warranty": 24,
  "description": "...",
  "category": "laptops"
}
```

**Stock Check Logic:**
```javascript
const isOutOfStock = !product.stock || product.stock <= 0;
```

Checks for:
- `stock === 0` → Out of stock
- `stock === null` → Out of stock
- `stock === undefined` → Out of stock
- `stock < 0` → Out of stock (shouldn't happen but handled)

---

## Testing

### Test 1: Product In Stock

1. **Create/find product with stock > 0**
2. **Navigate to product page**
3. **Expected:**
   - Shows "X in stock" label
   - "Add to cart" button is blue
   - Button is clickable
   - Can add to cart successfully

### Test 2: Product Out of Stock

1. **Set product stock to 0** (via Django admin)
2. **Navigate to product page**
3. **Expected:**
   - Shows "Out of stock" label
   - Button text: "Out of Stock"
   - Button is grayed out
   - Button cannot be clicked
   - Cursor shows "not allowed" icon

### Test 3: Adding Product with Stock, Then Running Out

1. **Product starts with stock = 2**
2. **User 1 adds 1 to cart** (stock becomes 1)
3. **User 2 adds 1 to cart** (stock becomes 0)
4. **User 3 views product page**
5. **Expected:** Button disabled, shows "Out of Stock"

---

## Manual Testing via Django Admin

### Set Product to Out of Stock:

1. Go to http://localhost:8000/admin/
2. Click **Products**
3. Select a product
4. Set **Stock** to `0`
5. Click **Save**
6. Visit product page on frontend
7. Verify button is disabled

### Set Product Back In Stock:

1. Go to Django admin
2. Select same product
3. Set **Stock** to `10`
4. Click **Save**
5. Refresh product page on frontend
6. Verify button is enabled again

---

## Future Enhancements

### Possible Improvements:

1. **Email Notification:**
   - "Notify me when back in stock" button
   - User enters email
   - Gets notified when stock > 0

2. **Wishlist Integration:**
   - Show "Add to Wishlist" as alternative
   - User can save for later

3. **Alternative Products:**
   - Show similar in-stock products
   - "Customers also viewed" section

4. **Stock Countdown:**
   - Show "Only 3 left!" for low stock
   - Create urgency when stock < 5

5. **Expected Restock Date:**
   - "Expected back in stock: March 15"
   - Set by product manager

---

## Summary

✅ Add to Cart button disabled when stock = 0
✅ Button text changes to "Out of Stock"
✅ Visual feedback (gray, semi-transparent, no-cursor)
✅ Stock label clearly shows availability
✅ Users can still view product details
✅ Prevents adding unavailable items to cart
