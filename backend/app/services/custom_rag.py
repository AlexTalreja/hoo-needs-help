import os
import uuid
import math
import requests
from io import BytesIO
from tempfile import NamedTemporaryFile
from typing import Dict, Any, List

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_core.prompts import ChatPromptTemplate

from app.services.supabase import get_supabase_client
from app.services.gemini import generate_embedding


def _get_embeddings_model():
    return GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=os.environ.get("GEMINI_API_KEY"),
    )


def custom_embed_pdf(document_id: str, file_url: str, course_id: str, file_name: str) -> None:
    """Embed a PDF using the custom LangChain + SupabaseVectorStore approach.

    Stores chunk embeddings into the `documents` table with rich metadata.
    """
    # Download file
    resp = requests.get(file_url)
    resp.raise_for_status()
    pdf_bytes = BytesIO(resp.content)

    # Persist temporarily for loader
    with NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
        tmp.write(pdf_bytes.getvalue())
        tmp.flush()

        loader = PyPDFLoader(tmp.name)
        raw_docs = loader.load()

    if not raw_docs:
        return

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = splitter.split_documents(raw_docs)

    texts: List[str] = []
    metadatas: List[Dict[str, Any]] = []
    for idx, d in enumerate(chunks):
        md = dict(d.metadata or {})
        md.update({
            "page": md.get("page", md.get("page_number")),
            "file_name": file_name,
            "type": "pdf",
            "course_id": course_id,
            "document_id": document_id,
            "chunk_index": idx,
        })
        texts.append(d.page_content)
        metadatas.append(md)

    embeddings = _get_embeddings_model()
    vectors = embeddings.embed_documents(texts) if texts else []

    supabase = get_supabase_client()

    rows = [
        {
            "id": str(uuid.uuid4()),
            "content": t,
            "metadata": m,
            "embedding": v,
        }
        for t, m, v in zip(texts, metadatas, vectors)
    ]

    if not rows:
        return

    # Upsert in batches to avoid payload limits
    BATCH = int(os.getenv("UPSERT_BATCH_SIZE", "200"))
    for start in range(0, len(rows), BATCH):
        batch = rows[start:start + BATCH]
        supabase.table("documents_v3072").upsert(batch).execute()


def custom_retrieve_answer(question: str, course_id: str, k: int = 3) -> Dict[str, Any]:
    """Retrieve top-k chunks from `documents_v3072` (fallback to legacy `document_chunks`) and generate an answer.

    Returns a dict matching the legacy response shape: { answer, citations, sources }.
    """
    supabase = get_supabase_client()

    # Get course system prompt (fallback if missing)
    course = supabase.table('courses').select('system_prompt').eq('id', course_id).single().execute()
    system_prompt = (course.data or {}).get('system_prompt', 'You are a helpful teaching assistant.')

    embeddings = _get_embeddings_model()
    table_name = os.getenv("RAG_VECTOR_TABLE", "documents_v3072")
    match_fn = os.getenv("RAG_MATCH_FN", "match_documentsv3072")
    vector_store = SupabaseVectorStore(
        embedding=embeddings,
        client=supabase,
        table_name=table_name,
        query_name=match_fn,
    )

    try:
        try:
            pairs = vector_store.similarity_search_with_score(question, k=max(k * 2, 6))
        except Exception:
            docs_only = vector_store.similarity_search(question, k=max(k * 2, 6))
            pairs = [(d, None) for d in docs_only]
    except Exception:
        pairs = []

    # Fallback to legacy table if versioned table produced no results
    if not pairs:
        try:
            legacy_store = SupabaseVectorStore(
                embedding=embeddings,
                client=supabase,
                table_name=os.getenv("RAG_LEGACY_TABLE", "document_chunks"),
                query_name=os.getenv("RAG_LEGACY_MATCH_FN", "match_document_chunks"),
            )
            try:
                legacy_pairs = legacy_store.similarity_search_with_score(question, k=max(k * 2, 6))
            except Exception:
                legacy_docs = legacy_store.similarity_search(question, k=max(k * 2, 6))
                legacy_pairs = [(d, None) for d in legacy_docs]
            pairs = legacy_pairs
        except Exception:
            pass

    # Prefer course-scoped docs using metadata, fallback to whatever we have if empty
    filtered = [p for p in pairs if str(p[0].metadata.get('course_id')) == str(course_id)]
    selected = filtered[:k] if filtered else pairs[:k]

    docs_only = [p[0] for p in selected]

    context_parts: List[str] = [d.page_content for d in docs_only]

    # Include TA-verified answers (if available) to preserve helpful behavior
    try:
        q_embed = generate_embedding(question)
        verified_response = supabase.rpc('match_verified_answers', {
            'query_embedding': q_embed,
            'match_count': 2,
            'filter_course_id': course_id
        }).execute()
        verified_answers = verified_response.data or []
        for va in verified_answers:
            q = va.get('question')
            a = va.get('answer')
            if a:
                context_parts.append(f"Verified QA\nQ: {q}\nA: {a}")
    except Exception:
        # Non-fatal if verified answers are unavailable
        pass

    context = "\n\n".join(context_parts)
    if not context:
        return {"answer": "I couldn't find relevant course materials to answer that.", "citations": [], "sources": []}

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0,
        google_api_key=os.environ.get("GEMINI_API_KEY"),
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt + " Always cite the provided sources inline when applicable."),
        ("human", "Context:\n" + context + "\n\nQuestion: " + question + "\nAnswer succinctly and ground your answer in the context."),
    ])
    chain = prompt | llm
    answer_msg = chain.invoke({})
    answer_text = answer_msg.content if hasattr(answer_msg, 'content') else str(answer_msg)

    # Build citations and sources
    citations = []
    sources = []
    for d in docs_only:
        md = d.metadata or {}
        citations.append({
            "type": md.get("type", "pdf"),
            "file_name": md.get("file_name"),
            "page": md.get("page"),
            "metadata": md,
        })
        sources.append({
            "content": d.page_content,
            "metadata": md,
        })

    return {"answer": answer_text, "citations": citations, "sources": sources}
