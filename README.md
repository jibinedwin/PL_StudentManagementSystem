# Student Management System (PL_SMS)

A full-stack Student Management System with a **Flask + MySQL** backend and a plain **HTML/CSS/JS** frontend.

- **Backend:** `backend/` — Flask (N-tier: `routes/` controllers → `models.py` + `extensions.py` → MySQL via PyMySQL)
- **Frontend:** `frontend/` — static pages served by the same Flask server (single origin, no CORS issues)

---

## 📁 Project Structure (actual locations)

```
├── backend/
│   ├── app.py              # Flask entrypoint — serves frontend + /api blueprints
│   ├── config.py           # Loads .env, builds MySQL URI
│   ├── extensions.py       # SQLAlchemy (db) & Bcrypt singletons
│   ├── auth_utils.py       # login_required / admin_required / student_required decorators
│   ├── models.py           # User, Department, Course, Student models
│   ├── seed.py             # One-time DB seeder (tables, admin, courses, students)
│   ├── requirements.txt
│   ├── .env                # DB credentials & SECRET_KEY (not committed)
│   └── routes/
│       ├── __init__.py     # Blueprint exports
│       ├── auth.py         # POST /api/login, /api/logout, GET /api/current-user
│       ├── dashboard.py    # GET /api/stats
│       ├── students.py     # CRUD /api/students, status, password, student profile
│       ├── departments.py  # /api/departments, /api/courses
│       ├── users.py        # /api/users (admin credential management)
│       └── profile.py      # GET/PUT /api/profile, /api/profile/password
│
└── frontend/
    ├── index.html          # Login page (Admin / Student tabs)
    ├── admin-dashboard.html
    ├── student-dashboard.html
    ├── assets/
    │   ├── js/api.js       # Centralized API helper (location-aware base URL)
    │   ├── js/main.js      # Login page logic
    │   ├── css/styles.css
    │   └── img/            # Logos, icons, backgrounds
    ├── css/                # Dashboard stylesheets
    └── js/                 # auth.js, common.js, dashboard.js, student-dashboard.js, ...
```

---

## 🚀 Getting Started

### 1. Requirements
- Python 3.10+
- MySQL Server (default port 3306)

### 2. Configure the database
Edit `backend/.env`:
```env
SECRET_KEY=change_me
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=student_management_system
```

### 3. Install dependencies & seed the database (first run only)
```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # Windows
.venv/Scripts/python seed.py
```

### 4. Run the server (backend + frontend together)
```bash
cd backend
.venv/Scripts/python app.py
```

Open **http://localhost:5000** — that's the login page, served by Flask itself.
The API lives under **http://localhost:5000/api**.

> The frontend also still works standalone (Live Server / double-click `index.html`):
> `frontend/assets/js/api.js` detects the origin and calls `http://localhost:5000/api` in that case.

---

## 🔑 Default Credentials

| Role | Username / ID | Password | Portal |
|---|---|---|---|
| Admin | `admin` | `admin123` | Admin tab → `admin-dashboard.html` |
| Student | `STD-1001` | `123456` | Student tab → `student-dashboard.html` |

---

## 📡 REST API Reference

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/login` | POST | Public | Admin & student login (session-based) |
| `/api/logout` | POST | Public | Clear session |
| `/api/current-user` | GET | Any | Current session user |
| `/api/stats` | GET | Public | Dashboard counters |
| `/api/students` | GET/POST | Admin | List / create (auto Student ID) |
| `/api/students/<id>` | GET/PUT/DELETE | Admin | Read / update / delete |
| `/api/students/<id>/status` | PATCH | Admin | Toggle Active/Inactive |
| `/api/students/<id>/password` | PUT | Admin | Reset student password |
| `/api/student/profile` | GET | Student | Own profile |
| `/api/departments` | GET/POST | Public | Departments list/create |
| `/api/courses` | GET/POST | Public | Courses list/create |
| `/api/users` | GET/POST | Admin | User accounts |
| `/api/profile` | GET | Any | Logged-in profile |
| `/api/profile/password` | PUT | Any | Change own password |
