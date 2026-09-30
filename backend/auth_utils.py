from functools import wraps
from flask import session, jsonify

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'status': 'error', 'message': 'Authentication required. Please log in.'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'status': 'error', 'message': 'Authentication required. Please log in.'}), 401
        if session.get('role') != 'admin':
            return jsonify({'status': 'error', 'message': 'Access denied: Administrator privileges required.'}), 403
        return f(*args, **kwargs)
    return decorated_function

def student_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'status': 'error', 'message': 'Authentication required. Please log in.'}), 401
        if session.get('role') != 'student':
            return jsonify({'status': 'error', 'message': 'Access denied: Student privileges required.'}), 403
        return f(*args, **kwargs)
    return decorated_function
