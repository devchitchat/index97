fetch('/signin/form')
  .then(r => r.text())
  .then(html => { document.getElementById('signin-form').innerHTML = html })
