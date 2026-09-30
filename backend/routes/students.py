import re
from flask import Blueprint, request, jsonify, session
from extensions import db
from models import Student, User, Course, Department
from auth_utils import admin_required

students_bp = Blueprint('students', __name__)

# ============================================================
# 1. VIEW ALL & SEARCH STUDENTS
# ============================================================
@students_bp.route('/students', methods=['GET'])
@admin_required
def get_students():
    """
    Get all students with optional search and filter parameters:
    - search: matches studentId, firstName, lastName, email, phone, course, address
    - course: matches course name
    - status: matches Active / Inactive
    """
    search = (request.args.get('search') or '').strip().lower()
    course_filter = (request.args.get('course') or '').strip()
    status_filter = (request.args.get('status') or '').strip()

    query = Student.query

    if course_filter:
        query = query.filter(Student.course == course_filter)

    if status_filter:
        query = query.filter(Student.status == status_filter)

    query = query.order_by(Student.id.desc())
    all_students = query.all()

    student_list = [s.to_dict() for s in all_students]

    # Flexible multi-field search
    if search:
        student_list = [
            s for s in student_list if (
                search in s['studentId'].lower() or
                search in f"{s['firstName']} {s['lastName']}".lower() or
                search in s['email'].lower() or
                search in s['phone'].lower() or
                search in s['course'].lower() or
                search in s['address'].lower()
            )
        ]

    return jsonify({
        'status': 'success',
        'count': len(student_list),
        'students': student_list
    }), 200


# ============================================================
# 2. VIEW SINGLE STUDENT DETAILS
# ============================================================
@students_bp.route('/students/<student_id>', methods=['GET'])
@admin_required
def get_student(student_id):
    """
    View details for a specific student by student_id or integer id.
    """
    student = Student.query.filter_by(student_id=student_id).first()
    if not student and student_id.isdigit():
        student = Student.query.get(int(student_id))

    if not student:
        return jsonify({
            'status': 'error',
            'message': f'Student with ID "{student_id}" not found.'
        }), 404

    return jsonify({
        'status': 'success',
        'student': student.to_dict()
    }), 200


# ============================================================
# 3. ADD NEW STUDENT (AUTOMATIC STUDENT ID GENERATION)
# ============================================================
@students_bp.route('/students', methods=['POST'])
@admin_required
def add_student():
    """
    Creates a new student record and associated student user login account.
    The Student ID is automatically generated sequentially (STD-XXXX),
    so the admin NEVER enters it manually.
    """
    data = request.get_json() or {}

    first_name = (data.get('firstName') or '').strip()
    last_name = (data.get('lastName') or '').strip()
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()
    dob = (data.get('dob') or '').strip()
    gender = (data.get('gender') or '').strip()
    course_name = (data.get('course') or '').strip()
    status = (data.get('status') or 'Active').strip()
    address = (data.get('address') or '').strip()
    admission_date = (data.get('admissionDate') or '').strip()
    initial_password = (data.get('password') or '123456').strip()

    # Optional base64 data-URL profile photo
    photo = data.get('photo') or None
    if photo:
        if not isinstance(photo, str) or not photo.startswith('data:image/'):
            return jsonify({'status': 'error', 'message': 'Invalid photo format. Expected a base64 image data URL.'}), 400
        if len(photo) > 3 * 1024 * 1024:
            return jsonify({'status': 'error', 'message': 'Photo is too large. Maximum allowed size is about 2 MB.'}), 413

    if not first_name or not last_name:
        return jsonify({
            'status': 'error',
            'message': 'First Name and Last Name are required fields.'
        }), 400

    # Validate email format if provided
    if email:
        email_regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(email_regex, email):
            return jsonify({
                'status': 'error',
                'message': 'Invalid email address format.'
            }), 400
        # Check duplicate email
        dup_email = Student.query.filter(Student.email.ilike(email)).first()
        if dup_email:
            return jsonify({
                'status': 'error',
                'message': f'A student with email "{email}" already exists.'
            }), 409

    # Auto-generate next Student ID
    auto_student_id = Student.generate_next_student_id()

    # Link to course & department if match found
    course_obj = None
    if course_name:
        course_obj = Course.query.filter_by(name=course_name).first()

    # Create associated student login User account
    student_user = User(
        username=auto_student_id,
        role='student'
    )
    student_user.set_password(initial_password)
    db.session.add(student_user)
    db.session.flush()  # get student_user.id

    # Create Student record
    new_student = Student(
        student_id=auto_student_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        dob=dob,
        gender=gender,
        course=course_name,
        course_id=course_obj.id if course_obj else None,
        department_id=course_obj.department_id if course_obj else None,
        status=status,
        address=address,
        admission_date=admission_date,
        photo=photo,
        user_id=student_user.id,
        plain_password=initial_password
    )
    db.session.add(new_student)
    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        msg = str(getattr(exc, 'orig', exc))
        if 'Data too long' in msg or 'max_allowed_packet' in msg:
            return jsonify({
                'status': 'error',
                'message': 'Could not save student: the profile photo is too large for the database. Please use a smaller image (under 2 MB).'
            }), 413
        return jsonify({
            'status': 'error',
            'message': f'Could not save student record: {msg}'
        }), 500

    return jsonify({
        'status': 'success',
        'message': f'Student registered successfully with ID: {auto_student_id}',
        'student': new_student.to_dict()
    }), 201


