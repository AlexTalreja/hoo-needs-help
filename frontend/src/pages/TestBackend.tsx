import { useState } from 'react'
import { supabase } from '../services/supabase'
import { askQuestion, getAnalytics, getFlaggedQuestions } from '../services/api'

export default function TestBackend() {
  const [status, setStatus] = useState<string>('')
  const [result, setResult] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check auth status
  const checkAuth = async () => {
    const { data } = await supabase.auth.getSession()
    setIsAuthenticated(!!data.session)
    setStatus(data.session ? '✅ Authenticated' : '❌ Not authenticated')
  }

  // Test: Ask a question
  const testAskQuestion = async () => {
    try {
      setStatus('Asking question...')
      const response = await askQuestion({
        question: 'What is recursion?',
        course_id: '11111111-1111-1111-1111-111111111111',
      })
      setResult(response)
      setStatus('✅ Question answered!')
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`)
      setResult(error)
    }
  }

  // Test: Get analytics
  const testAnalytics = async () => {
    try {
      setStatus('Fetching analytics...')
      const response = await getAnalytics(
        '11111111-1111-1111-1111-111111111111'
      )
      setResult(response)
      setStatus('✅ Analytics fetched!')
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`)
      setResult(error)
    }
  }

  // Test: Get flagged questions
  const testFlaggedQuestions = async () => {
    try {
      setStatus('Fetching flagged questions...')
      const response = await getFlaggedQuestions(
        '11111111-1111-1111-1111-111111111111'
      )
      setResult(response)
      setStatus('✅ Flagged questions fetched!')
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`)
      setResult(error)
    }
  }

  // Quick login for testing
  const quickLogin = async () => {
    try {
      setStatus('Logging in...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'instructor@test.com',
        password: 'password',
      })

      if (error) throw error

      setIsAuthenticated(true)
      setStatus('✅ Logged in successfully!')
      setResult(data)
    } catch (error: any) {
      setStatus(`❌ Login failed: ${error.message}`)
      setResult(error)
    }
  }

  // Test health endpoint
  const testHealth = async () => {
    try {
      setStatus('Testing health endpoint...')
      const response = await fetch('http://localhost:5000/health')
      const data = await response.json()
      setResult(data)
      setStatus('✅ Backend is healthy!')
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`)
      setResult(error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Backend Testing Dashboard
        </h1>

        {/* Auth Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={checkAuth}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Check Auth Status
            </button>
            <button
              onClick={quickLogin}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Quick Login (Test User)
            </button>
          </div>
          <p className="text-sm">
            {isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}
          </p>
        </div>

        {/* Test Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Backend Tests</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={testHealth}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Test Health Endpoint
            </button>
            <button
              onClick={testAskQuestion}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              disabled={!isAuthenticated}
            >
              Test Ask Question
            </button>
            <button
              onClick={testAnalytics}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              disabled={!isAuthenticated}
            >
              Test Analytics
            </button>
            <button
              onClick={testFlaggedQuestions}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              disabled={!isAuthenticated}
            >
              Test Flagged Questions
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Note: Most endpoints require authentication. Login first!
          </p>
        </div>

        {/* Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <p className="font-mono text-sm">{status || 'Ready to test...'}</p>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
            {result ? JSON.stringify(result, null, 2) : 'No results yet...'}
          </pre>
        </div>
      </div>
    </div>
  )
}
