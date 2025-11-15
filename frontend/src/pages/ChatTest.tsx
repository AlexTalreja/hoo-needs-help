import { useState, useEffect, useRef } from 'react'
import { askQuestion, AskQuestionResponse, Citation } from '../services/api'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import ChatHistory from '../components/ChatHistory'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  confidence_score?: number
  timestamp: Date
}

interface EnrolledCourse {
  id: string
  name: string
}

export default function ChatTest() {
  const { user, userRole } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [historyRefresh, setHistoryRefresh] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Redirect instructors to teacher dashboard
  useEffect(() => {
    if (userRole === 'instructor') {
      window.location.href = '/teacher'
    }
  }, [userRole])

  useEffect(() => {
    loadEnrolledCourses()
  }, [user])

  useEffect(() => {
    if (selectedCourseId && user) {
      // Create new session when course changes
      createNewSession()
    }
  }, [selectedCourseId])

  const loadEnrolledCourses = async () => {
    if (!user) return

    setLoadingCourses(true)
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          course_id,
          courses (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (error) throw error

      const courses = data?.map(e => ({
        id: e.courses.id,
        name: e.courses.name,
      })) || []

      setEnrolledCourses(courses as any)

      // Auto-select first course if available
      if (courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(courses[0].id)
      }
    } catch (error) {
      console.error('Error loading enrolled courses:', error)
    } finally {
      setLoadingCourses(false)
    }
  }

  const createNewSession = async () => {
    if (!user || !selectedCourseId) return

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          course_id: selectedCourseId,
          title: 'New Chat',
        })
        .select()
        .single()

      if (error) throw error

      const welcomeMessage = 'Hello! I\'m your AI teaching assistant. Ask me anything about your course materials!'

      setCurrentSessionId(data.id)
      setMessages([
        {
          id: '0',
          type: 'assistant',
          content: welcomeMessage,
          timestamp: new Date(),
        },
      ])

      // Save welcome message to database
      await supabase
        .from('chat_messages')
        .insert({
          session_id: data.id,
          role: 'assistant',
          content: welcomeMessage,
          citations: null,
        })

      // Trigger history refresh
      setHistoryRefresh(prev => prev + 1)
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  const loadSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const loadedMessages: Message[] = data.map(msg => ({
        id: msg.id,
        type: msg.role as 'user' | 'assistant',
        content: msg.content,
        citations: msg.citations,
        timestamp: new Date(msg.created_at),
      }))

      setMessages(loadedMessages)
      setCurrentSessionId(sessionId)
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  const saveMessage = async (role: 'user' | 'assistant', content: string, citations?: Citation[]) => {
    if (!currentSessionId) return

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSessionId,
          role,
          content,
          citations: citations || null,
        })
        .select()
        .single()

      if (error) throw error

      // Update session title based on first user message
      if (role === 'user' && messages.length <= 1) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
        await supabase
          .from('chat_sessions')
          .update({ title })
          .eq('id', currentSessionId)
      }

      return data.id
    } catch (error) {
      console.error('Error saving message:', error)
      return null
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !currentSessionId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = input
    setInput('')
    setLoading(true)

    // Save user message
    await saveMessage('user', userInput)

    try {
      const response: AskQuestionResponse = await askQuestion({
        question: userInput,
        course_id: selectedCourseId,
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.answer,
        citations: response.citations,
        confidence_score: response.confidence_score,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      // Save assistant message
      await saveMessage('assistant', response.answer, response.citations)

      // Trigger history refresh to update timestamp
      setHistoryRefresh(prev => prev + 1)
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])

      // Save error message
      await saveMessage('assistant', errorMessage.content)
    } finally {
      setLoading(false)
    }
  }

  const formatCitation = (citation: Citation, index: number) => {
    if (citation.type === 'pdf' && citation.page) {
      return (
        <span
          key={index}
          className="inline-block bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs mr-1 mb-1"
        >
          📄 {citation.file_name} (p. {citation.page})
        </span>
      )
    } else if (citation.type === 'vtt' && citation.timestamp) {
      const minutes = Math.floor(citation.timestamp / 60)
      const seconds = Math.floor(citation.timestamp % 60)
      return (
        <span
          key={index}
          className="inline-block bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs mr-1 mb-1"
        >
          🎥 {citation.file_name} ({minutes}:{seconds.toString().padStart(2, '0')})
        </span>
      )
    } else if (citation.type === 'verified') {
      return (
        <span
          key={index}
          className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-1 mb-1"
        >
          ✓ TA-Verified Answer
        </span>
      )
    }
    return null
  }

  // Show enrollment prompt if no courses
  if (!loadingCourses && enrolledCourses.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Courses Enrolled</h2>
            <p className="text-gray-600 mb-6">
              You need to enroll in a course before you can start chatting with the AI assistant.
            </p>
            <a
              href="/courses"
              className="inline-block px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition"
            >
              Browse Courses
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Course Selector */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Course:</label>
          {loadingCourses ? (
            <div className="text-sm text-gray-500">Loading courses...</div>
          ) : (
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {enrolledCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat History Sidebar */}
        <ChatHistory
          selectedCourseId={selectedCourseId}
          currentSessionId={currentSessionId}
          onSelectSession={loadSession}
          onNewChat={createNewSession}
          refreshTrigger={historyRefresh}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-lg px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Citations */}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2 font-medium">
                    Sources:
                  </p>
                  <div className="flex flex-wrap">
                    {message.citations.map((citation, idx) =>
                      formatCitation(citation, idx)
                    )}
                  </div>
                </div>
              )}

              {/* Confidence Score */}
              {message.type === 'assistant' && message.confidence_score !== undefined && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 font-medium">
                      Confidence:
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            message.confidence_score >= 0.8
                              ? 'bg-green-500'
                              : message.confidence_score >= 0.5
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${message.confidence_score * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${
                        message.confidence_score >= 0.8
                          ? 'text-green-700'
                          : message.confidence_score >= 0.5
                          ? 'text-yellow-700'
                          : 'text-red-700'
                      }`}>
                        {(message.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {message.confidence_score < 0.5 && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Low confidence - answer may not be fully accurate
                    </p>
                  )}
                </div>
              )}

                  <p className="text-xs text-gray-400 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse flex space-x-2">
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                    </div>
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask a question about your course..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={loading || !currentSessionId}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || !currentSessionId}
                  className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Send
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tip: Upload course documents first for better answers!
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
