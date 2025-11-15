## Database Setup Guide

**Complete guide for setting up the Supabase database schema for HooNeedsHelp**

---

## Prerequisites

✅ Supabase project created
✅ Supabase credentials added to `backend/.env`

---

## Step-by-Step Instructions

### 1. Access the Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **ymurgykwjrlichrfznsl**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

---

### 2. Run Migrations in Order

**IMPORTANT**: Run these in the exact order shown. Each migration depends on the previous ones.

#### Migration 1: Enable pgvector Extension

1. Open file: `supabase/migrations/01_enable_pgvector.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. ✅ You should see: `pgvector extension enabled successfully!`

---

#### Migration 2: Create Core Tables

1. Open file: `supabase/migrations/02_create_core_tables.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**
5. ✅ You should see: `Core tables created successfully!`

**Tables created:**
- `users` - User profiles with roles
- `courses` - Course information
- `course_documents` - Uploaded files

---

#### Migration 3: Create Vector Tables

1. Open file: `supabase/migrations/03_create_vector_tables.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**
5. ✅ You should see: `Vector tables created successfully!`

**Tables created:**
- `document_chunks` - Text chunks with embeddings (vector)
- `ta_verified_answers` - Human-verified Q&A with embeddings

---

#### Migration 4: Create QA Logs Table

1. Open file: `supabase/migrations/04_create_qa_logs.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**
5. ✅ You should see: `QA logs table created successfully!`

**Tables created:**
- `qa_logs` - Question/answer history for analytics

---

#### Migration 5: Create Database Functions

1. Open file: `supabase/migrations/05_create_functions.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**
5. ✅ You should see: `Database functions created successfully!`

**Functions created:**
- `match_document_chunks()` - Vector similarity search for documents
- `match_verified_answers()` - Vector similarity search for TA answers

---

#### Migration 6: Create RLS Policies

1. Open file: `supabase/migrations/06_create_rls_policies.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**
5. ✅ You should see: `RLS policies created successfully!`

**Security enabled:**
- Students can only read courses and documents
- TAs/Instructors can upload documents and create verified answers
- Row Level Security (RLS) protects all tables

---

#### Migration 7: Create Indexes

1. Open file: `supabase/migrations/07_create_indexes.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**
5. ✅ You should see: `Indexes created successfully!`

**Indexes created:**
- B-tree indexes for foreign keys
- Vector indexes (IVFFLAT) for fast similarity search

---

### 3. Verify Setup

Run this query in the SQL Editor to verify all tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**You should see:**
- ✅ `courses`
- ✅ `course_documents`
- ✅ `document_chunks`
- ✅ `qa_logs`
- ✅ `ta_verified_answers`
- ✅ `users`

---

### 4. (Optional) Add Test Data

If you want sample data for testing:

1. **First**: Create a test user in Supabase Auth
   - Go to **Authentication** → **Users**
   - Click **Add User**
   - Enter email: `instructor@test.com`
   - Set password
   - Copy the **User UID**

2. **Then**: Update seed file
   - Open `supabase/seed.sql`
   - Replace `YOUR_USER_ID_HERE` with the copied UID
   - Copy the entire file
   - Paste into SQL Editor
   - Click **Run**

---

## Verification Tests

### Test 1: Check pgvector Extension

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

✅ Should return 1 row

### Test 2: Check Vector Similarity Function

```sql
SELECT match_document_chunks(
  array_fill(0, ARRAY[768])::vector(768),
  5
);
```

✅ Should return empty result (no data yet) but no errors

### Test 3: Check RLS Policies

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

✅ Should return multiple policies for each table

---

## Troubleshooting

### Error: "extension vector does not exist"
**Solution**: Make sure you ran Migration 1 first

### Error: "relation users does not exist"
**Solution**: Run migrations in order (Migration 2 before 3, 4, etc.)

### Error: "permission denied"
**Solution**: Make sure you're logged into Supabase Dashboard with the project owner account

### Error: "vector dimension mismatch"
**Solution**: Verify you're using `vector(768)` everywhere (text-embedding-004 dimension)

---

## Next Steps

After database setup is complete:

1. ✅ **Test Flask Backend**: The backend can now query these tables
2. ✅ **Upload Documents**: Use the `/api/upload-document` endpoint
3. ✅ **Test RAG**: Ask questions via `/api/ask-question`
4. ✅ **View Analytics**: Check `/api/analytics/<course_id>`

---

## Database Schema Summary

```
users (id, email, role)
  ↓
courses (id, name, instructor_id, system_prompt)
  ↓
  ├─ course_documents (id, course_id, file_name, type)
  │    ↓
  │    └─ document_chunks (id, document_id, content, embedding)
  │
  ├─ ta_verified_answers (id, course_id, question, answer, embedding)
  │
  └─ qa_logs (id, course_id, question, ai_answer, sources_cited, rating, status)
```

---

## Important Notes

⚠️ **Service Role Key**: Your Flask backend uses the service role key, which bypasses RLS. This is correct and expected.

⚠️ **Vector Dimensions**: Always use `vector(768)` for text-embedding-004 model

⚠️ **Indexes**: Vector indexes (IVFFLAT) may take time to build with large datasets

✅ **Success**: If all migrations ran without errors, your database is ready!

---

**Last Updated**: 2025-11-15
