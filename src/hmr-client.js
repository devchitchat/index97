(function(){
  const es = new EventSource('/__index97_hmr')
  es.onmessage = async (e) => {
    const { type } = JSON.parse(e.data)
    if (type === 'css') {
      document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const url = new URL(link.href)
        link.href = url.origin + url.pathname + '?t=' + Date.now()
      })
      return
    }
    const res = await fetch(location.href)
    const html = await res.text()
    const next = new DOMParser().parseFromString(html, 'text/html')
    morph(document.documentElement, next.documentElement)
  }

  function morph(oldNode, newNode) {
    const oldChildren = [...oldNode.childNodes]
    const newChildren = [...newNode.childNodes]
    const len = Math.max(oldChildren.length, newChildren.length)
    for (let i = 0; i < len; i++) {
      patch(oldNode, oldChildren[i], newChildren[i])
    }
  }

  function patch(parent, oldChild, newChild) {
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
    patchAttrs(oldChild, newChild)
    morph(oldChild, newChild)
  }

  function patchAttrs(oldEl, newEl) {
    for (const { name } of [...oldEl.attributes]) {
      if (!newEl.hasAttribute(name)) oldEl.removeAttribute(name)
    }
    for (const { name, value } of newEl.attributes) {
      if (oldEl.getAttribute(name) !== value) oldEl.setAttribute(name, value)
    }
  }
})()