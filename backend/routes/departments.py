from flask import Blueprint, request, jsonify
from extensions import db
from models import Department, Course, Student
from auth_utils import admin_required

departments_bp = Blueprint('departments', __name__)

# ============================================================
# 1. DEPARTMENTS CRUD
# ============================================================
@departments_bp.route('/departments', methods=['GET'])
def get_departments():
    """
    Get all departments with related courses count and student count.
    """
    departments = Department.query.order_by(Department.name.asc()).all()
    return jsonify({
        'status': 'success',
        'count': len(departments),
        'departments': [d.to_dict() for d in departments]
    }), 200


@departments_bp.route('/departments/<int:dept_id>', methods=['GET'])
def get_department(dept_id):
    """
    Get a single department's details including list of its courses and students.
    """
    dept = Department.query.get(dept_id)
    if not dept:
        return jsonify({'status': 'error', 'message': f'Department ID {dept_id} not found.'}), 404

    data = dept.to_dict()
    data['courses'] = [c.to_dict() for c in dept.courses]
    data['students'] = [s.to_dict(include_password=False) for s in dept.students]

    return jsonify({
        'status': 'success',
        'department': data
    }), 200


@departments_bp.route('/departments', methods=['POST'])
def add_department():
    """
    Add a new department.
    """
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    code = (data.get('code') or '').strip().upper()
    description = (data.get('description') or '').strip()

    if not name:
        return jsonify({'status': 'error', 'message': 'Department name is required.'}), 400

    existing = Department.query.filter_by(name=name).first()
    if existing:
        return jsonify({'status': 'error', 'message': f'Department "{name}" already exists.'}), 409

    dept = Department(name=name, code=code if code else None, description=description)
    db.session.add(dept)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Department "{name}" created successfully.',
        'department': dept.to_dict()
    }), 201


@departments_bp.route('/departments/<int:dept_id>', methods=['PUT'])
def update_department(dept_id):
    """
    Update an existing department.
    """
    dept = Department.query.get(dept_id)
    if not dept:
        return jsonify({'status': 'error', 'message': f'Department ID {dept_id} not found.'}), 404

    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    code = (data.get('code') or '').strip().upper()
    description = (data.get('description') or '').strip()

    if not name:
        return jsonify({'status': 'error', 'message': 'Department name cannot be empty.'}), 400

    dup = Department.query.filter((Department.name == name) & (Department.id != dept.id)).first()
    if dup:
        return jsonify({'status': 'error', 'message': f'Department with name "{name}" already exists.'}), 409

    dept.name = name
    dept.code = code if code else None
    dept.description = description
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Department "{name}" updated successfully.',
        'department': dept.to_dict()
    }), 200


@departments_bp.route('/departments/<int:dept_id>', methods=['DELETE'])
def delete_department(dept_id):
    """
    Delete a department by ID.
    """
    dept = Department.query.get(dept_id)
    if not dept:
        return jsonify({'status': 'error', 'message': 'Department not found.'}), 404

    # Nullify students referencing this department
    Student.query.filter_by(department_id=dept.id).update({'department_id': None})
    db.session.delete(dept)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Department "{dept.name}" deleted successfully.'
    }), 200


# ============================================================
# 2. COURSES MANAGEMENT (LINKED TO DEPARTMENTS)
# ============================================================
@departments_bp.route('/courses', methods=['GET'])
@admin_required
def get_courses():
    """
    Get all courses with their duration and department information.
    """
    courses = Course.query.order_by(Course.id.asc()).all()
    return jsonify({
        'status': 'success',
        'count': len(courses),
        'courses': [c.to_dict() for c in courses]
    }), 200


@departments_bp.route('/courses', methods=['POST'])
@admin_required
def add_course():
    """
    Add a new course / degree program.
    """
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    duration = (data.get('duration') or '4 Years').strip()
    department_id = data.get('departmentId')

    if not name:
        return jsonify({'status': 'error', 'message': 'Course name is required.'}), 400

    existing = Course.query.filter_by(name=name).first()
    if existing:
        return jsonify({'status': 'error', 'message': f'Course "{name}" already exists.'}), 409

    # Default to first available department if not supplied
    if not department_id:
        first_dept = Department.query.first()
        department_id = first_dept.id if first_dept else None

    course = Course(name=name, duration=duration, department_id=department_id)
    db.session.add(course)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Course "{name}" added successfully.',
        'course': course.to_dict()
    }), 201


@departments_bp.route('/courses/<int:course_id>', methods=['DELETE'])
@admin_required
def delete_course(course_id):
    """
    Delete a course by ID.
    """
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'status': 'error', 'message': 'Course not found.'}), 404

    # Unassign students referencing this course (frontend shows 'Not Assigned' for empty course)
    Student.query.filter_by(course_id=course.id).update({'course_id': None, 'course': None, 'department_id': None})
    db.session.delete(course)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Course "{course.name}" deleted successfully.'
    }), 200
