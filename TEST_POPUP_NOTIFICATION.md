# Quick Test: Popup Notification

## 5-Minute Test Procedure

### Step 1: Setup (1 minute)

1. **Start servers:**
   ```bash
   # Terminal 1
   cd backend
   python manage.py runserver

   # Terminal 2
   cd frontend
   npm start
   ```

2. **Create test user** (if needed):
   - Go to http://localhost:3000/register
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `testpass123`

### Step 2: Add Products to Wishlist (1 minute)

1. **Login as test user:**
   - Username: `testuser`
   - Password: `testpass123`

2. **Add 2-3 products to wishlist:**
   - Go to http://localhost:3000/products
   - Click the heart icon ♡ on 2-3 different products
   - Hearts should turn filled ♥

3. **Logout:**
   - Click "Logout" button

### Step 3: Apply Discounts as Admin (1 minute)

1. **Login as admin:**
   - Username: `admin`
   - Password: `admin`

2. **Apply discount:**
   - Click "Manage Discounts" in navigation
   - Select the products you added to wishlist
   - Enter discount: `30`
   - Click "Apply Discount"
   - ✅ Should see success message

3. **Logout**

### Step 4: Test Popup (1 minute)

1. **Login as test user again:**
   - Username: `testuser`
   - Password: `testpass123`

2. **VERIFY POPUP APPEARS:**
   ```
   ✅ Popup should appear with:
      - "🎉 Sale Alert!" header
      - List of discounted products
      - Original prices crossed out
      - Green sale prices
      - Red discount badges
      - Total savings amount
      - "Maybe Later" and "View Wishlist" buttons
   ```

### Step 5: Test Interactions (1 minute)

**Test A: Close Button**
1. Click the X button in top-right
2. ✅ Popup should close
3. Navigate to different pages
4. ✅ Popup should NOT reappear

**Test B: View Wishlist Button**
1. If you dismissed, logout and login again
2. Popup appears
3. Click "View Wishlist"
4. ✅ Should navigate to /wishlist page
5. ✅ Products should show discount badges

**Test C: Maybe Later Button**
1. Logout and login again
2. Click "Maybe Later"
3. ✅ Popup closes
4. Navigate around
5. ✅ Popup doesn't reappear

## Expected Visual Appearance

```
╔═══════════════════════════════════════╗
║              🎉 (bouncing)            ║ [X]
║          Sale Alert!                  ║
║   2 items from your wishlist are      ║
║          now on sale!                 ║
╠═══════════════════════════════════════╣
║  ┌────────────────────────────────┐  ║
║  │ [Image]  Gaming Chair          │  ║
║  │          $299.99 → $224.99     │  ║
║  │          25% OFF               │  ║
║  │          Save $75.00           │  ║
║  └────────────────────────────────┘  ║
╠═══════════════════════════════════════╣
║  ┌────────────────────────────────┐  ║
║  │ [Image]  Laptop Pro 15         │  ║
║  │          $1299.99 → $974.99    │  ║
║  │          25% OFF               │  ║
║  │          Save $325.00          │  ║
║  └────────────────────────────────┘  ║
╠═══════════════════════════════════════╣
║  Total Potential Savings: $400.00     ║
╠═══════════════════════════════════════╣
║  [  Maybe Later  ] [ View Wishlist ]  ║
╚═══════════════════════════════════════╝
```

## Troubleshooting

### Popup Doesn't Appear

**Problem:** No popup when logging in

**Solutions:**
1. Check browser console for errors (F12)
2. Verify products are actually on sale:
   ```bash
   cd backend
   python manage.py shell -c "
   from products.models import Product
   sale_products = Product.objects.filter(is_on_sale=True)
   print(f'Products on sale: {sale_products.count()}')
   for p in sale_products:
       print(f'  - {p.name}: {p.discount_percentage}%')
   "
   ```

3. Verify wishlist has those products:
   ```bash
   cd backend
   python manage.py shell -c "
   from wishlist.models import Wishlist
   from django.contrib.auth.models import User
   user = User.objects.get(username='testuser')
   wishlist = Wishlist.objects.filter(user=user)
   print(f'Wishlist items for testuser: {wishlist.count()}')
   for w in wishlist:
       print(f'  - {w.product.name} (on sale: {w.product.is_on_sale})')
   "
   ```

4. Check if already dismissed:
   - Open browser console
   - Type: `sessionStorage.getItem('wishlist_sale_notification_dismissed')`
   - If it returns "true", clear it: `sessionStorage.clear()`
   - Refresh page

### Popup Appears Empty

**Problem:** Popup shows but no products listed

**Solution:**
- Products in wishlist are not on sale
- Apply discounts to those specific products via Manage Discounts

### Styling Issues

**Problem:** Popup looks broken or unstyled

**Solution:**
1. Hard refresh browser (Ctrl + Shift + R)
2. Check if CSS file exists: `frontend/src/components/WishlistSaleNotification.css`
3. Check browser console for 404 errors

## Demo Tips

For presenting to instructor:

1. **Prepare ahead:**
   - Have test user with wishlist items ready
   - Have admin window open in separate browser/incognito

2. **Demo flow:**
   - Show admin applying discount
   - Switch to test user browser
   - Login and show popup appearing
   - Click through to wishlist to show products with badges

3. **Highlight features:**
   - "Notice the smooth animation"
   - "Shows total potential savings"
   - "Only shows once per session"
   - "Complements the email notification system"

---

**Quick Test Duration:** 5 minutes
**Status:** Ready to test ✅
**Last Updated:** 2026-01-13
