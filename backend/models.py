from datetime import datetime
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from extensions import db, bcrypt

class User(db.Model):
    """
    Users table for authentication.
    Supports both 'admin' and 'student' roles.
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student')  # 'admin' or 'student'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # One-to-one relationship with Student model (if role == 'student')
    student = db.relationship('Student', back_populates='user', uselist=False, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role
        }


class Department(db.Model):
    """
    Department model (e.g., School of Engineering, Science, Business).
    One department has many courses.
    """
    __tablename__ = 'departments'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=True)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    courses = db.relationship('Course', back_populates='department', cascade='all, delete-orphan')
    students = db.relationship('Student', back_populates='department')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code or '',
            'description': self.description or '',
            'totalCourses': len(self.courses),
            'totalStudents': len(self.students)
        }


class Course(db.Model):
    """
    Course/Program model (e.g., Computer Science, Information Technology).
    Belongs to a Department, has many Students.
    """
    __tablename__ = 'courses'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    duration = db.Column(db.String(50), nullable=False, default='4 Years')
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    department = db.relationship('Department', back_populates='courses')
    students = db.relationship('Student', back_populates='course_rel')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'duration': self.duration,
            'departmentId': self.department_id,
            'departmentName': self.department.name if self.department else 'General',
            'studentCount': len(self.students)
        }


class Attendance(db.Model):
    """
    Attendance record for a student on a specific date.
    One row per (student, date) — 'Present' or 'Absent' — regardless of course.
    """
    __tablename__ = 'attendance'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_row_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False, index=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True)
    attendance_date = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(db.String(10), nullable=False, default='Present')  # 'Present' or 'Absent'
    marked_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship('Student', backref='attendance_records')
    course = db.relationship('Course')

    def to_dict(self):
        return {
            'id': self.id,
            'studentRowId': self.student_row_id,
            'studentId': self.student.student_id if self.student else '',
            'courseId': self.course_id,
            'date': self.attendance_date.strftime('%Y-%m-%d') if self.attendance_date else '',
            'status': self.status
        }


class Student(db.Model):
    """
    Student model containing student personal, academic and contact details.
    """
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(60), nullable=False)
    last_name = db.Column(db.String(60), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    dob = db.Column(db.String(20), nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    
    # Text field for direct course name (matches frontend data contract)
    course = db.Column(db.String(120), nullable=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)

    status = db.Column(db.String(20), default='Active', nullable=False)  # 'Active' or 'Inactive'
    address = db.Column(db.Text, nullable=True)
    admission_date = db.Column(db.String(20), nullable=True)

    # Base64 data-URL of the student's profile photo (optional, empty string = no photo)
    # MEDIUMTEXT (~16 MB) is required: a plain TEXT column (64 KB) cannot hold a
    # base64-encoded photo, which fails with "Data too long" on commit.
    photo = db.Column(MEDIUMTEXT, nullable=True)
    
    # Link to user account
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    plain_password = db.Column(db.String(100), default='123456') # For Admin users list display

    # Relationships
    user = db.relationship('User', back_populates='student')
    course_rel = db.relationship('Course', back_populates='students')
    department = db.relationship('Department', back_populates='students')

    @classmethod
    def generate_next_student_id(cls):
        """
        Auto-generates sequential Student ID (e.g., STD-1001, STD-1002).
        Admins never need to enter it manually.
        """
        all_students = cls.query.all()
        if not all_students:
            return 'STD-1001'

        max_num = 1000
        for s in all_students:
            if s.student_id and s.student_id.startswith('STD-'):
                try:
                    num = int(s.student_id.replace('STD-', ''))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass
        return f"STD-{max_num + 1}"

    def to_dict(self, include_password=True):
        res = {
            'id': self.id,
            'studentId': self.student_id,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'email': self.email or '',
            'phone': self.phone or '',
            'dob': self.dob or '',
            'gender': self.gender or '',
            'course': self.course or (self.course_rel.name if self.course_rel else ''),
            'courseId': self.course_id,
            'departmentId': self.department_id,
            'departmentName': self.department.name if self.department else '',
            'status': self.status or 'Active',
            'address': self.address or '',
            'admissionDate': self.admission_date or '',
            'photo': self.photo or ''
        }
        if include_password:
            res['password'] = self.plain_password or '123456'
        return res
