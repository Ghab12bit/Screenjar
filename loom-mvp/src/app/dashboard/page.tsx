'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import VideoCard from '@/components/VideoCard'

interface Video {
  id: string
  title: string
  thumbnail_url: string | null
  duration: number
  view_count: number
  created_at: string
  file_url: string
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-800" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-800 rounded w-3/4" />
        <div className="h-3 bg-gray-800 rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-8 bg-gray-800 rounded flex-1" />
          <div className="h-8 bg-gray-800 rounded w-16" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/videos')
      .then((res) => res.json())
      .then((data) => {
        if (data.videos) {
          setVideos(data.videos)
        } else {
          setError('Failed to load recordings')
        }
      })
      .catch(() => setError('Failed to load recordings'))
      .finally(() => setLoading(false))
  }, [])

  function handleDelete(id: string) {
    setVideos((prev) => prev.filter((v) => v.id !== id))
  }

  function handleTitleUpdate(id: string, title: string) {
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, title } : v)))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Recordings</h1>
          {!loading && (
            <p className="text-gray-400 mt-1">
              {videos.length} recording{videos.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Link
          href="/record"
          className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200"
        >
          + New Recording
        </Link>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="rounded-full bg-gray-800 p-6 mb-6">
            <svg className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No recordings yet</h2>
          <p className="text-gray-400 mb-6">Record your first video to get started</p>
          <Link
            href="/record"
            className="rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3 font-medium text-white transition-all duration-200"
          >
            Record your first video
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onDelete={handleDelete}
              onTitleUpdate={handleTitleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
