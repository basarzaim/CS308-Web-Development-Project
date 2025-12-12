# Database Import Instructions for Teammates

This file explains how to import the database dump to set up the exact same database on your local machine.

---

## What's Included

The file **`backend/database_dump.sql`** contains:
- ✅ All database tables (products, orders, users, cart, reviews, wishlist)
- ✅ All 10 products with images
- ✅ User accounts
- ✅ Orders (if any)
- ✅ All database structure

---

## Prerequisites

Before importing, make sure you have:
- PostgreSQL installed (any version 12+)
- A PostgreSQL user (usually `postgres`)
- The database dump file: `backend/database_dump.sql`

---

## Step 1: Create Empty Database

First, create a new empty database:

### On Windows (using psql):
```bash
psql -U postgres

# Inside psql:
CREATE DATABASE ecommerce_db;
\q
```

### On Mac/Linux:
```bash
psql -U postgres

# Inside psql:
CREATE DATABASE ecommerce_db;
\q
```

### Alternative (pgAdmin):
1. Open pgAdmin
2. Right-click on "Databases"
3. Click "Create" > "Database"
4. Name: `ecommerce_db`
5. Click "Save"

---

## Step 2: Import Database Dump

Now import the dump file into your new database:

### On Windows:
```bash
# Method 1: Using psql
psql -U postgres -d ecommerce_db -f backend/database_dump.sql

# Method 2: If you get "psql: command not found"
"C:\Program Files\PostgreSQL\[VERSION]\bin\psql.exe" -U postgres -d ecommerce_db -f backend/database_dump.sql
```

### On Mac/Linux:
```bash
psql -U postgres -d ecommerce_db -f backend/database_dump.sql
```

### If it asks for password:
- Enter your PostgreSQL password
- If you don't know it, you set it when installing PostgreSQL

**Expected output:**
```
SET
SET
SET
SET
...
CREATE TABLE
CREATE TABLE
...
COPY 10
COPY 5
...
```

This means tables are being created and data is being copied.

---

## Step 3: Configure .env File

Create a `.env` file in the `backend` folder with your database credentials:

**File:** `backend/.env`

```env
DB_NAME=ecommerce_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_SSL=disable
```

**Important:** Replace `your_postgres_password` with YOUR actual PostgreSQL password!

---

## Step 4: Verify Import

Check if the import worked:

```bash
psql -U postgres -d ecommerce_db

# Inside psql, run:
\dt  # List all tables

# Should show:
# products_product
# orders_order
# users_customer
# cart_cartitem
# reviews_comment
# wishlist_wishlistitem
# ... and more

# Check products:
SELECT name, price FROM products_product;

# Should show all 10 products!

# Exit:
\q
```

---

## Step 5: Run Migrations (Just in Case)

Even though the database is imported, run migrations to be safe:

```bash
cd backend
python -m venv venv

# Activate virtual environment:
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies:
pip install -r requirements.txt

# Run migrations:
python manage.py migrate
```

**Note:** Migrations might show "No migrations to apply" - that's OK!

---

## Step 6: Create Superuser (Optional)

If you want to access Django admin with your own account:

```bash
python manage.py createsuperuser
```

Enter:
- Email: your-email@example.com
- Username: admin (or your choice)
- Password: (choose a password)

---

## Step 7: Start Backend

```bash
cd backend
venv\Scripts\activate  # Windows
python manage.py runserver
```

**Should see:**
```
Starting development server at http://127.0.0.1:8000/
```

---

## Step 8: Start Frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

**Should see:**
```
VITE v4.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

---

## Step 9: Verify Everything Works

1. Open http://localhost:5173
2. Go to http://localhost:5173/products
3. **You should see all 10 products!**
4. Try logging in (if you imported users, their passwords are in the dump)
5. Try adding to cart
6. Try checkout

---

## Troubleshooting

### Issue: "database already exists"

**Solution:**
```bash
psql -U postgres

DROP DATABASE ecommerce_db;
CREATE DATABASE ecommerce_db;
\q

# Then import again
psql -U postgres -d ecommerce_db -f backend/database_dump.sql
```

---

### Issue: "psql: command not found"

**Solution (Windows):**
Find your PostgreSQL installation path:
```bash
# Usually at:
C:\Program Files\PostgreSQL\[VERSION]\bin\

# Use full path:
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d ecommerce_db -f backend/database_dump.sql
```

**Solution (Mac):**
```bash
# Install via Homebrew:
brew install postgresql

# Or find existing installation:
find /Applications -name psql
```

---

### Issue: "FATAL: password authentication failed"

**Solution:**
- Your PostgreSQL password is incorrect
- Reset it using pgAdmin or:
```bash
# Windows (run as Administrator):
psql -U postgres
ALTER USER postgres PASSWORD 'new_password';
```

---

### Issue: "permission denied for schema public"

**Solution:**
```bash
psql -U postgres -d ecommerce_db

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

---

### Issue: No products showing on frontend

**Check:**
1. Backend is running: http://localhost:8000/admin/
2. Database imported correctly:
   ```bash
   psql -U postgres -d ecommerce_db
   SELECT COUNT(*) FROM products_product;
   # Should show: 10
   ```
3. Frontend .env is correct:
   ```env
   VITE_API_URL=http://localhost:8000/api
   VITE_USE_MOCK=false
   ```

---

### Issue: "relation does not exist"

**Means:** Tables weren't created properly

**Solution:**
1. Drop database and recreate
2. Import dump again
3. Run migrations:
   ```bash
   python manage.py migrate
   ```

---

## Alternative Import Method (pgAdmin)

If you prefer using pgAdmin GUI:

1. Open pgAdmin
2. Right-click on `ecommerce_db`
3. Click "Restore"
4. Select `database_dump.sql`
5. Click "Restore"

**Note:** This works for `.backup` files better than `.sql` files. For `.sql` files, use psql command line.

---

## Database Structure Overview

After import, you'll have these main tables:

### Products:
- `products_product` - All 10 products

### Users:
- `users_customer` - User accounts with roles

### Orders:
- `orders_order` - Order records
- `orders_orderitem` - Items in each order

### Cart:
- `cart_cartitem` - Shopping cart items

### Reviews:
- `reviews_comment` - Product reviews

### Wishlist:
- `wishlist_wishlistitem` - Wishlist items

---

## Quick Verification Commands

After import, run these to verify:

```bash
# Connect to database
psql -U postgres -d ecommerce_db

# Count products
SELECT COUNT(*) FROM products_product;
-- Should return: 10

# List products
SELECT id, name, price, stock FROM products_product;

# Count users
SELECT COUNT(*) FROM users_customer;

# List tables
\dt

# Exit
\q
```

---

## Success Checklist

After completing all steps, verify:

- [ ] PostgreSQL is running
- [ ] Database `ecommerce_db` exists
- [ ] Database has 10 products
- [ ] Backend server starts without errors
- [ ] Frontend shows products at /products
- [ ] Can register/login
- [ ] Can add to cart
- [ ] Can checkout

If all checked ✅, you're ready to develop!

---

## Important Notes

1. **Product images:** The `backend/media/products/` folder contains product images. Make sure these files are included when you clone the repo.

2. **Passwords:** User passwords in the dump are hashed. You won't know them unless you were told. Create a new superuser with `createsuperuser`.

3. **Environment:** The dump is from a development database. Don't use it in production.

4. **Updates:** If the original database changes, ask for a new dump.

---

## For Turkish Speakers

Arkadaşın için Türkçe özet:

1. PostgreSQL'de `ecommerce_db` adında boş bir database oluştur
2. `psql -U postgres -d ecommerce_db -f backend/database_dump.sql` komutunu çalıştır
3. `backend/.env` dosyasını oluştur ve database bilgilerini gir
4. Backend'i çalıştır: `python manage.py runserver`
5. Frontend'i çalıştır: `npm run dev`
6. http://localhost:5173 adresine git - 10 ürün görmelisin!

Sorun olursa yukarıdaki "Troubleshooting" bölümüne bak.

---

## Summary

**File to import:** `backend/database_dump.sql`

**Command to import:**
```bash
psql -U postgres -d ecommerce_db -f backend/database_dump.sql
```

**What you get:**
- 10 products with all details
- Complete database structure
- User accounts and roles
- All tables ready to use

**Time to import:** 10-30 seconds

**Result:** Exact copy of the database, ready to develop!
