# Stock Quantity Limit - Add to Cart Validation

## Overview

Users can now select a quantity when adding products to cart, with strict enforcement of stock limits both on the frontend and backend. The system prevents users from adding more items than are available in stock.

---

## Changes Made

### 1. Backend: Stock Validation in Cart (backend/cart/views.py)

#### AddToCartView - Stock Checks:

**Added:**
```python
# Check if product is out of stock
if not product.stock or product.stock <= 0:
    return response.Response(
        {"error": "This product is out of stock"},
        status=status.HTTP_400_BAD_REQUEST
    )

# Check if new quantity exceeds stock
if new_quantity > product.stock:
    return response.Response(
        {"error": f"Only {product.stock} items available in stock. You already have {item.quantity} in your cart."},
        status=status.HTTP_400_BAD_REQUEST
    )
```

**What It Does:**
- ✅ Rejects add to cart if product stock is 0
- ✅ Checks existing cart quantity + new quantity
- ✅ Returns helpful error message showing current cart quantity
- ✅ Prevents over-purchasing

#### UpdateCartItemView - Stock Validation:

**Added:**
```python
# Check if quantity exceeds stock
if qty > cart_item.product.stock:
    return response.Response(
        {"error": f"Only {cart_item.product.stock} items available in stock"},
        status=status.HTTP_400_BAD_REQUEST
    )
```

**What It Does:**
- ✅ Validates quantity updates in checkout/cart
- ✅ Prevents users from manually increasing quantity beyond stock
- ✅ Returns clear error message

---

### 2. Frontend: Quantity Selector (frontend/src/pages/Product.jsx)

#### Added State Variables:

```javascript
const [cartError, setCartError] = useState("");
const [quantity, setQuantity] = useState(1);
```

#### Added Quantity Change Handler:

```javascript
function handleQuantityChange(newQty) {
  const stock = product.stock || 0;
  const qty = Math.max(1, Math.min(newQty, stock));
  setQuantity(qty);
}
```

**Logic:**
- Minimum: 1
- Maximum: product.stock
- Automatically clamps invalid values

#### Updated Add to Cart Handler:

```javascript
async function handleAddToCart() {
  setCartNotice("");
  setCartError("");
  try {
    await addToCart(productId, quantity);  // ✅ Now sends selected quantity
    setCartNotice(`${quantity} item(s) added to cart!`);
    setQuantity(1);  // Reset to 1 after success
    setTimeout(() => setCartNotice(""), 4000);
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message || "Failed to add to cart";
    setCartError(errorMsg);  // ✅ Shows backend error
    setTimeout(() => setCartError(""), 6000);
  }
}
```

**Changes:**
- ✅ Sends quantity parameter to backend
- ✅ Shows backend error messages
- ✅ Resets quantity to 1 after successful add
- ✅ Longer timeout for errors (6s vs 4s)

#### Added Quantity Selector UI:

```javascript
{!isOutOfStock && (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
    <label style={{ fontWeight: '500', fontSize: '14px' }}>Quantity:</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* Minus Button */}
      <button
        type="button"
        onClick={() => handleQuantityChange(quantity - 1)}
        disabled={quantity <= 1}
        style={{ /* ... */ }}
      >
        −
      </button>

      {/* Number Input */}
      <input
        type="number"
        min="1"
        max={product.stock}
        value={quantity}
        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
        style={{ /* ... */ }}
      />

      {/* Plus Button */}
      <button
        type="button"
        onClick={() => handleQuantityChange(quantity + 1)}
        disabled={quantity >= product.stock}
        style={{ /* ... */ }}
      >
        +
      </button>

      {/* Stock Indicator */}
      <span style={{ fontSize: '13px', color: '#666' }}>
        (Max: {product.stock})
      </span>
    </div>
  </div>
)}
```

**Features:**
- ✅ Minus button (disabled when quantity = 1)
- ✅ Number input (constrained to 1-stock)
- ✅ Plus button (disabled when quantity = stock)
- ✅ "Max: X" label showing available stock
- ✅ Only shown when product is in stock

---

## User Experience

### Scenario 1: Product In Stock (stock = 10)

