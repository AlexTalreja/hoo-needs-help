"""Google Gemini API integration."""
import google.generativeai as genai
from flask import current_app
import logging

logger = logging.getLogger(__name__)

# Configure Gemini API
def configure_gemini():
    """Configure Gemini with API key from config."""
    api_key = current_app.config['GEMINI_API_KEY']
    if not api_key:
        raise ValueError('Gemini API key is missing')
    genai.configure(api_key=api_key)


def generate_embedding(text: str) -> list:
    """
    Generate embedding for text using Gemini embedding model.

    Args:
        text: Input text to embed

    Returns:
        List of floats representing the embedding vector
    """
    try:
        configure_gemini()
        model = current_app.config['GEMINI_EMBEDDING_MODEL']

        result = genai.embed_content(
            model=model,
            content=text,
            task_type="retrieval_document"
        )

        return result['embedding']

    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        raise


def generate_answer(question: str, context_chunks: list, verified_answers: list, system_prompt: str) -> dict:
    """
    Generate answer using Gemini chat model with RAG context.

    Args:
        question: User's question
        context_chunks: Retrieved document chunks
        verified_answers: TA-verified answers
        system_prompt: Course-specific system prompt

    Returns:
        {
            "answer": str,
            "citations": [{"type": str, "file_name": str, ...}]
        }
    """
    try:
        configure_gemini()
        model_name = current_app.config['GEMINI_CHAT_MODEL']

        # Construct context from chunks
        context_parts = []

        # Add verified answers first (higher priority)
        for i, verified in enumerate(verified_answers):
            context_parts.append(f"[VERIFIED ANSWER {i+1}]")
            context_parts.append(f"Q: {verified.get('question', '')}")
            context_parts.append(f"A: {verified.get('answer', '')}")
            context_parts.append("")

        # Add document chunks
        for i, chunk in enumerate(context_chunks):
            metadata = chunk.get('metadata', {})
            content = chunk.get('content', '')

            source_info = f"[Source: {metadata.get('file_name', 'unknown')}"
            if 'page' in metadata:
                source_info += f", page {metadata['page']}"
            if 'start_time' in metadata:
                source_info += f", timestamp {metadata['start_time']}s"
            source_info += "]"

            context_parts.append(source_info)
            context_parts.append(content)
            context_parts.append("")

        context_text = "\n".join(context_parts)

        # Construct prompt
        prompt = f"""System: {system_prompt}

Context (use ONLY this information to answer):
{context_text}

User Question: {question}

Instructions:
- Answer the question using ONLY the context provided above
- Include citations in your answer in the format: (source_name, page X) or (source_name, timestamp Xs)
- If the context doesn't contain relevant information, say "I don't have enough information in the course materials to answer this question"
- Be helpful and clear in your explanation

Answer:"""

        # Generate response
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        answer_text = response.text

        # Parse citations from answer
        # TODO: Implement more robust citation extraction
        citations = extract_citations(answer_text, context_chunks, verified_answers)

        return {
            'answer': answer_text,
            'citations': citations,
            'sources_used': len(context_chunks) + len(verified_answers)
        }

    except Exception as e:
        logger.error(f"Error generating answer: {str(e)}")
        raise


def extract_citations(answer: str, chunks: list, verified: list) -> list:
    """
    Extract citation information from answer text.

    Args:
        answer: Generated answer text
        chunks: Document chunks used as context
        verified: Verified answers used as context

    Returns:
        List of citation objects
    """
    citations = []

    # Extract citations from context chunks
    for chunk in chunks:
        metadata = chunk.get('metadata', {})
        citation = {
            'type': metadata.get('type', 'pdf'),
            'file_name': metadata.get('file_name', ''),
            'doc_id': chunk.get('document_id')
        }

        if 'page' in metadata:
            citation['page'] = metadata['page']
        if 'start_time' in metadata:
            citation['timestamp'] = metadata['start_time']

        citations.append(citation)

    # Add verified answer citations
    for v in verified:
        citations.append({
            'type': 'verified',
            'question': v.get('question', '')
        })

    return citations
