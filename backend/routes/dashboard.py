from flask import Blueprint, jsonify
from models import Student, Department, Course
from auth_utils import admin_required

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    """
    Returns live dynamic statistics from MySQL database:
    - totalStudents
    - activeStudents
    - inactiveStudents
    - totalCourses
    - totalDepartments
    """
    try:
        total_students = Student.query.count()
        active_students = Student.query.filter_by(status='Active').count()
        inactive_students = Student.query.filter(Student.status != 'Active').count()
        total_courses = Course.query.count()
        total_departments = Department.query.count()

        return jsonify({
            'status': 'success',
            'stats': {
                'totalStudents': total_students,
                'activeStudents': active_students,
                'inactiveStudents': inactive_students,
                'totalCourses': total_courses,
                'totalDepartments': total_departments
            }
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to retrieve dashboard statistics: {str(e)}'
        }), 500
