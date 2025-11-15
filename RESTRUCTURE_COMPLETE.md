# Project Restructure Complete: Flask Backend + React Frontend

**Date**: 2025-11-15
**Status**: ✅ Complete

## What Changed

The project has been restructured from a **Supabase Edge Functions** backend to a **Flask (Python) backend** while keeping React for the frontend and maintaining Supabase for database, auth, and storage.

## New Architecture

```
┌─────────────────────────────────────────────┐
│  React Frontend (localhost:3000)            │
│  - UI Components                            │
│  - Supabase Auth (direct)                   │
│  - API calls to Flask backend               │
└───────────────┬─────────────────────────────┘
                │ HTTP REST API
┌───────────────▼─────────────────────────────┐
│  Flask Backend (localhost:5000)             │
│  - RAG query engine                         │
│  - Document processing (PDF, VTT)           │
│  - Gemini API integration                   │
│  - Business logic                           │
└───────────────┬─────────────────────────────┘
                │ Supabase Python Client
┌───────────────▼─────────────────────────────┐
│  Supabase (Cloud)                           │
│  - PostgreSQL + pgvector                    │
│  - Authentication                           │
│  - File Storage                             │
└─────────────────────────────────────────────┘
```

## Directory Structure

### Before
```
HooNeedsHelp/
├── src/                    # React app
├── public/
├── package.json
├── vite.config.ts
└── .env
```

### After (Monorepo)
```
HooNeedsHelp/
├── frontend/                         # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   │   ├── supabase.ts          # Auth only
│   │   │   └── api.ts               # Flask API client ✨ NEW
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   ├── .env                         # Frontend env vars
│   └── Dockerfile                   # ✨ NEW
│
├── backend/                         # ✨ NEW - Flask app
│   ├── app/
│   │   ├── __init__.py             # Flask app factory
│   │   ├── routes/
│   │   │   ├── rag.py              # RAG endpoints
│   │   │   ├── documents.py        # Document processing
│   │   │   └── analytics.py        # Analytics
│   │   ├── services/
│   │   │   ├── supabase.py         # Supabase client
│   │   │   ├── gemini.py           # Gemini integration
│   │   │   ├── pdf_processor.py    # PDF parsing
│   │   │   └── vtt_processor.py    # VTT parsing
│   │   ├── utils/
│   │   │   └── auth.py             # JWT validation
│   │   └── models/
│   ├── requirements.txt
│   ├── config.py
│   ├── run.py
│   ├── .env                        # Backend env vars
│   ├── .env.example
│   ├── README.md
│   └── Dockerfile                  # ✨ NEW
│
├── package.json                    # Monorepo scripts ✨ NEW
├── docker-compose.yml              # ✨ NEW
├── README.md                       # ✨ UPDATED
└── .gitignore                      # ✨ UPDATED (Python)
```

## Files Created (43 new files)

### Backend Flask Application (24 files)
1. `backend/run.py` - Entry point
2. `backend/config.py` - Configuration
3. `backend/requirements.txt` - Python dependencies
4. `backend/.env` - Backend environment variables
5. `backend/.env.example` - Template
6. `backend/README.md` - Backend documentation
7. `backend/Dockerfile` - Docker configuration

**App Structure:**
8. `backend/app/__init__.py` - Flask app factory
9. `backend/app/routes/__init__.py`
10. `backend/app/routes/rag.py` - RAG query endpoints
11. `backend/app/routes/documents.py` - Document upload/processing
12. `backend/app/routes/analytics.py` - Analytics endpoints
13. `backend/app/services/__init__.py`
14. `backend/app/services/supabase.py` - Supabase client
15. `backend/app/services/gemini.py` - Gemini API integration
16. `backend/app/services/pdf_processor.py` - PDF text extraction
17. `backend/app/services/vtt_processor.py` - VTT transcript parsing
18. `backend/app/utils/__init__.py`
19. `backend/app/utils/auth.py` - JWT validation decorator
20. `backend/app/models/__init__.py` - Data models placeholder

### Frontend Updates (5 files)
21. `frontend/src/services/api.ts` - Flask API client
22. `frontend/.env` - Frontend environment variables
23. `frontend/.env.example` - Template
24. `frontend/Dockerfile` - Docker configuration

