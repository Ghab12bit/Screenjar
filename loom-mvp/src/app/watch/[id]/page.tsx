'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import VideoPlayer from '@/components/VideoPlayer'
import { formatRelativeDate, formatDuration } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Video {
  id: string
  title: string
  file_url: string
  thumbnail_url: string | null
  duration: number
  view_count: number
  created_at: string
}

export default function WatchPage() {
  const params = useParams()
  const id = params.id as string
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return

    fetch(`/api/videos/${id}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true)
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data?.video) {
          setVideo(data.video)
          // Increment view count
          fetch(`/api/videos/${id}/view`, { method: 'POST' }).catch(() => {})
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('Link copied!')
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="aspect-video bg-gray-900 rounded-xl animate-pulse" />
        <div className="space-y-3">
          <div className="h-6 bg-gray-900 rounded w-1/2 animate-pulse" />
          <div className="h-4 bg-gray-900 rounded w-1/3 animate-pulse" />
        </div>
      </div>
    )
  }

  if (notFound || !video) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-full bg-gray-800 p-6 mb-6">
          <svg className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Video not found</h2>
        <p className="text-gray-400">This video may have been deleted or the link is invalid.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <VideoPlayer
        src={video.file_url}
        poster={video.thumbnail_url || undefined}
        title={video.title}
      />

      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">{video.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <span>{formatRelativeDate(video.created_at)}</span>
          <span>·</span>
          <span>{formatDuration(video.duration)}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {video.view_count} view{video.view_count !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="pt-2 border-t border-gray-800">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 rounded-xl border border-gray-700 hover:border-gray-500 px-5 py-2.5 text-sm text-gray-300 hover:text-white transition-all duration-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Link
          </button>
        </div>
      </div>
    </div>
  )
}
