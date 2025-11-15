// User types
export type UserRole = 'student' | 'ta' | 'instructor'

export interface User {
  id: string
  email: string
  role: UserRole
  created_at?: string
}

// Course types
export interface Course {
  id: string
  name: string
  instructor_id: string
  system_prompt: string
  created_at?: string
}

// Document types
export type DocumentType = 'pdf' | 'vtt' | 'video'

export interface CourseDocument {
  id: string
  course_id: string
  file_name: string
  storage_path: string
  type: DocumentType
  created_at?: string
}

// Document chunk types
export interface DocumentChunk {
  id: string
  document_id: string
  content: string
  metadata: Record<string, unknown>
  embedding?: number[]
  created_at?: string
}

// TA verified answer types
export interface TAVerifiedAnswer {
  id: string
  course_id: string
  question: string
  answer: string
  embedding?: number[]
  created_at?: string
}

// QA log types
export type QAStatus = 'answered' | 'flagged' | 'reviewed'

export interface QALog {
  id: string
  course_id: string
  question: string
  ai_answer: string
  sources_cited: SourceCitation[]
  rating?: number
  status: QAStatus
  created_at?: string
}

// Citation types
export interface SourceCitation {
  doc_id?: string
  file_name?: string
  page?: number
  video_id?: string
  timestamp?: number
  type: 'pdf' | 'video' | 'verified'
}

// Chat message types
export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: SourceCitation[]
}
