import { findSession } from './_accounts.js'

const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''

export function sessionCookie(token, { sameSite = 'Strict' } = {}) {
  return `sid=${token}; HttpOnly; Path=/; SameSite=${sameSite}${secure}`
}

export function clearSessionCookie() {
  return `sid=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`
}

export function getClientIp(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? null
}

export function getSession(req) {
  const cookie = req.headers.get('Cookie') ?? ''
  const token = cookie.match(/(?:^|;\s*)sid=([^;]+)/)?.[1]
  if (!token) return null
  return findSession(token)
}

export function isAdmin(session) {
  return session?.role === 'admin'
}

export function requireAdmin(req) {
  const session = getSession(req)
  if (!isAdmin(session)) throw Object.assign(new Error('Unauthorized'), { status: 401 })
  return session
}
