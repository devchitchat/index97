fetch('/signup/form')
  .then(r => r.text())
  .then(html => { document.getElementById('signup-form').innerHTML = html })
