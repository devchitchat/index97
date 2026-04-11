import { createAccount, findByEmail, logAuthEvent } from '../_accounts.js'
import { getClientIp } from '../_auth.js'

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128
const MAX_EMAIL_LENGTH = 254

const ERRORS = {
  required: 'Email and password are required.',
  password_too_short: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  email_taken: 'An account with that email already exists.',
}

export async function GET(req) {
  const code = new URL(req.url).searchParams.get('e') ?? ''
  const error = ERRORS[code] ?? ''
  return { error }
}

export async function POST(req) {
  const form = await req.formData()
  const email = (form.get('email') ?? '').trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH)
  const password = (form.get('password') ?? '').slice(0, MAX_PASSWORD_LENGTH)
  const ip = getClientIp(req)

  if (!email || !password) {
    return Response.redirect('/signup?e=required', 303)
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return Response.redirect('/signup?e=password_too_short', 303)
  }

  if (findByEmail(email)) {
    return Response.redirect('/signup?e=email_taken', 303)
  }

  const passwordHash = await Bun.password.hash(password)
  const result = createAccount(email, passwordHash)
  logAuthEvent('signup', { accountId: Number(result.lastInsertRowid), email, ip })

  return Response.redirect('/signin', 303)
}
