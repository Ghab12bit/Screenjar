'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatDuration, formatRelativeDate } from '@/lib/utils'

interface Video {
  id: string
  title: string
  thumbnail_url: string | null
  duration: number
  view_count: number
  created_at: string
  file_url: string
}

interface VideoCardProps {
  video: Video
  onDelete: (id: string) => void
  onTitleUpdate: (id: string, title: string) => void
}

export default function VideoCard({ video, onDelete, onTitleUpdate }: VideoCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState(video.title)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function saveTitle() {
    setIsEditingTitle(false)
    if (title === video.title) return

    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })

      if (res.ok) {
        onTitleUpdate(video.id, title)
        toast.success('Title updated')
      } else {
        setTitle(video.title)
        toast.error('Failed to update title')
      }
    } catch {
      setTitle(video.title)
      toast.error('Failed to update title')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/videos/${video.id}`, { method: 'DELETE' })
      if (res.ok) {
        onDelete(video.id)
        toast.success('Video deleted')
      } else {
        toast.error('Failed to delete video')
      }
    } catch {
      toast.error('Failed to delete video')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  function copyLink() {
    const shareUrl = `${window.location.origin}/watch/${video.id}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Link copied to clipboard!')
    })
  }

  return (
    <>
      <div className="group rounded-xl bg-gray-900 border border-gray-800 overflow-hidden hover:border-gray-700 transition-all duration-200 cursor-pointer">
        {/* Thumbnail */}
        <div
          className="relative aspect-video bg-gray-800 overflow-hidden"
          onClick={() => router.push(`/watch/${video.id}`)}
        >
          {video.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <svg className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <div className="rounded-full bg-white/20 backdrop-blur-sm p-4">
              <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Duration */}
          <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 text-xs text-white font-medium">
            {formatDuration(video.duration)}
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          {/* Title */}
          {isEditingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') {
                  setTitle(video.title)
                  setIsEditingTitle(false)
                }
              }}
              className="w-full bg-gray-800 rounded px-2 py-1 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <h3
              className="text-white font-medium text-sm truncate mb-1 hover:text-blue-400 transition-colors"
              onDoubleClick={() => setIsEditingTitle(true)}
              title="Double-click to edit"
            >
              {title}
            </h3>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <span>{formatRelativeDate(video.created_at)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {video.view_count}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex-1 rounded-lg border border-gray-700 hover:border-gray-600 px-3 py-1.5 text-xs text-gray-300 hover:text-white transition-all duration-200"
            >
              Copy Link
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-gray-700 hover:border-red-500 hover:text-red-400 px-3 py-1.5 text-xs text-gray-300 transition-all duration-200"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(false)
          }}
        >
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Delete recording?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently delete &quot;{video.title}&quot;. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-gray-700 hover:border-gray-600 px-4 py-2 text-sm text-gray-300 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-800 px-4 py-2 text-sm font-medium text-white transition-all"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
