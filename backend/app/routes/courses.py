"""Course management API endpoints."""
from flask import Blueprint, request, jsonify
from app.services.supabase import get_supabase_client
from app.utils.auth import require_auth
import logging

logger = logging.getLogger(__name__)
courses_bp = Blueprint('courses', __name__)


@courses_bp.route('/courses', methods=['POST'])
@require_auth
def create_course(user):
    """
    Create a new course.

    Request body:
        name: str - Course name
        system_prompt: str (optional) - AI assistant personality
    """
    try:
        # Verify user is instructor
        if user.get('role') not in ['instructor', 'ta']:
            return jsonify({'error': 'Unauthorized. Must be an instructor or TA.'}), 403

        data = request.get_json()
        name = data.get('name')
        system_prompt = data.get('system_prompt', 'You are a helpful teaching assistant.')

        if not name:
            return jsonify({'error': 'Course name is required'}), 400

        supabase = get_supabase_client()

        # Create course
        course_record = {
            'name': name,
            'instructor_id': user['id'],
            'system_prompt': system_prompt
        }

        response = supabase.table('courses').insert(course_record).execute()
        course = response.data[0]

        logger.info(f"Course created: {course['id']} by user {user['id']}")

        return jsonify({
            'message': 'Course created successfully',
            'course': course
        }), 201

    except Exception as e:
        logger.error(f"Error creating course: {str(e)}")
        return jsonify({'error': 'Failed to create course'}), 500


@courses_bp.route('/courses', methods=['GET'])
@require_auth
def get_courses(user):
    """Get all courses for the current user."""
    try:
        supabase = get_supabase_client()

        # If instructor/TA, get courses they created
        # If student, get courses they're enrolled in (TODO: implement enrollment table)
        if user.get('role') in ['instructor', 'ta']:
            response = supabase.table('courses').select('*').eq('instructor_id', user['id']).execute()
        else:
            # For now, return all courses (TODO: filter by enrollment)
            response = supabase.table('courses').select('*').execute()

        return jsonify({'courses': response.data}), 200

    except Exception as e:
        logger.error(f"Error fetching courses: {str(e)}")
        return jsonify({'error': 'Failed to fetch courses'}), 500


@courses_bp.route('/courses/<course_id>', methods=['GET'])
@require_auth
def get_course(user, course_id):
    """Get a specific course by ID."""
    try:
        supabase = get_supabase_client()
        response = supabase.table('courses').select('*').eq('id', course_id).single().execute()

        return jsonify({'course': response.data}), 200

    except Exception as e:
        logger.error(f"Error fetching course {course_id}: {str(e)}")
        return jsonify({'error': 'Failed to fetch course'}), 500


@courses_bp.route('/courses/<course_id>', methods=['PUT'])
@require_auth
def update_course(user, course_id):
    """Update a course."""
    try:
        supabase = get_supabase_client()

        # Check if user is the instructor of this course
        course = supabase.table('courses').select('*').eq('id', course_id).single().execute()
        if course.data['instructor_id'] != user['id']:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        update_data = {}

        if 'name' in data:
            update_data['name'] = data['name']
        if 'system_prompt' in data:
            update_data['system_prompt'] = data['system_prompt']

        response = supabase.table('courses').update(update_data).eq('id', course_id).execute()

        return jsonify({
            'message': 'Course updated successfully',
            'course': response.data[0]
        }), 200

    except Exception as e:
        logger.error(f"Error updating course {course_id}: {str(e)}")
        return jsonify({'error': 'Failed to update course'}), 500
