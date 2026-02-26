import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc('increment_view_count', {
      video_id: params.id,
    })

    if (error) {
      // Fallback: manual increment
      const { data: video } = await supabase
        .from('videos')
        .select('view_count')
        .eq('id', params.id)
        .single()

      if (video) {
        await supabase
          .from('videos')
          .update({ view_count: (video.view_count || 0) + 1 })
          .eq('id', params.id)
      }
    }

    return NextResponse.json({ message: 'View count incremented' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