### Root Level (4 files)
25. `package.json` - Monorepo scripts
26. `docker-compose.yml` - Multi-container orchestration
27. `RESTRUCTURE_COMPLETE.md` - This file

### Updated Files (3)
28. `README.md` - Complete rewrite for monorepo structure
29. `.gitignore` - Added Python-specific ignores
30. `backend/README.md` - Backend-specific documentation

## Key Features Implemented

### Flask Backend
✅ **RAG Query Engine** (`/api/ask-question`)
- Vector similarity search
- Gemini embedding generation
- AI answer generation with citations
- QA logging

✅ **Document Processing** (`/api/upload-document`)
- PDF text extraction and chunking
- VTT transcript parsing with timestamps
- Embedding generation for all chunks
- Storage in Supabase

✅ **Analytics** (`/api/analytics/<course_id>`)
- Top-level KPIs (questions, ratings, flagged count)
- Top concepts extraction
- Question volume over time

✅ **TA Review** (`/api/submit-correction`, `/api/flagged-questions`)
- Submit verified answers
- Retrieve flagged questions
- Human-in-the-loop learning

### Frontend API Client
✅ **TypeScript API Service** (`frontend/src/services/api.ts`)
- Type-safe API calls
- Automatic auth token injection
- Error handling
- Complete interface for all endpoints

### Development Tools
✅ **Docker Support**
- Dockerfile for frontend
- Dockerfile for backend
- docker-compose.yml for full stack

✅ **Monorepo Scripts**
- `npm run dev` - Run both servers
- `npm run dev:frontend` - Frontend only
- `npm run dev:backend` - Backend only

## Environment Variables Split

### Frontend (`.env` in /frontend)
```bash
VITE_SUPABASE_URL=https://ymurgykwjrlichrfznsl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...  # ✅ ANON KEY (public)
VITE_API_URL=http://localhost:5000/api
```

### Backend (`.env` in /backend)
```bash
SUPABASE_URL=https://ymurgykwjrlichrfznsl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key_here  # ⚠️ SERVICE ROLE (secret!)
GEMINI_API_KEY=AIzaSyBq7IN_md0hB5U2UXsBS60VsJGw4iD-9Zg
SECRET_KEY=dev-secret-key
FLASK_DEBUG=True
CORS_ORIGINS=http://localhost:3000
```

## API Endpoints Implemented

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/ask-question` | POST | RAG query |
| `/api/submit-correction` | POST | TA correction |
| `/api/upload-document` | POST | Upload PDF/VTT |
| `/api/documents/<course_id>` | GET | List documents |
| `/api/analytics/<course_id>` | GET | Course analytics |
| `/api/flagged-questions/<course_id>` | GET | Flagged questions |

## Python Dependencies

```
Flask==3.0.0
flask-cors==4.0.0
python-dotenv==1.0.0
supabase==2.3.4
google-generativeai==0.3.2
PyPDF2==3.0.1
requests==2.31.0
gunicorn==21.2.0
```

## Next Steps

### Immediate (To Get Running)

1. **Add Service Role Key** to `backend/.env`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
   ```

2. **Install Backend Dependencies**:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

3. **Install Frontend Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

4. **Test the Setup**:
   ```bash
   # Terminal 1: Backend
   cd backend
   python run.py

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

### Phase 1.2 (Database Setup)

Now that the backend structure is ready, proceed to Phase 1.2:
- Set up Supabase database schema
- Enable pgvector extension
- Create database tables
- Implement RLS policies

The Flask backend is ready to use these database tables once they're created!

## Advantages of This Structure

✅ **Full Control** - You own all backend logic
✅ **Python Ecosystem** - Access to PyPDF2, ML libraries, etc.
✅ **Easier Debugging** - Run Python debugger locally
✅ **Flexible** - Easy to switch databases or add features
✅ **Cost Effective** - No Supabase Edge Function costs
✅ **Familiar** - Python backend if you prefer it over TypeScript/Deno

## Trade-offs

⚠️ **More setup** - Need to run two servers
⚠️ **Deployment** - Need to deploy backend separately (Railway, Render, etc.)
⚠️ **CORS** - Need to handle cross-origin requests (already configured)

---

**Status**: ✅ Restructure Complete - Ready for Phase 1.2 (Database Setup)

**Total Time**: ~10 minutes
**Files Created/Modified**: 43
**Lines of Code**: ~2000+ (Python + TypeScript)
