# HooNeedsHelp - Implementation Roadmap

## Project Overview
An AI-powered teaching assistant platform that provides students with instant, grounded answers from course materials with clickable citations to PDFs and video timestamps.

---

## Implementation Strategy

This roadmap follows a **bottom-up, dependency-driven approach** that prioritizes:
1. **Foundation First**: Database, auth, and infrastructure
2. **Core RAG Pipeline**: The heart of the AI TA functionality
3. **User-Facing Features**: Student chat, then TA tools, then analytics
4. **Polish & Optimization**: Performance, UX improvements, edge cases

---

## Phase 1: Foundation & Infrastructure (Week 1)

### 1.1 Project Setup & Environment
**Priority**: CRITICAL | **Duration**: 2-4 hours

- [ ] Initialize React + Vite project with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Set up Supabase project
- [ ] Configure environment variables (.env)
- [ ] Set up folder structure (`/src/components`, `/pages`, `/hooks`, `/services`, `/types`)
- [ ] Set up ESLint and Prettier

**Dependencies**: None
**Deliverable**: Development environment ready for coding

---

### 1.2 Database Schema & Migrations
**Priority**: CRITICAL | **Duration**: 4-6 hours

**Order of Implementation**:
1. **Users table** (extends Supabase Auth)
   ```sql
   users (id, email, role)  -- role: 'student', 'ta', 'instructor'
   ```

2. **Courses table**
   ```sql
   courses (id, name, instructor_id, system_prompt, created_at)
   ```

3. **Course documents table**
   ```sql
   course_documents (id, course_id, file_name, storage_path, type)
   -- type: 'pdf', 'vtt', 'video'
   ```

4. **Document chunks table** (with pgvector)
   ```sql
   document_chunks (id, document_id, content, metadata, embedding)
   -- Enable pgvector extension
   -- Create index on embedding column for fast similarity search
   ```

5. **TA verified answers table**
   ```sql
   ta_verified_answers (id, course_id, question, answer, embedding, created_at)
   ```

6. **QA logs table**
   ```sql
   qa_logs (id, course_id, question, ai_answer, sources_cited, rating, status, created_at)
   -- status: 'answered', 'flagged', 'reviewed'
   ```

7. **Row Level Security (RLS) Policies**
   - Students can only read their enrolled courses
   - TAs can read/write for their assigned courses
   - Instructors have full access to their courses

**Dependencies**: Supabase project setup
**Deliverable**: Complete database schema with proper indexes, foreign keys, and RLS policies

---

### 1.3 Authentication System
**Priority**: CRITICAL | **Duration**: 3-4 hours

- [ ] Configure Supabase Auth (email/password)
- [ ] Create login page UI
- [ ] Create signup page with role selection (TA/Instructor only for hackathon)
- [ ] Implement authentication context in React
- [ ] Add protected route wrapper component
- [ ] Create simple navbar with user info and logout

**Dependencies**: Database schema (users table)
**Deliverable**: Working login/logout, protected routes

---

## Phase 2: Core RAG Pipeline (Week 1-2)

### 2.1 Document Processing & Embeddings
**Priority**: CRITICAL | **Duration**: 8-10 hours

**Implementation Order**:

1. **Set up Gemini API integration**
   - Create Supabase Edge Function for Gemini calls
   - Implement embedding generation function
   - Add error handling and retry logic

2. **PDF Processing**
   - [ ] Create file upload UI component
   - [ ] Set up Supabase Storage bucket
   - [ ] Create `process-pdf` Edge Function
     - Parse PDF text using pdf-parse
     - Chunk text (500-1000 tokens per chunk)
     - Store page metadata
   - [ ] Generate embeddings for each chunk
   - [ ] Store in `document_chunks` table

3. **VTT (Transcript) Processing**
   - [ ] Create `process-vtt` Edge Function
     - Parse .vtt file format
     - Create chunks with timestamp ranges [start_time, end_time]
     - Store timestamp metadata
   - [ ] Generate embeddings for transcript chunks
   - [ ] Link to corresponding video file

