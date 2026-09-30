# Student Management System - Flask & MySQL Backend

A clean, modular, beginner-friendly backend built with **Flask**, **Flask-SQLAlchemy**, **Flask-Bcrypt**, **PyMySQL**, **Flask-CORS**, and **python-dotenv**.

The Flask app now **serves the frontend too**, so the whole app runs on a single origin: `http://localhost:5000`.

---

## 1. Project Directory Structure

```
backend/
├── .env                # Environment variables (MySQL credentials & Flask SECRET_KEY)
├── app.py              # Flask entrypoint — serves frontend + registers API blueprints
├── config.py           # Loads .env configurations & builds the MySQL URI
├── extensions.py       # Initializes db (SQLAlchemy) and bcrypt (Flask-Bcrypt)
├── auth_utils.py       # login_required / admin_required / student_required decorators
├── models.py           # SQLAlchemy models (User, Student, Department, Course)
├── seed.py             # Database seeder (tables, admin, departments, courses, students)
├── requirements.txt    # Project dependencies
└── routes/
    ├── __init__.py     # Exports all route Blueprints
    ├── auth.py         # Login (Admin/Student), Logout & Current-User session APIs
    ├── dashboard.py    # Dynamic dashboard statistics from live MySQL counts
    ├── students.py     # Student CRUD, search, auto-ID generation, status & password
    ├── departments.py  # Departments and Courses management APIs
    ├── users.py        # User account management (admin credentials view)
    └── profile.py      # Logged-in user profile & password change
```

The frontend lives in the sibling `../frontend/` folder and is served by `app.py` at `/`.

---

## 2. Configuration (`.env`)

```ini
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=sms_super_secret_session_key_2026

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=student_management_system
```

---

## 3. Database Models & Relationships

- **`User`**: Authentication for `admin` and `student` roles with Bcrypt password hashing (`password_hash`).
- **`Student`**: Personal, contact, and enrollment data. Auto-generates sequential Student IDs (`STD-1001`, `STD-1002`, ...). Linked 1-to-1 with `User`.
- **`Department`**: Faculty/department records. One department has many courses and students.
- **`Course`**: Belongs to a department and has many enrolled students.

---

## 4. Setup & Running

### A. Run Database Seeding (First-time setup)
```bash
python seed.py
```

### B. Start the Server (backend + frontend together)
```bash
python app.py
```

- **Frontend (UI):** http://localhost:5000
- **API Base:** http://localhost:5000/api

> CORS is still enabled on `/api/*` (with credentials), so the frontend also works
> when opened standalone via Live Server or directly from disk —
> `frontend/assets/js/api.js` automatically targets `http://localhost:5000/api` in that case.

---

## 5. API Endpoints Reference

### Authentication (`/api`)
- `POST /api/login` — Authenticate as `admin` or `student`.
- `POST /api/logout` — Clear session.
- `GET /api/current-user` — Current session user profile.

### Dashboard (`/api`, admin session required)
- `GET /api/stats` — Live MySQL statistics (`totalStudents`, `activeStudents`, `inactiveStudents`, `totalCourses`, `totalDepartments`).

### Students (`/api`, admin session required)
- `GET /api/students` — All students (supports `?search=`, `?course=`, `?status=`).
- `POST /api/students` — Add student (**Student ID is generated automatically**).
- `GET /api/students/<student_id>` — Student details.
- `PUT /api/students/<student_id>` — Edit student.
- `PATCH /api/students/<student_id>/status` — Toggle status (`Active` / `Inactive`).
- `DELETE /api/students/<student_id>` — Delete student and login account.
- `PUT /api/students/<student_id>/password` — Reset a student's password.
- `GET /api/student/profile?student_id=<id>` — Student self-service profile.

### Departments & Courses (`/api`)
- `GET /api/departments` — List all departments.
- `POST /api/departments` — Add new department.
- `GET|PUT|DELETE /api/departments/<id>` — Manage a department.
- `GET /api/courses` — List all courses (admin session required).
- `POST /api/courses` — Add new course (admin session required).
- `DELETE /api/courses/<id>` — Delete course (admin session required).

### Users (`/api`)
- `GET /api/users` — All user accounts (admin only).
- `POST /api/users` — Create a user account.
- `GET|PUT|DELETE /api/users/<id>` — Manage a user account.

### Profile (`/api`)
- `GET /api/profile` — Profile of the logged-in user (admin or student).
- `PUT /api/profile/password` — Change own password.

---

## 6. Default Login Credentials

| Role | Username / ID | Password | Portal Entry |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Admin tab |
| **Student** | `STD-1001` | `123456` | Student tab |
