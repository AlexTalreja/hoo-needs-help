# Phase 1.2: Database Schema & Migrations - READY ✅

**Date**: 2025-11-15
**Status**: SQL Files Created - Ready to Run in Supabase Dashboard

---

## What Was Created

### 7 SQL Migration Files + 1 Seed File

All files are in `/supabase/migrations/` ready to copy/paste into Supabase SQL Editor.

| File | Purpose | Tables/Functions Created |
|------|---------|--------------------------|
| `01_enable_pgvector.sql` | Enable vector extension | pgvector extension |
| `02_create_core_tables.sql` | Core tables | users, courses, course_documents |
| `03_create_vector_tables.sql` | Vector tables | document_chunks, ta_verified_answers |
| `04_create_qa_logs.sql` | Analytics table | qa_logs |
| `05_create_functions.sql` | Vector search functions | match_document_chunks(), match_verified_answers() |
| `06_create_rls_policies.sql` | Security policies | RLS policies for all tables |
| `07_create_indexes.sql` | Performance indexes | B-tree + Vector (IVFFLAT) indexes |
| `seed.sql` | Test data (optional) | Sample course, documents, Q&A |

---

## Database Schema Overview

```sql
┌─────────────────────────────────────────────────────┐
│  users (extends auth.users)                         │
│  - id, email, role (student/ta/instructor)         │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│  courses                                            │
│  - id, name, instructor_id, system_prompt          │
└──────────────────┬──────────────────────────────────┘
                   │
      ┌────────────┼─────────────┬─────────────┐
      │            │             │             │
┌─────▼────────┐ ┌▼──────────┐ ┌▼──────────┐ │
│ course_docs  │ │ ta_verified│ │ qa_logs   │ │
│ - PDF/VTT    │ │ - Q&A      │ │ - history │ │
│ - videos     │ │ - embedding│ │ - ratings │ │
└─────┬────────┘ └────────────┘ └───────────┘ │
      │                                        │
┌─────▼────────┐                              │
│ doc_chunks   │──────────────────────────────┘
│ - content    │  (Vector similarity search)
│ - embedding  │
└──────────────┘
```

---

## Tables Created

### 1. **users** (Extends Supabase Auth)
- `id` - UUID (references auth.users)
- `email` - User email
- `role` - student | ta | instructor
- `created_at`, `updated_at`

### 2. **courses**
- `id` - UUID
- `name` - Course name (e.g., "CS 101")
- `instructor_id` - UUID (references users)
- `system_prompt` - AI personality for this course
- `created_at`, `updated_at`

### 3. **course_documents**
- `id` - UUID
- `course_id` - UUID (references courses)
- `file_name` - Original filename
- `storage_path` - Path in Supabase Storage
- `type` - pdf | vtt | video
- `processing_status` - pending | processing | completed | failed
- `created_at`, `updated_at`

### 4. **document_chunks** (Vector Table)
- `id` - UUID
- `document_id` - UUID (references course_documents)
- `content` - Text content
- `metadata` - JSONB (page, timestamp, etc.)
- **`embedding`** - vector(768) - text-embedding-004 embeddings
- `created_at`

### 5. **ta_verified_answers** (Vector Table)
- `id` - UUID
- `course_id` - UUID (references courses)
- `question` - Original question
- `answer` - TA-verified answer
- **`embedding`** - vector(768) - Question embedding for retrieval
- `created_by` - UUID (references users)
- `created_at`, `updated_at`

### 6. **qa_logs** (Analytics)
- `id` - UUID
- `course_id` - UUID (references courses)
- `user_id` - UUID (references users)
- `question` - Student question
- `ai_answer` - AI-generated answer
- `sources_cited` - JSONB (array of citations)
- `rating` - Integer (-1 thumbs down, 1 thumbs up)
- `status` - answered | flagged | reviewed
- `created_at`

---

## Database Functions Created

### `match_document_chunks(query_embedding, match_count, filter_course_id)`
**Purpose**: Vector similarity search for document chunks

**Parameters**:
- `query_embedding` - vector(768) - Question embedding
- `match_count` - INT - Number of results to return (default 5)
- `filter_course_id` - UUID - Optional course filter

**Returns**: Table with id, document_id, content, metadata, similarity score

**Used by**: Flask backend for RAG queries

---

### `match_verified_answers(query_embedding, match_count, filter_course_id)`
**Purpose**: Vector similarity search for TA-verified answers

**Parameters**:
- `query_embedding` - vector(768) - Question embedding
- `match_count` - INT - Number of results (default 2)
- `filter_course_id` - UUID - Optional course filter

