## CS308 Web Development Project – E‑Commerce Platform

This repository contains a full‑stack e‑commerce style web application built as part of the **CS308 Web Development** course.  
The system consists of a **Django REST Framework backend** and a **React + Vite frontend**, providing product browsing, cart and checkout, order management, reviews, and wishlist features.

The project is licensed under the **MIT License** (see `LICENSE`).

---

## Tech Stack

- **Backend**
  - Django 5.x
  - Django REST Framework
  - PostgreSQL (via `psycopg2-binary`)
  - JWT authentication (`djangorestframework-simplejwt`)
  - CORS support (`django-cors-headers`)
  - Email sending via **SendGrid** (SMTP)

- **Frontend**
  - React 19 (SPA)
  - Vite (bundler/dev server)
  - React Router
  - Axios for API communication

---

## Project Structure

- `backend/` – Django project
  - `config/` – Django project configuration
    - `settings.py` – core settings, DB, DRF, auth, CORS, email/SendGrid
    - `urls.py` – root URL configuration and API routing
  - `products/` – product catalog (listing, detail, search, filters)
  - `cart/` – shopping cart management and cart utilities
  - `orders/` – checkout, order placement, order listing (user + admin), status updates
  - `reviews/` – product review models and APIs
  - `wishlist/` – wishlist models and APIs
  - `users/` – custom `Customer` model, authentication, user profile APIs
  - `media/products/` – example product images
  - `requirements.txt` – backend Python dependencies

- `frontend/` – React SPA
  - `src/` – React pages, components, routing, and API client
  - `vite.config.js` – Vite configuration
  - `package.json` – frontend dependencies and scripts

- `scripts/`
  - `setup_backend.ps1` – helper script to bootstrap the backend
  - `setup_frontend.ps1` – helper script to bootstrap the frontend
  - `get_database_dump.ps1` – helper to fetch a DB dump (if provided)

- `.README/BACKEND_FIXES_NEEDED.md` – internal notes on past backend issues and how they were fixed.
- `SENDGRID_SETUP.md` – configuration guide for SendGrid email integration.

---

## Prerequisites

- **Backend**
  - Python 3.11+ (compatible with Django 5)
  - PostgreSQL database (local or remote)

- **Frontend**
  - Node.js 20+ and npm (or pnpm/yarn if you prefer)

- **General**
  - Git
  - A modern browser (Chrome, Edge, Firefox, etc.)

---

## Backend Setup (Django + DRF)

From the repository root:

```bash
cd backend

# (Optional but recommended) create virtualenv
python -m venv venv
venv\Scripts\activate  # on Windows
# source venv/bin/activate  # on macOS/Linux

pip install --upgrade pip
pip install -r requirements.txt
```

### Environment Configuration

Create a `.env` file in the `backend/` directory (this file is **not** committed to Git). At minimum you will need:

```env
# PostgreSQL database
DB_NAME=cs308
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Secret key
DJANGO_SECRET_KEY=change_me

# SendGrid / email (see SENDGRID_SETUP.md)
SENDGRID_SMTP_HOST=smtp.sendgrid.net
SENDGRID_SMTP_PORT=587
SENDGRID_USERNAME=apikey
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=your_verified_email@example.com
```

The exact variable names and usage are configured in `backend/config/settings.py`.

### Database Migrations and Superuser

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
```

### Running the Backend

```bash
cd backend
python manage.py runserver
```

By default the API will be available at `http://127.0.0.1:8000/` (e.g. `http://127.0.0.1:8000/api/products/`).

---

## Frontend Setup (React + Vite)

From the repository root:

```bash
cd frontend
npm install
```

### Development Server

```bash
cd frontend
npm run dev
```

The React app will be available on the Vite dev server (typically `http://127.0.0.1:5173/`).  
Make sure the backend is running on `http://127.0.0.1:8000/` so API requests succeed.

### Production Build

```bash
cd frontend
npm run build
```

This creates an optimized production bundle under `frontend/dist/`.

---

## Key Features

- **Product Catalog**
  - Browse products with images and details.
  - View product detail pages and customer reviews.

- **Shopping Cart & Checkout**
  - Add/remove items in the cart.
  - Checkout flow integrated with the backend `orders` app.
  - Stock validation and error handling on checkout.

- **Orders & Admin Views**
  - Authenticated users can list their own orders.
  - Admin/sales views for listing all orders and updating their status.
  - Support for discounts and invoice download (as per course tickets).

- **Authentication & Profiles**
  - Email‑based login using a custom `Customer` model.
  - JWT authentication with Django REST Framework SimpleJWT.
  - User profile endpoint for “current user” details.

- **Reviews & Wishlist**
  - Users can leave product reviews.
  - Wishlist management for saving favorite products.

- **Email Integration**
  - Order confirmation emails via SendGrid SMTP.
  - Configurable through environment variables (`SENDGRID_SETUP.md`).

---

## Running with Helper Scripts (Windows)

For convenience, there are PowerShell scripts in the `scripts/` directory:

- `scripts/setup_backend.ps1` – install Python dependencies, apply migrations, and prepare the backend.
- `scripts/setup_frontend.ps1` – install Node dependencies for the frontend.
- `scripts/get_database_dump.ps1` – helper to download/restore a database dump (if available).

You can run them from the repository root in PowerShell, for example:

```powershell
.\scripts\setup_backend.ps1
.\scripts\setup_frontend.ps1
```

---

## Development Notes

- The internal file `.README/BACKEND_FIXES_NEEDED.md` documents historical backend issues (authentication, order endpoints, serializers) and how they were addressed.
- The backend currently assumes a PostgreSQL database; update `DATABASES` in `backend/config/settings.py` if you need a different database.
- For local development, ensure CORS settings in `backend/config/settings.py` allow requests from the frontend dev origin (e.g. `http://127.0.0.1:5173`).

---

## License

This project is released under the **MIT License**. See `LICENSE` for details.

