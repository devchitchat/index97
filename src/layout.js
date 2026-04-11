import path from 'node:path'

export async function findLayoutData(layoutPath) {
  const jsPath = layoutPath.replace(/\.html$/, '.js')
  if (await Bun.file(jsPath).exists()) return jsPath
  return null
}

export async function findLayout(filePath, pagesDir) {
  let dir = path.dirname(filePath)
  while (true) {
    const layoutPath = path.join(dir, '_layout.html')
    if (await Bun.file(layoutPath).exists()) return layoutPath
    if (dir === pagesDir) break
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function extractSlots(html) {
  const slots = {}
  const content = html.replace(/<template\s+data-slot="([^"]+)">([\s\S]*?)<\/template>/g, (_, name, slotContent) => {
    slots[name] = slotContent.trim()
    return ''
  }).trim()
  return { content, slots }
}

export function applyLayout(pageHtml, layoutHtml) {
  const { content, slots } = extractSlots(pageHtml)

  return layoutHtml
    .replace('{{content}}', content)
    .replace(/\{\{slot:([^|{}]+?)(?:\s*\|\|\s*([^}]*))?\}\}/g, (_, name, defaultValue = '') => {
      return name.trim() in slots ? slots[name.trim()] : defaultValue.trim()
    })
}
