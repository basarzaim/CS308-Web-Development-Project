# Project Setup Guide

This guide will help you set up the CS308 Web Development Project locally on your machine.

## Prerequisites

Before starting, make sure you have installed:
- **Python 3.8+** (check with `python --version`)
- **Node.js 18+** and npm (check with `node --version` and `npm --version`)
- **PostgreSQL** (check with `psql --version`)
- **Git** (if cloning from repository)

## Step 1: Install PostgreSQL

If you don't have PostgreSQL installed:

### Windows:
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Install it and remember the password you set for the `postgres` user
3. Make sure PostgreSQL service is running (check in Services)

### Verify Installation:
```bash
psql --version
```

## Step 2: Get Database from Teammate

You have two options to get the database:

### Option A: Database Dump (Recommended)
Ask your teammate to create a database dump:

**On teammate's machine:**
```bash
pg_dump -U postgres -d your_database_name > database_dump.sql
```

**On your machine:**
1. Create an empty database:
```bash
psql -U postgres
CREATE DATABASE cs308_project;
\q
```

2. Import the dump:
```bash
psql -U postgres -d cs308_project < database_dump.sql
```

### Option B: Fresh Database (If no dump available)
If your teammate doesn't have a dump, you can create a fresh database and run migrations (you'll lose existing data):

```bash
psql -U postgres
CREATE DATABASE cs308_project;
\q
```

## Step 3: Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Create a virtual environment:**
```bash
# Windows
python -m venv venv

# Activate virtual environment
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1
# Windows (CMD)
venv\Scripts\activate
```

3. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

4. **Create `.env` file in the `backend` directory:**
Create a file named `.env` with the following content:

```env
DB_NAME=cs308_project
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_SSL=disable
```

**Replace `your_postgres_password` with your actual PostgreSQL password!**

5. **Run database migrations:**
```bash
python manage.py migrate
```

6. **Create a superuser (optional, for admin access):**
```bash
python manage.py createsuperuser
```

7. **Load initial data (if your teammate provided fixtures):**
```bash
# If there are fixture files
python manage.py loaddata fixtures/*.json
```

8. **Start the Django development server:**
```bash
python manage.py runserver
```

The backend should now be running at `http://localhost:8000`

## Step 4: Frontend Setup

1. **Open a new terminal and navigate to frontend directory:**
```bash
cd frontend
```

2. **Install Node dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

The frontend should now be running at `http://localhost:5173` (or 5174)

## Step 5: Verify Setup

1. **Backend API:** Visit `http://localhost:8000/api/products/` - you should see product data (or empty list)
2. **Frontend:** Visit `http://localhost:5173` - you should see the application
3. **Admin Panel:** Visit `http://localhost:8000/admin/` - login with superuser credentials

## Troubleshooting

### Database Connection Issues:
- Make sure PostgreSQL service is running
- Verify `.env` file has correct credentials
- Check if database exists: `psql -U postgres -l`

### Port Already in Use:
- Backend: Change port with `python manage.py runserver 8001`
- Frontend: Vite will automatically use next available port

### Missing Dependencies:
- Backend: Make sure virtual environment is activated before `pip install`
- Frontend: Delete `node_modules` and `package-lock.json`, then run `npm install` again

### Migration Issues:
- If migrations fail, try: `python manage.py migrate --run-syncdb`
- Check if database exists and user has proper permissions

## Quick Start Commands Summary

**Terminal 1 (Backend):**
```bash
cd backend
.\venv\Scripts\Activate.ps1  # Windows PowerShell
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```

## Getting Database Dump from Teammate

If your teammate needs to create a database dump for you:

**They should run:**
```bash
# Find database name first
psql -U postgres -l

# Create dump (replace 'database_name' with actual name)
pg_dump -U postgres -d database_name -F c -f database_backup.dump

# Or as SQL file
pg_dump -U postgres -d database_name > database_backup.sql
```

**You should receive:**
- `database_backup.dump` (binary format) OR
- `database_backup.sql` (SQL format)

**To restore:**
```bash
# For .dump file
pg_restore -U postgres -d cs308_project database_backup.dump

# For .sql file
psql -U postgres -d cs308_project < database_backup.sql
```

## Notes

- The `.env` file is in `.gitignore` - it won't be committed to git
- Media files (product images) are stored in `backend/media/` - you may need to copy these from your teammate
- Make sure both servers are running simultaneously for the app to work properly
