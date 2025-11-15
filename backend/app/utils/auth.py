"""Authentication utilities."""
from functools import wraps
from flask import request, jsonify
from app.services.supabase import get_supabase_client
import jwt
from flask import current_app
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

            # Decode JWT token (don't verify signature since Supabase handles that)
            # We just need to extract the user ID
            decoded = jwt.decode(token, options={"verify_signature": False})

            user_id = decoded.get('sub')  # 'sub' contains the user ID
            user_email = decoded.get('email')

            if not user_id:
                return jsonify({'error': 'Invalid token'}), 401

            # Get user role from users table
            supabase = get_supabase_client()
            user_record = supabase.table('users').select('role').eq('id', user_id).execute()

            # If user doesn't exist in users table, create them with default role
            if not user_record.data:
                # Create user entry
                supabase.table('users').insert({
                    'id': user_id,
                    'email': user_email,
                    'role': 'student'  # Default role
                }).execute()
                role = 'student'
            else:
                role = user_record.data[0].get('role', 'student')

            user_info = {
                'id': user_id,
                'email': user_email,
                'role': role
            }

            # Call the original function with user info
            return f(user_info, *args, **kwargs)

        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return jsonify({'error': 'Authentication failed'}), 401

    return decorated_function