**Returns**: Table with id, question, answer, similarity score

**Used by**: Flask backend to prioritize human-verified answers

---

## Row Level Security (RLS) Policies

### Security Model
- **Students**: Read-only access to courses, documents, chunks, verified answers
- **TAs**: Can upload documents, create verified answers, update QA logs
- **Instructors**: Full access to their courses

### Key Policies
- ✅ Users can only read their own profile
- ✅ Anyone authenticated can read courses (can be restricted later)
- ✅ Only instructors can create courses
- ✅ TAs/instructors can upload documents
- ✅ Anyone can read chunks and verified answers (for RAG)
- ✅ TAs/instructors can create verified answers
- ✅ Users can rate their own QA logs

---

## Indexes Created

### B-Tree Indexes (Foreign Keys & Queries)
- `courses.instructor_id`
- `course_documents.course_id, type, processing_status`
- `document_chunks.document_id`
- `ta_verified_answers.course_id, created_by`
- `qa_logs.course_id, user_id, status, created_at`

### Vector Indexes (Similarity Search)
- `document_chunks.embedding` - IVFFLAT (lists=100)
- `ta_verified_answers.embedding` - IVFFLAT (lists=100)

**Why IVFFLAT?**
- Faster than exact search for large datasets
- Good balance between speed and accuracy
- lists=100 is optimal for small-medium datasets (< 100k rows)

---

## What You Need to Do Next

### Step 1: Run Migrations

Follow the **DATABASE_SETUP.md** guide:

1. Go to Supabase Dashboard → SQL Editor
2. Run each migration file in order (01 → 07)
3. Verify success messages after each

**Estimated time**: 5-10 minutes

---

### Step 2: Verify Setup

Run this query to verify all tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- ✅ courses
- ✅ course_documents
- ✅ document_chunks
- ✅ qa_logs
- ✅ ta_verified_answers
- ✅ users

---

### Step 3: (Optional) Add Test Data

If you want to test immediately:

1. Create a test user in Supabase Auth
2. Update `seed.sql` with your user ID
3. Run seed.sql in SQL Editor

---

## Testing the Setup

### Test 1: Check pgvector Extension
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Test 2: Test Vector Function
```sql
SELECT match_document_chunks(
  array_fill(0, ARRAY[768])::vector(768),
  5
);
```

### Test 3: Verify RLS
```sql
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
```

---

## Integration with Flask Backend

Your Flask backend is **already configured** to use these tables:

### Routes Ready to Use:
- ✅ `POST /api/ask-question` → Uses `match_document_chunks()` and `match_verified_answers()`
- ✅ `POST /api/upload-document` → Inserts into `course_documents`
- ✅ `POST /api/submit-correction` → Inserts into `ta_verified_answers`
- ✅ `GET /api/analytics/<course_id>` → Queries `qa_logs`
- ✅ `GET /api/flagged-questions/<course_id>` → Queries `qa_logs WHERE status='flagged'`

### Services Ready to Use:
- ✅ `backend/app/services/pdf_processor.py` → Inserts into `document_chunks`
- ✅ `backend/app/services/vtt_processor.py` → Inserts into `document_chunks`
- ✅ `backend/app/services/gemini.py` → Generates embeddings for vector search

---

## After Database Setup

Once migrations are complete, you can:

1. **Test Document Upload**:
   - Use frontend to upload a PDF
   - Backend will process and create chunks with embeddings

2. **Test RAG Query**:
   - Ask a question via `/api/ask-question`
   - Backend will search vectors and generate answer

3. **View Analytics**:
   - Check `/api/analytics/<course_id>` for insights

---

## Files Summary

**Created**: 9 files
- 7 migration SQL files
- 1 seed data file
- 1 setup guide (DATABASE_SETUP.md)

**Total Lines**: ~400 lines of SQL

**Location**: `/supabase/migrations/`

---

## Important Notes

⚠️ **Vector Dimensions**: Always use `vector(768)` for text-embedding-004

⚠️ **Service Role Key**: Flask backend bypasses RLS (this is correct)

⚠️ **Order Matters**: Run migrations in numerical order (01 → 07)

✅ **Version Controlled**: All SQL files are in git for team collaboration

---

## Next Phase After This

**Phase 2.1**: Document Processing Pipeline
- Upload PDFs and VTT files
- Generate embeddings with Gemini
- Store chunks in vector database
- Test vector similarity search

---

**Status**: ✅ SQL Files Ready - Follow DATABASE_SETUP.md to run migrations

**Estimated Setup Time**: 10-15 minutes

**Last Updated**: 2025-11-15
