"""RAG (Retrieval-Augmented Generation) API endpoints."""
import os
from flask import Blueprint, request, jsonify
from app.services.gemini import generate_embedding, generate_answer
from app.services.supabase import get_supabase_client
from app.utils.auth import require_auth
import logging

logger = logging.getLogger(__name__)
rag_bp = Blueprint('rag', __name__)


@rag_bp.route('/ask-question', methods=['POST'])
@require_auth
def ask_question(user):
    """
    Handle student question and return AI-generated answer with citations.

    Request body:
        {
            "question": str,
            "course_id": str
        }

    Response:
        {
            "answer": str,
            "citations": [{ "type": str, "file_name": str, "page": int, ... }],
            "sources": [{ "content": str, "metadata": dict }]
        }
    """
    try:
        data = request.json
        question = data.get('question')
        course_id = data.get('course_id')

        if not question or not course_id:
            return jsonify({'error': 'Missing question or course_id'}), 400

        logger.info(f"Processing question for course {course_id}: {question[:50]}...")

        rag_mode = os.getenv('RAG_MODE', 'legacy').lower()
        supabase = get_supabase_client()

        if rag_mode == 'custom':
            try:
                from app.routes.custom_rag.retrieve import run_query as custom_run_query
            except Exception as e:
                logger.error(f"Failed to import retrieve.run_query: {str(e)}")
                return jsonify({'error': 'Custom RAG retrieval not available'}), 500

            # Use structured output from retrieve.py
            answer_data = custom_run_query(query=question, k=3, save_json=True, structured=True)

            # Log Q&A interaction (custom path)
            log_entry = {
                'course_id': course_id,
                'user_id': user['id'],
                'question': question,
                'ai_answer': answer_data.get('answer'),
                'sources_cited': answer_data.get('citations', []),
                'status': 'answered'
            }
            supabase.table('qa_logs').insert(log_entry).execute()

            return jsonify(answer_data), 200

        # Legacy path (default)
        # 1. Generate embedding for the question
        question_embedding = generate_embedding(question)

        # 2. Perform vector similarity search using env-configurable RPC/table naming
        # Try versioned RPC first if present, then legacy fallback
        try:
            match_fn = os.getenv('MATCH_DOCS_RPC', os.getenv('RAG_MATCH_FN', 'match_documentsv3072'))
            chunks_response = supabase.rpc(match_fn, {
                'query_embedding': question_embedding,
                'match_count': 3,
                'filter_course_id': course_id
            }).execute()
            if not chunks_response.data:
                raise ValueError('Empty result from versioned RPC')
        except Exception:
            chunks_response = supabase.rpc('match_document_chunks', {
                'query_embedding': question_embedding,
                'match_count': 3,
                'filter_course_id': course_id
            }).execute()

        # Search TA-verified answers
        verified_response = supabase.rpc('match_verified_answers', {
            'query_embedding': question_embedding,
            'match_count': 2,
            'filter_course_id': course_id
        }).execute()

        # Combine context sources
        context_chunks = chunks_response.data if chunks_response.data else []
        verified_answers = verified_response.data if verified_response.data else []

        # 3. Get course system prompt
        course = supabase.table('courses').select('system_prompt').eq('id', course_id).single().execute()
        system_prompt = course.data.get('system_prompt', 'You are a helpful teaching assistant.')

        # 4. Generate answer using Gemini
        answer_data = generate_answer(
            question=question,
            context_chunks=context_chunks,
            verified_answers=verified_answers,
            system_prompt=system_prompt
        )

        # 5. Log the Q&A interaction
        log_entry = {
            'course_id': course_id,
            'user_id': user['id'],
            'question': question,
            'ai_answer': answer_data['answer'],
            'sources_cited': answer_data['citations'],
            'status': 'answered'
        }
        supabase.table('qa_logs').insert(log_entry).execute()

        return jsonify(answer_data), 200

    except Exception as e:
        logger.error(f"Error in ask_question: {str(e)}")
        return jsonify({'error': 'Failed to process question'}), 500


@rag_bp.route('/submit-correction', methods=['POST'])
@require_auth
def submit_correction(user):
    """
    Submit a TA-verified correction for an AI answer.

    Request body:
        {
            "qa_log_id": str,
            "verified_answer": str,
            "course_id": str
        }
    """
    try:
        data = request.json
        qa_log_id = data.get('qa_log_id')
        verified_answer = data.get('verified_answer')
        course_id = data.get('course_id')

        if not all([qa_log_id, verified_answer, course_id]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Verify user is TA or instructor
        if user.get('role') not in ['ta', 'instructor']:
            return jsonify({'error': 'Unauthorized'}), 403

        supabase = get_supabase_client()

        # Get original question from qa_log
        qa_log = supabase.table('qa_logs').select('question').eq('id', qa_log_id).single().execute()
        question = qa_log.data['question']

        # Generate embedding for the question
        question_embedding = generate_embedding(question)

        # Insert verified answer
        verified_entry = {
            'course_id': course_id,
            'question': question,
            'answer': verified_answer,
            'embedding': question_embedding,
            'created_by': user['id']
        }
        supabase.table('ta_verified_answers').insert(verified_entry).execute()

        # Update qa_log status
        supabase.table('qa_logs').update({'status': 'reviewed'}).eq('id', qa_log_id).execute()

        return jsonify({'message': 'Correction submitted successfully'}), 200

    except Exception as e:
        logger.error(f"Error in submit_correction: {str(e)}")
        return jsonify({'error': 'Failed to submit correction'}), 500
