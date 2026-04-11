const OVERRIDE_METHODS = new Set(['DELETE', 'PUT', 'PATCH'])

export function rewriteFormMethods(html) {
  return html.replace(/<form([^>]*)>/gi, (match, attrs) => {
    const methodMatch = attrs.match(/\bmethod="([^"]+)"/i)
    if (!methodMatch) return match
    const method = methodMatch[1].toUpperCase()
    if (!OVERRIDE_METHODS.has(method)) return match
    const rewritten = attrs.replace(/\bmethod="[^"]+"/i, 'method="POST"')
    return `<form${rewritten}><input type="hidden" name="_method" value="${method}">`
  })
}

export async function resolveMethod(req) {
  if (req.method !== 'POST') return { method: req.method, req }
  const contentType = req.headers.get('Content-Type') || ''
  if (!contentType.includes('application/x-www-form-urlencoded')) return { method: 'POST', req }
  const body = await req.text()
  const params = new URLSearchParams(body)
  const override = params.get('_method')?.toUpperCase()
  const method = (override && OVERRIDE_METHODS.has(override)) ? override : 'POST'
  const resolved = new Request(req.url, { method, headers: req.headers, body })
  resolved.params = req.params
  return { method, req: resolved }
}
