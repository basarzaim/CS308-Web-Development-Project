# Testing the Discount System

## Quick Test Guide

### Step 1: Verify Product Display Shows Discounts

1. **Start the backend** (if not running):
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Start the frontend** (if not running):
   ```bash
   cd frontend
   npm start
   ```

3. **Go to the products page**: http://localhost:3000/products
   - Products should load normally
   - If a product has a discount, you should see:
     - ✅ Original price (crossed out)
     - ✅ Sale price (in green)
     - ✅ Red "X% OFF" badge

### Step 2: Test Discount Application

1. **Login as admin**:
   - Username: `admin`
   - Password: `admin`

2. **Navigate to Manage Discounts**: Click "Manage Discounts" in the navigation

3. **Apply a test discount**:
   - Select 1-2 products (check the checkboxes)
   - Enter discount percentage: `25`
   - Click "Apply Discount"
   - ✅ Should see success message

4. **Check the backend console**:
   Look for log messages like:
   ```
   [DISCOUNT] Starting wishlist notifications for 2 products
   [DISCOUNT] Product 'Gaming Chair' has 1 wishlist users
   [DISCOUNT] Sending email to admin@example.com for product 'Gaming Chair'
   [DISCOUNT] ✓ Email sent to admin@example.com
   ```

5. **Go back to products page**: http://localhost:3000/products
   - The products you discounted should now show:
     - ✅ Crossed-out original price
     - ✅ Green sale price
     - ✅ Red discount badge

### Step 3: Test Wishlist Notifications

1. **Add a product to wishlist**:
   - As a regular user, add any product to your wishlist
   - Click the heart icon on a product card

2. **As admin, apply discount to that product**:
   - Go to Manage Discounts
   - Select the product from wishlist
   - Apply 30% discount
   - Click "Apply Discount"

3. **Check Mailtrap inbox**:
   - Go to: https://mailtrap.io/inboxes
   - Login with your Mailtrap account
   - You should see a new email with subject: "🎉 Sale Alert: [Product Name] is now 30% off!"
   - Email should contain:
     - Original price
     - Sale price
     - Amount saved
     - Link to product

### Step 4: Verify Database Changes

Run this command to check if discounts are saved:

```bash
cd backend
python manage.py shell -c "
from products.models import Product
products_on_sale = Product.objects.filter(is_on_sale=True)
print(f'Products on sale: {products_on_sale.count()}')
for p in products_on_sale:
    print(f'  - {p.name}: {p.discount_percentage}% off (was ${p.price}, now ${p.get_discounted_price()})')
"
```

Expected output:
```
Products on sale: 2
  - Gaming Chair: 25.0% off (was $299.99, now $224.99)
  - Laptop Pro 15: 25.0% off (was $1299.99, now $974.99)
```

## Troubleshooting

### Issue: Discounts not showing on products page

**Solution:**
1. Check if frontend is caching old data - do a hard refresh (Ctrl+Shift+R)
2. Open browser console (F12) and check for errors
3. Verify the API returns discount fields:
   - Open http://localhost:8000/api/products/ in browser
   - Look for `is_on_sale`, `discount_percentage`, `discounted_price` fields

### Issue: Emails not being sent

**Solution:**
1. Check backend console for `[DISCOUNT]` log messages
2. Verify email configuration in `backend/config/settings.py`:
   ```python
   EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
   EMAIL_HOST = "sandbox.smtp.mailtrap.io"
   EMAIL_PORT = 25
   EMAIL_USE_TLS = True
   EMAIL_HOST_USER = "your-mailtrap-user"
   EMAIL_HOST_PASSWORD = "your-mailtrap-password"
   ```
3. Make sure the product you discounted is in someone's wishlist:
   ```bash
   cd backend
   python manage.py shell -c "
   from wishlist.models import Wishlist
   from products.models import Product

   product_id = 1  # Replace with your product ID
   product = Product.objects.get(id=product_id)
   wishlist_items = Wishlist.objects.filter(product=product)
   print(f'Users with {product.name} in wishlist:')
   for w in wishlist_items:
       print(f'  - {w.user.username} ({w.user.email})')
   "
   ```

### Issue: "No products found" in Manage Discounts

**Solution:**
1. Verify products exist in database:
   ```bash
   cd backend
   python manage.py shell -c "from products.models import Product; print(f'Total products: {Product.objects.count()}')"
   ```
2. Check browser console for API errors
3. Verify admin token is valid (try logging out and back in)

## Expected Behavior Summary

✅ **When discount is applied:**
- Products update in database with `discount_percentage` and `is_on_sale=True`
- Background thread starts sending emails
- Success message shows in UI
- Products page immediately shows discount badges
- Wishlist users receive email notifications

✅ **When discount is removed:**
- Products update with `discount_percentage=0` and `is_on_sale=False`
- Products page returns to normal pricing
- No emails sent

## Demo Checklist

For presenting to instructor:

- [ ] Show "Manage Discounts" page with product list
- [ ] Select 2-3 products and apply 30% discount
- [ ] Show success message
- [ ] Navigate to products page and show discount badges
- [ ] Open Mailtrap and show email notification received
- [ ] Show email content (original price, sale price, savings)
- [ ] Click link in email to verify it goes to product page
- [ ] Remove discount and show products return to normal

---

**Last Updated:** 2026-01-13
**Status:** System implemented and ready for testing
