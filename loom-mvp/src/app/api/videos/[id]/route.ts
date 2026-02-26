import { createClient } from '@/lib/supabase/server'
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    return NextResponse.json({ video })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title } = await request.json()

    const { data: video, error } = await supabase
      .from('videos')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !video) {
      return NextResponse.json({ error: 'Video not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ video })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !video) {
      return NextResponse.json({ error: 'Video not found or unauthorized' }, { status: 404 })
    }

    // Delete from R2
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: video.file_key,
      })
    )

    // Delete thumbnail if exists
    if (video.thumbnail_url) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const thumbKey = video.thumbnail_url.replace(`${appUrl}/api/media/`, '')
      if (thumbKey) {
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: thumbKey,
          })
        ).catch(() => {}) // ignore thumbnail delete errors
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Video deleted successfully' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
