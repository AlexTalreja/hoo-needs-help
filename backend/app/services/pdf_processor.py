"""PDF document processing."""
import requests
from PyPDF2 import PdfReader
from io import BytesIO
from app.services.gemini import generate_embedding
from app.services.supabase import get_supabase_client
import logging

logger = logging.getLogger(__name__)


def process_pdf(document_id: str, file_url: str, course_id: str):
    """
    Process PDF file: extract text, chunk it, generate embeddings, and store.

    Args:
        document_id: ID of the document record
        file_url: URL to the PDF file
        course_id: Course ID
    """
    try:
        logger.info(f"Processing PDF document {document_id}")

        # Download PDF
        response = requests.get(file_url)
        pdf_file = BytesIO(response.content)

        # Parse PDF
        reader = PdfReader(pdf_file)
        supabase = get_supabase_client()

        # Get file name from document record
        doc = supabase.table('course_documents').select('file_name').eq('id', document_id).single().execute()
        file_name = doc.data['file_name']

        # Process each page
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text()

            if not text.strip():
                continue

            # Chunk text (simple approach: chunk by page)
            # TODO: Implement more sophisticated chunking (by paragraph, token limit, etc.)
            chunks = chunk_text(text, max_tokens=500)

            for chunk_idx, chunk_text in enumerate(chunks):
                # Generate embedding
                embedding = generate_embedding(chunk_text)

                # Store chunk
                chunk_record = {
                    'document_id': document_id,
                    'content': chunk_text,
                    'metadata': {
                        'page': page_num,
                        'chunk_index': chunk_idx,
                        'file_name': file_name,
                        'type': 'pdf'
                    },
                    'embedding': embedding
                }

                supabase.table('document_chunks').insert(chunk_record).execute()

        logger.info(f"Successfully processed PDF {document_id}")

    except Exception as e:
        logger.error(f"Error processing PDF {document_id}: {str(e)}")
        raise


def chunk_text(text: str, max_tokens: int = 500) -> list:
    """
    Chunk text into smaller pieces.

    Args:
        text: Input text
        max_tokens: Maximum tokens per chunk (approximate)

    Returns:
        List of text chunks
    """
    # Simple chunking by character count (rough approximation of tokens)
    # 1 token ≈ 4 characters
    max_chars = max_tokens * 4

    chunks = []
    current_chunk = ""

    # Split by paragraphs first
    paragraphs = text.split('\n\n')

    for para in paragraphs:
        if len(current_chunk) + len(para) < max_chars:
            current_chunk += para + "\n\n"
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para + "\n\n"

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks
