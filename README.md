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

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth, Postgres, pgvector, Storage, Edge Functions)
- **AI**: Google Gemini (text-embedding-004 + gemini-2.5-flash)
- **Video**: HTML5 video player with timestamp seeking

## Project Structure

```
/src
  /components     # Reusable UI components
  /pages          # Page-level components (Student, TA, Admin)
  /hooks          # Custom React hooks
  /utils          # Helper functions
  /services       # API calls and Supabase clients
  /types          # TypeScript type definitions
/supabase
  /functions      # Edge Functions for backend logic (future)
  /migrations     # Database schema migrations (future)
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)
- A Google Gemini API key (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HooNeedsHelp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

   Update the following in `.env`:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `GEMINI_API_KEY`: Your Google Gemini API key

4. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Development Roadmap

See [ROADMAP.md](ROADMAP.md) for the detailed implementation plan.

**Current Status**: Phase 1.1 (Project Setup) - ✅ Complete

## Documentation

- [Project Plan](project-plan.md) - Full feature breakdown and architecture
- [Claude AI Guidelines](claude.md) - Guidelines for working with Claude on this project
- [Implementation Roadmap](ROADMAP.md) - Detailed development roadmap

## Contributing

This is a hackathon project for Claude for Good 2025. Follow the guidelines in [claude.md](claude.md) when working on features.

## License

MIT
