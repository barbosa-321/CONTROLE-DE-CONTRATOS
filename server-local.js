import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Carrega o .env se as variaveis criticas nao estiverem definidas
if (!process.env.JWT_SECRET || !process.env.SUPABASE_URL) {
  try {
    const envPath = path.join(__dirname, '.env')
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
        if (m && !(m[1] in process.env)) {
          let v = m[2]
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
          process.env[m[1]] = v
        }
      }
      console.log('[LOCAL-SERVER] .env carregado de', envPath)
    } else {
      console.warn('[LOCAL-SERVER] AVISO: arquivo .env nao encontrado em', envPath)
    }
  } catch (e) {
    console.warn('[LOCAL-SERVER] AVISO: falha ao carregar .env:', e.message)
  }
}

const PORT = process.env.PORT || 3000

const { default: apiHandler } = await import('./api/index.js')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

function parseCookies(header) {
  const cookies = {}
  if (!header) return cookies
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=')
    if (idx > 0) cookies[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
  }
  return cookies
}

function parseQuery(url) {
  const query = {}
  const idx = url.indexOf('?')
  if (idx === -1) return query
  const params = new URLSearchParams(url.slice(idx + 1))
  for (const [k, v] of params) query[k] = v
  return query
}

const server = http.createServer(async (req, res) => {
  const url = req.url
  const pathname = url.split('?')[0]

  if (pathname.startsWith('/api/')) {
    try {
      let rawBody = ''
      for await (const chunk of req) rawBody += chunk

      let parsedBody = null
      if (req.method !== 'GET' && req.method !== 'HEAD' && rawBody) {
        try { parsedBody = JSON.parse(rawBody) } catch { parsedBody = {} }
      }

      const query = parseQuery(url)
      const slug = pathname.slice('/api/'.length)
      query.path = slug.split('/')

      const headers = { ...req.headers }
      if (!headers.cookie) headers.cookie = Object.entries(parseCookies(req.headers.cookie)).map(([k, v]) => `${k}=${v}`).join('; ')

      const fakeReq = {
        method: req.method,
        url,
        headers,
        body: parsedBody,
        query,
        cookies: parseCookies(req.headers.cookie),
        connection: req.socket
      }

      let statusCode = 200
      let contentType = 'application/json'
      const outHeaders = {}

      const fakeRes = {
        setHeader(k, v) { outHeaders[k] = v },
        status(code) { statusCode = code; return fakeRes },
        send(body) {
          for (const [k, v] of Object.entries(outHeaders)) res.setHeader(k, v)
          if (!outHeaders['Content-Type'] && !res.getHeader('Content-Type')) res.setHeader('Content-Type', contentType)
          res.writeHead(statusCode)
          res.end(body)
        },
        json(obj) {
          for (const [k, v] of Object.entries(outHeaders)) res.setHeader(k, v)
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.writeHead(statusCode)
          res.end(JSON.stringify(obj))
        },
        end() { res.writeHead(statusCode); res.end() }
      }

      await apiHandler(fakeReq, fakeRes)
    } catch (e) {
      console.error('[LOCAL-SERVER] API error:', e)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, erro: e.message }))
    }
    return
  }

  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname)
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden'); return
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'index.html')
  }
  const ext = path.extname(filePath)
  const mime = MIME[ext] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': mime })
  fs.createReadStream(filePath).pipe(res)
})

server.listen(PORT, () => {
  console.log(`Servidor local rodando em http://localhost:${PORT}`)
})
