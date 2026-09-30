# Routes package
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.students import students_bp
from routes.departments import departments_bp
from routes.users import users_bp
from routes.profile import profile_bp

__all__ = [
    'auth_bp',
    'dashboard_bp',
    'students_bp',
    'departments_bp',
    'users_bp',
    'profile_bp'
]
