# Quick Start Guide

## 🚀 Fast Setup (5 minutes)

### Prerequisites Check
```powershell
python --version    # Should be 3.8+
node --version      # Should be 18+
psql --version      # PostgreSQL should be installed
```

### Step 1: Get Database from Teammate

**Ask your teammate to run:**
```bash
pg_dump -U postgres -d database_name > database_backup.sql
```

**Then restore it on your machine:**
```powershell
# Create database
psql -U postgres
CREATE DATABASE cs308_project;
\q

# Restore dump
psql -U postgres -d cs308_project < database_backup.sql
```

### Step 2: Backend Setup

```powershell
cd backend

# Option A: Use setup script
..\scripts\setup_backend.ps1

# Option B: Manual setup
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Create .env file (copy from SETUP_GUIDE.md)
# Edit .env with your database credentials

python manage.py migrate
python manage.py runserver
```

### Step 3: Frontend Setup

```powershell
# Open new terminal
cd frontend

# Option A: Use setup script
..\scripts\setup_frontend.ps1

# Option B: Manual setup
npm install
npm run dev
```

### Step 4: Access Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api/products/
- **Admin Panel:** http://localhost:8000/admin/

## 📝 Important Files

- **Backend Config:** `backend/.env` (create this file!)
- **Database:** PostgreSQL database named `cs308_project`
- **Requirements:** `backend/requirements.txt` (Python) and `frontend/package.json` (Node)

## 🔧 Common Issues

**Database connection failed?**
- Check PostgreSQL is running
- Verify `.env` file exists and has correct credentials
- Test connection: `psql -U postgres -d cs308_project`

**Port already in use?**
- Backend: `python manage.py runserver 8001`
- Frontend: Vite auto-selects next available port

**Module not found?**
- Backend: Activate venv and `pip install -r requirements.txt`
- Frontend: `npm install`

## 📚 Full Documentation

See `SETUP_GUIDE.md` for detailed instructions.
