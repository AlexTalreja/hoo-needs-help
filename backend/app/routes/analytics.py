"""Analytics API endpoints."""
from flask import Blueprint, request, jsonify
from app.services.supabase import get_supabase_client
from app.utils.auth import require_auth
from collections import Counter
import logging

logger = logging.getLogger(__name__)
analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/analytics/<course_id>', methods=['GET'])
@require_auth
def get_analytics(user, course_id):
    """
    Get analytics data for a course.

    Returns:
        {
            "total_questions": int,
            "avg_rating": float,
            "flagged_count": int,
            "top_concepts": [{"concept": str, "count": int}],
            "question_volume": [{"date": str, "count": int}]
        }
    """
    try:
        # Verify user is TA or instructor
        if user.get('role') not in ['ta', 'instructor']:
            return jsonify({'error': 'Unauthorized'}), 403

        supabase = get_supabase_client()

        # Get all QA logs for the course
        logs = supabase.table('qa_logs').select('*').eq('course_id', course_id).execute()
        qa_data = logs.data

        # Calculate metrics
        total_questions = len(qa_data)

        # Average rating
        ratings = [log['rating'] for log in qa_data if log.get('rating')]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0

        # Flagged count
        flagged_count = len([log for log in qa_data if log['status'] == 'flagged'])

        # Extract top concepts (simple keyword extraction from questions)
        # TODO: Implement more sophisticated NLP-based keyword extraction
        all_words = []
        for log in qa_data:
            words = log['question'].lower().split()
            # Filter common words
            filtered_words = [w for w in words if len(w) > 4]
            all_words.extend(filtered_words)

        concept_counts = Counter(all_words).most_common(10)
        top_concepts = [{'concept': word, 'count': count} for word, count in concept_counts]

        # Question volume over time (grouped by day)
        from datetime import datetime
        volume_by_date = {}
        for log in qa_data:
            created_at = log.get('created_at', '')
            date = created_at.split('T')[0] if created_at else 'unknown'
            volume_by_date[date] = volume_by_date.get(date, 0) + 1

        question_volume = [{'date': date, 'count': count} for date, count in sorted(volume_by_date.items())]

        analytics_data = {
            'total_questions': total_questions,
            'avg_rating': round(avg_rating, 2),
            'flagged_count': flagged_count,
            'top_concepts': top_concepts,
            'question_volume': question_volume
        }

        return jsonify(analytics_data), 200

    except Exception as e:
        logger.error(f"Error in get_analytics: {str(e)}")
        return jsonify({'error': 'Failed to fetch analytics'}), 500


@analytics_bp.route('/flagged-questions/<course_id>', methods=['GET'])
@require_auth
def get_flagged_questions(user, course_id):
    """Get all flagged questions for TA review."""
    try:
        # Verify user is TA or instructor
        if user.get('role') not in ['ta', 'instructor']:
            return jsonify({'error': 'Unauthorized'}), 403

        supabase = get_supabase_client()
        response = supabase.table('qa_logs').select('*').eq('course_id', course_id).eq('status', 'flagged').execute()

        return jsonify({'flagged_questions': response.data}), 200

    except Exception as e:
        logger.error(f"Error in get_flagged_questions: {str(e)}")
        return jsonify({'error': 'Failed to fetch flagged questions'}), 500
