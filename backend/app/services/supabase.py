"""Supabase client configuration."""
from supabase import create_client, Client
from flask import current_app
import logging

logger = logging.getLogger(__name__)

_supabase_client = None


def get_supabase_client() -> Client:
    """Get or create Supabase client instance."""
    global _supabase_client

    if _supabase_client is None:
        url = current_app.config['SUPABASE_URL']
        key = current_app.config['SUPABASE_SERVICE_ROLE_KEY']

        if not url or not key:
            raise ValueError('Supabase configuration is missing')

        # Create client with minimal options to avoid compatibility issues
        _supabase_client = create_client(
            supabase_url=url,
            supabase_key=key
        )
        logger.info('Supabase client initialized')

    return _supabase_client
