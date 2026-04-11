import { deleteSession, logAuthEvent } from '../_accounts.js'
import { clearSessionCookie, getClientIp } from '../_auth.js'

export async function POST(req) {
  const cookie = req.headers.get('Cookie') ?? ''
  const token = cookie.match(/(?:^|;\s*)sid=([^;]+)/)?.[1]
  if (token) {
    deleteSession(token)
    logAuthEvent('signout', { ip: getClientIp(req) })
  }

  return new Response(null, {
    status: 303,
    headers: {
      'Location': '/',
      'Set-Cookie': clearSessionCookie()
    }
  })
}
