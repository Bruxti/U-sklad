document.addEventListener('DOMContentLoaded', async () => {
  if (!window.USklad) return

  const productId = new URLSearchParams(window.location.search).get('id')

  const titleEl = document.querySelector('[data-product-title]')
  const breadcrumbTitleEl = document.querySelector('[data-product-title-breadcrumb]')
  const imageEl = document.querySelector('[data-product-image]')
  const priceEl = document.querySelector('[data-product-price]')
  const ratingEl = document.querySelector('[data-product-rating]')
  const descriptionEl = document.querySelector('[data-product-description]')
  const fullDescriptionEl = document.querySelector('[data-full-description]')
  const specsEl = document.querySelector('[data-product-specs]')
  const highlightsEl = document.querySelector('[data-product-highlights]')
  const tagsEl = document.querySelector('[data-product-tags]')
  const addButton = document.querySelector('[data-product-add-to-cart]')
  const minusButton = document.querySelector('[data-quantity-minus]')
  const plusButton = document.querySelector('[data-quantity-plus]')
  const quantityValue = document.querySelector('[data-quantity-value]')
  const thumbsRoot = document.querySelector('[data-product-thumbs]')
  const prevButton = document.querySelector('[data-slider-prev]')
  const nextButton = document.querySelector('[data-slider-next]')
  const accordionToggle = document.querySelector('[data-accordion-toggle]')
  const accordionPanel = document.querySelector('[data-accordion-panel]')

  let quantity = 1
  let currentImageIndex = 0
  const maxQuantity = 99

  const fmt = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)

  function renderQuantity() {
    if (quantityValue) quantityValue.textContent = String(quantity)
  }

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

  function setActiveImage(product) {
    const images = (product.images && product.images.length ? product.images : [product.thumbnail]).filter(Boolean)
    const safe = Math.max(0, Math.min(currentImageIndex, images.length - 1))
    currentImageIndex = safe
    if (imageEl) {
      imageEl.src = images[safe]
      imageEl.alt = product.name
    }
    if (thumbsRoot) {
      thumbsRoot.innerHTML = images
        .map(
          (src, i) =>
            `<button type="button" class="product-page_thumb${i === safe ? ' product-page_thumb--active' : ''}" data-thumb-index="${i}">
               <img src="${src}" alt="">
             </button>`,
        )
        .join('')
      thumbsRoot.querySelectorAll('[data-thumb-index]').forEach((b) => {
        b.addEventListener('click', () => {
          currentImageIndex = Number(b.dataset.thumbIndex)
          setActiveImage(product)
        })
      })
    }
  }

  function toggleAccordion() {
    if (!accordionToggle || !accordionPanel) return
    const open = accordionToggle.getAttribute('aria-expanded') === 'true'
    accordionToggle.setAttribute('aria-expanded', String(!open))
    accordionPanel.hidden = open
  }

  let product = null
  try {
    product = await window.USklad.getProductById(productId)
  } catch (e) {
    console.error('Failed to fetch product:', e)
  }

  if (!product) {
    if (titleEl) titleEl.textContent = 'Товар не найден'
    if (breadcrumbTitleEl) breadcrumbTitleEl.textContent = 'Товар не найден'
    if (descriptionEl) descriptionEl.textContent = 'Запрошенный товар недоступен.'
    if (priceEl) priceEl.textContent = ''
    if (ratingEl) ratingEl.innerHTML = ''
    if (addButton) addButton.disabled = true
    return
  }

  if (breadcrumbTitleEl) breadcrumbTitleEl.textContent = product.name
  if (titleEl) titleEl.textContent = product.name
  if (priceEl) priceEl.textContent = fmt(product.price)

  if (ratingEl) {
    ratingEl.innerHTML = `
      <div class="product-page_stars" aria-hidden="true">${renderStars(product.rating)}</div>
      <span class="product-page_rating-text">${product.rating.toFixed(1)} из 5 звёзд</span>`
  }

  if (tagsEl) {
    tagsEl.innerHTML = (product.tags || [])
      .map((t) => `<span class="product-page_tag-chip">${t}</span>`)
      .join('')
  }
  if (descriptionEl) descriptionEl.textContent = product.description
  if (fullDescriptionEl) fullDescriptionEl.textContent = product.fullDescription
  if (specsEl) {
    specsEl.innerHTML = (product.specs || [])
      .map((s) => `<li class="product-page_spec-item">${s}</li>`)
      .join('')
  }
  if (highlightsEl) {
    highlightsEl.innerHTML = (product.highlights || [])
      .map((h) => `<li class="product-page_highlight-item">${h}</li>`)
      .join('')
  }

  setActiveImage(product)
  renderQuantity()
  await updateCartButton(product.id, addButton)

  minusButton?.addEventListener('click', () => {
    quantity = Math.max(1, quantity - 1)
    renderQuantity()
  })
  plusButton?.addEventListener('click', () => {
    quantity = Math.min(maxQuantity, quantity + 1)
    renderQuantity()
  })

  prevButton?.addEventListener('click', () => {
    const images = (product.images?.length ? product.images : [product.thumbnail]).filter(Boolean)
    currentImageIndex = (currentImageIndex - 1 + images.length) % images.length
    setActiveImage(product)
  })
  nextButton?.addEventListener('click', () => {
    const images = (product.images?.length ? product.images : [product.thumbnail]).filter(Boolean)
    currentImageIndex = (currentImageIndex + 1) % images.length
    setActiveImage(product)
  })

  accordionToggle?.addEventListener('click', toggleAccordion)

  addButton?.addEventListener('click', async () => {
    if (!window.USklad.getToken()) {
      window.USklad.redirectToLogin()
      return
    }
    try {
      await window.USklad.addToCart(product.id, quantity)
      await updateCartButton(product.id, addButton)
    } catch (err) {
      alert(err.message || 'Не удалось добавить в корзину')
    }
  })

  window.addEventListener('USklad:cartchange', () => updateCartButton(product.id, addButton))
})

async function updateCartButton(productId, button) {
  if (!button) return
  if (!window.USklad.getToken()) {
    button.textContent = 'В корзину'
    button.disabled = false
    button.classList.remove('product-page_cart-button--in-cart')
    return
  }
  try {
    const cart = await window.USklad.getCart()
    const inCart = cart.items.some((i) => i.productId === productId)
    button.textContent = inCart ? 'В корзине' : 'В корзину'
    button.disabled = inCart
    button.classList.toggle('product-page_cart-button--in-cart', inCart)
  } catch {
    button.textContent = 'В корзину'
    button.disabled = false
    button.classList.remove('product-page_cart-button--in-cart')
  }
}