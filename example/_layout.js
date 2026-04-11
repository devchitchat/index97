import { getSession } from './_auth.js'

export function data(req) {
  const session = getSession(req)
  return { session }
}