4. **Video File Handling**
   - [ ] Upload to Supabase Storage
   - [ ] Store reference in `course_documents`
   - [ ] No processing needed (just storage)

**Dependencies**: Database schema, Supabase Storage, Gemini API
**Deliverable**: Ability to upload and process course materials into vector store

---

### 2.2 RAG Query Engine
**Priority**: CRITICAL | **Duration**: 10-12 hours

This is the **core of the entire system**. Implementation order:

1. **Create `ask-question` Edge Function skeleton**
   - Set up request/response structure
   - Add authentication check
   - Add rate limiting

2. **Implement embedding generation for questions**
   - Call Gemini embedding API with user question
   - Handle errors

3. **Implement vector similarity search**
   ```typescript
   // Parallel searches:
   // 1. Search document_chunks (top 3-5 results)
   // 2. Search ta_verified_answers (top 2 results, higher weight)
   ```
   - Use pgvector cosine similarity
   - Set similarity threshold (e.g., > 0.7)
   - Retrieve metadata (page numbers, timestamps)

4. **Construct LLM prompt**
   ```
   System: [course.system_prompt]

   Context:
   - [chunk 1 with source info]
   - [chunk 2 with source info]
   - [TA verified answer if exists]

   User Question: [question]

   Instructions: Answer using ONLY the context above.
   Cite sources in format: (syllabus.pdf, page 3) or (Lecture 2 at 14:32)
   ```

5. **Call Gemini Chat API**
   - Use gemini-2.5-flash
   - Set temperature low (0.2-0.3) for consistency
   - Set max tokens limit

6. **Parse response and extract citations**
   - Use regex or structured output to extract citations
   - Map citations to source IDs
   - Format citations as clickable links

7. **Log to qa_logs table**
   - Store question, answer, sources_cited (JSONB)
   - Set initial status = 'answered'

8. **Return structured response to frontend**

**Dependencies**: Document processing pipeline, pgvector indexes
**Deliverable**: Working RAG system that answers questions with citations

---

## Phase 3: Student-Facing Interface (Week 2)

### 3.1 Chat Interface
**Priority**: HIGH | **Duration**: 6-8 hours

- [ ] Create `ChatInterface` component
  - Message list with auto-scroll
  - Input field with submit button
  - Loading state during API call
  - Error handling UI

- [ ] Implement message display
  - User messages (right-aligned)
  - AI responses (left-aligned)
  - Timestamp display

- [ ] Add citation rendering
  - Parse citation format in AI response
  - Make citations clickable
  - Style differently (e.g., blue underline)

- [ ] Create feedback mechanism
  - Add 👍/👎 buttons to each AI response
  - Update `qa_logs.rating` on click
  - If 👎, update `status = 'flagged'`

**Dependencies**: RAG query engine
**Deliverable**: Functional chat interface for students

---

### 3.2 Video Player with Timestamp Seeking
**Priority**: HIGH | **Duration**: 4-6 hours

**Implementation Order**:

1. **Create `VideoPlayer` component**
   - Use HTML5 `<video>` element initially
   - Add play/pause controls
   - Add volume control
   - Make responsive

2. **Implement timestamp click handler**
   - Parse timestamp from citation (e.g., "14:32")
   - Convert to seconds (14*60 + 32 = 872)
   - Set `video.currentTime = 872`
   - Auto-play video

3. **Create modal/overlay for video**
   - Opens when timestamp clicked
   - Closes with X button or ESC key
   - Preload video metadata for fast seeking

4. **Add loading states**
   - Show spinner while video loads
   - Handle video not found errors

**Dependencies**: Chat interface with citations
**Deliverable**: Clickable timestamp citations that jump to exact video moments

---

### 3.3 Student Dashboard
**Priority**: MEDIUM | **Duration**: 2-3 hours

