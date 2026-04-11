import { findByEmail, createSession, logAuthEvent } from '../_accounts.js'
import { sessionCookie, getClientIp } from '../_auth.js'
import { createRateLimiter } from '../../src/rate-limit.js'

const ERRORS = {
  invalid_credentials: 'Invalid email or password.',
}

// 10 attempts per 15 minutes per IP
const rateLimit = createRateLimiter({ windowMs: 15 * 60_000, max: 10 })

export async function GET(req) {
  const code = new URL(req.url).searchParams.get('e') ?? ''
  const error = ERRORS[code] ?? ''
  return { error }
}

export async function POST(req) {
  rateLimit(req)

  const form = await req.formData()
  const email = (form.get('email') ?? '').trim().toLowerCase()
  const password = form.get('password') ?? ''
  const ip = getClientIp(req)

  const account = email ? findByEmail(email) : null
  if (!account || !password || !(await Bun.password.verify(password, account.password_hash))) {
    logAuthEvent('signin_fail', { email: email || null, ip })
    return Response.redirect('/signin?e=invalid_credentials', 303)
  }

  const token = createSession(account.id)
  logAuthEvent('signin_success', { accountId: account.id, email: account.email, ip })

  return new Response(null, {
    status: 303,
    headers: {
      'Location': '/',
      'Set-Cookie': sessionCookie(token)
    }
  })
}
