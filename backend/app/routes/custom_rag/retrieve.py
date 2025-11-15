# import basics
import os
import json
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_google_genai._common import GoogleGenerativeAIError
from supabase.client import Client, create_client

def _compute_confidence(query: str, docs, scores):
    """Heuristic confidence score (0..1) based on retrieval scores and query term coverage.

    - If scores look like similarities (max <= 1.5) use their raw average (clipped 0..1).
      Otherwise treat scores as distances and transform each s -> 1/(1+s).
    - Query coverage: proportion of distinct content-bearing tokens (>3 chars) appearing
      in the concatenated context.
    - Final confidence = 0.6 * score_component + 0.4 * coverage_component.
    """
    if not docs:
        return 0.0
    # Prepare context
    context = " ".join(d.page_content.lower() for d in docs)
    # Extract meaningful query tokens
    import re
    tokens = {t for t in re.findall(r"[A-Za-z0-9]+", query.lower()) if len(t) > 3}
    matched = sum(1 for t in tokens if t in context)
    coverage = matched / len(tokens) if tokens else 0.0
    usable_scores = [s for s in scores if isinstance(s, (int, float))]
    if not usable_scores:
        score_component = 0.0
    else:
        max_score = max(usable_scores)
        if max_score <= 1.5:  # assume already similarity 0..1
            # Clamp each and average
            sims = [max(0.0, min(1.0, s)) for s in usable_scores]
            score_component = sum(sims) / len(sims)
        else:
            # Treat as distances -> convert
            sims = [1.0 / (1.0 + max(s, 0.0)) for s in usable_scores]
            score_component = sum(sims) / len(sims)
    confidence = 0.6 * score_component + 0.4 * coverage
    if confidence < 0: confidence = 0.0
    if confidence > 1: confidence = 1.0
    return round(confidence, 4)

# load environment variables
load_dotenv()  

# initiate supabase database
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(supabase_url, supabase_key)

# initiate embeddings model
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",  # align with embed.py
    google_api_key=os.environ.get("GEMINI_API_KEY")
)

# Resolve table/function from environment to avoid hardcoded 'documents'
VECTOR_TABLE = os.getenv("RAG_VECTOR_TABLE", "documents_v3072")
MATCH_FN = os.getenv("RAG_MATCH_FN", "match_documentsv3072")

# initiate vector store
vector_store = SupabaseVectorStore(
    embedding=embeddings,
    client=supabase,
    table_name=VECTOR_TABLE,
    query_name=MATCH_FN,
)

# initiate large language model (temperature = 0)
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",  # remove models/ prefix per docs
    temperature=0,
    google_api_key=os.environ.get("GEMINI_API_KEY")
)

