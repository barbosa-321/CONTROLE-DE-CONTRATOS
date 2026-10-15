import { vercelHandler } from '../../api/index.js'

export default async (event, context) => {
  let path = event.path || '/'
  if (!path.startsWith('/api/')) {
    const idx = path.indexOf('/api/')
    if (idx !== -1) path = path.slice(idx)
    else path = '/api/' + path.replace(/^\/+/, '')
  }

  const result = await vercelHandler({
    path,
    httpMethod: event.httpMethod,
    headers: event.headers || {},
    body: event.body,
    queryStringParameters: event.queryStringParameters || {},
    isBase64Encoded: event.isBase64Encoded
  })

  return {
    statusCode: result.statusCode || 200,
    headers: result.headers || { 'Content-Type': 'application/json' },
    body: result.body || ''
  }
}
