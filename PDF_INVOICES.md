# PDF Invoices with Customer Information

## Overview

Users can now download professional PDF invoices for their orders. The invoices include comprehensive customer information, order details, itemized product lists, and pricing breakdowns with discounts.

---

## Features

✅ Professional PDF invoice generation
✅ Company header with branding
✅ Customer information (name, email, phone, shipping address)
✅ Order details (ID, date, status)
✅ Itemized product list with quantities and prices
✅ Subtotal, discount, and total calculations
✅ Professional footer with contact information
✅ Download directly from Orders page
✅ Secure - users can only download their own invoices

---

## Changes Made

### 1. Backend: Enhanced PDF Generation (backend/orders/utils.py)

**Complete Rewrite** - Transformed from basic invoice to professional document:

#### Before:
```python
def generate_invoice_pdf(order):
    p.drawString(100, 750, "Order Invoice")
    p.drawString(100, 720, f"Order ID: {order.id}")
    p.drawString(100, 700, f"User: {order.user.email}")
    p.drawString(100, 680, f"Total Price: {order.total_price}")
    # Basic item list
```

#### After:
```python
def generate_invoice_pdf(order):
    """
    Generate a professional PDF invoice with:
    - Company header (blue background, white text)
    - Customer details (name, email, phone, shipping address)
    - Order information (ID, date, status)
    - Itemized product table with headers
    - Pricing breakdown (subtotal, discount, total)
    - Professional footer
    """
```

#### New Features in PDF:

**1. Professional Header:**
- Dark blue background band across top
- Company name "CS308 E-Commerce" in large font
- Company address
- "INVOICE" title on right side

**2. Two-Column Layout:**

**Left: Invoice Details**
- Invoice #: 123
- Date: December 12, 2025
- Status: Processing

**Right: Customer Information**
- Name: John Doe
- Email: customer@example.com
- Phone: +90 555 123 4567
- Shipping Address:
  - Street address (wrapped if long)
  - City

**3. Professional Table:**
```
Product               | Quantity | Unit Price | Subtotal
MacBook Pro 2024     | 2        | $1,499.00  | $2,998.00
iPhone 15 Pro        | 1        | $999.00    | $999.00
```

**4. Pricing Section:**
```
Subtotal:                    $3,997.00
Discount (10%):              -$399.70
--------------------------------------
Total:                       $3,597.30
```

**5. Footer:**
- "Thank you for your business!"
- Contact email: support@cs308ecommerce.com
- Page number

---

### 2. Backend: Download Invoice Endpoint (backend/orders/views.py)

**Added New View:**
```python
class DownloadInvoiceView(APIView):
    """
    Download PDF invoice for an order.
    Returns the PDF file directly as a download.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        # Get order for current user only (security)
        order = get_object_or_404(Order, pk=pk, user=request.user)

        # Generate PDF
        pdf_buffer = generate_invoice_pdf(order)

        # Return PDF as downloadable file
        response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{order.id}.pdf"'

        return response
```

**Security:**
- ✅ Requires authentication (`IsAuthenticated`)
- ✅ Users can only download **their own** invoices
- ✅ Returns 404 if order doesn't belong to user

---

### 3. Backend: URL Routing (backend/orders/urls.py)

**Added New Endpoint:**
```python
path("<int:pk>/download-invoice/", DownloadInvoiceView.as_view(), name="download-invoice"),
```

**Full URL:**
```
GET /api/orders/{order_id}/download-invoice/
```

---

### 4. Frontend: Download Button (frontend/src/pages/Orders.jsx)

**Replaced HTML Download with PDF Download:**

**Before:**
- Generated HTML invoice in browser
- Downloaded as `.html` file
- No server validation

**After:**
```javascript
const handleDownloadInvoice = async (orderId) => {
  const token = localStorage.getItem('access_token');

  // Fetch PDF from backend
  const response = await fetch(
    `http://localhost:8000/api/orders/${orderId}/download-invoice/`,
    {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );

  // Download PDF blob
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  // Trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice_${orderId}.pdf`;
  a.click();
};
```

**UI Button:**
```jsx
<button
  className="btn-primary"
  onClick={() => handleDownloadInvoice(order.id)}
  title="Download invoice as PDF"
>
  📄 Download PDF Invoice
