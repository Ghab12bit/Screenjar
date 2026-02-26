'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type RecordingMode = 'screen' | 'webcam' | 'screen+webcam'
export type RecordingStatus = 'idle' | 'requesting-permission' | 'recording' | 'paused' | 'stopped'

export interface RecorderState {
  status: RecordingStatus
  stream: MediaStream | null
  webcamStream: MediaStream | null
  recordedBlob: Blob | null
  thumbnailBlob: Blob | null
  duration: number
  startRecording: (mode: RecordingMode) => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => void
  discardRecording: () => void
}

export function useRecorder(): RecorderState {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)

  const stopAllStreams = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
    }
    if (webcamStream) {
      webcamStream.getTracks().forEach((t) => t.stop())
    }
  }, [stream, webcamStream])

  useEffect(() => {
    return () => {
      stopAllStreams()
    }
  }, [stopAllStreams])

  const generateThumbnail = useCallback(async (blob: Blob): Promise<Blob | null> => {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(blob)
        const video = document.createElement('video')
        video.src = url
        video.muted = true
        video.playsInline = true

        video.onloadedmetadata = () => {
          video.currentTime = Math.min(0.5, video.duration / 2)
        }

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth || 1280
            canvas.height = video.videoHeight || 720
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              URL.revokeObjectURL(url)
              resolve(null)
              return
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(
              (thumbBlob) => {
                URL.revokeObjectURL(url)
                resolve(thumbBlob)
              },
              'image/png',
              0.8
            )
          } catch {
            URL.revokeObjectURL(url)
            resolve(null)
          }
        }

        video.onerror = () => {
          URL.revokeObjectURL(url)
          resolve(null)
        }

        // Timeout fallback
        setTimeout(() => {
          URL.revokeObjectURL(url)
          resolve(null)
        }, 5000)
      } catch {
        resolve(null)
      }
    })
  }, [])

  const startRecording = useCallback(async (mode: RecordingMode) => {
    setStatus('requesting-permission')
    chunksRef.current = []

    try {
      let mainStream: MediaStream
      let camStream: MediaStream | null = null

      if (mode === 'screen' || mode === 'screen+webcam') {
        mainStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })
      } else {
        mainStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
      }

      if (mode === 'screen+webcam') {
        try {
          camStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          })
        } catch {
          // Webcam failed, continue without it
          camStream = null
        }
      }

      setStream(mainStream)
      setWebcamStream(camStream)

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'

      const recorder = new MediaRecorder(mainStream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const thumb = await generateThumbnail(blob)
        setRecordedBlob(blob)
        setThumbnailBlob(thumb)
        setStatus('stopped')
      }

      // Stop recording if screen sharing is stopped by the user
      mainStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (mediaRecorderRef.current?.state !== 'inactive') {
          stopRecording()
        }
      })

      recorder.start(1000)
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0
      setStatus('recording')
    } catch (err) {
      console.error('Failed to start recording:', err)
      setStatus('idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateThumbnail])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      pausedTimeRef.current = Date.now()
      setStatus('paused')
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      // Adjust start time to account for pause duration
      startTimeRef.current += Date.now() - pausedTimeRef.current
      setStatus('recording')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      setDuration(elapsed)
      mediaRecorderRef.current.stop()

      // Stop all tracks
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
      if (webcamStream) {
        webcamStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [stream, webcamStream])

  const discardRecording = useCallback(() => {
    stopAllStreams()
    setStream(null)
    setWebcamStream(null)
    setRecordedBlob(null)
    setThumbnailBlob(null)
    setDuration(0)
    chunksRef.current = []
    mediaRecorderRef.current = null
    setStatus('idle')
  }, [stopAllStreams])

  return {
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
  }
}
