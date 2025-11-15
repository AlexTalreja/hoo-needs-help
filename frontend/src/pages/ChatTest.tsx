import { useState, useEffect, useRef } from 'react'
import { askQuestion, AskQuestionResponse, Citation } from '../services/api'
import { supabase } from '../services/supabase'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  timestamp: Date
}

export default function ChatTest() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const courseId = '11111111-1111-1111-1111-111111111111' // Test course ID

  useEffect(() => {
    checkAuth()
    // Add welcome message
    setMessages([
      {
        id: '0',
        type: 'assistant',
        content:
          'Hello! I\'m your AI teaching assistant. Ask me anything about your course materials!',
        timestamp: new Date(),
      },
    ])
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkAuth = async () => {
    const { data } = await supabase.auth.getSession()
    setIsAuthenticated(!!data.session)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response: AskQuestionResponse = await askQuestion({
        question: input,
        course_id: courseId,
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.answer,
        citations: response.citations,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const formatCitation = (citation: Citation, index: number) => {
    if (citation.type === 'pdf' && citation.page) {
      return (
        <span
          key={index}
          className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-1 mb-1"
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
          className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs mr-1 mb-1"
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please log in to use the chat.</p>
          <a
            href="/test"
            className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Teaching Assistant</h1>
        <p className="text-sm text-gray-600">CS 101: Introduction to Computer Science</p>
      </div>

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
                  ? 'bg-blue-500 text-white'
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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
  )
}
