import { vercelHandler } from '../../api/index.js'

export default async (request) => {
  const url = new URL(request.url)
  let path = url.pathname

  if (!path.startsWith('/api/')) {
    const idx = path.indexOf('/api/')
    if (idx !== -1) path = path.slice(idx)
    else path = '/api/' + path.replace(/^\/+/, '')
  }

  let rawBody = ''
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try { rawBody = await request.text() } catch { rawBody = '' }
  }

  const headers = {}
  request.headers.forEach((value, key) => { headers[key] = value })

  const qs = {}
  url.searchParams.forEach((value, key) => { qs[key] = value })

  const result = await vercelHandler({
    path,
    httpMethod: request.method,
    headers,
    body: rawBody || null,
    queryStringParameters: qs
  })

  return new Response(result.body || '', {
    status: result.statusCode || 200,
    headers: result.headers || { 'Content-Type': 'application/json' }
  })
}
