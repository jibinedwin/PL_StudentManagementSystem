from datetime import date, datetime
from flask import Blueprint, request, jsonify
from extensions import db
from models import Student, Course, Attendance
from auth_utils import admin_required

attendance_bp = Blueprint('attendance', __name__)


# ============================================================
# 1. LIST COURSES (for the Attendance course table)
# ============================================================
@attendance_bp.route('/attendance/courses', methods=['GET'])
@admin_required
def get_attendance_courses():
    """
    Returns all courses with enrolled student counts,
    for the Attendance section's course selection table.
    """
    courses = Course.query.order_by(Course.name.asc()).all()
    course_list = []
    for c in courses:
        d = c.to_dict()
        d['enrolledCount'] = Student.query.filter(
            (Student.course_id == c.id) | (Student.course == c.name)
        ).count()
        course_list.append(d)

    return jsonify({
        'status': 'success',
        'count': len(course_list),
        'courses': course_list
    }), 200


# ============================================================
# 2. STUDENTS ENROLLED IN A COURSE (+ today's attendance status)
# ============================================================
@attendance_bp.route('/attendance/courses/<int:course_id>/students', methods=['GET'])
@admin_required
def get_course_students(course_id):
    """
    Returns students enrolled in a course with their attendance
    status for the given date (defaults to today).
    """
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'status': 'error', 'message': f'Course ID {course_id} not found.'}), 404

    query_date = _parse_date(request.args.get('date'))

    students = Student.query.filter(
        (Student.course_id == course_id) | (Student.course == course.name)
    ).order_by(Student.first_name.asc(), Student.last_name.asc()).all()

    records = Attendance.query.filter(
        Attendance.attendance_date == query_date,
        Attendance.student_row_id.in_([s.id for s in students]) if students else db.false()
    ).all()

    status_by_student = {r.student_row_id: r.status for r in records}

    student_list = []
    for s in students:
        student_list.append({
            'id': s.id,
            'studentId': s.student_id,
            'fullName': f"{s.first_name} {s.last_name}",
            'status': s.status or 'Active',
            'attendanceStatus': status_by_student.get(s.id) or None  # 'Present' | 'Absent' | None
        })

    return jsonify({
        'status': 'success',
        'date': query_date.strftime('%Y-%m-%d'),
        'course': course.to_dict(),
        'count': len(student_list),
        'students': student_list
    }), 200


# ============================================================
# 3. GET ATTENDANCE FOR A COURSE + DATE
# ============================================================
@attendance_bp.route('/attendance', methods=['GET'])
@admin_required
def get_attendance():
    """
    Returns saved attendance rows for a course on a date.
    Query params: course_id (optional), date (defaults to today).
    """
    query_date = _parse_date(request.args.get('date'))
    course_id = request.args.get('course_id', type=int)

    query = Attendance.query.filter(Attendance.attendance_date == query_date)
    if course_id:
        query = query.filter(Attendance.course_id == course_id)

    records = query.all()
    return jsonify({
        'status': 'success',
        'date': query_date.strftime('%Y-%m-%d'),
        'count': len(records),
        'attendance': [r.to_dict() for r in records]
    }), 200


# ============================================================
# 4. MARK / SAVE ATTENDANCE (UPSERT, BULK)
# ============================================================
@attendance_bp.route('/attendance', methods=['POST'])
@admin_required
def mark_attendance():
    """
    Body: {
      "courseId": 3,
      "date": "2026-09-30",            # optional, defaults to today
      "records": [
        {"studentId": "STD-1001", "status": "Present"},
        {"studentRowId": 7,        "status": "Absent"}
      ]
    }
    Upserts one attendance row per student per date.
    """
    data = request.get_json() or {}

    attendance_date = _parse_date(data.get('date'))
    course_id = data.get('courseId')
    records = data.get('records') or []

    if not records:
        return jsonify({'status': 'error', 'message': 'No attendance records provided.'}), 400

    course = Course.query.get(course_id) if course_id else None
    if course_id and not course:
        return jsonify({'status': 'error', 'message': f'Course ID {course_id} not found.'}), 404

    saved, errors = [], []
    for rec in records:
        status = (rec.get('status') or '').strip()
        if status not in ('Present', 'Absent'):
            errors.append(f"Invalid status '{status}' for a record (expected 'Present' or 'Absent').")
            continue

        student = None
        if rec.get('studentRowId'):
            student = Student.query.get(rec['studentRowId'])
        elif rec.get('studentId'):
            student = Student.query.filter_by(student_id=rec['studentId']).first()

        if not student:
            errors.append(f"Student not found: {rec.get('studentId') or rec.get('studentRowId')}")
            continue

        existing = Attendance.query.filter_by(
            student_row_id=student.id,
            attendance_date=attendance_date
        ).first()

        if existing:
            existing.status = status
            existing.course_id = course.id if course else existing.course_id
            row = existing
        else:
            row = Attendance(
                student_row_id=student.id,
                course_id=course.id if course else None,
                attendance_date=attendance_date,
                status=status
            )
            db.session.add(row)

        saved.append(row)

    if errors and not saved:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': ' '.join(errors)}), 400

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': f'Could not save attendance: {str(getattr(exc, "orig", exc))}'}), 500

    return jsonify({
        'status': 'success',
        'message': f'Attendance saved for {len(saved)} student(s).',
        'date': attendance_date.strftime('%Y-%m-%d'),
        'saved': len(saved),
        'errors': errors
    }), 200


# ============================================================
# Helpers
# ============================================================
def _parse_date(raw):
    """Parse a YYYY-MM-DD string; falls back to today on invalid/missing input."""
    if raw:
        try:
            return datetime.strptime(str(raw).strip(), '%Y-%m-%d').date()
        except ValueError:
            pass
    return date.today()
