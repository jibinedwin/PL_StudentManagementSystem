from flask import Blueprint, request, jsonify, session
from extensions import db
from models import Student, User
from auth_utils import login_required

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/profile', methods=['GET'])
@login_required
def get_current_profile():
    """
    Get profile details for the currently logged-in user (admin or student).
    """
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user:
        return jsonify({'status': 'error', 'message': 'User session not found.'}), 404

    res = {
        'status': 'success',
        'user': user.to_dict()
    }
    if user.role == 'student' and user.student:
        res['student'] = user.student.to_dict(include_password=False)

    return jsonify(res), 200

@profile_bp.route('/profile/password', methods=['PUT'])
@login_required
def update_profile_password():
    """
    Update password for the logged-in user.
    """
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user:
        return jsonify({'status': 'error', 'message': 'User session not found.'}), 404

    data = request.get_json() or {}
    old_password = (data.get('oldPassword') or '').strip()
    new_password = (data.get('newPassword') or '').strip()

    if not old_password or not new_password:
        return jsonify({'status': 'error', 'message': 'Current password and new password are required.'}), 400

    if not user.check_password(old_password):
        return jsonify({'status': 'error', 'message': 'Incorrect current password.'}), 401

    user.set_password(new_password)
    if user.role == 'student' and user.student:
        user.student.plain_password = new_password

    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': 'Password updated successfully.'
    }), 200
