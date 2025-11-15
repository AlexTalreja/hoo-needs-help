/**
 * API service for communicating with Flask backend.
 */
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * Get authorization token from Supabase session.
 */
async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token || null
}

/**
 * Make authenticated API request to Flask backend.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Request failed',
    }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// ==================== RAG API ====================

export interface AskQuestionRequest {
  question: string
  course_id: string
}

export interface Citation {
  type: 'pdf' | 'vtt' | 'verified'
  file_name?: string
  page?: number
  timestamp?: number
  question?: string
  doc_id?: string
}

export interface AskQuestionResponse {
  answer: string
  citations: Citation[]
  sources_used: number
  confidence_score: number
}

/**
 * Ask a question and get AI-generated answer.
 */
export async function askQuestion(
  data: AskQuestionRequest
): Promise<AskQuestionResponse> {
  return apiRequest<AskQuestionResponse>('/ask-question', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export interface SubmitCorrectionRequest {
  qa_log_id: string
  verified_answer: string
  course_id: string
}

/**
 * Submit a TA correction for an AI answer.
 */
export async function submitCorrection(
  data: SubmitCorrectionRequest
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/submit-correction', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ==================== Document API ====================

/**
 * Upload a course document (PDF, VTT, or video).
 */
export async function uploadDocument(
  file: File,
  courseId: string,
  documentType: 'pdf' | 'vtt' | 'video'
): Promise<{ message: string; document_id: string }> {
  const token = await getAuthToken()

  const formData = new FormData()
  formData.append('file', file)
  formData.append('course_id', courseId)
  formData.append('document_type', documentType)

  const headers: HeadersInit = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}/upload-document`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export interface CourseDocument {
  id: string
  course_id: string
  file_name: string
  storage_path: string
  type: 'pdf' | 'vtt' | 'video'
  processing_status?: string
  created_at?: string
}

/**
 * Get all documents for a course.
 */
export async function getDocuments(
  courseId: string
): Promise<{ documents: CourseDocument[] }> {
  return apiRequest<{ documents: CourseDocument[] }>(`/documents/${courseId}`)
}

// ==================== Analytics API ====================

export interface AnalyticsData {
  total_questions: number
  avg_rating: number
  flagged_count: number
  top_concepts: string[]  // Array of topic strings
  question_volume: Array<{ date: string; count: number }>
}

/**
 * Get analytics for a course.
 */
export async function getAnalytics(courseId: string, timeRange: string = '7'): Promise<AnalyticsData> {
  return apiRequest<AnalyticsData>(`/analytics/${courseId}?time_range=${timeRange}`)
}

export interface FlaggedQuestion {
  id: string
  course_id: string
  question: string
  ai_answer: string
  sources_cited: Citation[]
  rating?: number
  status: string
  created_at?: string
}

/**
 * Get flagged questions for TA review.
 */
export async function getFlaggedQuestions(
  courseId: string
): Promise<{ flagged_questions: FlaggedQuestion[] }> {
  return apiRequest<{ flagged_questions: FlaggedQuestion[] }>(
    `/flagged-questions/${courseId}`
  )
}

// ==================== Courses API ====================

export interface Course {
  id: string
  name: string
  instructor_id: string
  system_prompt?: string
  created_at?: string
  updated_at?: string
}

/**
 * Create a new course.
 */
export async function createCourse(
  name: string
): Promise<{ message: string; course: Course }> {
  return apiRequest<{ message: string; course: Course }>('/courses', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

/**
 * Get all courses for the current user.
 */
export async function getCourses(): Promise<{ courses: Course[] }> {
  return apiRequest<{ courses: Course[] }>('/courses')
}

/**
 * Get a specific course by ID.
 */
export async function getCourse(courseId: string): Promise<{ course: Course }> {
  return apiRequest<{ course: Course }>(`/courses/${courseId}`)
}

// ==================== Chat Logs API ====================

export interface ChatLog {
  id: string
  user_id: string
  user_email?: string
  question: string
  ai_answer: string
  rating?: number
  status: string
  created_at: string
  sources_cited?: any[]
}

export interface Student {
  id: string
  email: string
  questionCount: number
}

/**
 * Get all students who have asked questions in a course.
 */
export async function getStudentsWithQuestions(
  courseId: string
): Promise<{ students: Student[] }> {
  return apiRequest<{ students: Student[] }>(`/chat-logs/students/${courseId}`)
}

/**
 * Get all chat logs for a specific student in a course.
 */
export async function getStudentChatLogs(
  courseId: string,
  studentId: string
): Promise<{ logs: ChatLog[] }> {
  return apiRequest<{ logs: ChatLog[] }>(`/chat-logs/${courseId}/${studentId}`)
}

// ==================== Health Check ====================

/**
 * Check if backend is healthy.
 */
export async function healthCheck(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${API_URL.replace('/api', '')}/health`)
  return response.json()
}
