import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getAnalytics, AnalyticsData, getDocumentCitations, DocumentCitation } from '../../services/api'

interface AnalyticsProps {
  courseId: string
  courseName: string
}

// Colors for pie chart
const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899', '#14b8a6', '#f97316']

function Analytics({ courseId, courseName }: AnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [documentCitations, setDocumentCitations] = useState<DocumentCitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90' | 'all'>('7')

  useEffect(() => {
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, timeRange])

  const loadAnalytics = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Load analytics data
      const analyticsResult = await getAnalytics(courseId, timeRange)
      setAnalyticsData(analyticsResult)

      // Load document citations separately to prevent one from breaking the other
      try {
        const citationsResult = await getDocumentCitations(courseId, timeRange)
        setDocumentCitations(citationsResult.document_citations || [])
      } catch (citationErr) {
        console.error('Failed to load document citations:', citationErr)
        // Don't fail the entire analytics load if citations fail
        setDocumentCitations([])
      }
    } catch (err) {
      console.error('Analytics error:', err)
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
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
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

      {/* Document Citations Pie Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Most Referenced Documents in Student Chats
        </h3>
        {documentCitations && documentCitations.length > 0 ? (
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Pie Chart */}
            <div className="w-full md:w-1/2 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={documentCitations.map(doc => ({
                      name: doc.document_name,
                      value: doc.citation_count
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={(entry: any) => `${entry.name}: ${entry.value}`}
                    labelLine={true}
                  >
                    {documentCitations.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="w-full md:w-1/2">
              <div className="space-y-3">
                {documentCitations.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-700 font-medium truncate">{doc.document_name}</span>
                    </div>
                    <span className="text-purple-600 font-semibold ml-4">
                      {doc.citation_count} {doc.citation_count === 1 ? 'chat' : 'chats'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-4 italic">
                Shows unique student chats where each document was cited as a source
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No document citations available yet for this time period.</p>
            <p className="text-sm text-gray-400 mt-2">Citations will appear here once students ask questions and receive answers with sources.</p>
          </div>
        )}
      </div>

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