- [ ] Create course selection page
- [ ] Show enrolled courses (for demo, just one course)
- [ ] Add course info sidebar (instructor, description)
- [ ] Link to chat interface

**Dependencies**: Auth system
**Deliverable**: Student landing page after login

---

## Phase 4: TA & Instructor Workspace (Week 2-3)

### 4.1 TA Review Queue
**Priority**: HIGH | **Duration**: 6-8 hours

**Implementation Order**:

1. **Create TA Dashboard**
   - Show count of flagged questions
   - Display notification badge

2. **Create Review Queue component**
   - Query `qa_logs WHERE status = 'flagged'`
   - Display as list/table with:
     - Student question
     - AI's answer
     - Timestamp
     - "Review" button

3. **Create Review UI**
   - Show original question (read-only)
   - Show AI's answer (read-only)
   - Add rich text editor for TA's verified answer
   - Add "Submit" and "Cancel" buttons

4. **Create `submit-correction` Edge Function**
   - Accept question + verified answer
   - Generate embedding for question
   - Insert into `ta_verified_answers` table
   - Update original `qa_logs` entry (status = 'reviewed')

5. **Add success feedback**
   - Show toast notification on submit
   - Remove from queue
   - Update counter

**Dependencies**: QA logs from student questions, RAG system
**Deliverable**: TAs can review and correct AI answers

---

### 4.2 Knowledge Base Management
**Priority**: MEDIUM | **Duration**: 4-5 hours

- [ ] Create "Add Q&A" form for TAs
  - Question input field
  - Answer rich text editor
  - Submit button

- [ ] Create `add-verified-qa` Edge Function
  - Validate input
  - Generate embedding
  - Insert into `ta_verified_answers`

- [ ] Create list view of all verified answers
  - Show question/answer pairs
  - Add edit/delete functionality

**Dependencies**: TA authentication
**Deliverable**: TAs can proactively add common Q&As

---

### 4.3 Course Management (Instructor)
**Priority**: MEDIUM | **Duration**: 4-5 hours

- [ ] Create course settings page
  - Edit course name
  - Edit AI system prompt (persona)
  - Save changes

- [ ] Create file management UI
  - Upload PDF, VTT, video files
  - Display uploaded files
  - Delete files (with confirmation)

- [ ] Add processing status indicator
  - Show "Processing..." for files being embedded
  - Show "Ready" when complete
  - Show errors if processing fails

**Dependencies**: Document processing pipeline
**Deliverable**: Instructors can configure courses and upload materials

---

## Phase 5: Analytics Dashboard (Week 3)

### 5.1 Top-Level KPIs
**Priority**: MEDIUM | **Duration**: 3-4 hours

- [ ] Create analytics page layout
- [ ] Create `get-analytics` Edge Function
  - Query qa_logs for aggregations
  - Return structured data

- [ ] Display KPI cards:
  - Total questions asked
  - Average rating (👍/👎 ratio)
  - Number of flagged answers
  - Number of reviewed answers

**Dependencies**: QA logs data
**Deliverable**: Instructor sees high-level metrics

---

### 5.2 Concept Struggle Visualization
**Priority**: HIGH | **Duration**: 5-6 hours

**Implementation Order**:

1. **Implement keyword extraction**
   - Use simple TF-IDF or keyword extraction
   - Extract top terms from questions

2. **Create aggregation query**
   - Group questions by extracted keywords
   - Count frequency

3. **Create bar chart/word cloud component**
   - Use Recharts or Chart.js
   - Display top 10-15 concepts
   - Make interactive (click to see questions)

**Dependencies**: Analytics Edge Function
**Deliverable**: Visual showing most confusing topics

---

### 5.3 Question Volume Over Time
**Priority**: MEDIUM | **Duration**: 3-4 hours

- [ ] Create time-series aggregation query
  - Group qa_logs by day/hour
  - Count questions

