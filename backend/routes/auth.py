from flask import Blueprint, request, jsonify, session
from extensions import db
from models import User, Student

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login endpoint supporting Admin and Student roles.
    Uses Bcrypt password verification and establishes Flask session.
    """
    data = request.get_json() or {}
    role = (data.get('role') or 'admin').strip().lower()
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()

    if not username or not password:
        return jsonify({
            'status': 'error',
            'message': 'Username / Student ID and Password are required.'
        }), 400

    # 1. Admin login
    if role == 'admin':
        user = User.query.filter_by(username=username, role='admin').first()
        if not user or not user.check_password(password):
            return jsonify({
                'status': 'error',
                'message': 'Invalid Admin credentials.'
            }), 401

        # Store session
        session['user_id'] = user.id
        session['username'] = user.username
        session['role'] = 'admin'

        return jsonify({
            'status': 'success',
            'message': 'Admin login successful!',
            'user': {
                'id': user.id,
                'username': user.username,
                'role': 'admin'
            }
        }), 200

    # 2. Student login (can log in using student_id or username)
    elif role == 'student':
        # Search by user account username (which matches student_id)
        user = User.query.filter(
            (User.username == username) & (User.role == 'student')
        ).first()

        # If not found directly on users, try student record by student_id or first_name
        student_rec = None
        if user:
            student_rec = user.student
        else:
            student_rec = Student.query.filter(
                (Student.student_id == username) | (Student.first_name == username)
            ).first()
            if student_rec and student_rec.user:
                user = student_rec.user

        if not user or not user.check_password(password):
            return jsonify({
                'status': 'error',
                'message': 'Invalid Student ID or Password.'
            }), 401

        if student_rec and student_rec.status == 'Inactive':
            return jsonify({
                'status': 'error',
                'message': 'Your account is currently inactive. Please contact the administrator.'
            }), 403

        # Store session
        session['user_id'] = user.id
        session['username'] = user.username
        session['role'] = 'student'
        session['student_id'] = student_rec.student_id if student_rec else user.username

        return jsonify({
            'status': 'success',
            'message': 'Student login successful!',
            'student': student_rec.to_dict(include_password=False) if student_rec else None,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': 'student'
            }
        }), 200

    return jsonify({'status': 'error', 'message': f'Unsupported role: {role}'}), 400


@auth_bp.route('/logout', methods=['POST', 'GET'])
def logout():
    """
    Clears the session on logout.
    """
    session.clear()
    return jsonify({
        'status': 'success',
        'message': 'Logged out successfully.'
    }), 200


@auth_bp.route('/current-user', methods=['GET'])
def current_user():
    """
    Returns the currently logged-in user profile from session.
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({
            'status': 'error',
            'message': 'Not logged in.'
        }), 401

    user = User.query.get(user_id)
    if not user:
        session.clear()
        return jsonify({'status': 'error', 'message': 'User not found.'}), 401

    resp = {
        'status': 'success',
        'user': user.to_dict()
    }
    if user.role == 'student' and user.student:
        resp['student'] = user.student.to_dict(include_password=False)

    return jsonify(resp), 200
