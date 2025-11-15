"""Analytics API endpoints."""
from flask import Blueprint, request, jsonify
from app.services.supabase import get_supabase_client
from app.services.gemini import call_gemini
from app.utils.auth import require_auth
from collections import Counter
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)
analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/analytics/<course_id>', methods=['GET'])
@require_auth
def get_analytics(user, course_id):
    """
    Get analytics data for a course.

    Query Parameters:
        time_range: str - '7', '30', '90', or 'all' (default: '7')

    Returns:
        {
            "total_questions": int,
            "avg_rating": float,
            "flagged_count": int,
            "top_concepts": [str],  # Array of topic strings (max 5)
            "question_volume": [{"date": str, "count": int}]
        }
    """
    try:
        # Verify user is TA or instructor
        if user.get('role') not in ['ta', 'instructor']:
            return jsonify({'error': 'Unauthorized'}), 403

        # Get time range parameter
        time_range = request.args.get('time_range', '7')

        supabase = get_supabase_client()

        # Get all QA logs for the course
        logs = supabase.table('qa_logs').select('*').eq('course_id', course_id).execute()
        all_qa_data = logs.data

        # Filter by time range
        if time_range != 'all':
            days = int(time_range)
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            qa_data = [
                log for log in all_qa_data
                if log.get('created_at') and datetime.fromisoformat(log['created_at'].replace('Z', '+00:00')) >= cutoff_date
            ]
        else:
            qa_data = all_qa_data

        # Calculate metrics
        total_questions = len(qa_data)

        # Average rating
        ratings = [log['rating'] for log in qa_data if log.get('rating')]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0

        # Flagged count
        flagged_count = len([log for log in qa_data if log['status'] == 'flagged'])

        # Extract top concepts using Gemini API
        top_concepts = []
        if qa_data:
            # Combine all questions into one text blob
            questions_text = " ||| ".join([log['question'] for log in qa_data])

            # Create prompt for Gemini
            prompt = f"""Analyze the following student questions and summarize the key topics being asked about in 3 detailed sentences.

Questions: {questions_text}

Return format: Exactly 3 sentences, each on a new line. Be specific and descriptive about what students are asking."""

            try:
                gemini_response = call_gemini(prompt, temperature=0.3)
                # Split response into sentences (by newlines or periods)
                response_text = gemini_response.strip()

                # Try splitting by newlines first
                sentences = [s.strip() for s in response_text.split('\n') if s.strip()]

                # If we don't have 3 sentences, try splitting by periods
                if len(sentences) < 3:
                    sentences = [s.strip() + '.' for s in response_text.split('.') if s.strip()]

                # Take up to 3 sentences
                top_concepts = sentences[:3]

            except Exception as e:
                logger.error(f"Error calling Gemini for topic extraction: {str(e)}")
                top_concepts = []

        # Question volume over time (grouped by day)
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
