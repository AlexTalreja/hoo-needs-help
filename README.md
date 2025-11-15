# HooNeedsHelp

An AI-powered teaching assistant platform that helps students get instant answers grounded in their course materials (PDFs, video transcripts, syllabus) with clickable citations to specific pages and video timestamps.

**Claude for Good Hackathon 2025**

## Features

- **AI-Powered Q&A**: Students get instant answers grounded in course materials
- **Rich Citations**: Clickable links to PDF pages and video timestamps
- **Human-in-the-Loop**: TAs can correct AI answers to improve the system
- **Analytics Dashboard**: Instructors see which concepts students struggle with
- **Video Timestamp Seeking**: Click a timestamp citation to jump to that exact moment

## Tech Stack

### Frontend
- **React** + **Vite** + **TypeScript** + **Tailwind CSS**
- Communicates with Flask backend via REST API

### Backend
- **Flask** (Python) - RESTful API server
- **Google Gemini** - text-embedding-004 (embeddings) + gemini-2.0-flash-exp (chat)
- **PyPDF2** - PDF text extraction
- **VTT Parser** - Video transcript processing

### Infrastructure
- **Supabase** - PostgreSQL database (with pgvector), Auth, Storage
- **Docker** - Containerized development environment

## Project Structure (Monorepo)

```
HooNeedsHelp/
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── pages/              # Page-level components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/
│   │   │   ├── supabase.ts    # Supabase client (Auth only)
│   │   │   └── api.ts         # Flask API client
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # Helper functions
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Flask application
│   ├── app/
│   │   ├── routes/             # API endpoints
│   │   ├── services/           # Business logic
│   │   ├── utils/              # Helper functions
│   │   └── models/             # Data models
│   ├── requirements.txt
│   ├── run.py
│   └── config.py
│
├── docker-compose.yml          # Run both services with Docker
├── package.json                # Monorepo scripts
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Supabase account** (free tier works)
- **Google Gemini API key** (free tier available)

### Option 1: Manual Setup (Recommended for Development)

#### 1. Clone the repository
```bash
git clone <repository-url>
cd HooNeedsHelp
```

#### 2. Set up the Backend (Flask)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your credentials:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY (not anon key!)
# - GEMINI_API_KEY
# - SECRET_KEY

# Run the backend server
python run.py
# Server runs on http://localhost:5000
```

#### 3. Set up the Frontend (React)

```bash
# Open a NEW terminal
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and add:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY (not service role key!)
# - VITE_API_URL=http://localhost:5000/api

# Run the frontend development server
npm run dev
# Server runs on http://localhost:3000
```

#### 4. Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Docker Setup (All-in-One)

```bash
# Build and run both frontend and backend
docker-compose up

# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

## Available Scripts

### Monorepo Scripts (from root)

```bash
npm run dev                 # Run both frontend and backend concurrently
npm run dev:frontend        # Run frontend only
npm run dev:backend         # Run backend only
npm run install:all         # Install all dependencies
npm run build:frontend      # Build frontend for production
```

### Frontend Scripts (from /frontend)

```bash
npm run dev                 # Start Vite dev server
npm run build               # Build for production
npm run lint                # Run ESLint
npm run format              # Format code with Prettier
```

### Backend Scripts (from /backend)

```bash
python run.py               # Run Flask dev server
pytest                      # Run tests (when implemented)
```

## Environment Variables

### Frontend (.env in /frontend)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=http://localhost:5000/api
```

### Backend (.env in /backend)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=random-secret-key
FLASK_DEBUG=True
CORS_ORIGINS=http://localhost:3000
```

**⚠️ Security Note**: Never commit `.env` files or expose service role keys!

## Development Workflow

1. **Backend** runs on port 5000, handles:
   - RAG queries (vector search + Gemini)
   - Document processing (PDF, VTT)
   - Analytics calculations

2. **Frontend** runs on port 3000, handles:
   - User interface
   - Auth (Supabase Auth directly)
   - API calls to Flask backend

3. **Supabase** (cloud):
   - Database (Postgres + pgvector)
   - Authentication
   - File storage

## Development Roadmap

See [ROADMAP.md](ROADMAP.md) for the detailed implementation plan.

**Current Status**: Phase 1.1 (Project Setup) - ✅ Complete (Restructured for Flask)

## Documentation

- [Project Plan](project-plan.md) - Full feature breakdown and architecture
- [Claude AI Guidelines](claude.md) - Guidelines for working with Claude on this project
- [Implementation Roadmap](ROADMAP.md) - Detailed development roadmap

## Contributing

This is a hackathon project for Claude for Good 2025. Follow the guidelines in [claude.md](claude.md) when working on features.

## License

MIT
