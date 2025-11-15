"""Flask application factory."""
from flask import Flask
from flask_cors import CORS
from config import config


def create_app(config_name='default'):
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Register blueprints
    from app.routes.rag import rag_bp
    from app.routes.documents import documents_bp
    from app.routes.analytics import analytics_bp
    from app.routes.courses import courses_bp
    from app.routes.chat_logs import chat_logs_bp

    app.register_blueprint(rag_bp, url_prefix='/api')
    app.register_blueprint(documents_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api')
    app.register_blueprint(courses_bp, url_prefix='/api')
    app.register_blueprint(chat_logs_bp, url_prefix='/api')

    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'healthy', 'service': 'HooNeedsHelp Backend'}, 200

    return app
