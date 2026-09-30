from flask import Flask, jsonify, send_from_directory, request
from werkzeug.exceptions import NotFound
from flask_cors import CORS
import os

from config import Config
from extensions import db, bcrypt
from routes import auth_bp, dashboard_bp, students_bp, departments_bp, users_bp, profile_bp

# Frontend folder lives one level above the backend folder
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))

def _migrate_photo_column():
    """
    Lightweight auto-migration: upgrade students.photo from TEXT (64 KB) to
    MEDIUMTEXT (~16 MB). TEXT is too small for base64 profile photos and caused
    'Data too long for column' errors when adding students with a photo.
    Runs on every startup and is a no-op once the column is already MEDIUMTEXT.
    """
    with db.engine.connect() as conn:
        cols = conn.execute(db.text(
            "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students'"
        )).fetchall()
        col_types = {c[0]: c[1] for c in cols}

        if 'photo' not in col_types:
            conn.execute(db.text(
                "ALTER TABLE students ADD COLUMN photo MEDIUMTEXT NULL"
            ))
            conn.commit()
            print("  [migrate] Added 'photo' MEDIUMTEXT column to students table.")
        elif str(col_types['photo']).lower() == 'text':
            conn.execute(db.text(
                "ALTER TABLE students MODIFY COLUMN photo MEDIUMTEXT NULL"
            ))
            conn.commit()
            print("  [migrate] Upgraded 'photo' column TEXT -> MEDIUMTEXT.")

def create_app(config_class=Config):
    app = Flask(__name__, static_folder=None)

    app.config.from_object(config_class)

    # Initialize extensions with app
    db.init_app(app)
    bcrypt.init_app(app)

    # Auto-migrate the photo column for databases created before the fix
    with app.app_context():
        try:
            _migrate_photo_column()
        except Exception as e:
            # Never block server startup on migration (e.g. DB not seeded yet)
            print(f"  [migrate] Skipped photo column migration: {e}")

    # CORS still enabled for anyone opening index.html directly or via Live Server
    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})

    # Register Blueprints under /api prefix
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(dashboard_bp, url_prefix='/api')
    app.register_blueprint(students_bp, url_prefix='/api')
    app.register_blueprint(departments_bp, url_prefix='/api')
    app.register_blueprint(users_bp, url_prefix='/api')
    app.register_blueprint(profile_bp, url_prefix='/api')

    # ------------------------------------------------------------------
    # Serve the frontend (same origin => no CORS issues, session cookies
    # always work, and pages load exactly like production).
    # ------------------------------------------------------------------
    @app.route('/')
    def serve_index():
        return send_from_directory(FRONTEND_DIR, 'index.html')

    @app.route('/<path:path>')
    def serve_frontend(path):
        # Unknown API paths must return JSON 404, not the login page HTML
        if path == 'api' or path.startswith('api/'):
            raise NotFound()
        full_path = os.path.join(FRONTEND_DIR, path)
        if os.path.isfile(full_path):
            return send_from_directory(FRONTEND_DIR, path)
        # Unknown non-file paths fall back to the login page
        return send_from_directory(FRONTEND_DIR, 'index.html')

    @app.errorhandler(404)
    def handle_404(e):
        if request.path.startswith('/api/') or request.path == '/api':
            return jsonify({'status': 'error', 'message': 'API endpoint not found.'}), 404
        return send_from_directory(FRONTEND_DIR, 'index.html'), 404

    @app.route('/api')
    def api_root():
        return jsonify({
            'status': 'online',
            'message': 'Student Management System Flask-MySQL API',
            'endpoints': {
                'auth': ['POST /api/login', 'POST /api/logout', 'GET /api/current-user'],
                'dashboard': 'GET /api/stats',
                'students': [
                    'GET /api/students',
                    'POST /api/students (auto-generates Student ID)',
                    'GET /api/students/<id>',
                    'PUT /api/students/<id>',
                    'PATCH /api/students/<id>/status',
                    'DELETE /api/students/<id>',
                    'PUT /api/students/<id>/password',
                    'GET /api/student/profile?student_id=<id>'
                ],
                'departments': [
                    'GET /api/departments',
                    'POST /api/departments',
                    'GET /api/courses',
                    'POST /api/courses'
                ],
                'users': ['GET /api/users', 'POST /api/users'],
                'profile': ['GET /api/profile', 'PUT /api/profile/password']
            }
        })

    return app

app = create_app()

if __name__ == '__main__':
    print("=" * 65)
    print("  Student Management System - Flask & MySQL Backend")
    print("  Frontend (UI):  http://localhost:5000")
    print("  API Base:       http://localhost:5000/api")
    print("=" * 65)
    app.run(host='0.0.0.0', port=5000, debug=True)
