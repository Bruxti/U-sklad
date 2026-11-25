(() => {
  const API = window.SHOP_CONFIG?.apiBase || 'http://localhost:3000'
  const TOKEN_KEY = 'USklad_token'
  const CART_CHANGE_EVENT = 'USklad:cartchange'

  // ---------- auth ----------
  function getToken() {
    return localStorage.getItem(TOKEN_KEY)
  }
  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  }
  function decodeToken(token) {
    if (!token) return null
    try {
      const [, payload] = token.split('.')
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    } catch {
      return null
    }
  }
  function getCurrentUser() {
    const t = getToken()
    if (!t) return null
    const p = decodeToken(t)
    if (!p) return null
    return { id: Number(p.sub), role: p.role }
  }
  function isAdmin() {
    return getCurrentUser()?.role === 'admin'
  }
  function logout() {
    setToken(null)
    window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT, { detail: { count: 0 } }))
  }

  // ---------- HTTP ----------
  async function request(method, path, { body, auth = false } = {}) {
    const headers = {}
    if (body !== undefined) headers['content-type'] = 'application/json'
    if (auth) {
      const token = getToken()
      if (!token) throw { status: 401, code: 'NO_TOKEN', message: 'Требуется вход' }
      headers.authorization = `Bearer ${token}`
    }

    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let data = null
    if (text) {
      try { data = JSON.parse(text) } catch { data = text }
    }
    if (!res.ok) {
      const err = data?.error || { code: 'HTTP_ERROR', message: `HTTP ${res.status}` }
      throw { status: res.status, ...err }
    }
    return data
  }

  // ---------- products ----------
  async function loadProducts(params = {}) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return request('GET', `/api/products${suffix}`)
  }

  async function getProductById(id) {
    if (!id) return null
    try {
      return await request('GET', `/api/products/${id}`)
    } catch (e) {
      if (e.status === 404) return null
      throw e
    }
  }

  async function getHomeProducts(limit = 6) {
    const res = await loadProducts({ limit, sort_by: 'title', order: 'asc' })
    return res.items
  }

  // ---------- cart ----------
  async function getCart() {
    if (!getToken()) return { items: [], subtotal: 0, discount: 0, total: 0, promoCode: null, itemCount: 0 }
    return request('GET', '/api/cart', { auth: true })
  }

  async function addToCart(productId, quantity = 1) {
    if (!getToken()) {
      redirectToLogin()
      throw { status: 401, code: 'NO_TOKEN' }
    }
    const cart = await request('POST', '/api/cart/items', {
      auth: true,
      body: { productId, quantity },
    })
    emitCartChange(cart)
    return cart
  }

  async function setCartItemQuantity(itemId, quantity) {
    const cart = await request('PATCH', `/api/cart/items/${itemId}`, {
      auth: true,
      body: { quantity },
    })
    emitCartChange(cart)
    return cart
  }

  async function removeCartItem(itemId) {
    const cart = await request('DELETE', `/api/cart/items/${itemId}`, { auth: true })
    emitCartChange(cart)
    return cart
  }

  async function applyPromo(code) {
    const cart = await request('POST', '/api/cart/apply-promo', {
      auth: true,
      body: { code },
    })
    emitCartChange(cart)
    return cart
  }

  async function checkout() {
    const res = await request('POST', '/api/cart/checkout', { auth: true, body: {} })
    emitCartChange({ itemCount: 0 })
    return res
  }

  // ---------- shared ----------
  async function refreshCartBadge() {
    const count = getToken() ? (await getCart()).itemCount : 0
    document.querySelectorAll('[data-cart-badge]').forEach((b) => {
      b.textContent = String(count)
      b.hidden = count === 0
    })
    return count
  }

  function emitCartChange(cart) {
    const count = cart?.itemCount ?? 0
    document.querySelectorAll('[data-cart-badge]').forEach((b) => {
      b.textContent = String(count)
      b.hidden = count === 0
    })
    window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT, { detail: { count, cart } }))
  }

  function redirectToLogin() {
    const ret = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `login.html?return=${ret}`
  }

  document.addEventListener('DOMContentLoaded', () => {
    refreshCartBadge().catch(() => {})
  })

  window.USklad = {
    API,
    request,
    // auth
    getToken, setToken, getCurrentUser, isAdmin, logout,
    // products
    loadProducts, getProductById, getHomeProducts,
    // cart
    getCart, addToCart, setCartItemQuantity, removeCartItem, applyPromo, checkout,
    // misc
    refreshCartBadge, emitCartChange, redirectToLogin,
  }
})()