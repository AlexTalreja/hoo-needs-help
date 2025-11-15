import { useState, useEffect } from 'react'
import CourseCreation from '../components/teacher/CourseCreation'
import FileUpload from '../components/teacher/FileUpload'
import Analytics from '../components/teacher/Analytics'
import ChatLogs from '../components/teacher/ChatLogs'
import { getCourses, Course } from '../services/api'

function TeacherDashboard() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'create' | 'upload' | 'analytics' | 'chatlogs'>('create')

  // Load courses on mount
  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const data = await getCourses()
      setCourses(data.courses)
    } catch (error) {
      console.error('Error loading courses:', error)
      setCourses([])
    }
  }

  const handleCourseCreated = (newCourse: Course) => {
    setCourses([...courses, newCourse])
    setSelectedCourseId(newCourse.id)
    setActiveTab('upload')
  }

  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage courses, upload materials, and view analytics</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Course Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Your Courses</h2>

              {courses.length === 0 ? (
                <p className="text-gray-500 text-sm">No courses yet. Create one to get started!</p>
              ) : (
                <div className="space-y-2">
                  {courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => setSelectedCourseId(course.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition ${
                        selectedCourseId === course.id
                          ? 'bg-purple-100 text-purple-700 font-medium'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {course.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('create')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                      activeTab === 'create'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Create Course
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    disabled={!selectedCourseId}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                      activeTab === 'upload'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } ${!selectedCourseId ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Upload Files
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    disabled={!selectedCourseId}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                      activeTab === 'analytics'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } ${!selectedCourseId ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Analytics
                  </button>
                  <button
                    onClick={() => setActiveTab('chatlogs')}
                    disabled={!selectedCourseId}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                      activeTab === 'chatlogs'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } ${!selectedCourseId ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Chat Logs
                  </button>
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow p-6">
              {activeTab === 'create' && (
                <CourseCreation onCourseCreated={handleCourseCreated} />
              )}

              {activeTab === 'upload' && selectedCourse && (
                <FileUpload courseId={selectedCourse.id} courseName={selectedCourse.name} />
              )}

              {activeTab === 'analytics' && selectedCourse && (
                <Analytics courseId={selectedCourse.id} courseName={selectedCourse.name} />
              )}

              {activeTab === 'chatlogs' && selectedCourse && (
                <ChatLogs courseId={selectedCourse.id} courseName={selectedCourse.name} />
              )}

              {!selectedCourseId && activeTab !== 'create' && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Please select a course from the sidebar or create a new one.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard
