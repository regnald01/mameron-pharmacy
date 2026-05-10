
# Mameron Pharmacy Management System

A modern pharmacy management platform built using **React.js** for the frontend and **Django REST Framework** for the backend.

The system helps pharmacies manage:

- Medicine inventory
- Sales and transactions
- Orders
- User roles
- Dashboard analytics
- Pharmacy operations securely and efficiently

---

# System Architecture

```text
React Frontend
      ↓
Django REST API
      ↓
PostgreSQL / MySQL
```

---

# Features

## Authentication & Authorization
- Secure login system
- JWT authentication
- Role-based access control

## User Roles
- Admin
- Pharmacist
- Cashier
- Support Staff

## Pharmacy Management
- Medicine inventory management
- Stock monitoring
- Sales management
- Order tracking
- Dashboard analytics

## Security
- Protected API endpoints
- Token authentication
- Secure backend architecture

---

# Technologies Used

## Frontend
- React.js
- Axios
- React Router
- TailwindCSS / CSS

## Backend
- Django
- Django REST Framework
- Simple JWT Authentication

## Database
- PostgreSQL / MySQL / SQLite

---

# Project Structure

```text
mameron-pharmacy/
│
├── client/                 # React Frontend
│
├── server/                 # Django Backend
│   ├── api/
│   ├── pharmacy/
│   └── manage.py
│
├── .gitignore
├── README.md
└── requirements.txt
```

---

# Frontend Setup (React)

## Navigate to frontend

```bash
cd client
```

## Install dependencies

```bash
npm install
```

## Start development server

```bash
npm run dev
```

or

```bash
npm start
```

Frontend runs on:

```text
http://localhost:3000
```

---

# Backend Setup (Django)

## Navigate to backend

```bash
cd server
```

## Create virtual environment

### Linux/macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

---

## Install dependencies

```bash
pip install -r requirements.txt
```

---

## Run migrations

```bash
python manage.py migrate
```

---

## Create superuser

```bash
python manage.py createsuperuser
```

---

## Start Django server

```bash
python manage.py runserver
```

Backend runs on:

```text
http://localhost:8000
```

---

# Environment Variables

## Backend `.env`

```env
SECRET_KEY=your-secret-key
DEBUG=True

DB_NAME=pharmacy
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
```

## Frontend `.env`

```env
VITE_API_URL=http://localhost:8000/api
```

---

# API Authentication

The project uses JWT authentication.

## Example Login Endpoint

```text
POST /api/login/
```

## Example Response

```json
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token"
}
```

---

# User Access Levels

| Role | Permissions |
|------|-------------|
| Admin | Full system access |
| Pharmacist | Medicines and dashboard |
| Cashier | Sales and transactions |
| Support | Orders and support dashboard |

---

# Recommended Production Stack

```text
Nginx
 ├── React Frontend
 └── Django API
        ↓
    PostgreSQL
```

---

# Security Recommendations

- Use HTTPS in production
- Store secrets in environment variables
- Enable CORS properly
- Use strong JWT secret keys
- Regularly update dependencies

---

# Example `.gitignore`

```gitignore
# React
node_modules/
dist/
build/

# Django
venv/
__pycache__/
*.pyc
db.sqlite3

# Environment
.env

# IDE
.vscode/
.codex/

# Logs
*.log
```

---

# Future Improvements

- Email notifications
- Real-time stock alerts
- Barcode scanner integration
- Multi-branch pharmacy support
- Reporting and analytics
- Docker deployment
- CI/CD pipeline

---

# Screenshots

## Login Page

Modern secure login interface with role-based authentication.

---

# Author

Developed for Mameron Pharmacy Management System.

---

# License

This project is licensed for educational and commercial pharmacy management use.
