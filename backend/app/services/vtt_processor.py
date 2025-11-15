"""VTT (Video Transcript) processing."""
import requests
import re
from app.services.gemini import generate_embedding
from app.services.supabase import get_supabase_client
import logging

logger = logging.getLogger(__name__)


def process_vtt(document_id: str, file_url: str, course_id: str):
    """
    Process VTT file: parse transcript with timestamps, generate embeddings.

    Args:
        document_id: ID of the document record
        file_url: URL to the VTT file
        course_id: Course ID
    """
    try:
        logger.info(f"Processing VTT document {document_id}")

        # Download VTT
        response = requests.get(file_url)
        vtt_content = response.text

        # Parse VTT
        segments = parse_vtt(vtt_content)

        supabase = get_supabase_client()

        # Get file name from document record
        doc = supabase.table('course_documents').select('file_name').eq('id', document_id).single().execute()
        file_name = doc.data['file_name']

        # Group segments into chunks (e.g., 30-second chunks)
        chunks = group_segments(segments, duration=30)

        for chunk in chunks:
            # Generate embedding for chunk text
            embedding = generate_embedding(chunk['text'])

            # Store chunk
            chunk_record = {
                'document_id': document_id,
                'content': chunk['text'],
                'metadata': {
                    'start_time': chunk['start_time'],
                    'end_time': chunk['end_time'],
                    'file_name': file_name,
                    'type': 'vtt'
                },
                'embedding': embedding
            }

            supabase.table('document_chunks').insert(chunk_record).execute()

        logger.info(f"Successfully processed VTT {document_id}")

    except Exception as e:
        logger.error(f"Error processing VTT {document_id}: {str(e)}")
        raise


def parse_vtt(vtt_content: str) -> list:
    """
    Parse VTT file into segments with timestamps.

    Args:
        vtt_content: Raw VTT file content

    Returns:
        List of {"start": float, "end": float, "text": str}
    """
    segments = []

    # Split by double newline (VTT cue separator)
    cues = re.split(r'\n\n', vtt_content)

    for cue in cues:
        lines = cue.strip().split('\n')

        # Find timestamp line (format: 00:00:00.000 --> 00:00:05.000)
        timestamp_pattern = r'(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})'

        for i, line in enumerate(lines):
            match = re.search(timestamp_pattern, line)
            if match:
                start_str, end_str = match.groups()
                start_time = timestamp_to_seconds(start_str)
                end_time = timestamp_to_seconds(end_str)

                # Text is on following lines
                text = ' '.join(lines[i+1:]).strip()

                if text:
                    segments.append({
                        'start': start_time,
                        'end': end_time,
                        'text': text
                    })
                break

    return segments


def timestamp_to_seconds(timestamp: str) -> float:
    """Convert VTT timestamp (HH:MM:SS.mmm) to seconds."""
    parts = timestamp.split(':')
    hours = int(parts[0])
    minutes = int(parts[1])
    seconds = float(parts[2])

    return hours * 3600 + minutes * 60 + seconds


def group_segments(segments: list, duration: int = 30) -> list:
    """
    Group consecutive segments into larger chunks.

    Args:
        segments: List of parsed VTT segments
        duration: Target duration in seconds for each chunk

    Returns:
        List of {"start_time": float, "end_time": float, "text": str}
    """
    chunks = []
    current_chunk = {
        'start_time': None,
        'end_time': None,
        'text': ''
    }

    for segment in segments:
        if current_chunk['start_time'] is None:
            current_chunk['start_time'] = segment['start']

        current_chunk['end_time'] = segment['end']
        current_chunk['text'] += ' ' + segment['text']

        # Check if chunk duration reached
        if current_chunk['end_time'] - current_chunk['start_time'] >= duration:
            chunks.append({
                'start_time': current_chunk['start_time'],
                'end_time': current_chunk['end_time'],
                'text': current_chunk['text'].strip()
            })

            # Reset for next chunk
            current_chunk = {
                'start_time': None,
                'end_time': None,
                'text': ''
            }

    # Add remaining chunk if any
    if current_chunk['text']:
        chunks.append({
            'start_time': current_chunk['start_time'],
            'end_time': current_chunk['end_time'],
            'text': current_chunk['text'].strip()
        })

    return chunks
