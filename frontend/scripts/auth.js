document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('[data-login-form]')
  const registerForm = document.querySelector('[data-register-form]')
  const errorBox = document.querySelector('[data-auth-error]')

  function showError(msg) {
    if (!errorBox) return
    errorBox.textContent = msg
    errorBox.hidden = false
  }

  function redirectAfterAuth() {
    const params = new URLSearchParams(window.location.search)
    const ret = params.get('return') || 'index.html'
    window.location.href = ret
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(loginForm)
      try {
        const res = await window.USklad.request('POST', '/api/auth/login', {
          body: { email: fd.get('email'), password: fd.get('password') },
        })
        window.USklad.setToken(res.accessToken)
        await window.USklad.refreshCartBadge()
        redirectAfterAuth()
      } catch (err) {
        showError(err.message || 'Ошибка входа')
      }
    })
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(registerForm)
      try {
        const res = await window.USklad.request('POST', '/api/auth/register', {
          body: { email: fd.get('email'), password: fd.get('password') },
        })
        window.USklad.setToken(res.accessToken)
        await window.USklad.refreshCartBadge()
        redirectAfterAuth()
      } catch (err) {
        showError(err.message || 'Ошибка регистрации')
      }
    })
  }
})