from flask import Blueprint, request, jsonify, session
from extensions import db
from models import User, Student
from auth_utils import login_required, admin_required

users_bp = Blueprint('users', __name__)

@users_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """
    Get all student and admin user accounts.
    """
    search = (request.args.get('search') or '').strip().lower()
    role_filter = (request.args.get('role') or '').strip().lower()

    query = User.query

    if role_filter:
        query = query.filter_by(role=role_filter)

    users = query.order_by(User.id.asc()).all()

    result = []
    for u in users:
        item = {
            'id': u.id,
            'username': u.username,
            'role': u.role,
            'created_at': u.created_at.strftime('%Y-%m-%d %H:%M:%S') if u.created_at else ''
        }
        if u.role == 'student' and u.student:
            item['studentId'] = u.student.student_id
            item['fullName'] = f"{u.student.first_name} {u.student.last_name}"
            item['email'] = u.student.email or ''
            item['status'] = u.student.status or 'Active'
            item['password'] = u.student.plain_password or '123456'
        else:
            item['studentId'] = '-'
            item['fullName'] = 'System Administrator' if u.role == 'admin' else u.username
            item['email'] = '-'
            item['status'] = 'Active'
            item['password'] = '******'
        
        if search:
            if not (search in item['username'].lower() or 
                    search in item['fullName'].lower() or 
                    search in item['studentId'].lower() or
                    search in item['email'].lower()):
                continue

        result.append(item)

    return jsonify({
        'status': 'success',
        'count': len(result),
        'users': result
    }), 200


@users_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user_details(user_id):
    """
    Retrieve one specific user's details.
    """
    u = User.query.get(user_id)
    if not u:
        return jsonify({'status': 'error', 'message': f'User ID {user_id} not found.'}), 404

    item = {
        'id': u.id,
        'username': u.username,
        'role': u.role,
        'created_at': u.created_at.strftime('%Y-%m-%d %H:%M:%S') if u.created_at else ''
    }
    if u.role == 'student' and u.student:
        item['student'] = u.student.to_dict()
    return jsonify({'status': 'success', 'user': item}), 200


@users_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    """
    Create a new user account directly.
    """
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    role = (data.get('role') or 'student').strip().lower()

    if not username or not password:
        return jsonify({'status': 'error', 'message': 'Username and password are required.'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'status': 'error', 'message': f'Username "{username}" is already taken.'}), 409

    new_user = User(username=username, role=role)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'User "{username}" created successfully.',
        'user': new_user.to_dict()
    }), 201


@users_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """
    Update a user's password or role.
    """
    u = User.query.get(user_id)
    if not u:
        return jsonify({'status': 'error', 'message': f'User ID {user_id} not found.'}), 404

    data = request.get_json() or {}
    new_password = (data.get('password') or '').strip()
    new_role = (data.get('role') or '').strip().lower()

    if new_password:
        u.set_password(new_password)
        if u.role == 'student' and u.student:
            u.student.plain_password = new_password

    if new_role and new_role in ['admin', 'student']:
        u.role = new_role

    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'User ID {user_id} updated successfully.',
        'user': u.to_dict()
    }), 200


@users_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """
    Delete a user account.
    """
    u = User.query.get(user_id)
    if not u:
        return jsonify({'status': 'error', 'message': f'User ID {user_id} not found.'}), 404

    if u.username == 'admin' or (session.get('user_id') == u.id):
        return jsonify({'status': 'error', 'message': 'Cannot delete the primary admin or currently active user.'}), 400

    db.session.delete(u)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'User ID {user_id} deleted successfully.'
    }), 200
