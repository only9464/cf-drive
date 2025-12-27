/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono'
import { rateLimit, RateLimitBinding, RateLimitKeyFunc } from "@elithrar/workers-hono-rate-limit";
import { getConnInfo } from 'hono/cloudflare-workers'
type Env = {
  MY_BUCKET: R2Bucket,
  MY_RATE_LIMITER: RateLimitBinding;
}
const app = new Hono<{ Bindings: Env }>()

const getKey: RateLimitKeyFunc = (c) => getConnInfo(c).remote.address  || "";

// Apply rate limiting to all routes
app.use("*", (c, next) => rateLimit(c.env.MY_RATE_LIMITER, getKey)(c, next));

const normalizeKey = (raw?: string) => {
  if (!raw) return ''
  // Hono 的路由参数可能已经解码，但 URL 路径中的编码需要处理
  // 先移除开头的 /，然后尝试解码（如果已经是解码后的，decodeURIComponent 不会报错）
  let cleaned = raw.startsWith('/') ? raw.slice(1) : raw
  try {
    // 如果包含 % 说明是编码的，需要解码
    if (cleaned.includes('%')) {
      cleaned = decodeURIComponent(cleaned)
    }
  } catch (e) {
    // 解码失败，使用原始值
  }
  return cleaned
}

// 正确编码 Content-Disposition 头中的文件名（支持 Unicode）
const encodeContentDisposition = (filename: string): string => {
  // 检查是否包含非 ASCII 字符
  const hasNonASCII = /[^\x00-\x7F]/.test(filename)
  if (hasNonASCII) {
    // 使用 RFC 5987 格式：filename*=UTF-8''encoded-filename
    const encoded = encodeURIComponent(filename)
    return `inline; filename="${filename}"; filename*=UTF-8''${encoded}`
  }
  return `inline; filename="${filename}"`
}

// children 列表（文件 + 目录）
app.post('/api/children', async (c) => {
  const bucket = c.env.MY_BUCKET
  const reqJson = await c.req.json<{ dirname?: string }>().catch(() => ({}))
  const raw = reqJson?.dirname || ''
  const prefix = normalizeKey(raw)
  const listOptions: R2ListOptions = {
    prefix,
    delimiter: '/',
  }
  const result = await bucket.list(listOptions)
  // 文件对象
  const files = result.objects.map(obj => ({
    key: obj.key,
    // 文件名只要最后一级
    name: obj.key.split('/').pop() || obj.key,
    type: 'file',
    size: obj.size,
    uploaded: obj.uploaded
  }))
  // 文件夹对象
  const folders = (result.delimitedPrefixes || []).map(folder => ({
    key: folder,
    // 取文件夹最后一级
    name: folder.replace(/\/$/, '').split('/').pop() || folder,
    type: 'folder'
  }))
  return c.json({
    list: [...folders, ...files]
  })
})


// 直接路径下载（用于文件直链）
app.get('/*', async (c) => {
  let key = normalizeKey(c.req.path)
  const bucket = c.env.MY_BUCKET

  if (!key) {
    const indexObject = await bucket.get('index.html')
    if (indexObject) {
      const headers = new Headers()
      headers.set('Content-Type', 'text/html;charset=UTF-8')
      headers.set('Content-Length', indexObject.size.toString())
      return new Response(indexObject.body, { headers })
    }
    return c.json({ error: 'No key specified' }, 400)
  }

  const object = await bucket.get(key)
  if (!object) return c.json({ error: 'File not found' }, 404)
  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream')
  headers.set('Content-Length', object.size.toString())
  const filename = key.split('/').pop() || 'file'
  headers.set('Content-Disposition', encodeContentDisposition(filename))
  return new Response(object.body, { headers })
})

export default app