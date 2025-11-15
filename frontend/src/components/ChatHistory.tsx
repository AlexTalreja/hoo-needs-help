import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ChatSession {
  id: string
  title: string
  course_id: string
  created_at: string
  updated_at: string
}

interface ChatHistoryProps {
  selectedCourseId: string
  currentSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewChat: () => void
  refreshTrigger?: number  // Optional trigger to force refresh
}

export default function ChatHistory({
  selectedCourseId,
  currentSessionId,
  onSelectSession,
  onNewChat,
  refreshTrigger,
}: ChatHistoryProps) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (selectedCourseId && user) {
      loadSessions()
    }
  }, [selectedCourseId, user, currentSessionId, refreshTrigger]) // Add refreshTrigger to dependencies

  const loadSessions = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', selectedCourseId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      setSessions(data || [])
    } catch (error) {
      console.error('Error loading chat sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Delete this chat? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      // If deleting current session, create new chat
      if (sessionId === currentSessionId) {
        onNewChat()
      }

      loadSessions()
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
      isOpen ? 'w-72' : 'w-0'
    }`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute left-0 top-20 z-10 bg-white border border-gray-200 rounded-r-lg p-2 hover:bg-gray-50 transition"
        style={{ marginLeft: isOpen ? '288px' : '0' }}
      >
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform ${isOpen ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={onNewChat}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Loading history...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No chat history yet
              </div>
            ) : (
              <div className="p-2">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`group p-3 rounded-lg cursor-pointer mb-2 transition ${
                      session.id === currentSessionId
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          session.id === currentSessionId ? 'text-emerald-900' : 'text-gray-900'
                        }`}>
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(session.updated_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-red-600 hover:bg-red-50 rounded transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
