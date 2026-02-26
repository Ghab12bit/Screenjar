'use client'

interface VideoPlayerProps {
  src: string
  poster?: string
  title?: string
}

export default function VideoPlayer({ src, poster, title }: VideoPlayerProps) {
  return (
    <div className="w-full rounded-xl overflow-hidden shadow-2xl bg-black">
      <video
        src={src}
        poster={poster}
        controls
        preload="metadata"
        title={title}
        className="w-full max-h-[80vh] object-contain"
        style={{ display: 'block' }}
      />
    </div>
  )
}
