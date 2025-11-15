import { useState, useEffect } from 'react'
import { getStudentsWithQuestions, getStudentChatLogs, ChatLog, Student } from '../../services/api'

interface ChatLogsProps {
  courseId: string
  courseName: string
}

function ChatLogs({ courseId, courseName }: ChatLogsProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  useEffect(() => {
    loadStudents()
    // Clear selected student when course changes
    setSelectedStudentId(null)
    setChatLogs([])
  }, [courseId])

  useEffect(() => {
    if (selectedStudentId) {
      loadChatLogs(selectedStudentId)
    } else {
      setChatLogs([])
    }
  }, [selectedStudentId, courseId])

  const loadStudents = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getStudentsWithQuestions(courseId)
      setStudents(data.students || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students')
      setStudents([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadChatLogs = async (studentId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getStudentChatLogs(courseId, studentId)
      setChatLogs(data.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat logs')
      setChatLogs([])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpandLog = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Chat Logs</h2>
      <p className="text-gray-600 mb-6">Course: <span className="font-semibold">{courseName}</span></p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Student List */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Students</h3>

            {isLoading && !selectedStudentId ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : students.length === 0 ? (
              <p className="text-gray-500 text-sm">No students have asked questions yet.</p>
            ) : (
              <div className="space-y-2">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      selectedStudentId === student.id
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="text-sm font-medium truncate">{student.email}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {student.questionCount} question{student.questionCount !== 1 ? 's' : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Logs */}
        <div className="lg:col-span-3">
          {!selectedStudentId ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <p className="text-gray-500">Select a student to view their chat history</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading chat logs...</p>
                </div>
              ) : error ? (
                <div className="p-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                  </div>
                </div>
              ) : chatLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No chat history for this student.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {chatLogs.map((log) => (
                    <div key={log.id} className="p-6">
                      {/* Question Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-gray-500">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                            {log.status === 'flagged' && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                                Flagged
                              </span>
                            )}
                            {log.rating === 1 && (
                              <span className="text-green-600">👍</span>
                            )}
                            {log.rating === -1 && (
                              <span className="text-red-600">👎</span>
                            )}
                          </div>
                          <p className="text-gray-900 font-medium">{log.question}</p>
                        </div>
                        <button
                          onClick={() => toggleExpandLog(log.id)}
                          className="ml-4 text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                          {expandedLogId === log.id ? 'Hide' : 'Show'} Answer
                        </button>
                      </div>

                      {/* Answer (Expandable) */}
                      {expandedLogId === log.id && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.ai_answer}</p>

                          {log.sources_cited && log.sources_cited.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-500 mb-2">Sources:</p>
                              <div className="flex flex-wrap gap-2">
                                {log.sources_cited.map((source: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                  >
                                    {source.file_name || source.type}
                                    {source.page && ` (p. ${source.page})`}
                                    {source.timestamp && ` (${Math.floor(source.timestamp / 60)}:${String(Math.floor(source.timestamp % 60)).padStart(2, '0')})`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">About Chat Logs</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>View all questions asked by each student in your course</li>
          <li>See which questions were flagged (👎) by students</li>
          <li>Review AI-generated answers and sources cited</li>
          <li>Identify knowledge gaps and areas where students need more help</li>
        </ul>
      </div>
    </div>
  )
}

export default ChatLogs
