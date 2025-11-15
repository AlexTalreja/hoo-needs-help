"""Flask application configuration."""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""

    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_DEBUG', 'True') == 'True'

    # Supabase
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    # Gemini
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    GEMINI_EMBEDDING_MODEL = 'models/text-embedding-004'
    GEMINI_CHAT_MODEL = 'models/gemini-2.0-flash-exp'

    # RAG Configuration
    EMBEDDING_DIMENSION = 768  # text-embedding-004 dimension
    SIMILARITY_THRESHOLD = 0.7
    MAX_CONTEXT_CHUNKS = 5

    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
