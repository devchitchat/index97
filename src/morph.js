export function morph(oldNode, newNode) {
  const oldChildren = [...oldNode.childNodes]
  const newChildren = [...newNode.childNodes]
  const len = Math.max(oldChildren.length, newChildren.length)
  for (let i = 0; i < len; i++) {
    patch(oldNode, oldChildren[i], newChildren[i])
  }
}

export function patch(parent, oldChild, newChild) {
  if (!oldChild) { parent.appendChild(newChild.cloneNode(true)); return }
  if (!newChild) { parent.removeChild(oldChild); return }
  if (oldChild.nodeType !== newChild.nodeType || oldChild.nodeName !== newChild.nodeName) {
    parent.replaceChild(newChild.cloneNode(true), oldChild)
    return
  }
  if (oldChild.nodeType === 3) {
    if (oldChild.textContent !== newChild.textContent) oldChild.textContent = newChild.textContent
    return
  }
  if (oldChild.nodeType === 1) patchAttrs(oldChild, newChild)
  morph(oldChild, newChild)
}

export function patchAttrs(oldEl, newEl) {
  const oldAttrs = oldEl.attributes
  const newAttrs = newEl.attributes
  if (!oldAttrs || !newAttrs) return
  for (const { name } of [...oldAttrs]) {
    if (!newEl.hasAttribute(name)) oldEl.removeAttribute(name)
  }
  for (const { name, value } of newAttrs) {
    if (oldEl.getAttribute(name) !== value) oldEl.setAttribute(name, value)
  }
}
