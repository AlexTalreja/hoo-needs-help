import { useState, useEffect } from 'react'
import { uploadDocument, getDocuments, CourseDocument } from '../services/api'
import Header from '../components/Header'

export default function DocumentManagement() {
  const [documents, setDocuments] = useState<CourseDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')

  const courseId = '11111111-1111-1111-1111-111111111111' // Test course ID

  // Load documents on mount
  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const response = await getDocuments(courseId)
      setDocuments(response.documents)
    } catch (err: any) {
      console.error('Error loading documents:', err)
    }
  }

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Determine document type
    let documentType: 'pdf' | 'vtt' | 'video'
    if (file.name.endsWith('.pdf')) {
      documentType = 'pdf'
    } else if (file.name.endsWith('.vtt')) {
      documentType = 'vtt'
    } else if (
      file.name.endsWith('.mp4') ||
      file.name.endsWith('.mov') ||
      file.name.endsWith('.webm')
    ) {
      documentType = 'video'
    } else {
      setError('Unsupported file type. Please upload PDF, VTT, or video files.')
      return
    }

    setUploading(true)
    setError('')
    setUploadProgress(`Uploading ${file.name}...`)

    try {
      const response = await uploadDocument(file, courseId, documentType)
      setUploadProgress(
        `✅ ${file.name} uploaded successfully! Processing...`
      )

      // Reload documents after successful upload
      setTimeout(() => {
        loadDocuments()
        setUploadProgress('')
        setUploading(false)
      }, 2000)
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`)
      setUploading(false)
      setUploadProgress('')
    }
  }

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄'
      case 'vtt':
        return '📝'
      case 'video':
        return '🎥'
      default:
        return '📎'
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
            ✓ Ready
          </span>
        )
      case 'processing':
        return (
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
            ⏳ Processing...
          </span>
        )
      case 'failed':
        return (
          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
            ✗ Failed
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
            Pending
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Course Documents
            </h1>
            <p className="text-gray-600">
              Upload PDFs, transcripts, and videos for the AI to learn from
            </p>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload Document</h2>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.vtt,.mp4,.mov,.webm"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer ${uploading ? 'opacity-50' : ''}`}
              >
                <div className="text-6xl mb-4">📁</div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-500">
                  PDF, VTT, MP4, MOV, or WebM files
                </p>
              </label>
            </div>

            {uploadProgress && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">{uploadProgress}</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Uploaded Documents</h2>

            {documents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No documents uploaded yet</p>
                <p className="text-sm mt-2">
                  Upload your first document to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-3xl">
                        {getDocumentIcon(doc.type)}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {doc.file_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {doc.type.toUpperCase()} •{' '}
                          {new Date(doc.created_at || '').toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>{getStatusBadge(doc.processing_status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              How Document Processing Works
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                📄 <strong>PDFs</strong>: Extracted page-by-page, chunked, and
                embedded
              </li>
              <li>
                📝 <strong>VTT Transcripts</strong>: Parsed with timestamps and
                embedded
              </li>
              <li>
                🎥 <strong>Videos</strong>: Stored for playback (upload matching
                VTT for AI)
              </li>
              <li>
                ⚡ <strong>Processing time</strong>: Usually takes 10-30 seconds
                per document
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
