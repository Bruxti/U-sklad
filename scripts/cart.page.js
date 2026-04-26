document.addEventListener('DOMContentLoaded', async () => {
  if (!window.USklad) return;

  const itemsRoot = document.querySelector('[data-cart-items]');
  const emptyState = document.querySelector('[data-cart-empty]');
  const summaryPanel = document.querySelector('[data-cart-summary]');
  const countEl = document.querySelector('[data-cart-count]');
  const summaryCountEl = document.querySelector('[data-cart-summary-count]');
  const subtotalEl = document.querySelector('[data-cart-subtotal]');
  const discountEl = document.querySelector('[data-cart-discount]');
  const totalEl = document.querySelector('[data-cart-total]');
  const promoInput = document.querySelector('[data-promo-input]');
  const promoButton = document.querySelector('[data-promo-apply]');
  const promoMessage = document.querySelector('[data-promo-message]');
  const backButtons = document.querySelectorAll('[data-cart-back]');
  const layout = document.querySelector('.cart-page_layout');
  const checkoutButton = document.querySelector('[data-cart-checkout]');

  const PROMO_CODE = 'SAVE10';
  const PROMO_DISCOUNT = 0.1;

  let promoApplied = false;

  function formatMoney(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  function renderPromoMessage(text = '', state = '') {
    if (!promoMessage) return;
    promoMessage.textContent = text;
    promoMessage.dataset.state = state;
  }

  function getItemCount(cartIds) {
    return cartIds.length;
  }

  function getItemCountText(count) {
    return `${count} товар(ов) готово к оформлению`;
  }

  function getSummaryCountText(count) {
    return `${count} товар(ов) в корзине`;
  }

  function groupCartItems(products, cartIds) {
    const productMap = new Map(products.map((product) => [product.id, product]));
    const quantityMap = new Map();

    cartIds.forEach((id) => {
      if (!productMap.has(id)) return;
      quantityMap.set(id, (quantityMap.get(id) || 0) + 1);
    });

    return Array.from(quantityMap.entries()).map(([id, quantity]) => {
      const product = productMap.get(id);

      return {
        id: product.id,
        name: product.name,
        tag: product.tags[0] || '',
        thumbnail: product.thumbnail,
        price: product.price,
        quantity,
        lineTotal: product.price * quantity
      };
    });
  }

  function renderEmpty() {
    if (itemsRoot) itemsRoot.innerHTML = '';
    if (emptyState) emptyState.hidden = false;
    if (summaryPanel) summaryPanel.hidden = true;
    layout?.classList.add('cart-page_layout--empty');

    if (countEl) countEl.textContent = '0 товар(ов) готов(о) к оформлению';
    if (summaryCountEl) summaryCountEl.textContent = '0 товар(ов) в корзине';
    if (subtotalEl) subtotalEl.textContent = formatMoney(0);
    if (discountEl) discountEl.textContent = formatMoney(0);
    if (totalEl) totalEl.textContent = formatMoney(0);
  }

  function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.25 && rating - fullStars < 0.75;

    const stars = [];
    for (let index = 0; index < 5; index += 1) {
      if (index < fullStars) {
        stars.push('<i class="fa-solid fa-star"></i>');
      } else if (index === fullStars && hasHalfStar) {
        stars.push('<i class="fa-solid fa-star-half-stroke"></i>');
      } else {
        stars.push('<i class="fa-regular fa-star"></i>');
      }
    }

    return stars.join('');
  }

  function renderItem(item) {
    const productUrl = `product.html?id=${encodeURIComponent(item.id)}`;

    return `
      <article class="cart-item" data-product-id="${item.id}">
        <a class="cart-item_link" href="${productUrl}" aria-label="Открыть товар ${item.name}">
          <img class="cart-item_image" src="${item.thumbnail}" alt="${item.name}">
          <div class="cart-item_content">
            <h3 class="cart-item_title">${item.name}</h3>
            <p class="cart-item_subtitle">${item.tag}</p>
            <div class="cart-item_meta">
              <div class="cart-item_rating" aria-label="Рейтинг ${item.quantity}">
                <span class="cart-item_stars">${renderStars(4)}</span>
              </div>
              <p class="cart-item_unit-price">${formatMoney(item.price)} за шт.</p>
            </div>
          </div>
        </a>

        <div class="cart-item_actions">
          <div class="cart-item_qty">
            <button type="button" class="cart-item_qty-btn" data-cart-action="decrease" aria-label="Уменьшить количество">−</button>
            <span class="cart-item_qty-value">${item.quantity}</span>
            <button type="button" class="cart-item_qty-btn" data-cart-action="increase" aria-label="Увеличить количество">+</button>
          </div>

          <div class="cart-item_price">${formatMoney(item.lineTotal)}</div>

          <button type="button" class="cart-item_remove" data-cart-action="remove" aria-label="Удалить товар">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </article>
    `;
  }

  function renderCart() {
    const products = window.USklad.loadProducts();
    return products.then((loadedProducts) => {
      const validProducts = loadedProducts.filter((product) => product && product.id !== null);

      window.USklad.clearInvalidCartIds(validProducts);

      const cartIds = window.USklad.getCartIds();
      const items = groupCartItems(validProducts, cartIds);

      const count = getItemCount(cartIds);

      if (countEl) countEl.textContent = getItemCountText(count);
      if (summaryCountEl) summaryCountEl.textContent = getSummaryCountText(count);
      if (cartIds.length === 0) {
        renderEmpty();
        return;
      }

      if (emptyState) emptyState.hidden = true;
      if (summaryPanel) summaryPanel.hidden = false;
      layout?.classList.remove('cart-page_layout--empty');

      if (itemsRoot) {
        itemsRoot.innerHTML = items.map(renderItem).join('');
      }

      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const discount = promoApplied ? subtotal * PROMO_DISCOUNT : 0;
      const total = subtotal - discount;

      if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
      if (discountEl) discountEl.textContent = `- ${formatMoney(discount)}`;
      if (totalEl) totalEl.textContent = formatMoney(total);
    });
  }

  async function handleCheckout() {
    alert('Спасибо за покупку!');

    promoApplied = false;

    if (promoInput) {
      promoInput.value = '';
    }

    renderPromoMessage('', '');
    window.USklad.saveCartIds([]);
    await renderCart();
  }

  if (checkoutButton) {
    checkoutButton.addEventListener('click', handleCheckout);
  }

  async function applyPromo() {
    const code = promoInput ? promoInput.value.trim().toUpperCase() : '';

    if (!code) {
      renderPromoMessage('Введите промокод', 'error');
      return;
    }

    if (code !== PROMO_CODE) {
      promoApplied = false;
      renderPromoMessage('Неверный промокод', 'error');
      await renderCart();
      return;
    }

    promoApplied = true;
    renderPromoMessage('Промокод применён', 'success');
    await renderCart();
  }

  if (itemsRoot) {
    itemsRoot.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-cart-action]');
      const card = event.target.closest('[data-product-id]');

      if (!button || !card) return;

      const id = Number(card.dataset.productId);
      const action = button.dataset.cartAction;

      if (action === 'increase') {
        window.USklad.addToCart(id);
      } else if (action === 'decrease') {
        window.USklad.removeOneFromCart(id);
      } else if (action === 'remove') {
        window.USklad.removeAllFromCart(id);
      }

      await renderCart();
    });
  }

  if (promoButton) {
    promoButton.addEventListener('click', applyPromo);
  }

  if (promoInput) {
    promoInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyPromo();
      }
    });
  }

  backButtons.forEach((button) => {
    button.addEventListener('click', () => {
      window.location.href = button.dataset.href || 'catalog.html';
    });
  });

  await renderCart();
});