```
┌─────────────────────────────────────┐
│ MacBook Pro 2024                    │
│ $1,499.00 | 10 in stock | 24 months │
│                                     │
│ Quantity: [−] [5] [+] (Max: 10)    │
│                                     │
│ ┌─────────────────┐                │
│ │ Add to cart     │                │
│ └─────────────────┘                │
└─────────────────────────────────────┘
```

**User Actions:**
1. Click `+` to increase quantity
2. Click `−` to decrease quantity
3. Type directly into number input
4. Select "Add to cart"
5. See success message: "5 item(s) added to cart!"

---

### Scenario 2: Low Stock (stock = 2)

```
┌─────────────────────────────────────┐
│ iPhone 15 Pro                       │
│ $999.00 | 2 in stock | 12 months   │
│                                     │
│ Quantity: [−] [2] [+̶] (Max: 2)     │  ← Plus button disabled
│                                     │
│ ┌─────────────────┐                │
│ │ Add to cart     │                │
│ └─────────────────┘                │
└─────────────────────────────────────┘
```

**Behavior:**
- Plus button grayed out when quantity = stock
- User can't increase beyond 2
- Shows "(Max: 2)" clearly

---

### Scenario 3: Out of Stock (stock = 0)

```
┌─────────────────────────────────────┐
│ Samsung Galaxy S24                  │
│ $899.00 | Out of stock | 12 months │
│                                     │
│ ┌─────────────────┐                │
│ │ Out of Stock    │  ← Disabled    │
│ └─────────────────┘                │
└─────────────────────────────────────┘
```

**Behavior:**
- No quantity selector shown
- Button disabled and grayed out
- Text: "Out of Stock"

---

### Scenario 4: User Already Has Items in Cart

**Setup:**
- Product stock: 5
- User already has 3 in cart
- User tries to add 3 more

**Result:**
```
❌ Only 5 items available in stock. You already have 3 in your cart.
```

**What Happens:**
- Backend checks existing cart quantity
- Calculates: 3 (existing) + 3 (new) = 6
- Rejects because 6 > 5 (stock)
- Shows helpful error message

---

## API Error Responses

### Error 1: Out of Stock

**Request:**
```json
POST /api/cart/add/
{
  "product_id": 1,
  "quantity": 1
}
```

**Response:**
```json
HTTP 400 Bad Request
{
  "error": "This product is out of stock"
}
```

---

### Error 2: Exceeds Stock (New Addition)

**Request:**
```json
POST /api/cart/add/
{
  "product_id": 1,
  "quantity": 10
}
```

**Product Stock:** 5
**Current Cart:** 2

**Response:**
```json
HTTP 400 Bad Request
{
  "error": "Only 5 items available in stock. You already have 2 in your cart."
}
```

---

### Error 3: Exceeds Stock (Update)

**Request:**
```json
PATCH /api/cart/items/123/
{
  "quantity": 100
}
```

**Product Stock:** 5

**Response:**
```json
HTTP 400 Bad Request
{
  "error": "Only 5 items available in stock"
}
```

---

## Quantity Selector Controls

### Minus Button (−)

| Quantity | Button State |
|----------|-------------|
| 1 | Disabled (grayed out) |
| 2-stock | Enabled |

**Action:** Decreases quantity by 1

---

### Plus Button (+)

| Quantity | Stock | Button State |
|----------|-------|-------------|
| 1-9 | 10 | Enabled |
| 10 | 10 | Disabled (grayed out) |

**Action:** Increases quantity by 1

---

### Number Input

**Properties:**
- Type: `number`
- Min: `1`
- Max: `product.stock`
- Width: `60px`

**Behavior:**
- User can type directly
- Automatically clamped to 1-stock range
- Invalid inputs (NaN, 0, negative) default to 1

---

## Visual States

### Active Quantity Controls:
```css
background: white
border: 1px solid #ddd
cursor: pointer
```

### Disabled Quantity Controls:
```css
background: #f5f5f5
border: 1px solid #ddd
cursor: not-allowed
```

### Success Message:
```
✅ 5 item(s) added to cart! Go to checkout
```
- Green text
- Link to checkout
- Auto-hides after 4 seconds

