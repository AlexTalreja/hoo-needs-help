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


def call_gemini(prompt: str, temperature: float = 0.7) -> str:
    """
    Call Gemini API with a simple prompt and return the text response.

    Args:
        prompt: The prompt to send to Gemini
        temperature: Temperature for response randomness (0.0-1.0)

    Returns:
        The text response from Gemini
    """
    try:
        configure_gemini()
        model_name = current_app.config['GEMINI_CHAT_MODEL']

        model = genai.GenerativeModel(model_name)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
            )
        )

        return response.text

    except Exception as e:
        logger.error(f"Error calling Gemini: {str(e)}")
        raise


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
            "citations": [{"type": str, "file_name": str, ...}],
            "confidence_score": float (0.0-1.0)
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

        # Calculate confidence score
        confidence_score = calculate_confidence_score(
            question=question,
            answer=answer_text,
            context_chunks=context_chunks,
            verified_answers=verified_answers
        )

        return {
            'answer': answer_text,
            'citations': citations,
            'confidence_score': confidence_score,
            'sources_used': len(context_chunks) + len(verified_answers)
        }

    except Exception as e:
        logger.error(f"Error generating answer: {str(e)}")
        raise


def calculate_confidence_score(question: str, answer: str, context_chunks: list, verified_answers: list) -> float:
    """
    Calculate confidence score for the generated answer using Gemini.
    Uses a conservative estimate based on multiple factors.

    Args:
        question: User's question
        answer: Generated answer
        context_chunks: Retrieved document chunks
        verified_answers: TA-verified answers

    Returns:
        Float between 0.0 and 1.0 representing confidence level
    """
    try:
        configure_gemini()
        model_name = current_app.config['GEMINI_CHAT_MODEL']

        # Build confidence evaluation prompt
        confidence_prompt = f"""You are evaluating the confidence level of an AI-generated answer.

Question: {question}

Generated Answer: {answer}

Number of context sources used: {len(context_chunks)}
Number of verified answers available: {len(verified_answers)}

Evaluate the confidence level for this answer on a scale of 0.0 to 1.0 based on:
1. How well the answer is supported by the context
2. Whether the answer directly addresses the question
3. The specificity and detail of the answer
4. The presence of citations
5. Whether verified answers were available
6. Any hedging language or uncertainty in the answer

Be CONSERVATIVE in your estimate. Only give high scores (>0.8) if the answer is clearly well-supported and directly addresses the question.
Give medium scores (0.5-0.8) for answers that are partially supported or somewhat indirect.
Give low scores (<0.5) for answers that lack support, are vague, or show uncertainty.
If you were unable to answer the question, you must give a 0.5 or below. Randomize the value from 0.40 to 0.50, with precision up to 2 significant figures.

Respond with ONLY a single decimal number between 0.0 and 1.0, nothing else."""

        model = genai.GenerativeModel(model_name)
        response = model.generate_content(
            confidence_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.0,  # Use deterministic output for consistency
            )
        )

        # Parse confidence score from response
        confidence_text = response.text.strip()
        try:
            confidence = float(confidence_text)
            # Clamp to valid range
            confidence = max(0.0, min(1.0, confidence))

            # Apply additional conservative adjustment based on context availability
            if len(context_chunks) == 0 and len(verified_answers) == 0:
                confidence *= 0.3  # Heavily penalize answers with no context
            elif len(verified_answers) > 0:
                confidence = min(1.0, confidence * 1.1)  # Slight boost for verified answers

            return round(confidence, 2)
        except ValueError:
            logger.warning(f"Could not parse confidence score from: {confidence_text}")
            # Fallback: use heuristic-based confidence
            return calculate_heuristic_confidence(answer, context_chunks, verified_answers)

    except Exception as e:
        logger.error(f"Error calculating confidence score: {str(e)}")
        # Return conservative fallback confidence
        return calculate_heuristic_confidence(answer, context_chunks, verified_answers)


def calculate_heuristic_confidence(answer: str, context_chunks: list, verified_answers: list) -> float:
    """
    Calculate confidence using simple heuristics as a fallback.

    Args:
        answer: Generated answer
        context_chunks: Retrieved document chunks
        verified_answers: TA-verified answers

    Returns:
        Float between 0.0 and 1.0
    """
    confidence = 0.5  # Start with neutral confidence

    # Check for uncertainty phrases
    uncertainty_phrases = [
        "i don't have enough information",
        "i cannot answer",
        "not sure",
        "unclear",
        "might be",
        "possibly",
        "perhaps"
    ]
    answer_lower = answer.lower()

    if any(phrase in answer_lower for phrase in uncertainty_phrases):
        confidence -= 0.3

    # Boost for having context
    if len(context_chunks) > 0:
        confidence += 0.2
    if len(verified_answers) > 0:
        confidence += 0.2

    # Boost for citations (rough check)
    if '(' in answer and ')' in answer:
        confidence += 0.1

    # Clamp to valid range
    return round(max(0.0, min(1.0, confidence)), 2)


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
