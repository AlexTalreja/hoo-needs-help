"""Document processing API endpoints."""
from flask import Blueprint, request, jsonify
from app.services.pdf_processor import process_pdf
from app.services.vtt_processor import process_vtt
from app.services.supabase import get_supabase_client
from app.utils.auth import require_auth
import logging

logger = logging.getLogger(__name__)
documents_bp = Blueprint('documents', __name__)


@documents_bp.route('/upload-document', methods=['POST'])
@require_auth
def upload_document(user):
    """
    Upload and process a course document (PDF, VTT, or video).

    Form data:
        file: File
        course_id: str
        document_type: str ('pdf', 'vtt', 'video')
    """
    try:
        # Verify user is TA or instructor
        if user.get('role') not in ['ta', 'instructor']:
            return jsonify({'error': 'Unauthorized'}), 403

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        course_id = request.form.get('course_id')
        document_type = request.form.get('document_type')

        if not all([file, course_id, document_type]):
            return jsonify({'error': 'Missing required fields'}), 400

        if document_type not in ['pdf', 'vtt', 'video']:
            return jsonify({'error': 'Invalid document type'}), 400

        supabase = get_supabase_client()

        # Upload file to Supabase Storage
        file_path = f"{course_id}/{file.filename}"
        storage_response = supabase.storage.from_('course-documents').upload(
            file_path,
            file.read(),
            {'content-type': file.content_type}
        )

        # Create document record
        document_record = {
            'course_id': course_id,
            'file_name': file.filename,
            'storage_path': file_path,
            'type': document_type,
            'processing_status': 'pending'
        }
        doc_response = supabase.table('course_documents').insert(document_record).execute()
        document_id = doc_response.data[0]['id']

        # Process document based on type
        if document_type == 'pdf':
            # Get the file URL and process
            file_url = supabase.storage.from_('course-documents').get_public_url(file_path)
            process_pdf(document_id, file_url, course_id)
        elif document_type == 'vtt':
            file_url = supabase.storage.from_('course-documents').get_public_url(file_path)
            process_vtt(document_id, file_url, course_id)
        # Video files don't need processing, just storage

        # Update processing status
        supabase.table('course_documents').update({
            'processing_status': 'completed'
        }).eq('id', document_id).execute()

        return jsonify({
            'message': 'Document uploaded successfully',
            'document_id': document_id
        }), 200

    except Exception as e:
        logger.error(f"Error in upload_document: {str(e)}")
        return jsonify({'error': 'Failed to upload document'}), 500


@documents_bp.route('/documents/<course_id>', methods=['GET'])
@require_auth
def get_documents(user, course_id):
    """Get all documents for a course."""
    try:
        supabase = get_supabase_client()
        response = supabase.table('course_documents').select('*').eq('course_id', course_id).execute()

        return jsonify({'documents': response.data}), 200

    except Exception as e:
        logger.error(f"Error in get_documents: {str(e)}")
        return jsonify({'error': 'Failed to fetch documents'}), 500
