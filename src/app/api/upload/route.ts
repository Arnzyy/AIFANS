import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getPresignedUploadUrl, getAvatarPath, getBannerPath, getPostMediaPath } from '@/lib/storage/r2'

// Get a presigned URL for direct upload to R2
export async function POST(request: NextRequest) {
  // Debug: Log R2 env vars (partial for security)
  console.log('[API] /api/upload - R2 config check:', {
    hasAccountId: !!process.env.R2_ACCOUNT_ID,
    hasBucket: !!process.env.R2_BUCKET_NAME,
    bucketName: process.env.R2_BUCKET_NAME,
    hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
    hasPublicUrl: !!process.env.R2_PUBLIC_URL,
  })

  try {
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[API] /api/upload - user:', user?.id, 'error:', authError?.message)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 })
    }

    const body = await request.json()
    const { filename, type, postId } = body
    console.log('[API] /api/upload - filename:', filename, 'type:', type)

    if (!filename || !type) {
      return NextResponse.json(
        { error: 'Filename and type are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeType = getMimeType(ext || '')

    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      )
    }

    // Determine folder based on upload type
    let folder: string
    switch (type) {
      case 'avatar':
        folder = getAvatarPath(user.id)
        break
      case 'banner':
        folder = getBannerPath(user.id)
        break
      case 'post':
        if (!postId) {
          // Generate a temporary folder for new posts
          folder = getPostMediaPath(user.id, `temp-${Date.now()}`)
        } else {
          folder = getPostMediaPath(user.id, postId)
        }
        break
      case 'message':
        folder = `messages/${user.id}`
        break
      default:
        folder = `uploads/${user.id}`
    }

    // Get presigned URL
    const { uploadUrl, key, publicUrl } = await getPresignedUploadUrl(filename, folder)

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}