def run_query(query: str, k: int = 3, save_json: bool = True, structured: bool = False):
    print(f"\n🔍 Query: {query}")
    # Attempt retrieval, with quota-aware error handling
    try:
        # Use with_score variant to capture relevance
        try:
            retrieved_pairs = vector_store.similarity_search_with_score(query, k=k)
        except Exception:
            # Fallback if with_score not implemented
            retrieved_docs = vector_store.similarity_search(query, k=k)
            retrieved_pairs = [(d, None) for d in retrieved_docs]
    except GoogleGenerativeAIError as e:
        if "quota" in str(e).lower() or "exceeded" in str(e).lower():
            print("\n❌ Embedding quota error while generating query embedding.")
            print("   Actions you can take:")
            print("   1. Visit https://ai.google.dev/usage and confirm embedding quota > 0")
            print("   2. Enable billing for the project (Generative Language API)")
            print("   3. If free tier shows 0 for embeddings, switch to an alternate provider (e.g. OpenAI, Cohere, Voyage) or local model.")
            print("   4. Re-run after quota available. Exiting.")
        else:
            print(f"Unexpected embedding error: {e}")
        return None

    print(f"📚 Retrieved {len(retrieved_pairs)} document chunks")
    docs_only = [p[0] for p in retrieved_pairs]
    scores_only = [p[1] for p in retrieved_pairs]
    for i, (doc, score) in enumerate(retrieved_pairs, 1):
        meta = doc.metadata
        preview = doc.page_content[:250].replace("\n", " ")
        score_txt = f" score={score:.4f}" if score is not None else ""
        print(f"\n  Chunk {i}{score_txt}:")
        print(f"    Metadata: {meta}")
        print(f"    Preview: {preview}{'...' if len(doc.page_content) > 250 else ''}")

    # Build combined context
    context = "\n\n".join(doc.page_content for doc in docs_only)
    if not context:
        print("\n⚠️ No context retrieved. Cannot answer.")
        if structured:
            return {"answer": "I couldn't find relevant course materials to answer that.", "citations": [], "sources": []}
        return None

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant. Use ONLY the provided context to answer the user question. If dates are not in context, say you cannot find them."),
        ("human", "Context:\n" + context + "\n\nQuestion: " + query + "\nAnswer succinctly.")
    ])
    chain = prompt | llm
    answer = chain.invoke({})
    confidence_score = _compute_confidence(query, docs_only, scores_only)
    annotated_answer = f"{answer.content}\n\nConfidence: {confidence_score}" if answer.content else f"Confidence: {confidence_score}"
    print("\n🧠 Answer:\n" + annotated_answer)

    # Optional model self-evaluation step (LLM estimates its own reliability)
    self_eval_enabled = os.getenv("SELF_EVAL", "true").lower() == "true"
    self_eval_result = None
    model_confidence = None

    def _safe_parse_eval_json(raw: str):
        import json, re
        cleaned = raw.strip()
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned)
        # Try to isolate first balanced object
        start = cleaned.find("{"); end = cleaned.rfind("}")
        candidates = []
        if start != -1 and end != -1 and end > start:
            candidates.append(cleaned[start:end+1])
        candidates.append(cleaned)
        for c in candidates:
            try:
                return json.loads(c)
            except Exception:
                continue
        return {"raw": raw, "parse_error": "Could not parse JSON"}

    if self_eval_enabled and answer.content:
        eval_payload = {
            "question": query,
            "retrieved_chunks": [
                {
                    "index": i + 1,
                    "score": scores_only[i],
                    "content": docs_only[i].page_content[:800]
                } for i in range(len(docs_only))
            ],
            "answer": answer.content
        }
        eval_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an impartial evaluator. Given the QUESTION, RETRIEVED_CHUNKS, and ANSWER, output strict JSON assessing the answer. JSON keys: used_chunk_indices (array of ints), hallucination_risk (0-1), coverage (0-1), answer_quality (0-1), final_confidence (0-1), rationale (string <=400 chars). 'final_confidence' should reflect overall trustworthiness considering hallucination risk and coverage. Respond ONLY with JSON."),
            ("human", "{evaluation_payload}")
        ])
        try:
            eval_chain = eval_prompt | llm
            raw_eval = eval_chain.invoke({"evaluation_payload": json.dumps(eval_payload, ensure_ascii=False)}).content.strip()
            self_eval_result = _safe_parse_eval_json(raw_eval)
            model_confidence = self_eval_result.get("final_confidence")
            # Fallback synthesis if final_confidence missing but components exist
            if model_confidence is None:
                try:
                    hallucination_risk = float(self_eval_result.get("hallucination_risk", 0))
                    coverage = float(self_eval_result.get("coverage", 0))
                    answer_quality = float(self_eval_result.get("answer_quality", 0))
                    # Blend: penalize hallucination, reward coverage & quality
                    synthesized = answer_quality * (1 - hallucination_risk) * (0.5 + 0.5 * coverage)
                    model_confidence = round(max(0.0, min(1.0, synthesized)), 4)
                    self_eval_result["final_confidence_fallback"] = model_confidence
                except Exception:
                    pass
        except Exception as e:
            print(f"\n⚠️ Self-eval step failed: {e}")
            self_eval_result = {"error": str(e)}

    # Combine heuristic and model confidence if both available
    combined_confidence = confidence_score
    if model_confidence is not None:
        # Weighted blend: 40% heuristic, 60% model self-eval
        try:
            combined_confidence = round(0.4 * confidence_score + 0.6 * float(model_confidence), 4)
        except Exception:
            combined_confidence = confidence_score
        annotated_answer += f"\nModelSelfConfidence: {model_confidence}\nCombinedConfidence: {combined_confidence}"
        print(f"\n🤖 Model self-eval confidence: {model_confidence} | Combined: {combined_confidence}")
    else:
        print("\nℹ️ Model self-eval disabled or unavailable; using heuristic confidence only.")

    # Build JSON artifact for research
    include_embeddings = os.getenv("INCLUDE_RETRIEVAL_EMBEDDINGS", "true").lower() == "true"
    query_embedding = None
    doc_embeddings = None
    embedding_requests = 0
    if include_embeddings:
        try:
            query_embedding = embeddings.embed_query(query)
            embedding_requests += 1
        except Exception:
            query_embedding = None
        try:
            doc_embeddings = embeddings.embed_documents([d.page_content for d in docs_only])
            embedding_requests += 1
        except Exception:
            doc_embeddings = None

    results_json = {
        "query": query,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "k": k,
        "embedding_model": "models/gemini-embedding-001",
        "llm_model": "gemini-2.5-flash",
        "embedding_requests_made": embedding_requests,
        "chunks": []
    }
    for idx, doc in enumerate(docs_only):
        result_entry = {
            "id": str(uuid.uuid4()),
            "rank": idx + 1,
            "score": scores_only[idx],
            "metadata": doc.metadata,
            "content": doc.page_content,
            "included_in_context": True,
        }
        # if doc_embeddings is not None:
        #     result_entry["embedding"] = doc_embeddings[idx]
        results_json["chunks"].append(result_entry)
    results_json["answer"] = answer.content
    results_json["confidence_score"] = confidence_score
    results_json["model_self_evaluation"] = self_eval_result
    results_json["combined_confidence"] = combined_confidence

    if save_json:
        out_path = os.getenv("RETRIEVAL_LOG_PATH", "retrieval_last.json")
        try:
            with open(out_path, "w") as f:
                json.dump(results_json, f, ensure_ascii=False, indent=2)
            print(f"\n🗂  Saved retrieval artifact JSON to {out_path}")
        except Exception as e:
            print(f"\n⚠️ Failed to save JSON artifact: {e}")

    # Also pretty-print JSON (compact summary)
    print("\n🔎 Retrieval JSON Summary (truncated scores):")
    summary = {
        "query": results_json["query"],
        "answer_preview": answer.content[:120] + ("..." if len(answer.content) > 120 else ""),
        "chunks": [
            {
                "rank": c["rank"],
                "score": c["score"],
                "metadata": c["metadata"],
                "content_preview": c["content"][:120] + ("..." if len(c["content"]) > 120 else "")
            }
            for c in results_json["chunks"]
        ],
        "heuristic_confidence": confidence_score,
        "model_self_confidence": model_confidence,
        "combined_confidence": combined_confidence
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if not structured:
        return annotated_answer

    # Build structured answer compatible with API expectations
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

    return {"answer": annotated_answer, "citations": citations, "sources": sources}

if __name__ == "__main__":
    run_query("What is the meaning of taking the course cybersecurity? Explain in depth how important or what this could be.", k=3, save_json=True)