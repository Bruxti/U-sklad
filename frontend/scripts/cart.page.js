document.addEventListener('DOMContentLoaded', async () => {
  if (!window.USklad) return
  if (!window.USklad.getToken()) {
    window.USklad.redirectToLogin()
    return
  }

  const itemsRoot = document.querySelector('[data-cart-items]')
  const emptyState = document.querySelector('[data-cart-empty]')
  const summaryPanel = document.querySelector('[data-cart-summary]')
  const countEl = document.querySelector('[data-cart-count]')
  const summaryCountEl = document.querySelector('[data-cart-summary-count]')
  const subtotalEl = document.querySelector('[data-cart-subtotal]')
  const discountEl = document.querySelector('[data-cart-discount]')
  const totalEl = document.querySelector('[data-cart-total]')
  const promoInput = document.querySelector('[data-promo-input]')
  const promoButton = document.querySelector('[data-promo-apply]')
  const promoMessage = document.querySelector('[data-promo-message]')
  const checkoutButton = document.querySelector('[data-cart-checkout]')

  const fmt = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)

  function setPromoMessage(text = '', state = '') {
    if (!promoMessage) return
    promoMessage.textContent = text
    promoMessage.dataset.state = state
  }

  function renderEmpty() {
    if (itemsRoot) itemsRoot.innerHTML = ''
    if (emptyState) emptyState.hidden = false
    if (summaryPanel) summaryPanel.hidden = true
    if (countEl) countEl.textContent = '0 товар(ов)'
    if (summaryCountEl) summaryCountEl.textContent = '0 товар(ов)'
    if (subtotalEl) subtotalEl.textContent = fmt(0)
    if (discountEl) discountEl.textContent = fmt(0)
    if (totalEl) totalEl.textContent = fmt(0)
  }

  function renderItem(item) {
    return `
      <article class="cart-item" data-item-id="${item.id}">
        <a class="cart-item_link" href="product.html?id=${item.productId}">
          <img class="cart-item_image" src="${item.product.thumbnail}" alt="${item.product.name}">
          <div class="cart-item_content">
            <h3 class="cart-item_title">${item.product.name}</h3>
            <p class="cart-item_subtitle">${item.product.tags[0] || ''}</p>
            <p class="cart-item_unit-price">${fmt(item.unitPrice)} за шт.</p>
          </div>
        </a>
        <div class="cart-item_actions">
          <div class="cart-item_qty">
            <button type="button" class="cart-item_qty-btn" data-action="decrease">−</button>
            <span class="cart-item_qty-value">${item.quantity}</span>
            <button type="button" class="cart-item_qty-btn" data-action="increase">+</button>
          </div>
          <div class="cart-item_price">${fmt(item.lineTotal)}</div>
          <button type="button" class="cart-item_remove" data-action="remove">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </article>`
  }

  function renderCart(cart) {
    if (!cart.items.length) return renderEmpty()
    if (emptyState) emptyState.hidden = true
    if (summaryPanel) summaryPanel.hidden = false
    if (itemsRoot) itemsRoot.innerHTML = cart.items.map(renderItem).join('')
    if (countEl) countEl.textContent = `${cart.itemCount} товар(ов)`
    if (summaryCountEl) summaryCountEl.textContent = `${cart.itemCount} товар(ов)`
    if (subtotalEl) subtotalEl.textContent = fmt(cart.subtotal)
    if (discountEl) discountEl.textContent = cart.discount ? `- ${fmt(cart.discount)}` : fmt(0)
    if (totalEl) totalEl.textContent = fmt(cart.total)
    if (promoInput) promoInput.value = cart.promoCode || ''
    setPromoMessage(cart.promoCode ? `Применён ${cart.promoCode}` : '', cart.promoCode ? 'success' : '')
  }

  async function reload() {
    try {
      renderCart(await window.USklad.getCart())
    } catch (e) {
      if (e.status === 401) window.USklad.redirectToLogin()
    }
  }

  itemsRoot?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]')
    const card = e.target.closest('[data-item-id]')
    if (!btn || !card) return
    const itemId = Number(card.dataset.itemId)
    const action = btn.dataset.action
    const cart = await window.USklad.getCart()
    const item = cart.items.find((i) => i.id === itemId)
    if (!item) return
    try {
      if (action === 'increase') await window.USklad.setCartItemQuantity(itemId, item.quantity + 1)
      else if (action === 'decrease' && item.quantity > 1)
        await window.USklad.setCartItemQuantity(itemId, item.quantity - 1)
      else if (action === 'decrease')
        await window.USklad.removeCartItem(itemId)
      else if (action === 'remove') await window.USklad.removeCartItem(itemId)
      await reload()
    } catch (err) {
      alert(err.message || 'Ошибка')
    }
  })

  promoButton?.addEventListener('click', async () => {
    const code = promoInput?.value.trim() || ''
    if (!code) {
      setPromoMessage('Введите промокод', 'error')
      return
    }
    try {
      await window.USklad.applyPromo(code)
      setPromoMessage('Промокод применён', 'success')
      await reload()
    } catch (err) {
      setPromoMessage(err.message || 'Неверный промокод', 'error')
    }
  })

  checkoutButton?.addEventListener('click', async () => {
    try {
      await window.USklad.checkout()
      alert('Спасибо за покупку!')
      await reload()
    } catch (err) {
      alert(err.message || 'Не удалось оформить заказ')
    }
  })

  await reload()
})