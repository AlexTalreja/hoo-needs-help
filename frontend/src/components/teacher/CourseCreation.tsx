import { useState } from 'react'
import { createCourse, Course } from '../../services/api'

interface CourseCreationProps {
  onCourseCreated: (course: Course) => void
}

function CourseCreation({ onCourseCreated }: CourseCreationProps) {
  const [courseName, setCourseName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      const data = await createCourse(courseName)
      setSuccess(true)
      setCourseName('')
      onCourseCreated(data.course)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Course</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course Name */}
        <div>
          <label htmlFor="courseName" className="block text-sm font-medium text-gray-700 mb-2">
            Course Name *
          </label>
          <input
            type="text"
            id="courseName"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="e.g., CS 101: Introduction to Programming"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">Course created successfully!</p>
          </div>
        )}

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading || !courseName.trim()}
            className="w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Creating Course...' : 'Create Course'}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Your course will be created and added to the sidebar</li>
          <li>Upload course materials (PDFs, transcripts) in the "Upload Files" tab</li>
          <li>Students can start asking questions once materials are uploaded</li>
          <li>View analytics and chat logs to monitor student engagement</li>
        </ol>
      </div>
    </div>
  )
}

export default CourseCreation
