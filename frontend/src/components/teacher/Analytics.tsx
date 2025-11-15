import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getAnalytics, AnalyticsData } from '../../services/api'

interface AnalyticsProps {
  courseId: string
  courseName: string
}

function Analytics({ courseId, courseName }: AnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90' | 'all'>('7')

  useEffect(() => {
    loadAnalytics()
  }, [courseId, timeRange])

  const loadAnalytics = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getAnalytics(courseId, timeRange)
      setAnalyticsData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading analytics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Analytics</h2>
          <p className="text-gray-600 mt-1">Course: <span className="font-semibold">{courseName}</span></p>
        </div>

        {/* Time Range Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('7')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              timeRange === '7'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 7 days
          </button>
          <button
            onClick={() => setTimeRange('30')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              timeRange === '30'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 30 days
          </button>
          <button
            onClick={() => setTimeRange('90')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              timeRange === '90'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 90 days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              timeRange === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All time
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <h3 className="text-sm font-medium opacity-90">Total Questions</h3>
          <p className="text-4xl font-bold mt-2">{analyticsData.total_questions}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <h3 className="text-sm font-medium opacity-90">Average Rating</h3>
          <p className="text-4xl font-bold mt-2">{analyticsData.avg_rating.toFixed(1)}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <h3 className="text-sm font-medium opacity-90">Flagged Questions</h3>
          <p className="text-4xl font-bold mt-2">{analyticsData.flagged_count}</p>
        </div>
      </div>

      {/* Key Topics Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Topics Being Asked</h3>

        {analyticsData.top_concepts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No questions asked yet in this time period.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {analyticsData.top_concepts.map((sentence, index) => (
              <div key={index} className="flex items-start">
                <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold text-sm mr-3 mt-1">
                  {index + 1}
                </span>
                <p className="text-gray-700 leading-relaxed">{sentence}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Question Volume Over Time */}
      {analyticsData.question_volume && analyticsData.question_volume.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Question Volume Over Time</h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.question_volume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#10b981" name="Questions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6 text-right">
        <button
          onClick={loadAnalytics}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Refresh Analytics
        </button>
      </div>
    </div>
  )
}

export default Analytics
