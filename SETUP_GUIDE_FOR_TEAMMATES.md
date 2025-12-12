# Setup Guide for Team Members

This guide will help your friends set up the project on their machines and import the 10 products.

---

## Prerequisites

Make sure you have installed:
- Python 3.8+
- Node.js 16+
- PostgreSQL
- Git

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/basarzaim/CS308-Web-Development-Project.git
cd CS308-Web-Development-Project
git checkout working-version
```

---

## Step 2: Backend Setup

### 2.1 Create Virtual Environment

```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate
```

### 2.2 Install Dependencies

```bash
pip install -r requirements.txt
```

**Note:** If you get an error about `reportlab`, install it:
```bash
pip install reportlab
```

### 2.3 Configure Database

Create a `.env` file in the `backend` directory:

```env
DB_NAME=your_database_name
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_SSL=disable
```

**For Local PostgreSQL:**
```env
DB_NAME=cs308_ecommerce
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432
DB_SSL=disable
```

### 2.4 Create PostgreSQL Database

```bash
# Open PostgreSQL command line (psql)
psql -U postgres

# Create database
CREATE DATABASE cs308_ecommerce;

# Exit psql
\q
```

### 2.5 Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 2.6 Create Superuser

```bash
python manage.py createsuperuser
```

Follow the prompts:
- Email: admin@example.com
- Username: admin
- Password: (choose a password)

### 2.7 Import Products

**This is the important step to get the 10 products!**

```bash
python manage.py import_products ../products_data.json
```

You should see:
```
Created: Desk Lamp LED
Created: External SSD 1TB
Created: Webcam HD Pro
Created: Laptop Pro 15
Created: Wireless Mouse
Created: Mechanical Keyboard
Created: 27" 4K Monitor
Created: Noise Cancelling Headphones
Created: Gaming Chair
Created: USB-C Hub
Successfully imported 10 products
```

### 2.8 Copy Product Images (Optional)

The products have images in `backend/media/products/`. These are already in the repository, so they should be available after cloning.

### 2.9 Start Backend Server

```bash
python manage.py runserver
```

Backend should be running at: http://localhost:8000

---

## Step 3: Frontend Setup

### 3.1 Install Dependencies

Open a **new terminal** (keep backend running):

```bash
cd frontend
npm install
```

### 3.2 Start Frontend Server

```bash
npm run dev
```

Frontend should be running at: http://localhost:5173

---

## Step 4: Verify Setup

### 4.1 Check Products

Open your browser and go to:
- **Frontend:** http://localhost:5173/products
- **Backend Admin:** http://localhost:8000/admin/products/product/

You should see all 10 products!

### 4.2 Test Account

Create a test account or use Django admin to create users.

---

## Product List

Your project includes these 10 products:

1. **Desk Lamp LED** - $39.99 (Smart Home)
2. **External SSD 1TB** - $129.99 (Storage)
3. **Webcam HD Pro** - $79.99 (Photo & Video)
4. **Laptop Pro 15** - $1,299.99 (Laptops)
5. **Wireless Mouse** - $29.99 (Peripherals)
6. **Mechanical Keyboard** - $89.99 (Peripherals)
7. **27" 4K Monitor** - $399.99 (Monitors)
8. **Noise Cancelling Headphones** - $249.99 (Audio)
9. **Gaming Chair** - $299.99 (Smart Home)
10. **USB-C Hub** - $49.99 (Accessories)

---

## Troubleshooting

### Issue 1: "No module named 'reportlab'"

**Solution:**
```bash
pip install reportlab
```

### Issue 2: "products_data.json not found"

**Solution:**
Make sure you're in the `backend` directory when running:
```bash
python manage.py import_products ../products_data.json
```

### Issue 3: Database connection error

**Solution:**
- Check that PostgreSQL is running
- Verify `.env` file has correct credentials
- Make sure database exists: `CREATE DATABASE cs308_ecommerce;`

### Issue 4: Products already exist

If you run import again and see "Skipping existing product", that's normal. The import command won't create duplicates.

To start fresh:
```bash
# This will DELETE all products and re-import
python manage.py import_products ../products_data.json --clear
```

### Issue 5: Missing product images

**Solution:**
The images are in `backend/media/products/`. Make sure you pulled the latest code:
```bash
git pull origin working-version
```

---

## Advanced: Using Django Fixtures (Alternative Method)

If you prefer Django's built-in fixtures system:

### Export (if you make changes):
```bash
python manage.py dumpdata products.Product --indent 2 > products_fixture.json
```

### Import:
```bash
python manage.py loaddata products_fixture.json
```

---

## Project Features

Your project includes:

✅ User authentication (login/register)
✅ Product catalog with 10 products
✅ Shopping cart
✅ Checkout with shipping info
✅ Order management
✅ Order confirmation emails (Mailtrap)
✅ PDF invoice generation
✅ Stock management
✅ Product reviews and ratings
✅ Wishlist
✅ Admin panel for Product/Sales Managers
✅ Order status updates
✅ Discount application

---

## Quick Start Commands

After initial setup, to run the project:

**Terminal 1 (Backend):**
```bash
cd backend
venv\Scripts\activate  # Windows
python manage.py runserver
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Then open: http://localhost:5173

---

## Team Workflow

### Pull Latest Changes:
```bash
git pull origin working-version
```

### Before Making Changes:
```bash
git checkout -b feature/your-feature-name
```

### After Making Changes:
```bash
git add .
git commit -m "Description of changes"
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## Contact

If you have issues, check:
1. This guide
2. The documentation files (.md files in root)
3. Ask the team on your group chat

---

## Files in This Repository

### Documentation:
- `SETUP_GUIDE_FOR_TEAMMATES.md` - This file
- `ADMIN_NAVIGATION_FIX.md` - Admin features
- `CHECKOUT_LOGIN_DOUBLE_PROMPT_FIX.md` - Checkout flow
- `ORDER_CONFIRMATION_EMAIL.md` - Email setup
- `PDF_INVOICES.md` - Invoice generation
- `PAGINATION_FIX.md` - Pagination
- `STOCK_QUANTITY_LIMIT.md` - Stock management
- `OUT_OF_STOCK_HANDLING.md` - Out of stock products
- And more...

### Data Files:
- `products_data.json` - **The 10 products** (import this!)

### Code:
- `backend/` - Django REST API
- `frontend/` - React frontend

---

## Success Checklist

After setup, verify:

- [ ] Backend running at http://localhost:8000
- [ ] Frontend running at http://localhost:5173
- [ ] Can see 10 products at http://localhost:5173/products
- [ ] Can log in/register
- [ ] Can add products to cart
- [ ] Can checkout
- [ ] Can view orders
- [ ] Can download invoice
- [ ] Django admin works at http://localhost:8000/admin

If all checkboxes are checked, you're ready to go! 🚀
