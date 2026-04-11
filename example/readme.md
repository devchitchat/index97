---
title: readme — index97
description: Building websites like it's 1997.
---

# index97

Building websites like it's 1997.

## Principles

- Just leverage the web platform
- Use JavaScript, CSS and HTML
- Minimize dependencies
- Serving web pages is super fast — start there
- Super fast developer workflow — hot reload, immediately see your changes
- Routes are simple — `index.html` loads at `/`
- Serve HTML fragments for component-based architecture

## Conventions

| File | Route | Kind |
|---|---|---|
| `index.html` | `/` | page |
| `about.html` | `/about` | page |
| `blog/[slug].js` | `/blog/:slug` | handler |
| `signin.phtml` | `/signin` | partial |
| `post.md` | `/post` | markdown |
| `_layout.html` | — | layout |
| `public/` | — | static assets |

## Layouts

Use `_layout.html` with `{{content}}` and named slots:

```html
<title>{{slot:title || index97}}</title>
{{slot:head}}
<main>{{content}}</main>
```

Pages set slots with `<template data-slot>`:

```html
<template data-slot="title">My Page</template>
<h1>My Page</h1>
```

Markdown files use front matter:

```markdown
---
title: My Post
---

# My Post
```
