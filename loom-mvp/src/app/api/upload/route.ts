import { createClient } from '@/lib/supabase/server'
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { nanoid } from 'nanoid'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const videoFile = formData.get('video') as File | null
    const thumbnailFile = formData.get('thumbnail') as File | null
    const durationStr = formData.get('duration') as string | null
    const duration = durationStr ? parseFloat(durationStr) : 0

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    const videoKey = `${user.id}/${nanoid(12)}.webm`
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: videoKey,
        Body: videoBuffer,
        ContentType: 'video/webm',
      })
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const fileUrl = `${appUrl}/api/media/${videoKey}`

    let thumbnailUrl: string | null = null
    let thumbnailKey: string | null = null

    if (thumbnailFile && thumbnailFile.size > 0) {
      thumbnailKey = `${user.id}/${nanoid(12)}-thumb.png`
      const thumbBuffer = Buffer.from(await thumbnailFile.arrayBuffer())

      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: thumbnailKey,
          Body: thumbBuffer,
          ContentType: 'image/png',
        })
      )

      thumbnailUrl = `${appUrl}/api/media/${thumbnailKey}`
    }

    const { data: video, error: dbError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        title: 'Untitled Recording',
        file_key: videoKey,
        file_url: fileUrl,
        file_size: videoFile.size,
        duration,
        thumbnail_url: thumbnailUrl,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({
      id: video.id,
      title: video.title,
      fileUrl: video.file_url,
      shareUrl: `${appUrl}/watch/${video.id}`,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
