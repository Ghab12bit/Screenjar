'use client'

interface UploadProgressProps {
  progress: number
  processing?: boolean
}

export default function UploadProgress({ progress, processing = false }: UploadProgressProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-8 shadow-2xl text-center">
        <div className="mb-6">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            {processing ? (
              <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {processing ? 'Processing...' : 'Uploading...'}
          </h3>
          {!processing && (
            <p className="text-gray-400 text-sm">{progress}% complete</p>
          )}
        </div>

        {!processing && (
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
