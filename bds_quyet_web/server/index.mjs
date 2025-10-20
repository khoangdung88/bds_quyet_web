import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

// Env
const PORT = process.env.PORT || 3000
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2'
const S3_BUCKET = process.env.S3_BUCKET || 'bds-quyet'

// S3 client
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  } : undefined,
})

// Presign endpoint (PUT)
app.post('/api/s3/presign', async (req, res) => {
  try {
    const { fileName, contentType } = req.body || {}
    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' })
    }

    const Key = fileName
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key,
      ContentType: contentType,
    })

    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 })
    return res.json({ url, key: Key, bucket: S3_BUCKET, region: AWS_REGION })
  } catch (e) {
    console.error('presign error:', e)
    return res.status(500).json({ error: 'presign_failed' })
  }
})

// Facebook posting endpoint
app.post('/api/fb/post', async (req, res) => {
  try {
    const { message, groupIds } = req.body || {}
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ error: 'groupIds is required' })
    }
    const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN
    const results = []

    // Nếu thiếu token, trả về kết quả thất bại có cấu trúc để client vẫn log lịch sử
    if (!FB_ACCESS_TOKEN) {
      for (const gid of groupIds) {
        results.push({ groupId: gid, ok: false, error: 'fb_access_token_missing' })
      }
      return res.json({ error: 'fb_access_token_missing', results })
    }

    for (const gid of groupIds) {
      try {
        const params = new URLSearchParams()
        if (message) params.set('message', String(message))
        params.set('access_token', FB_ACCESS_TOKEN)
        const resp = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(gid)}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        })
        const data = await resp.json()
        if (!resp.ok) {
          results.push({ groupId: gid, ok: false, error: data?.error?.message || 'unknown_error' })
        } else {
          results.push({ groupId: gid, ok: true, postId: data?.id || null })
        }
      } catch (e) {
        results.push({ groupId: gid, ok: false, error: e?.message || 'request_failed' })
      }
    }

    return res.json({ results })
  } catch (e) {
    console.error('fb post error:', e)
    return res.status(500).json({ error: 'fb_post_failed' })
  }
})

// Serve static from dist
const distDir = path.resolve(__dirname, '..', 'dist')
app.use(express.static(distDir))

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`)
})
