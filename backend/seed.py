"""
Database seeding script:
Creates MySQL tables and populates sample Users, Departments, Courses, and Students.
Run this script once using:
    python seed.py
"""
import os
import sys

# Ensure backend directory is in python search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from extensions import db
from models import User, Department, Course, Student

def seed_database():
    with app.app_context():
        print("Creating all MySQL database tables...")
        db.create_all()

        # Lightweight migration for databases created before the photo column existed
        with db.engine.connect() as conn:
            cols = conn.execute(db.text(
                "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students'"
            )).fetchall()
            col_types = {c[0]: str(c[1]).lower() for c in cols}
            if 'photo' not in col_types:
                print("  [+] Adding 'photo' column to students table...")
                conn.execute(db.text("ALTER TABLE students ADD COLUMN photo MEDIUMTEXT NULL"))
                conn.commit()
                print("  [+] 'photo' column added.")
            elif col_types['photo'] == 'text':
                print("  [+] Upgrading 'photo' column TEXT -> MEDIUMTEXT...")
                conn.execute(db.text("ALTER TABLE students MODIFY COLUMN photo MEDIUMTEXT NULL"))
                conn.commit()
                print("  [+] 'photo' column upgraded to MEDIUMTEXT.")

        # 1. Seed Admin User
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            admin_user = User(username='admin', role='admin')
            admin_user.set_password('admin123')
            db.session.add(admin_user)
            print("  [+] Admin user created: username='admin', password='admin123'")
        else:
            print("  [i] Admin user already exists.")

        # 2. Seed Departments
        departments_data = [
            {'name': 'School of Computer Science & Engineering', 'code': 'CSE', 'description': 'Software, Computing, and Systems'},
            {'name': 'School of Electrical Sciences', 'code': 'EEE', 'description': 'Electronics, Power, and Telecommunications'},
            {'name': 'School of Mechanical & Civil Engineering', 'code': 'MEC', 'description': 'Design, Manufacturing, and Infrastructure'},
            {'name': 'School of Management Studies', 'code': 'SMS', 'description': 'Business, Finance, and Administration'}
        ]

        dept_objs = {}
        for d_data in departments_data:
            dept = Department.query.filter_by(name=d_data['name']).first()
            if not dept:
                dept = Department(name=d_data['name'], code=d_data['code'], description=d_data['description'])
                db.session.add(dept)
                db.session.flush()
                print(f"  [+] Department created: {dept.name}")
            dept_objs[d_data['code']] = dept

        # 3. Seed Courses
        courses_data = [
            {'name': 'Computer Science', 'duration': '4 Years', 'dept': 'CSE'},
            {'name': 'Information Technology', 'duration': '4 Years', 'dept': 'CSE'},
            {'name': 'Electrical Engineering', 'duration': '4 Years', 'dept': 'EEE'},
            {'name': 'Mechanical Engineering', 'duration': '4 Years', 'dept': 'MEC'},
            {'name': 'Business Administration', 'duration': '3 Years', 'dept': 'SMS'}
        ]

        course_objs = {}
        for c_data in courses_data:
            course = Course.query.filter_by(name=c_data['name']).first()
            dept_id = dept_objs[c_data['dept']].id if c_data['dept'] in dept_objs else None
            if not course:
                course = Course(name=c_data['name'], duration=c_data['duration'], department_id=dept_id)
                db.session.add(course)
                db.session.flush()
                print(f"  [+] Course created: {course.name}")
            course_objs[c_data['name']] = course

        # 4. Seed Sample Students with their User accounts
        sample_students = [
            {
                'student_id': 'STD-1001',
                'first_name': 'Alex',
                'last_name': 'Johnson',
                'email': 'alex.johnson@example.com',
                'phone': '9876543210',
                'dob': '2002-05-14',
                'gender': 'Male',
                'course': 'Computer Science',
                'status': 'Active',
                'address': '123 University Ave, Cityville',
                'admission_date': '2023-08-15',
                'password': '123456'
            },
            {
                'student_id': 'STD-1002',
                'first_name': 'Sophia',
                'last_name': 'Miller',
                'email': 'sophia.m@example.com',
                'phone': '9876543211',
                'dob': '2003-02-20',
                'gender': 'Female',
                'course': 'Information Technology',
                'status': 'Active',
                'address': '456 College Blvd, Townsville',
                'admission_date': '2023-08-16',
                'password': '123456'
            },
            {
                'student_id': 'STD-1003',
                'first_name': 'Liam',
                'last_name': 'Davis',
                'email': 'liam.davis@example.com',
                'phone': '9876543212',
                'dob': '2001-11-10',
                'gender': 'Male',
                'course': 'Electrical Engineering',
                'status': 'Inactive',
                'address': '789 Elm St, Metro City',
                'admission_date': '2022-09-01',
                'password': '123456'
            },
            {
                'student_id': 'STD-1004',
                'first_name': 'Emma',
                'last_name': 'Wilson',
                'email': 'emma.w@example.com',
                'phone': '9876543213',
                'dob': '2002-08-25',
                'gender': 'Female',
                'course': 'Business Administration',
                'status': 'Active',
                'address': '321 Pine Rd, Suburbia',
                'admission_date': '2023-08-20',
                'password': '123456'
            }
        ]

        for s_data in sample_students:
            existing_student = Student.query.filter_by(student_id=s_data['student_id']).first()
            if not existing_student:
                # Create user login account for the student
                s_user = User.query.filter_by(username=s_data['student_id']).first()
                if not s_user:
                    s_user = User(username=s_data['student_id'], role='student')
                    s_user.set_password(s_data['password'])
                    db.session.add(s_user)
                    db.session.flush()

                c_obj = course_objs.get(s_data['course'])

                student = Student(
                    student_id=s_data['student_id'],
                    first_name=s_data['first_name'],
                    last_name=s_data['last_name'],
                    email=s_data['email'],
                    phone=s_data['phone'],
                    dob=s_data['dob'],
                    gender=s_data['gender'],
                    course=s_data['course'],
                    course_id=c_obj.id if c_obj else None,
                    department_id=c_obj.department_id if c_obj else None,
                    status=s_data['status'],
                    address=s_data['address'],
                    admission_date=s_data['admission_date'],
                    user_id=s_user.id,
                    plain_password=s_data['password']
                )
                db.session.add(student)
                print(f"  [+] Student created: {student.student_id} - {student.first_name} {student.last_name}")
            else:
                print(f"  [i] Student {s_data['student_id']} already exists.")

        db.session.commit()
        print("\n[SUCCESS] MySQL Database seeded successfully!")

if __name__ == '__main__':
    seed_database()
