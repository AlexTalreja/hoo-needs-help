# Claude AI Guidelines for HooNeedsHelp

## Project Context

**HooNeedsHelp** is an AI-powered teaching assistant platform that helps students get instant answers grounded in their course materials (PDFs, video transcripts, syllabus) with clickable citations to specific pages and video timestamps.

### Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS
- **Backend**: Supabase (Auth, Postgres DB, pgvector, Storage, Edge Functions)
- **AI**: Google Gemini (text-embedding-004 for embeddings, gemini-2.5-flash for chat)
- **Video**: HTML5 video or Video.js with timestamp seeking

---

## Coding Standards

### General Principles
1. **Component-Based Architecture**: All UI should be broken into reusable React components
2. **Type Safety**: Use TypeScript for all new code to catch errors early
3. **Accessibility**: Ensure all interactive elements are keyboard-accessible and screen-reader friendly
4. **Performance**: Optimize for fast load times (code splitting, lazy loading)
5. **Security**: Never expose API keys client-side; use Supabase Edge Functions for all Gemini API calls

### File Organization
```
/src
  /components     # Reusable UI components
  /pages          # Page-level components (Student, TA, Admin)
  /hooks          # Custom React hooks
  /utils          # Helper functions
  /services       # API calls and Supabase clients
  /types          # TypeScript type definitions
/supabase
  /functions      # Edge Functions for backend logic
  /migrations     # Database schema migrations
```

### Naming Conventions
- **Components**: PascalCase (e.g., `ChatInterface.tsx`, `VideoPlayer.tsx`)
- **Hooks**: camelCase with "use" prefix (e.g., `useRagQuery.ts`)
- **Edge Functions**: kebab-case (e.g., `ask-question`, `submit-correction`)
- **Database Tables**: snake_case (e.g., `qa_logs`, `document_chunks`)

---

## Key Architecture Patterns

### RAG (Retrieval-Augmented Generation) Flow
1. User asks question → Generate embedding
2. Vector similarity search in `document_chunks` and `ta_verified_answers`
3. Construct prompt with top K results as context
4. Call Gemini API with context + system prompt
5. Parse response, extract citations, log to `qa_logs`

### Citation Format
- **PDF**: "According to [syllabus.pdf](source-id) (page 2)..."
- **Video**: "Professor explained this in [Lecture 3](video-id) at [14:32](timestamp)..."
- Store citation metadata as JSONB in `qa_logs.sources_cited`

### Human-in-the-Loop Learning
When a TA corrects an answer:
1. Generate embedding for the original question
2. Insert into `ta_verified_answers` with high priority
3. Future RAG queries will retrieve this verified answer first

---

## Useful Claude Prompts

### For Feature Development
```
I'm working on the [component name] feature for HooNeedsHelp. This feature should [description].

Context:
- This is a React component using Tailwind CSS
- It needs to integrate with Supabase [Auth/Storage/DB]
- It should follow our RAG architecture pattern

Please help me:
1. Design the component structure
2. Write the React component with TypeScript
3. Create any necessary Supabase Edge Functions
4. Add proper error handling and loading states
```

### For RAG Implementation
```
I need to implement the RAG query logic for HooNeedsHelp. The flow should:
1. Take a user question and generate an embedding using Gemini
2. Perform vector similarity search on document_chunks and ta_verified_answers
3. Construct a prompt with the top 5 results
4. Call Gemini 2.5 Flash to generate an answer with citations
5. Parse and return structured response

Please write a Supabase Edge Function that implements this, ensuring:
- Proper error handling for Gemini API calls
- Efficient vector search queries using pgvector
- Citation extraction and formatting
- Logging to qa_logs table
```

### For Database Schema Changes
```
I need to [add/modify] the database schema for [feature].

Current schema (see project-plan.md section 4)
New requirement: [describe requirement]

Please create a Supabase migration that:
1. Adds necessary tables/columns
2. Includes proper foreign keys and indexes
3. Handles data migration if needed
4. Updates TypeScript types accordingly
```

### For Video Timestamp Feature
```
I'm implementing the clickable video timestamp feature. When a user clicks a timestamp citation like "(at 14:32)", it should:
1. Load the video in a modal/player
2. Seek to the exact timestamp
3. Handle edge cases (video not loaded, invalid timestamp)

Please help me build this feature using [Video.js/HTML5 video], ensuring:
- Smooth UX with loading states
- Proper timestamp parsing from citation format
- Mobile-responsive video player
```

