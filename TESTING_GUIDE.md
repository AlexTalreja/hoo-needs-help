# Testing Guide: Document Upload & RAG Pipeline

**Date**: 2025-11-15
**Phase**: 2.1 - Document Processing & RAG Testing

---

## What's Ready to Test

You now have a complete UI for testing the RAG pipeline:

✅ **Document Upload Page** - Upload PDFs and VTT files
✅ **Chat Interface** - Ask questions and get AI answers
✅ **Citations Display** - See source references in answers
✅ **Backend Processing** - PDF/VTT processing with embeddings

---

## Step-by-Step Testing

### **Step 1: Login**

1. Go to http://localhost:3000
2. Click **"Test Backend"**
3. Click **"Quick Login"** button
4. ✅ You should see "Logged in successfully!"

---

### **Step 2: Upload a Document**

1. Go back to home (http://localhost:3000)
2. Click **"Manage Documents"**
3. **Prepare a test PDF**:
   - Create a simple PDF with some text (or download one)
   - Keep it small (1-3 pages) for faster testing
   - Example content: "Recursion is when a function calls itself..."

4. Click the upload area or drag-and-drop your PDF
5. ✅ You should see:
   - "Uploading filename.pdf..."
   - "✅ filename.pdf uploaded successfully! Processing..."
   - Document appears in the list with "⏳ Processing..." status

6. **Wait ~10-30 seconds** for processing
7. ✅ Status should change to "✓ Ready"

---

### **Step 3: Verify Processing in Database**

**In Supabase SQL Editor**, run these queries to verify:

#### Check document was uploaded:
```sql
SELECT * FROM course_documents
WHERE course_id = '11111111-1111-1111-1111-111111111111'
ORDER BY created_at DESC;
```

✅ Should show your uploaded PDF with `processing_status = 'completed'`

#### Check chunks were created:
```sql
SELECT
  dc.id,
  dc.content,
  dc.metadata,
  dc.embedding IS NOT NULL as has_embedding
FROM document_chunks dc
JOIN course_documents cd ON dc.document_id = cd.id
WHERE cd.course_id = '11111111-1111-1111-1111-111111111111'
ORDER BY dc.created_at DESC
LIMIT 5;
```

✅ Should show text chunks from your PDF
✅ `has_embedding` should be TRUE
✅ `metadata` should have page numbers

---

### **Step 4: Test RAG Query**

1. Go to home (http://localhost:3000)
2. Click **"Start Chatting"**
3. **Ask a question about your PDF content**
   - Example: "What is recursion?"
   - Example: "What does the document say about [topic]?"

4. ✅ You should see:
   - AI response generated
   - Citations showing the PDF filename and page number
   - Example: `📄 syllabus.pdf (p. 3)`

---

### **Step 5: Check Backend Logs**

In your backend terminal, you should see logs like:

```
Processing question for course ...
Successfully processed PDF ...
Generated embeddings for X chunks
```

---

## Troubleshooting

### **Problem: Upload fails**

**Check**:
- Is backend running? (http://localhost:5000/health)
- Are you logged in? (try Quick Login again)
- Check backend logs for errors

### **Problem: Processing stays "Processing..." forever**

**Check backend logs for errors**:
- Gemini API key valid?
- PDF readable (not scanned image)?
- Check Supabase SQL for errors:
  ```sql
  SELECT * FROM course_documents
  WHERE processing_status = 'failed';
  ```

### **Problem: Chat returns empty answer**

**Possible causes**:
1. **No chunks in database** - Run verification query above
2. **No embeddings** - Check `has_embedding` column
3. **Question doesn't match content** - Try asking about something explicitly in the PDF
4. **Gemini API issue** - Check backend logs

**Debug query**:
```sql
-- See if there are any chunks with embeddings
SELECT COUNT(*)
FROM document_chunks
WHERE embedding IS NOT NULL;
```

### **Problem: Authentication fails**

**Solutions**:
1. Go to `/test` page
2. Click "Quick Login" again
3. Verify user exists in `users` table:
   ```sql
   SELECT * FROM users;
   ```

---

## Expected Behavior

### **Successful Upload Flow**:

1. **Upload**: PDF sent to backend
2. **Storage**: File saved to Supabase Storage
3. **Processing**:
   - Extract text from PDF page-by-page
   - Split into chunks (~500-1000 tokens each)
   - Generate embeddings via Gemini API
   - Store chunks + embeddings in database
4. **Status Update**: Document status → 'completed'

### **Successful RAG Query Flow**:

1. **Question**: User types question
2. **Embedding**: Generate embedding for question
3. **Search**: Vector similarity search in `document_chunks`
4. **Context**: Retrieve top 5 similar chunks
5. **Prompt**: Construct prompt with context
6. **Generate**: Gemini generates answer with citations
7. **Display**: Show answer + clickable citations

---

## Sample Test PDF Content

If you need a quick test PDF, create one with this content:

```
Computer Science 101 - Syllabus

Recursion
Recursion is a programming technique where a function calls
itself to solve a problem. Every recursive function needs:
1. A base case (stopping condition)
2. A recursive case (problem breakdown)

Example: Factorial
factorial(5) = 5 * factorial(4)
factorial(4) = 4 * factorial(3)
...
factorial(1) = 1 (base case)

Loops
Loops allow repeating code multiple times. Common types:
- for loops: iterate over sequences
- while loops: repeat while condition is true
```

Save as PDF and upload!

---

## Success Metrics

✅ **Document Upload Works**:
- File appears in document list
- Status changes to "Ready"
- Chunks visible in database with embeddings

✅ **RAG Query Works**:
- Question gets answered
- Answer relates to PDF content
- Citations show correct page numbers
- Response time < 5 seconds

✅ **End-to-End Flow**:
- Upload PDF → Ask question → Get relevant answer with citation

---

## Next Steps After Successful Test

Once the RAG pipeline works:

1. **Add more documents** - Test with multiple PDFs
2. **Test VTT files** - Upload video transcripts with timestamps
3. **Test TA corrections** - Use `/api/submit-correction`
4. **Build analytics** - View question patterns
5. **Polish UI** - Improve chat interface

---

## Quick Commands Reference

### Start Services:
```bash
# Terminal 1: Backend
cd backend
python run.py

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Check Health:
```
http://localhost:5000/health
http://localhost:3000
```

### Test Endpoints:
```
Documents: http://localhost:3000/documents
Chat: http://localhost:3000/chat
Test: http://localhost:3000/test
```

---

**Good luck testing!** 🚀

Report any issues and we'll debug together.
