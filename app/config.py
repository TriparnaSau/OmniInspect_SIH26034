import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'omniinspect-sih26034-secret-key-2026')
    DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'labelguard.db')
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
