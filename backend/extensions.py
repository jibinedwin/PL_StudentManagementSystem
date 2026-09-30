from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

# Initialize extensions without app instance
db = SQLAlchemy()
bcrypt = Bcrypt()
