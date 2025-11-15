import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'

interface Course {
  id: string
  name: string
  instructor_id: string
  is_public: boolean
  enrollment_code?: string
  created_at: string
  instructor?: {
    full_name: string
    email: string
  }
  is_enrolled?: boolean
}

export default function Courses() {
  const { user } = useAuth()
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollmentCode, setEnrollmentCode] = useState('')
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  useEffect(() => {
    loadCourses()
  }, [user])

  const loadCourses = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get enrolled courses
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select(`
          course_id,
          courses (
            id,
            name,
            created_at,
            is_public,
            instructor_id,
            users (
              full_name,
              email
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (enrollError) throw enrollError

      const enrolled = enrollments?.map(e => ({
        ...e.courses,
        instructor: e.courses.users,
        is_enrolled: true,
      })) || []

      setEnrolledCourses(enrolled as any)

      // Get all public courses
      const { data: allCourses, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          created_at,
          is_public,
          instructor_id,
          users (
            full_name,
            email
          )
        `)
        .eq('is_public', true)

      if (coursesError) throw coursesError

      // Filter out already enrolled courses
      const enrolledIds = new Set(enrolled.map(c => c.id))
      const available = allCourses
        ?.filter(c => !enrolledIds.has(c.id))
        .map(c => ({
          ...c,
          instructor: c.users,
          is_enrolled: false,
        })) || []

      setAvailableCourses(available as any)
    } catch (error: any) {
      console.error('Error loading courses:', error)
      setMessage({ type: 'error', text: 'Failed to load courses' })
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (course: Course) => {
    if (!user) return

    // If course requires enrollment code, show modal
    if (course.enrollment_code && !course.is_public) {
      setSelectedCourse(course)
      setShowCodeModal(true)
      return
    }

    await enrollInCourse(course.id)
  }

  const enrollInCourse = async (courseId: string, code?: string) => {
    if (!user) return

    try {
      // Verify enrollment code if required
      if (code) {
        const { data: course } = await supabase
          .from('courses')
          .select('enrollment_code')
          .eq('id', courseId)
          .single()

        if (course?.enrollment_code !== code) {
          setMessage({ type: 'error', text: 'Invalid enrollment code' })
          return
        }
      }

      // Check if enrollment already exists
      const { data: existingEnrollment } = await supabase
        .from('course_enrollments')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single()

      if (existingEnrollment) {
        // Reactivate existing enrollment
        const { error } = await supabase
          .from('course_enrollments')
          .update({
            status: 'active',
            enrolled_at: new Date().toISOString()
          })
          .eq('id', existingEnrollment.id)

        if (error) throw error
      } else {
        // Create new enrollment
        const { error } = await supabase
          .from('course_enrollments')
          .insert({
            user_id: user.id,
            course_id: courseId,
            status: 'active',
          })

        if (error) throw error
      }

      setMessage({ type: 'success', text: 'Successfully enrolled in course!' })
      setShowCodeModal(false)
      setEnrollmentCode('')
      setSelectedCourse(null)
      loadCourses()
    } catch (error: any) {
      console.error('Enrollment error:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to enroll' })
    }
  }

  const handleUnenroll = async (courseId: string) => {
    if (!user) return
    if (!confirm('Are you sure you want to unenroll from this course?')) return

    try {
      const { error } = await supabase
        .from('course_enrollments')
        .update({ status: 'inactive' })
        .eq('user_id', user.id)
        .eq('course_id', courseId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Successfully unenrolled from course' })
      loadCourses()
    } catch (error: any) {
      console.error('Unenroll error:', error)
      setMessage({ type: 'error', text: 'Failed to unenroll' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Courses</h1>
            <p className="text-gray-600">Enroll in courses to access AI-powered assistance</p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          {/* Enrolled Courses */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Enrolled Courses</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
              </div>
            ) : enrolledCourses.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500">You haven't enrolled in any courses yet</p>
                <p className="text-sm text-gray-400 mt-2">Browse available courses below</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {enrolledCourses.map(course => (
                  <div key={course.id} className="bg-white rounded-lg shadow-md p-6 border-2 border-emerald-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{course.name}</h3>
                        <p className="text-sm text-gray-600">
                          Instructor: {course.instructor?.full_name || course.instructor?.email}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                        Enrolled
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.location.href = '/chat'}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                      >
                        Go to Chat
                      </button>
                      <button
                        onClick={() => handleUnenroll(course.id)}
                        className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                      >
                        Unenroll
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Courses */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Courses</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
              </div>
            ) : availableCourses.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500">No available courses at the moment</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {availableCourses.map(course => (
                  <div key={course.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{course.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Instructor: {course.instructor?.full_name || course.instructor?.email}
                    </p>
                    <button
                      onClick={() => handleEnroll(course)}
                      className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                    >
                      Enroll
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enrollment Code Modal */}
      {showCodeModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Enter Enrollment Code</h2>
            <p className="text-gray-600 mb-6">
              This course requires an enrollment code. Please enter the code provided by your instructor.
            </p>
            <input
              type="text"
              value={enrollmentCode}
              onChange={e => setEnrollmentCode(e.target.value)}
              placeholder="Enrollment code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCodeModal(false)
                  setEnrollmentCode('')
                  setSelectedCourse(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => enrollInCourse(selectedCourse.id, enrollmentCode)}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >
                Enroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