</button>
```

---

## Invoice Layout

### Visual Structure:

```
┌──────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████ │ Blue Header
│ █ CS308 E-Commerce              INVOICE       █ │
│ █ 123 Tech Street, Istanbul, Turkey           █ │
│ ████████████████████████████████████████████████ │
├──────────────────────────────────────────────────┤
│                                                  │
│ Invoice Details          Customer Information   │
│ ---------------          --------------------   │
│ Invoice #: 42            Name: John Doe         │
│ Date: Dec 12, 2025       Email: john@email.com  │
│ Status: Processing       Phone: +90 555 123...  │
│                          Shipping Address:       │
│                          123 Main Street         │
│                          Istanbul                │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│ Order Items                                      │
│ ───────────────────────────────────────────────  │
│ Product          Qty   Unit Price   Subtotal    │
│ ──────────────────────────────────────────────── │
│ MacBook Pro      2     $1,499.00    $2,998.00   │
│ iPhone 15 Pro    1     $999.00      $999.00     │
│                                                  │
│                             Subtotal: $3,997.00  │
│                      Discount (10%): -$399.70   │
│                             ─────────────────    │
│                                Total: $3,597.30  │
│                                                  │
├──────────────────────────────────────────────────┤
│         Thank you for your business!             │
│   For questions, contact support@cs308.com      │
│                                         Page 1   │
└──────────────────────────────────────────────────┘
```

---

## Customer Information Included

The PDF invoice includes all available customer information:

### 1. Basic Info (Always Shown):
- **Name:** From `shipping_name` or `user.first_name + user.last_name` or `user.username`
- **Email:** From `user.email`

### 2. Contact Info (If Available):
- **Phone:** From `order.shipping_phone`

### 3. Shipping Address (If Available):
- **Street Address:** From `order.shipping_address` (wrapped if >40 chars)
- **City:** From `order.shipping_city`

### Example:

**Full Information:**
```
Customer Information
--------------------
Name: Jane Smith
Email: jane.smith@email.com
Phone: +90 555 987 6543
Shipping Address:
  Atatürk Bulvarı No: 45 Daire 12
  Kadıköy, Istanbul
```

**Minimal Information (no shipping):**
```
Customer Information
--------------------
Name: john_doe
Email: john@email.com
```

---

## API Endpoints

### Download Invoice (New)

**Endpoint:**
```
GET /api/orders/{order_id}/download-invoice/
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
- **Success (200):** Returns PDF file with `Content-Disposition: attachment`
- **Not Found (404):** Order doesn't exist or doesn't belong to user
- **Unauthorized (401):** No valid authentication token

**Example:**
```bash
curl -X GET \
  'http://localhost:8000/api/orders/42/download-invoice/' \
  -H 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...' \
  --output invoice_42.pdf
```

---

### Send Invoice (Existing - Email)

**Endpoint:**
```
POST /api/orders/{order_id}/send-invoice/
```

**What It Does:**
- Generates PDF using same `generate_invoice_pdf()` function
- Sends email to user with PDF attached
- Subject: "Invoice for Order #42"

---

## User Flow

### 1. User Places Order
```
User → Checkout → Order Created (#42)
```

### 2. User Views Orders
```
Navigate to "My Orders" page → See list of orders
```

### 3. User Downloads Invoice
```
Click "📄 Download PDF Invoice" button
    ↓
Frontend: GET /api/orders/42/download-invoice/
    ↓
Backend: Verify user owns order
    ↓
Backend: Generate PDF with customer info
    ↓
Frontend: Download PDF file (invoice_42.pdf)
    ↓
Success message: "Invoice downloaded successfully!"
```

---

## Security

### Authorization Checks:

**1. Authentication Required:**
```python
permission_classes = [IsAuthenticated]
```
- User must be logged in
- Valid JWT token required

**2. Ownership Validation:**
```python
order = get_object_or_404(Order, pk=pk, user=request.user)
```
- Only returns order if `order.user == request.user`
- Returns 404 if user tries to access another user's order

**3. Example Attack Prevention:**
```
User A (ID: 5) tries to download Order 123 (belongs to User B):

GET /api/orders/123/download-invoice/
Authorization: Bearer {user_a_token}

Backend: get_object_or_404(Order, pk=123, user=User A)
Result: 404 Not Found (order exists but belongs to User B)
```

---

## Testing

### Test 1: Download Invoice for Own Order

**Steps:**
1. Log in as regular user
2. Place an order
3. Go to "My Orders" page
4. Click "Download PDF Invoice" on your order
5. **Expected:**
   - PDF downloads as `invoice_{id}.pdf`
   - PDF contains your name, email, phone, address
   - Shows all order items with prices
   - Shows discount if applied

---

### Test 2: Cannot Download Other User's Invoice

**Steps:**
1. Note another user's order ID (e.g., 999)
2. Try to access: `http://localhost:8000/api/orders/999/download-invoice/`
3. **Expected:** 404 Not Found

---

### Test 3: PDF Content Verification

**Check PDF Includes:**
- ✅ Company name and address
- ✅ Invoice # and date
- ✅ Customer name (from shipping or user profile)
- ✅ Customer email
- ✅ Customer phone (if provided)
- ✅ Shipping address (if provided)
- ✅ All order items with quantities
- ✅ Correct unit prices
- ✅ Correct subtotals
- ✅ Discount (if applied)
- ✅ Final total
- ✅ Footer with contact info

---

### Test 4: Long Address Wrapping

**Steps:**
1. Create order with very long address:
   ```
   "Atatürk Bulvarı Numara 123 Daire 45 Kat 6 Blok C Kadıköy"
   ```
2. Download invoice
3. **Expected:** Address wraps to multiple lines (max 40 chars per line)

---

### Test 5: Discount Display

**Steps:**
1. Create order
2. Sales Manager applies 15% discount
3. Download invoice
4. **Expected:**
   ```
   Subtotal:          $1,000.00
   Discount (15%):    -$150.00
   Total:             $850.00
   ```

---

## Manual Testing via Django Shell

### Generate Test Invoice:

```python
from orders.models import Order
from orders.utils import generate_invoice_pdf

# Get an order
order = Order.objects.first()

# Generate PDF
pdf_buffer = generate_invoice_pdf(order)

# Save to file for inspection
with open('test_invoice.pdf', 'wb') as f:
    f.write(pdf_buffer.read())

print(f"PDF saved! Order ID: {order.id}")
print(f"Customer: {order.user.email}")
print(f"Items: {order.items.count()}")
```

**Then:** Open `test_invoice.pdf` and verify layout

---

## Dependencies

### Python Libraries Required:

```txt
reportlab>=4.0.0  # PDF generation
```

### Already Installed?
Check with:
```bash
cd backend
python -c "import reportlab; print(reportlab.Version)"
```

If not installed:
```bash
cd backend
pip install reportlab
```

Add to `requirements.txt`:
```
reportlab==4.2.5
```

---

## Customization

### Change Company Info:

**Edit:** `backend/orders/utils.py`

```python
# Line ~34
p.drawString(50, y + 25, "CS308 E-Commerce")  # Company name
p.drawString(50, y + 10, "123 Tech Street, Istanbul, Turkey")  # Address
```

---

### Change Colors:

**Header Color:**
```python
# Line ~30
p.setFillColorRGB(0.2, 0.2, 0.8)  # Blue (RGB: 51, 51, 204)
```

**Change to Green:**
```python
p.setFillColorRGB(0.2, 0.6, 0.3)  # Green
```

---

### Change Footer:

**Edit:** `backend/orders/utils.py`

```python
# Line ~197
p.drawCentredString(width / 2, footer_y, "Thank you for your business!")
p.drawCentredString(width / 2, footer_y - 12, "For questions, contact support@cs308ecommerce.com")
```

---

## Files Modified

### Backend:

1. **backend/orders/utils.py**
   - Complete rewrite of `generate_invoice_pdf()`
   - Added customer information display
   - Added professional formatting

2. **backend/orders/views.py**
   - Added `DownloadInvoiceView` class
   - GET endpoint returns PDF as download

3. **backend/orders/urls.py**
   - Added `/download-invoice/` endpoint
   - Imported `DownloadInvoiceView`

### Frontend:

4. **frontend/src/pages/Orders.jsx**
   - Replaced `handleDownloadInvoice()` function
   - Now fetches PDF from backend instead of generating HTML
   - Shows success/error messages

---

## Summary

✅ Professional PDF invoices with customer information
✅ Company header with branding
✅ Customer name, email, phone, shipping address
✅ Order details (ID, date, status)
✅ Itemized product table
✅ Subtotal, discount, and total calculations
✅ Download button on Orders page
✅ Secure - users can only download their own invoices
✅ Uses reportlab for PDF generation
✅ Professional layout and styling

**Users can now download beautiful, professional PDF invoices with all their information included!**