# ============================================================
# 4. EDIT / UPDATE STUDENT
# ============================================================
@students_bp.route('/students/<student_id>', methods=['PUT'])
@admin_required
def update_student(student_id):
    """
    Edit and update existing student details.
    """
    student = Student.query.filter_by(student_id=student_id).first()
    if not student and student_id.isdigit():
        student = Student.query.get(int(student_id))

    if not student:
        return jsonify({'status': 'error', 'message': f'Student "{student_id}" not found.'}), 404

    data = request.get_json() or {}

    first_name = (data.get('firstName') or '').strip()
    last_name = (data.get('lastName') or '').strip()
    if not first_name or not last_name:
        return jsonify({
            'status': 'error',
            'message': 'First Name and Last Name cannot be empty.'
        }), 400

    new_email = (data.get('email') or '').strip()
    if new_email:
        email_regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(email_regex, new_email):
            return jsonify({
                'status': 'error',
                'message': 'Invalid email address format.'
            }), 400
        # Check duplicate email on another student
        dup_email = Student.query.filter(
            (Student.email.ilike(new_email)) & (Student.id != student.id)
        ).first()
        if dup_email:
            return jsonify({
                'status': 'error',
                'message': f'Another student with email "{new_email}" already exists.'
            }), 409

    student.first_name = first_name
    student.last_name = last_name
    student.email = new_email
    student.phone = (data.get('phone') or '').strip()
    student.dob = (data.get('dob') or '').strip()
    student.gender = (data.get('gender') or '').strip()

    course_name = (data.get('course') or '').strip()
    student.course = course_name or None
    if course_name:
        course_obj = Course.query.filter_by(name=course_name).first()
        if course_obj:
            student.course_id = course_obj.id
            student.department_id = course_obj.department_id
    else:
        # Course cleared: drop stale links so to_dict() does not resurrect the old course
        student.course_id = None
        student.department_id = None

    student.status = (data.get('status') or 'Active').strip()
    student.address = (data.get('address') or '').strip()
    student.admission_date = (data.get('admissionDate') or '').strip()

    # Photo: absent key = keep existing; empty string = remove; data URL = replace
    if 'photo' in data:
        photo_val = data.get('photo')
        if photo_val:
            if not isinstance(photo_val, str) or not photo_val.startswith('data:image/'):
                return jsonify({'status': 'error', 'message': 'Invalid photo format. Expected a base64 image data URL.'}), 400
            if len(photo_val) > 3 * 1024 * 1024:
                return jsonify({'status': 'error', 'message': 'Photo is too large. Maximum allowed size is about 2 MB.'}), 413
            student.photo = photo_val
        else:
            student.photo = None

    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Student {student_id} updated successfully!',
        'student': student.to_dict()
    }), 200


