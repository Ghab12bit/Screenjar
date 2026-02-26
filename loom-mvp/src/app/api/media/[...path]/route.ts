import { r2Client, R2_BUCKET_NAME } from '@/lib/r2'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const key = params.path.join('/')
    const rangeHeader = request.headers.get('range')

    const commandParams: {
      Bucket: string
      Key: string
      Range?: string
    } = {
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }

    if (rangeHeader) {
      commandParams.Range = rangeHeader
    }

    const command = new GetObjectCommand(commandParams)
    const response = await r2Client.send(command)

    if (!response.Body) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const contentType = response.ContentType || 'application/octet-stream'
    const contentLength = response.ContentLength
    const contentRange = response.ContentRange

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
      'Accept-Ranges': 'bytes',
    }

    if (contentLength) {
      headers['Content-Length'] = contentLength.toString()
    }

    if (contentRange) {
      headers['Content-Range'] = contentRange
    }

    // Convert the readable stream to a Web ReadableStream
    const nodeStream = response.Body as unknown as Readable
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: Buffer) => {
          controller.enqueue(chunk)
        })
        nodeStream.on('end', () => {
          controller.close()
        })
        nodeStream.on('error', (err) => {
          controller.error(err)
        })
      },
    })

    const status = rangeHeader ? 206 : 200
    return new Response(webStream, { status, headers })
  } catch (err: unknown) {
    const error = err as { name?: string; $metadata?: { httpStatusCode?: number } }
    if (
      error.name === 'NoSuchKey' ||
      error.$metadata?.httpStatusCode === 404
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('Media proxy error:', err)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}
