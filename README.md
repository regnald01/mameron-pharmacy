
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
PostgreSQL 
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
- TailwindCSS 

## Backend
- Django
- Django REST Framework
- Simple JWT Authentication

## Database
- PostgreSQL 

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



# User Access Levels

| Role | Permissions |
|------|-------------|
| Admin | Full system access |
| Pharmacist | Medicines and dashboard |
| Cashier | Sales and transactions |
| Support | Orders and support dashboard |

---



# Screenshots

## Login Page

Modern secure login interface with role-based authentication.

<img width="1911" height="882" alt="mame01" src="https://github.com/user-attachments/assets/b85cf712-762c-436c-833a-ea6456802b43" />


# License

This project is licensed for educational and commercial pharmacy management use.

---

# Docker Development Setup

This repository now includes a development-focused Docker setup for the current project structure:

- `frontend`: Vite dev server on `http://localhost:5173`
- `backend`: Django dev server on `http://localhost:8000`

## Docker Files Included

- `docker-compose.yml`
- `client/Dockerfile`
- `client/.dockerignore`
- `server/api/Dockerfile`
- `server/api/.dockerignore`
- `server/api/entrypoint.sh`
- `server/api/requirements-docker.txt`

## Start With Docker

From the project root:

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api/`

## Notes

- This Docker setup is for development, not production.
- It uses the app's current Django `sqlite3` database setup.
- Django migrations run automatically when the backend container starts.
- Frontend and backend source folders are mounted into the containers for live reload.
