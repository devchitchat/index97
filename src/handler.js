import { render } from './template.js'

export async function dispatch(handlerFn, req, route) {
  const result = await handlerFn(req)

  if (result instanceof Response) return { response: result, data: {} }

  if (typeof result === 'string') {
    return {
      response: new Response(result, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
      data: {}
    }
  }

  if (typeof result === 'object' && result !== null) {
    if (!route.template) {
      return { response: new Response('No template found for handler', { status: 500 }), data: {} }
    }
    const template = await Bun.file(route.template).text()
    const html = render(template, result)
    return {
      response: new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
      data: result
    }
  }

  return { response: new Response('Handler returned unexpected value', { status: 500 }), data: {} }
}