# ============================================================
# 5. DEACTIVATE / ACTIVATE STUDENT
# ============================================================
@students_bp.route('/students/<student_id>/status', methods=['PATCH', 'PUT'])
@admin_required
def change_student_status(student_id):
    """
    Quick status toggle / deactivation for students.
    """
    student = Student.query.filter_by(student_id=student_id).first()
    if not student:
        return jsonify({'status': 'error', 'message': 'Student not found.'}), 404

    data = request.get_json() or {}
    new_status = data.get('status', 'Inactive').strip()
    student.status = new_status
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Student status changed to {new_status}.',
        'student': student.to_dict()
    }), 200


# ============================================================
# 6. DELETE STUDENT
# ============================================================
@students_bp.route('/students/<student_id>', methods=['DELETE'])
@admin_required
def delete_student(student_id):
    """
    Permanently deletes a student record and their login user account.
    """
    student = Student.query.filter_by(student_id=student_id).first()
    if not student and student_id.isdigit():
        student = Student.query.get(int(student_id))

    if not student:
        return jsonify({'status': 'error', 'message': f'Student "{student_id}" not found.'}), 404

    user = student.user
    db.session.delete(student)
    if user:
        db.session.delete(user)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Student {student_id} deleted successfully.'
    }), 200


# ============================================================
# 7. RESET / UPDATE STUDENT PASSWORD (FOR ADMIN USERS VIEW)
# ============================================================
@students_bp.route('/students/<student_id>/password', methods=['PUT'])
@admin_required
def reset_student_password(student_id):
    student = Student.query.filter_by(student_id=student_id).first()
    if not student:
        return jsonify({'status': 'error', 'message': 'Student not found.'}), 404

    data = request.get_json() or {}
    new_password = (data.get('password') or '').strip()
    if not new_password:
        return jsonify({'status': 'error', 'message': 'New password is required.'}), 400

    student.plain_password = new_password
    if student.user:
        student.user.set_password(new_password)

    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Password for student {student_id} updated successfully.'
    }), 200


# ============================================================
# 8. STUDENT OWN PROFILE (STUDENT MODULE)
# ============================================================
@students_bp.route('/student/profile', methods=['GET'])
def get_student_profile():
    """
    Allows a student to view their own profile and details only.
    """
    target_id = (request.args.get('student_id') or request.args.get('username') or '').strip()

    # If student is logged in with session, default to session ID
    if not target_id and session.get('role') == 'student':
        target_id = session.get('student_id') or session.get('username')

    if not target_id:
        return jsonify({
            'status': 'error',
            'message': 'student_id parameter is required.'
        }), 400

    # Ensure student can only view their own profile if logged in as student
    if session.get('role') == 'student':
        current_sess_id = session.get('student_id') or session.get('username')
        if current_sess_id and current_sess_id.lower() != target_id.lower():
            # If search by first_name match, verify owner
            student = Student.query.filter_by(student_id=current_sess_id).first()
            if not student or student.first_name.lower() != target_id.lower():
                return jsonify({
                    'status': 'error',
                    'message': 'Unauthorized: Students can only view their own profile.'
                }), 403

    student = Student.query.filter(
        (Student.student_id == target_id) | (Student.first_name == target_id)
    ).first()

    if not student:
        return jsonify({
            'status': 'error',
            'message': f'Student profile for "{target_id}" not found.'
        }), 404

    return jsonify({
        'status': 'success',
        'student': student.to_dict(include_password=False)
    }), 200
