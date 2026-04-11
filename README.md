# index97

A Bun-native web framework. File-based routing, server-side templates, zero config.

---

## Prerequisites

Install [Bun](https://bun.sh):

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Phase 1 — Up and running in 5 minutes

**1. Create a project**

```bash
mkdir my-site && cd my-site
bun init -y
bun add @devchitchat/index97
```

**2. Create the entry point**

```js
// server.js
import { createServer } from '@devchitchat/index97'
createServer({ pagesDir: './pages' })
```

**3. Create your first page and layout**

```bash
mkdir pages pages/public
```

```html
<!-- pages/_layout.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{slot:title || My Site}}</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>
  <main>
    {{content}}
  </main>
</body>
</html>
```

```html
<!-- pages/index.html -->
<template data-slot="title">Home — My Site</template>

<h1>Hello, world.</h1>
<include src="_greeting.phtml">
```

```html
<!-- pages/_greeting.phtml -->
<p>Welcome to index97. Files are routes. No config needed.</p>
```

```css
/* pages/public/style.css */
body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
nav a { margin-right: 1rem; }
```

**4. Run it**

```bash
bun server.js
```

Open [http://localhost:3000](http://localhost:3000). Edit any file — the browser updates instantly.

---

## Phase 2 — Level up

### Dynamic routes

Wrap a folder name in brackets to make it a parameter.

```
pages/
  blog/
    [slug].js       ← handles /blog/hello-world
    [slug].phtml    ← template for the above
```

```js
// pages/blog/[slug].js
import db from './_db.js'

export async function GET(req) {
  const post = db.query('SELECT * FROM posts WHERE slug = ?').get(req.params.slug)
  if (!post) return new Response('', { status: 404 })
  return { post }
}
```

```html
<!-- pages/blog/[slug].phtml -->
<h1>{{post.title}}</h1>
<p>{{post.body}}</p>
```

### Templates

| Syntax | What it does |
|--------|-------------|
| `{{name}}` | Render value, HTML-escaped |
| `{{{name}}}` | Render value, raw HTML |
| `{{#if name}}...{{/if}}` | Conditional |
| `{{#each items}}...{{/each}}` | Loop — `{{this}}` is each item |
| `<include src="partial.phtml">` | Server-side partial |
| `<include src="partial.phtml" label="@item.label">` | Pass data to partial |

### Layout slots

Pages can inject into named slots in the layout:

```html
<!-- in any page -->
<template data-slot="title">About — My Site</template>
<template data-slot="head">
  <link rel="stylesheet" href="/about.css">
</template>

<h1>About</h1>
```

```html
<!-- in _layout.html -->
<title>{{slot:title || My Site}}</title>
{{slot:head}}
{{content}}
```

### Server-side layout data

Export a `data` function from `_layout.js` to make values available across every page — useful for navigation, session state, feature flags:

```js
// pages/_layout.js
export function data(req) {
  const session = getSession(req)
  return { session }
}
```

```html
<!-- in _layout.html -->
{{#if session}}<a href="/signout">Sign out</a>{{/if}}
```

### Forms with PUT / PATCH / DELETE

Forms only support GET and POST natively. index97 rewrites the others automatically:

```html
<form method="DELETE" action="/posts/42">
  <button>Delete</button>
</form>
```

Export the matching method from your handler:

```js
export async function DELETE(req) {
  db.run('DELETE FROM posts WHERE id = ?', [req.params.id])
  return Response.redirect('/posts', 303)
}
```

### Static site generation

Export `staticPaths()` from any dynamic handler to tell the build which URLs to render:

```js
// pages/blog/[slug].js
export function staticPaths() {
  return db.query('SELECT slug FROM posts').all().map(p => ({ slug: p.slug }))
}
```

```bash
bunx index97 build   # renders all routes to dist/
bunx index97 serve   # serves dist/ as a static site
```

---

## CLI

| Command | What it does |
|---------|-------------|
| `bunx index97` | Start dev server with HMR |
| `bunx index97 start` | Start production server |
| `bunx index97 build` | Generate static site to `dist/` |
| `bunx index97 serve` | Serve a pre-built `dist/` |

## Project layout

```
my-site/
  server.js           ← entry point
  pages/
    _layout.html      ← wraps every page
    _layout.js        ← server-side data for the layout
    index.html        ← /
    about.html        ← /about
    blog/
      index.html      ← /blog
      [slug].js       ← /blog/:slug  (handler)
      [slug].phtml    ← template for the handler
    public/
      style.css       ← served as static files
      logo.png
```

Files starting with `_` are private — they are not routes.

---

## Security

### Content Security Policy

index97 sets the following CSP header on every response by default:

```
default-src 'self'; style-src 'self'; script-src 'self'
```

This means **inline styles and inline scripts are blocked**. Use external stylesheets and script files served from `pages/public/` instead.

```html
<!-- blocked -->
<div style="color: red">hello</div>
<style>body { margin: 0 }</style>

<!-- allowed -->
<link rel="stylesheet" href="/style.css">
```

To override the CSP, pass a `csp` option to `createServer`:

```js
import { createServer } from '@devchitchat/index97'
createServer({
  pagesDir: './pages',
  csp: "default-src 'self'; style-src 'self' 'unsafe-inline'"
})
```