- [ ] Create line chart component
  - X-axis: Time
  - Y-axis: Question count
  - Show spike indicators

**Dependencies**: Analytics Edge Function
**Deliverable**: Chart showing when students need help most

---

### 5.4 Lecture Heatmap
**Priority**: HIGH (Demo WOW Factor) | **Duration**: 6-8 hours

**Implementation Order**:

1. **Aggregate timestamp citations**
   - Query `qa_logs.sources_cited` JSONB
   - Extract all video timestamps
   - Group by video and time ranges (e.g., 30-second bins)

2. **Create heatmap data structure**
   ```typescript
   {
     video_id: string,
     segments: [
       { start: 0, end: 30, count: 5 },
       { start: 30, end: 60, count: 12 },
       ...
     ]
   }
   ```

3. **Create visualization component**
   - Show video timeline as horizontal bar
   - Overlay segments with color intensity based on count
   - Make segments clickable (jumps to that video time)

**Dependencies**: QA logs with citation data, video player
**Deliverable**: Visual showing which lecture moments confuse students most

---

## Phase 6: Polish & Optimization (Week 3-4)

### 6.1 Performance Optimization
**Priority**: MEDIUM | **Duration**: 4-6 hours

- [ ] Add React code splitting (lazy load routes)
- [ ] Optimize bundle size (analyze with Vite build)
- [ ] Add caching for embeddings (avoid re-processing)
- [ ] Optimize vector search queries (ensure indexes exist)
- [ ] Add pagination for long lists (review queue, analytics)

**Dependencies**: Core features complete
**Deliverable**: Fast load times and responsive UI

---

### 6.2 UX Improvements
**Priority**: MEDIUM | **Duration**: 4-5 hours

- [ ] Add loading skeletons (not just spinners)
- [ ] Add error boundaries for graceful failures
- [ ] Improve mobile responsiveness
- [ ] Add toast notifications for actions
- [ ] Add empty states for lists
- [ ] Add keyboard shortcuts (e.g., Ctrl+Enter to send message)

**Dependencies**: Core features complete
**Deliverable**: Professional, polished user experience

---

### 6.3 Error Handling & Edge Cases
**Priority**: HIGH | **Duration**: 4-6 hours

- [ ] Handle Gemini API failures (retry, fallback)
- [ ] Handle invalid file uploads (type, size validation)
- [ ] Handle malformed citations in AI responses
- [ ] Handle empty search results (no relevant context)
- [ ] Handle video playback errors
- [ ] Add comprehensive logging for debugging

**Dependencies**: Core features complete
**Deliverable**: Robust system that handles failures gracefully

---

### 6.4 Security Hardening
**Priority**: HIGH | **Duration**: 3-4 hours

- [ ] Review and test RLS policies
- [ ] Test that students can't access other courses
- [ ] Validate all file uploads (type, size, malware scan if possible)
- [ ] Sanitize user input before DB insertion
- [ ] Add rate limiting to Edge Functions
- [ ] Ensure API keys are never exposed client-side
- [ ] Add CORS policies

**Dependencies**: All features
**Deliverable**: Secure application ready for deployment

---

## Phase 7: Testing & Demo Preparation (Week 4)

### 7.1 Feature Testing
**Priority**: CRITICAL | **Duration**: 6-8 hours

- [ ] Test full student flow (ask question → get answer → click citation)
- [ ] Test TA flow (review flagged question → submit correction)
- [ ] Test instructor flow (upload materials → view analytics)
- [ ] Test RAG quality with various question types
- [ ] Test citation accuracy (page numbers, timestamps)
- [ ] Test video seeking accuracy

**Dependencies**: All features complete
**Deliverable**: Bug-free core functionality

---

### 7.2 Demo Data & Scenario
**Priority**: CRITICAL | **Duration**: 4-5 hours

- [ ] Create sample course (e.g., "CS 101: Intro to Python")
- [ ] Upload sample materials:
  - Sample syllabus PDF (3-4 pages)
  - Sample lecture video (10-15 min)
  - Sample transcript (.vtt file)
