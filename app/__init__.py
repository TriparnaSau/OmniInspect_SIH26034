import os
from flask import Flask, jsonify

def create_app():
    app = Flask(__name__, template_folder='templates', static_folder='static')
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'omniinspect-sih26034-secret-key-2026')
    app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max limit
    
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Initialize Database
    from app.database import init_db
    init_db(app)
    
    # Register API routes
    from app.routes.api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Render SPA main template
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_app(path):
        # API calls not caught by blueprint
        if path.startswith('api/'):
            return jsonify({"error": "API route not found"}), 404
        from flask import render_template
        return render_template('index.html')
        
    return app