### Error Message:
```
❌ Only 5 items available in stock. You already have 3 in your cart.
```
- Red text
- Auto-hides after 6 seconds

---

## Testing

### Test 1: Add Single Item

1. Go to product page (stock = 10)
2. Leave quantity at 1 (default)
3. Click "Add to cart"
4. **Expected:** "1 item(s) added to cart!"

---

### Test 2: Add Multiple Items

1. Go to product page (stock = 10)
2. Click `+` button 4 times (quantity = 5)
3. Click "Add to cart"
4. **Expected:** "5 item(s) added to cart!"

---

### Test 3: Exceed Stock

1. Go to product page (stock = 3)
2. Increase quantity to 3
3. Click "Add to cart"
4. **Expected:** Success
5. Refresh page
6. Try to add 2 more
7. **Expected:** Error - "Only 3 items available in stock. You already have 3 in your cart."

---

### Test 4: Type Invalid Quantity

1. Go to product page (stock = 10)
2. Type `999` in quantity input
3. **Expected:** Automatically clamped to 10
4. Type `0`
5. **Expected:** Automatically set to 1

---

### Test 5: Minus Button Disabled

1. Go to product page
2. Quantity should default to 1
3. **Expected:** Minus button is grayed out and disabled
4. Click minus button
5. **Expected:** Nothing happens

---

### Test 6: Plus Button Disabled

1. Go to product page (stock = 3)
2. Click `+` twice (quantity = 3)
3. **Expected:** Plus button becomes grayed out and disabled
4. Click plus button
5. **Expected:** Nothing happens

---

### Test 7: Out of Stock Product

1. Set product stock to 0 (Django admin)
2. Go to product page
3. **Expected:**
   - No quantity selector shown
   - Button shows "Out of Stock"
   - Button is disabled and grayed

---

## Backend Flow

### Adding to Cart:

```
User clicks "Add to cart" with quantity = 5
    ↓
Frontend: addToCart(productId, 5)
    ↓
Backend: POST /api/cart/add/ { product_id: 1, quantity: 5 }
    ↓
Check: Is product.stock > 0?
    ↓ No → Return 400 "Out of stock"
    ↓ Yes
Check: Does user already have items?
    ↓ Yes (has 3)
Calculate: new_quantity = 3 + 5 = 8
    ↓
Check: Is 8 > product.stock (10)?
    ↓ No → Add to cart successfully
    ↓ Yes → Return 400 "Only X items available..."
```

---

## Edge Cases Handled

### 1. User Types Negative Number
**Input:** `-5`
**Result:** Clamped to `1`

### 2. User Types Zero
**Input:** `0`
**Result:** Clamped to `1`

### 3. User Types Beyond Stock
**Input:** `999` (stock = 10)
**Result:** Clamped to `10`

### 4. User Types Non-Number
**Input:** `abc`
**Result:** Defaults to `1`

### 5. Multiple Additions
**Scenario:** User adds 3, then adds 4 more (stock = 5)
**Result:** Backend rejects second addition with error

### 6. Product Stock Changes During Session
**Scenario:** User has 5 in cart, admin reduces stock to 3
**Result:** Checkout will validate and reject order

---

## Files Modified

1. **backend/cart/views.py**
   - Added stock validation to `AddToCartView`
   - Added stock validation to `UpdateCartItemView`

2. **frontend/src/pages/Product.jsx**
   - Added `quantity` state
   - Added `cartError` state
   - Added `handleQuantityChange` function
   - Updated `handleAddToCart` to send quantity
   - Added quantity selector UI (−, input, +)
   - Added error display

---

## Summary

✅ Quantity selector with +/− buttons and number input
✅ Backend validates stock on add and update
✅ Shows "Max: X" to inform user of stock limit
✅ Prevents exceeding stock through UI constraints
✅ Backend enforces limits even if UI bypassed
✅ Helpful error messages show existing cart quantity
✅ Quantity resets to 1 after successful add
✅ Disabled buttons when at min/max limits
✅ All edge cases handled (negative, zero, NaN, etc.)

**User can now control quantity when adding to cart, with strict stock limits enforced!**
