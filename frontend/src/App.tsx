import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import TestBackend from './pages/TestBackend'
import DocumentManagement from './pages/DocumentManagement'
import ChatTest from './pages/ChatTest'

function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          HooNeedsHelp
        </h1>
        <p className="text-lg text-gray-600">
          AI-Powered Teaching Assistant Platform
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">💬 Chat</h3>
            <p className="text-gray-600 mb-4">
              Ask questions and get AI-powered answers
            </p>
            <Link
              to="/chat"
              className="inline-block px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
            >
              Start Chatting →
            </Link>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">📁 Documents</h3>
            <p className="text-gray-600 mb-4">
              Upload PDFs and transcripts for the AI
            </p>
            <Link
              to="/documents"
              className="inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Manage Documents →
            </Link>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">🧪 Test</h3>
            <p className="text-gray-600 mb-4">
              Test API endpoints and authentication
            </p>
            <Link
              to="/test"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Test Backend →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<TestBackend />} />
        <Route path="/documents" element={<DocumentManagement />} />
        <Route path="/chat" element={<ChatTest />} />
      </Routes>
    </Router>
  )
}

export default App
