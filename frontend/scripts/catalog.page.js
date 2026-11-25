document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('products-grid')
  const template = document.getElementById('product-card-template')
  const countEl = document.querySelector('.catalog_count')
  const searchInput = document.querySelector('.catalog_search input')
  const sortSelect = document.querySelector('.catalog_select')
  const ratingInputs = document.querySelectorAll('input[name="rating"]')
  const priceInputs = document.querySelectorAll('.catalog_price-field input')

  console.log('[catalog] init, url =', location.href)
  console.log('[catalog] grid:', !!grid, '| template:', !!template)

  if (!grid) { console.error('[catalog] #products-grid не найден'); return }
  if (!template) { console.error('[catalog] #product-card-template не найден'); return }

  let pager = document.getElementById('catalog-pagination')
  if (!pager) {
    pager = document.createElement('div')
    pager.id = 'catalog-pagination'
    pager.className = 'catalog_pagination'
    grid.after(pager)
  }

  const state = { page: 1, limit: 12, totalPages: 1 }

  const fmt = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)

  function renderStars(rating) {
    const full = Math.floor(rating)
    const half = rating - full >= 0.25 && rating - full < 0.75
    const stars = []
    for (let i = 0; i < 5; i++) {
      if (i < full) stars.push('<i class="fa-solid fa-star"></i>')
      else if (i === full && half) stars.push('<i class="fa-solid fa-star-half-stroke"></i>')
      else stars.push('<i class="fa-regular fa-star"></i>')
    }
    return stars.join('')
  }

  function getSelectedMinRating() {
    const vals = [...ratingInputs].filter(i => i.checked).map(i => Number(i.value)).filter(Number.isFinite)
    return vals.length ? Math.min(...vals) : undefined
  }

  function buildQuery() {
    const [minInput, maxInput] = priceInputs
    const q = {
      page: state.page,
      limit: state.limit,
      search: String(searchInput?.value ?? '').trim() || undefined,
      min_price: minInput?.value ? Number(minInput.value) : undefined,
      max_price: maxInput?.value ? Number(maxInput.value) : undefined,
      min_rating: getSelectedMinRating(),
    }
    const map = {
      'name-asc': ['title', 'asc'],
      'name-desc': ['title', 'desc'],
      'price-asc': ['price', 'asc'],
      'price-desc': ['price', 'desc'],
      'rating-desc': ['title', 'asc'],
    }
    const [sort_by, order] = map[sortSelect?.value] || ['title', 'asc']
    q.sort_by = sort_by
    q.order = order
    return q
  }

  function setLinks(node, product) {
    const url = `product.html?id=${encodeURIComponent(product.id)}`
    node.querySelectorAll('a').forEach((a) => {
      if (a.hasAttribute('data-product-add-to-cart')) return
      a.setAttribute('href', url)
    })
  }

  function renderCard(product) {
    const node = template.content.cloneNode(true)
    setLinks(node, product)

    const img = node.querySelector('[data-product-image]')
    const price = node.querySelector('[data-product-price]')
    const title = node.querySelector('[data-product-title]')
    const reviews = node.querySelector('[data-product-reviews]')
    const stars = node.querySelector('.product-card_stars')
    const addBtn = node.querySelector('[data-product-add-to-cart]')

    if (img) { img.src = product.thumbnail; img.alt = product.name }
    if (price) price.textContent = fmt(product.price)
    if (title) title.textContent = product.name
    if (reviews) reviews.textContent = `(${Number(product.rating).toFixed(1)})`
    if (stars) stars.innerHTML = renderStars(product.rating)
    if (addBtn) {
      addBtn.textContent = 'В корзину'
      addBtn.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        try { await window.USklad.addToCart(product.id, 1) }
        catch (err) { if (err.status !== 401) alert(err.message || 'Ошибка') }
      })
    }
    return node
  }

  function renderPager() {
    if (state.totalPages <= 1) { pager.innerHTML = ''; return }
    const btn = (label, page, active = false, disabled = false) =>
      `<button type="button" class="catalog_pagination-btn${active ? ' is-active' : ''}"
        data-page="${page}" ${disabled ? 'disabled' : ''}>${label}</button>`
    const parts = [btn('‹', state.page - 1, false, state.page === 1)]
    for (let p = 1; p <= state.totalPages; p++) parts.push(btn(String(p), p, p === state.page))
    parts.push(btn('›', state.page + 1, false, state.page === state.totalPages))
    pager.innerHTML = parts.join('')
  }

  pager.addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]')
    if (!b || b.disabled) return
    state.page = Number(b.dataset.page)
    render()
  })

  async function render() {
    try {
      const res = await window.USklad.loadProducts(buildQuery())
      state.totalPages = res.meta.total_pages
      if (countEl) countEl.textContent = `${res.meta.total_items} товар(ов)`
      grid.innerHTML = ''
      if (!res.items.length) {
        grid.innerHTML = '<div class="catalog_empty">Товары не найдены.</div>'
        renderPager()
        return
      }
      res.items.forEach((p) => grid.appendChild(renderCard(p)))
      renderPager()
      console.log('[catalog] rendered', res.items.length, 'cards. First href:',
        grid.querySelector('a')?.getAttribute('href'))
    } catch (e) {
      console.error(e)
      grid.innerHTML = '<div class="catalog_empty">Не удалось загрузить товары.</div>'
    }
  }

  let timer = null
  const debouncedRender = () => {
    clearTimeout(timer)
    state.page = 1
    timer = setTimeout(render, 300)
  }

  searchInput?.addEventListener('input', debouncedRender)
  sortSelect?.addEventListener('change', () => { state.page = 1; render() })
  ratingInputs.forEach(i => i.addEventListener('change', () => { state.page = 1; render() }))
  priceInputs.forEach(i => i.addEventListener('input', debouncedRender))

  render()
})