### For Analytics Dashboard
```
I'm building the instructor analytics dashboard that shows:
- Top-level KPIs (total questions, avg rating, flagged answers)
- Concept "struggle" visualization (most asked topics)
- Question volume over time (line chart)
- Lecture "heatmap" (which timestamps get most questions)

Please help me:
1. Write the Supabase queries to aggregate qa_logs data
2. Create React components for each visualization
3. Use a charting library like Recharts or Chart.js
4. Ensure real-time updates as new questions come in
```

---

## Testing Checklist

### Before Committing Code
- [ ] TypeScript compiles with no errors
- [ ] All ESLint warnings addressed
- [ ] Component renders correctly on mobile and desktop
- [ ] Edge Functions tested locally with `supabase functions serve`
- [ ] Database migrations run successfully
- [ ] No API keys hardcoded in frontend

### RAG Quality Tests
- [ ] Answers include relevant citations with correct page/timestamp
- [ ] Citations are clickable and navigate correctly
- [ ] Answers stay grounded in provided context (no hallucination)
- [ ] TA-verified answers appear as top context sources
- [ ] Low-confidence answers are properly flagged

### Security Tests
- [ ] Non-authenticated users cannot access TA/admin routes
- [ ] RLS (Row Level Security) policies prevent cross-course data leaks
- [ ] File uploads are validated for type and size
- [ ] User input is sanitized before database insertion

---

## Common Pitfalls to Avoid

1. **Exposing Gemini API Keys**: Always call Gemini from Supabase Edge Functions, never from React
2. **Vector Search Performance**: Always create indexes on embedding columns for fast similarity search
3. **Citation Parsing**: Ensure LLM response format is consistent and parseable (use structured outputs)
4. **Video Loading**: Preload video metadata to enable instant timestamp seeking
5. **Cost Control**: Set token limits on Gemini API calls and implement rate limiting
6. **RLS Policies**: Always test that students can't see other courses' data

---

## Hackathon Optimization Tips

### Quick Wins
- Use Tailwind UI or shadcn/ui for beautiful components fast
- Leverage Supabase CLI for instant backend deployment
- Use Gemini's JSON mode for reliable citation parsing
- Start with HTML5 `<video>` before integrating Video.js

### Demo-Ready Features
1. **Live Chat**: Real-time question answering with streaming responses
2. **Citation Showcase**: Click a timestamp → video jumps to exact moment
3. **TA Correction**: Show before/after of AI answer vs TA-verified answer
4. **Analytics**: Beautiful charts showing "what students struggle with most"

### Nice-to-Haves (if time permits)
- Markdown rendering in chat messages
- Code syntax highlighting in answers
- Export analytics as PDF
- Email notifications for TAs when questions are flagged
- Multi-language support

---

## Example Prompts for Specific Tasks

### Creating a New React Component
```
Create a new React component called [ComponentName] that [description].

Requirements:
- Use TypeScript with proper prop types
- Style with Tailwind CSS following our design system
- Handle loading and error states
- Be responsive (mobile-first design)
- Include accessibility attributes (ARIA labels)
```

### Writing a Supabase Edge Function
```
Write a Supabase Edge Function called [function-name] that [description].

The function should:
- Accept [parameters] in the request body
- Query the Supabase database for [data]
- Call Gemini API to [generate embeddings/answer questions]
- Return [structured response]
- Handle errors gracefully with proper HTTP status codes
```

### Debugging RAG Issues
```
The RAG system is returning irrelevant answers for questions about [topic].

Help me debug by:
1. Checking if the document chunks are being created correctly
2. Verifying the vector similarity search is using proper thresholds
3. Reviewing the prompt construction for the LLM
4. Testing with sample questions to see retrieved context
```

---

## Resources

- **Project Plan**: See [project-plan.md](project-plan.md) for full feature breakdown
- **Supabase Docs**: https://supabase.com/docs
- **Gemini API**: https://ai.google.dev/gemini-api/docs
- **pgvector**: https://github.com/pgvector/pgvector
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## Quick Reference: Database Schema

```sql
-- Key tables (see project-plan.md for full schema)
courses (id, name, instructor_id, system_prompt)
course_documents (id, course_id, file_name, storage_path, type)
document_chunks (id, document_id, content, metadata, embedding)
ta_verified_answers (id, course_id, question, answer, embedding)
qa_logs (id, course_id, question, ai_answer, sources_cited, rating, status, created_at)
```

---

**Last Updated**: 2025-11-15
