export function parseFrontMatter(src) {
  if (!src.startsWith('---')) return { data: {}, content: src }
  const end = src.indexOf('\n---', 3)
  if (end === -1) return { data: {}, content: src }
  const yaml = src.slice(3, end).trim()
  const content = src.slice(end + 4).trim()
  return { data: Bun.YAML.parse(yaml) ?? {}, content }
}

export function renderMarkdown(src) {
  const { data, content } = parseFrontMatter(src)
  const html = Bun.markdown.html(content, {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
  })
  return { html, data }
}
