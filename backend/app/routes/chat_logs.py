"""Chat logs API endpoints for teachers."""
from flask import Blueprint, jsonify
from app.services.supabase import get_supabase_client
from app.utils.auth import require_auth
import logging

logger = logging.getLogger(__name__)
chat_logs_bp = Blueprint('chat_logs', __name__)


@chat_logs_bp.route('/chat-logs/students/<course_id>', methods=['GET'])
@require_auth
def get_students_with_questions(user, course_id):
    """
    Get all students who have asked questions in a course.

    Returns:
        List of students with their question counts
    """
    try:
        # Verify user is instructor/TA for this course
        supabase = get_supabase_client()
        course = supabase.table('courses').select('instructor_id').eq('id', course_id).single().execute()

        if course.data['instructor_id'] != user['id'] and user.get('role') not in ['ta', 'instructor']:
            return jsonify({'error': 'Unauthorized'}), 403

        # Get all QA logs for this course with user information
        # Join with users table to get role
        qa_logs = supabase.table('qa_logs').select('user_id, users(email, role)').eq('course_id', course_id).execute()

        # Group by student and count questions (filter out TAs and instructors)
        student_map = {}
        for log in qa_logs.data:
            user_id = log['user_id']
            user_data = log.get('users', {})
            user_role = user_data.get('role', 'student')

            # Only include students (skip TAs and instructors)
            if user_role not in ['student']:
                continue

            if user_id not in student_map:
                student_map[user_id] = {
                    'id': user_id,
                    'email': user_data.get('email', 'Unknown'),
                    'questionCount': 0
                }
            student_map[user_id]['questionCount'] += 1

        students = list(student_map.values())

        return jsonify({'students': students}), 200

    except Exception as e:
        logger.error(f"Error fetching students for course {course_id}: {str(e)}")
        return jsonify({'error': 'Failed to fetch students'}), 500


@chat_logs_bp.route('/chat-logs/<course_id>/<student_id>', methods=['GET'])
@require_auth
def get_student_chat_logs(user, course_id, student_id):
    """
    Get all chat logs for a specific student in a course.

    Args:
        course_id: Course ID
        student_id: Student user ID
    """
    try:
        # Verify user is instructor/TA for this course
        supabase = get_supabase_client()
        course = supabase.table('courses').select('instructor_id').eq('id', course_id).single().execute()

        if course.data['instructor_id'] != user['id'] and user.get('role') not in ['ta', 'instructor']:
            return jsonify({'error': 'Unauthorized'}), 403

        # Verify that the student_id belongs to a student (not TA/instructor)
        student_user = supabase.table('users').select('email, role').eq('id', student_id).single().execute()

        if not student_user.data or student_user.data.get('role') != 'student':
            return jsonify({'error': 'User is not a student'}), 403

        # Get all QA logs for this student in this course
        response = supabase.table('qa_logs').select('*').eq('course_id', course_id).eq('user_id', student_id).order('created_at', desc=True).execute()

        user_email = student_user.data.get('email', 'Unknown')

        logs = response.data
        for log in logs:
            log['user_email'] = user_email

        return jsonify({'logs': logs}), 200

    except Exception as e:
        logger.error(f"Error fetching chat logs for student {student_id} in course {course_id}: {str(e)}")
        return jsonify({'error': 'Failed to fetch chat logs'}), 500
