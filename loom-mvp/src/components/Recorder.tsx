'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRecorder, RecordingMode } from '@/hooks/useRecorder'
import UploadProgress from '@/components/UploadProgress'
import { formatDuration } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function Recorder() {
  const [mode, setMode] = useState<RecordingMode>('screen')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  const previewRef = useRef<HTMLVideoElement>(null)
  const webcamRef = useRef<HTMLVideoElement>(null)
  const playbackRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const router = useRouter()
  const {
    status,
    stream,
    webcamStream,
    recordedBlob,
    thumbnailBlob,
    duration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
  } = useRecorder()

  useEffect(() => {
    if (previewRef.current && stream) {
      previewRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    if (webcamRef.current && webcamStream) {
      webcamRef.current.srcObject = webcamStream
    }
  }, [webcamStream])

  useEffect(() => {
    if (playbackRef.current && recordedBlob) {
      const url = URL.createObjectURL(recordedBlob)
      playbackRef.current.src = url
      return () => URL.revokeObjectURL(url)
    }
  }, [recordedBlob])

  useEffect(() => {
    if (status === 'recording') {
      startTimeRef.current = Date.now() - elapsedTime * 1000
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } else if (status === 'paused') {
      if (timerRef.current) clearInterval(timerRef.current)
    } else if (status === 'stopped' || status === 'idle') {
      if (timerRef.current) clearInterval(timerRef.current)
      if (status === 'idle') setElapsedTime(0)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function handleUpload() {
    if (!recordedBlob) return
    setIsUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('video', recordedBlob, 'recording.webm')
    if (thumbnailBlob) {
      formData.append('thumbnail', thumbnailBlob, 'thumbnail.png')
    }
    formData.append('duration', duration.toString())

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(pct)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            setIsUploading(false)
            setIsProcessing(true)
            setTimeout(() => {
              router.push(`/watch/${data.id}`)
            }, 1000)
            resolve()
          } catch {
            setIsUploading(false)
            toast.error('Upload failed: invalid response')
            reject()
          }
        } else {
          setIsUploading(false)
          toast.error('Upload failed. Please try again.')
          reject()
        }
      })

      xhr.addEventListener('error', () => {
        setIsUploading(false)
        toast.error('Upload failed. Check your connection.')
        reject()
      })

      xhr.open('POST', '/api/upload')
      xhr.send(formData)
    })
  }

  const modes: { id: RecordingMode; label: string }[] = [
    { id: 'screen', label: 'Screen Only' },
    { id: 'webcam', label: 'Webcam Only' },
    { id: 'screen+webcam', label: 'Screen + Webcam' },
  ]

  const isIdle = status === 'idle'
  const isRecording = status === 'recording'
  const isPaused = status === 'paused'
  const isStopped = status === 'stopped'
  const isRequesting = status === 'requesting-permission'

  return (
    <>
      {(isUploading || isProcessing) && (
        <UploadProgress progress={uploadProgress} processing={isProcessing} />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Mode selector */}
        {isIdle && (
          <div className="flex gap-2 p-1 rounded-xl bg-gray-900 border border-gray-800">
            {modes.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  mode === id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Preview area */}
        <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          {/* Live preview */}
          {(isRecording || isPaused || isRequesting) && !isStopped && (
            <video
              ref={previewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          )}

          {/* Playback preview after recording */}
          {isStopped && recordedBlob && (
            <video
              ref={playbackRef}
              controls
              className="w-full h-full object-contain"
            />
          )}

          {/* Idle placeholder */}
          {isIdle && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <svg className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <p className="text-sm">Press Record to start</p>
            </div>
          )}

          {isRequesting && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900">
              <div className="text-center">
                <div className="h-10 w-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Requesting permission...</p>
              </div>
            </div>
          )}

          {/* Webcam overlay */}
          {mode === 'screen+webcam' && (isRecording || isPaused) && webcamStream && (
            <div className="absolute bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-gray-700 shadow-lg">
              <video
                ref={webcamRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-xs font-medium">REC</span>
            </div>
          )}

          {/* Paused indicator */}
          {isPaused && (
            <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <span className="text-white text-xs font-medium">PAUSED</span>
            </div>
          )}
        </div>

        {/* Timer */}
        {(isRecording || isPaused) && (
          <div className="text-center">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">
              {formatDuration(elapsedTime)}
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {isIdle && (
            <button
              onClick={() => startRecording(mode)}
              className="flex items-center gap-3 rounded-xl bg-red-600 hover:bg-red-500 px-8 py-4 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-red-500/25"
            >
              <span className="h-4 w-4 rounded-full bg-white" />
              Record
            </button>
          )}

          {isRecording && (
            <>
              <button
                onClick={pauseRecording}
                className="flex items-center gap-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 px-6 py-3 text-white font-medium transition-all duration-200"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                Pause
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 rounded-xl bg-gray-700 hover:bg-gray-600 px-6 py-3 text-white font-medium transition-all duration-200"
              >
                <span className="h-4 w-4 rounded bg-white" />
                Stop
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button
                onClick={resumeRecording}
                className="flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 px-6 py-3 text-white font-medium transition-all duration-200"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Resume
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 rounded-xl bg-gray-700 hover:bg-gray-600 px-6 py-3 text-white font-medium transition-all duration-200"
              >
                <span className="h-4 w-4 rounded bg-white" />
                Stop
              </button>
            </>
          )}

          {isStopped && (
            <>
              <button
                onClick={handleUpload}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 px-8 py-3 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
              >
                Upload & Save
              </button>
              <button
                onClick={discardRecording}
                className="rounded-xl border border-gray-700 hover:border-gray-500 px-8 py-3 text-gray-300 hover:text-white font-medium transition-all duration-200"
              >
                Discard
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
