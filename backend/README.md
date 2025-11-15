# HooNeedsHelp Backend (Flask)

Python Flask backend for the HooNeedsHelp AI teaching assistant platform.

## Features

- **RAG Query Engine**: Vector similarity search + Gemini AI
- **Document Processing**: PDF and VTT transcript parsing with embedding generation
- **Analytics**: Course analytics and TA review queue
- **Supabase Integration**: Database, auth, and storage
- **RESTful API**: JSON API for frontend communication

## Tech Stack

- **Flask**: Web framework
- **Supabase**: Database, auth, and storage
- **Google Gemini**: Embeddings (text-embedding-004) and chat (gemini-2.0-flash-exp)
- **PyPDF2**: PDF text extraction
- **python-dotenv**: Environment configuration

## Project Structure

```
backend/
├── app/
│   ├── __init__.py           # Flask app factory
│   ├── routes/               # API endpoints
│   │   ├── rag.py           # RAG query, submit corrections
│   │   ├── documents.py     # Document upload and processing
│   │   └── analytics.py     # Analytics and flagged questions
│   ├── services/            # Business logic
│   │   ├── supabase.py      # Supabase client
│   │   ├── gemini.py        # Gemini API integration
│   │   ├── pdf_processor.py # PDF parsing and chunking
│   │   └── vtt_processor.py # VTT transcript parsing
│   ├── utils/               # Helper functions
│   │   └── auth.py          # JWT validation decorator
│   └── models/              # Data models (future)
├── config.py                # Configuration
├── run.py                   # Entry point
├── requirements.txt         # Python dependencies
└── .env                     # Environment variables
```

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (**not anon key**)
- `GEMINI_API_KEY`: Google Gemini API key
- `SECRET_KEY`: Flask secret key (generate a random string)

### 4. Run the Server

```bash
python run.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### RAG Endpoints

#### `POST /api/ask-question`
Ask a question and get AI-generated answer with citations.

**Request:**
```json
{
  "question": "What is recursion?",
  "course_id": "uuid"
}
```

**Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
{
  "answer": "Recursion is...",
  "citations": [
    {"type": "pdf", "file_name": "lecture1.pdf", "page": 3},
    {"type": "vtt", "file_name": "lecture1.vtt", "timestamp": 120.5}
  ],
  "sources_used": 5
}
```

#### `POST /api/submit-correction`
Submit a TA-verified answer correction.

**Request:**
```json
{
  "qa_log_id": "uuid",
  "verified_answer": "Corrected answer text",
  "course_id": "uuid"
}
```

### Document Endpoints

#### `POST /api/upload-document`
Upload and process a course document.

**Form Data:**
- `file`: File (PDF, VTT, or video)
- `course_id`: UUID
- `document_type`: "pdf", "vtt", or "video"

**Response:**
```json
{
  "message": "Document uploaded successfully",
  "document_id": "uuid"
}
```

#### `GET /api/documents/<course_id>`
Get all documents for a course.

### Analytics Endpoints

#### `GET /api/analytics/<course_id>`
Get course analytics.

**Response:**
```json
{
  "total_questions": 150,
  "avg_rating": 4.2,
  "flagged_count": 5,
  "top_concepts": [
    {"concept": "recursion", "count": 20},
    {"concept": "pointers", "count": 15}
  ],
  "question_volume": [
    {"date": "2025-01-10", "count": 25},
    {"date": "2025-01-11", "count": 30}
  ]
}
```

#### `GET /api/flagged-questions/<course_id>`
Get all flagged questions for TA review.

### Health Check

#### `GET /health`
Check if the server is running.

**Response:**
```json
{
  "status": "healthy",
  "service": "HooNeedsHelp Backend"
}
```

## Development

### Running Tests
```bash
# TODO: Add pytest tests
pytest
```

### Code Formatting
```bash
black app/
```

### Linting
```bash
flake8 app/
```

## Deployment

### Production Server (Gunicorn)

```bash
gunicorn -w 4 -b 0.0.0.0:5000 run:app
```

### Deployment Platforms

- **Railway**: Easy Python deployment with auto-scaling
- **Render**: Free tier available, auto-deploys from Git
- **Fly.io**: Serverless Python hosting
- **Heroku**: Classic PaaS (paid only)

## Environment Variables in Production

Make sure to set these in your deployment platform:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (**keep secret!**)
- `GEMINI_API_KEY` (**keep secret!**)
- `SECRET_KEY` (generate strong random key)
- `CORS_ORIGINS` (set to your production frontend URL)
- `FLASK_DEBUG=False`

## Security Notes

- **Never commit `.env` file** - it contains sensitive keys
- **Service role key** has full database access - keep it secret
- **Use HTTPS** in production
- **Validate all inputs** before processing
- **Rate limiting** should be added for production

## TODO

- [ ] Add request/response validation with Pydantic
- [ ] Add comprehensive error handling
- [ ] Add rate limiting middleware
- [ ] Add logging to file
- [ ] Add unit tests with pytest
- [ ] Add integration tests
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Optimize vector search queries
- [ ] Add caching layer (Redis)
