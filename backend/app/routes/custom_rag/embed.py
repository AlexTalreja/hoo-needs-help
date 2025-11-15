# import basics
import os
import time
import math
import uuid
from dotenv import load_dotenv

# import langchain
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# import supabase
from supabase.client import Client, create_client

# load environment variables
load_dotenv()  

# initiate supabase db
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# initiate embeddings model
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=os.environ.get("GEMINI_API_KEY")
)

# load pdf docs from folder 'documents'
loader = PyPDFDirectoryLoader("Unembedded")

# split the documents in multiple chunks
documents = loader.load()
print(f"✓ Loaded {len(documents)} documents")

if len(documents) == 0:
    print("\n⚠️  WARNING: No PDF documents found in 'CourseDocuments' folder!")
    print("   Please add PDF files to the CourseDocuments directory.")
    print("   Or use a different document loader for other file types.")
    exit(1)

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
docs = text_splitter.split_documents(documents)
print(f"✓ Split into {len(docs)} chunks")

# store chunks in vector store
print("Embedding and storing chunks in Supabase (batched)...")

# Build raw texts and metadata for embedding
texts = [d.page_content for d in docs]
metadatas = [d.metadata for d in docs]

# Controls: requests per minute and items per request
EMBED_BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "100"))  # items per API request
RATE_LIMIT_RPM = int(os.getenv("EMBED_RATE_LIMIT_RPM", "10"))  # max API requests per minute
UPSERT_BATCH_SIZE = int(os.getenv("UPSERT_BATCH_SIZE", "200"))

planned_requests = math.ceil(len(texts) / EMBED_BATCH_SIZE) if texts else 0
print(f"Planned embedding API requests: {planned_requests} (batch={EMBED_BATCH_SIZE}, rpm={RATE_LIMIT_RPM})")

rows = []
requests_made = 0
per_request_delay = 60.0 / RATE_LIMIT_RPM if RATE_LIMIT_RPM > 0 else 0.0

for start in range(0, len(texts), EMBED_BATCH_SIZE):
    end = min(start + EMBED_BATCH_SIZE, len(texts))
    batch_texts = texts[start:end]
    batch_meta = metadatas[start:end]

    # Throttle to respect RPM (spacing requests evenly)
    if requests_made > 0 and per_request_delay > 0:
        time.sleep(per_request_delay)

    # One embedding API request per batch
    vectors = embeddings.embed_documents(batch_texts)
    requests_made += 1
    print(f"  ✓ Embedded batch {requests_made}/{planned_requests} with {len(batch_texts)} items")

    # Build rows for this batch
    for t, m, v in zip(batch_texts, batch_meta, vectors):
        rows.append({
            "id": str(uuid.uuid4()),
            "content": t,
            "metadata": m,
            "embedding": v,
        })

# Upsert to Supabase in batches
for start in range(0, len(rows), UPSERT_BATCH_SIZE):
    batch = rows[start:start + UPSERT_BATCH_SIZE]
    # Updated to new versioned table name to align with retrieval path
    supabase.table("documents_v3072").upsert(batch).execute()
    print(f"  ✓ Upserted rows {start} - {start + len(batch) - 1} into documents_v3072")

print(f"\n✓ Successfully embedded and stored {len(rows)} chunk embeddings in Supabase!")
if rows:
    print(f"\nFirst chunk preview:")
    print(f"  Source: {docs[0].metadata}")
    print(f"  Content (first 200 chars): {docs[0].page_content[:200]}...")