- [ ] Seed database with:
  - Sample student questions
  - Sample TA corrections
  - Realistic analytics data
- [ ] Create demo script/flow

**Dependencies**: All features working
**Deliverable**: Compelling demo ready to present

---

### 7.3 Documentation
**Priority**: MEDIUM | **Duration**: 2-3 hours

- [ ] Update README with:
  - Project description
  - Setup instructions
  - Environment variables needed
  - How to run locally
- [ ] Add inline code comments
- [ ] Create architecture diagram (optional)
- [ ] Create user guide (optional)

**Dependencies**: Project complete
**Deliverable**: Clear documentation for judges/users

---

## Timeline Summary

### Week 1: Foundation + Core RAG
- Days 1-2: Phase 1 (Foundation)
- Days 3-7: Phase 2 (RAG Pipeline)

### Week 2: User Interfaces
- Days 1-3: Phase 3 (Student Interface)
- Days 4-7: Phase 4 (TA/Instructor Workspace)

### Week 3: Analytics + Polish
- Days 1-3: Phase 5 (Analytics Dashboard)
- Days 4-7: Phase 6 (Optimization & Security)

### Week 4: Final Testing
- Days 1-3: Phase 7 (Testing & Demo Prep)
- Days 4-7: Buffer for bugs and final polish

---

## Critical Path (Minimum Viable Product)

If time is limited, prioritize this subset for a working demo:

1. **Database schema** (Phase 1.2)
2. **Basic auth** (Phase 1.3)
3. **PDF processing + embeddings** (Phase 2.1 - PDF only)
4. **RAG query engine** (Phase 2.2)
5. **Chat interface** (Phase 3.1)
6. **Basic citations** (Phase 3.1 - text only, skip video player)
7. **TA review queue** (Phase 4.1)
8. **One analytics chart** (Phase 5.2 - concept struggle)

**Estimated MVP Time**: 40-50 hours (1-1.5 weeks of focused work)

---

## Risk Mitigation

### High-Risk Areas
1. **RAG Quality**: AI might give poor answers
   - **Mitigation**: Test with diverse questions, tune similarity thresholds

2. **Vector Search Performance**: Slow queries on large datasets
   - **Mitigation**: Ensure pgvector indexes are created, limit search results

3. **Video Timestamp Accuracy**: Transcripts might not align perfectly
   - **Mitigation**: Test with high-quality .vtt files, add +/- 5 second buffer

4. **Gemini API Costs**: Could exceed budget during testing
   - **Mitigation**: Set usage limits, use smaller embeddings model

### Dependencies on External Services
- **Supabase**: If down, entire app breaks
  - **Mitigation**: Have local development fallback
- **Gemini API**: If rate-limited or down
  - **Mitigation**: Implement retry logic, show graceful errors

---

## Success Metrics

### Technical Metrics
- [ ] RAG answer relevance > 80% (manual evaluation)
- [ ] Citation accuracy > 95% (correct page/timestamp)
- [ ] Page load time < 2 seconds
- [ ] Vector search response time < 500ms

### User Experience Metrics
- [ ] Students can get answer in < 10 seconds
- [ ] TAs can review question in < 2 minutes
- [ ] Instructors can upload materials in < 5 minutes

---

## Post-Hackathon Extensions

If time permits or for future development:

1. **Streaming Responses**: AI answer streams in real-time
2. **Multi-Course Support**: Students enrolled in multiple courses
3. **Email Notifications**: Alert TAs of flagged questions
4. **Markdown Support**: Rich formatting in answers
5. **Code Syntax Highlighting**: For CS courses
6. **Mobile App**: React Native version
7. **Advanced Analytics**: Predictive insights, student struggling detection
8. **Integration with LMS**: Canvas, Blackboard, etc.

---

**Last Updated**: 2025-11-15
