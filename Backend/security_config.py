"""
Security configuration and utilities for the DataTails application.
"""
import os
import re
import hashlib
import secrets
from functools import wraps
from flask import request, jsonify
import logging

logger = logging.getLogger(__name__)

# Security configurations
MAX_QUERY_LENGTH = 1000
MAX_RESPONSE_LENGTH = 5000
MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', 10485760))  # 10MB
ALLOWED_FILE_EXTENSIONS = {'pdf', 'docx', 'txt', 'csv'}
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
}

def validate_input_length(text, max_length, field_name):
    """Validate input text length."""
    if len(text) > max_length:
        raise ValueError(f"{field_name} too long. Maximum {max_length} characters allowed.")
    return True

def sanitize_filename(filename):
    """Sanitize filename to prevent directory traversal attacks."""
    # Remove any path components
    filename = os.path.basename(filename)
    # Remove or replace dangerous characters
    filename = re.sub(r'[^\w\-_\.]', '_', filename)
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:250] + ext
    return filename

def validate_file_type(filename, content_type=None):
    """Validate file type based on extension and MIME type."""
    if not filename or '.' not in filename:
        return False
    
    ext = filename.rsplit('.', 1)[1].lower()
    if ext not in ALLOWED_FILE_EXTENSIONS:
        return False
    
    # Additional MIME type validation if provided
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        return False
    
    return True

def generate_secure_token():
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)

def hash_sensitive_data(data):
    """Hash sensitive data for logging purposes."""
    return hashlib.sha256(data.encode()).hexdigest()[:8]

def validate_json_input(data, required_fields):
    """Validate JSON input data."""
    if not isinstance(data, dict):
        raise ValueError("Input must be a JSON object")
    
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")
    
    return True

def security_headers(response):
    """Add security headers to response."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

def rate_limit_by_user():
    """Rate limiting decorator based on user ID."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # This would integrate with your rate limiting system
            # For now, we'll rely on flask-limiter
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def log_security_event(event_type, details, user_id=None):
    """Log security-related events."""
    log_data = {
        'event_type': event_type,
        'details': details,
        'user_id': hash_sensitive_data(str(user_id)) if user_id else None,
        'ip_address': request.remote_addr if request else None,
        'user_agent': request.headers.get('User-Agent') if request else None
    }
    logger.warning(f"Security event: {log_data}")

def validate_cors_origin(origin):
    """Validate CORS origin against allowed origins."""
    allowed_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    return origin in allowed_origins

# Input validation patterns
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{3,20}$')
QUERY_PATTERN = re.compile(r'^[a-zA-Z0-9\s\?\.\,\!\-\_]{1,1000}$')

def validate_email(email):
    """Validate email format."""
    return bool(EMAIL_PATTERN.match(email))

def validate_username(username):
    """Validate username format."""
    return bool(USERNAME_PATTERN.match(username))

def validate_query(query):
    """Validate query format."""
    return bool(QUERY_PATTERN.match(query))
