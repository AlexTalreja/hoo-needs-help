import { useState, useEffect } from 'react'
import { uploadDocument, getDocuments, CourseDocument } from '../../services/api'

interface FileUploadProps {
  courseId: string
  courseName: string
}

function FileUpload({ courseId, courseName }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<'pdf' | 'vtt' | 'video'>('pdf')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [documents, setDocuments] = useState<CourseDocument[]>([])

  useEffect(() => {
    loadDocuments()
  }, [courseId])

  const loadDocuments = async () => {
    try {
      const response = await getDocuments(courseId)
      setDocuments(response.documents)
    } catch (err) {
      console.error('Error loading documents:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setError(null)
      setSuccess(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccess(null)

    try {
      await uploadDocument(selectedFile, courseId, documentType)
      setSuccess(`${selectedFile.name} uploaded successfully!`)
      setSelectedFile(null)
      // Reset file input
      const fileInput = document.getElementById('fileInput') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      // Reload documents list
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Course Materials</h2>
      <p className="text-gray-600 mb-6">Course: <span className="font-semibold">{courseName}</span></p>

      {/* Upload Form */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <div className="space-y-4">
          {/* Document Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="pdf"
                  checked={documentType === 'pdf'}
                  onChange={(e) => setDocumentType(e.target.value as 'pdf')}
                  className="mr-2"
                />
                PDF Document
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="vtt"
                  checked={documentType === 'vtt'}
                  onChange={(e) => setDocumentType(e.target.value as 'vtt')}
                  className="mr-2"
                />
                VTT Transcript
              </label>
            </div>
          </div>

          {/* File Input */}
          <div>
            <label htmlFor="fileInput" className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              type="file"
              id="fileInput"
              onChange={handleFileChange}
              accept={documentType === 'pdf' ? '.pdf' : '.vtt'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Upload Button */}
          <div>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {isUploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Uploaded Documents</h3>

        {documents.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {doc.file_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {doc.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        doc.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                        doc.processing_status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        doc.processing_status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.processing_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Supported File Types</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li><strong>PDF:</strong> Course materials, textbooks, lecture slides, syllabus</li>
          <li><strong>VTT:</strong> Video transcripts with timestamps for lecture videos</li>
        </ul>
      </div>
    </div>
  )
}

export default FileUpload
