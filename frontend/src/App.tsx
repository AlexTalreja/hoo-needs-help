import { BrowserRouter as Router } from 'react-router-dom'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            HooNeedsHelp
          </h1>
          <p className="text-lg text-gray-600">
            AI-Powered Teaching Assistant Platform
          </p>
          <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
            <p className="text-gray-700">
              Development environment is ready! 🎉
            </p>
          </div>
        </div>
      </div>
    </Router>
  )
}

export default App
