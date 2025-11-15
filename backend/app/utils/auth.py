"""Authentication utilities."""
from functools import wraps
from flask import request, jsonify
from app.services.supabase import get_supabase_client
import logging

logger = logging.getLogger(__name__)


def require_auth(f):
    """
    Decorator to require authentication for API endpoints.

    Validates Supabase JWT token from Authorization header.
    Passes user data to the wrapped function.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return jsonify({'error': 'Missing authorization header'}), 401

        try:
            # Extract token (format: "Bearer <token>")
            token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header

            # Verify token with Supabase
            supabase = get_supabase_client()
            user_response = supabase.auth.get_user(token)

            if not user_response or not user_response.user:
                return jsonify({'error': 'Invalid token'}), 401

            user_data = user_response.user

            # Get user role from users table
            user_record = supabase.table('users').select('role').eq('id', user_data.id).single().execute()

            user_info = {
                'id': user_data.id,
                'email': user_data.email,
                'role': user_record.data.get('role', 'student') if user_record.data else 'student'
            }

            # Call the original function with user info
            return f(user_info, *args, **kwargs)

        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return jsonify({'error': 'Authentication failed'}), 401

    return decorated_function
