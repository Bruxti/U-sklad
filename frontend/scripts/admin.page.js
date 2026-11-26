document.addEventListener('DOMContentLoaded', async () => {
  if (!window.USklad) return

  const user = window.USklad.getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const forbiddenEl = document.querySelector('[data-admin-forbidden]')
  const contentEl = document.querySelector('[data-admin-content]')
  const tabsEl = document.querySelector('[data-admin-tabs]')
  const subtitleEl = document.querySelector('[data-admin-subtitle]')
  const loginLink = document.querySelector('[data-admin-login-link]')
  const logoutBtn = document.querySelector('[data-admin-logout]')

  // ---------- доступ ----------
  if (!isAdmin) {
    forbiddenEl?.removeAttribute('hidden')
    if (subtitleEl) subtitleEl.textContent = 'Доступ только для администраторов'
    if (loginLink) loginLink.hidden = !!user
    if (logoutBtn) logoutBtn.hidden = !user

    logoutBtn?.addEventListener('click', () => {
      window.USklad.logout()
      window.location.href = 'login.html?return=admin.html'
    })

    return
  }

  contentEl?.removeAttribute('hidden')
  tabsEl?.removeAttribute('hidden')
  if (subtitleEl) {
    subtitleEl.textContent = `Вы вошли как администратор (id: ${user.id})`
  }

  // ---------- утилиты ----------
  const esc = (v) =>
    v == null
      ? ''
      : String(v).replace(/[&<>"']/g, (c) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[c],
        )

  const escapeHtml = (v) => esc(v)
  const escapeAttr = (v) => esc(v)

  // Изображения хранятся в БД как URL.
  // Локальный путь вида images/placeholder_1.png
  // преобразуем в URL GitHub Pages.
  const IMAGE_BASE_URL = 'https://bruxti.github.io/U-sklad/'

  function normalizeImageUrl(value) {
    const v = String(value || '').trim()

    if (!v) return ''

    // Уже абсолютный URL — ничего не меняем.
    if (/^https?:\/\//i.test(v)) {
      return v
    }

    // Относительный путь -> абсолютный URL GitHub Pages.
    return new URL(v.replace(/^\/+/, ''), IMAGE_BASE_URL).href
  }

  // ---------- модалка ----------
  const modal = document.querySelector('[data-modal]')
  const modalTitle = document.querySelector('[data-modal-title]')
  const modalSub = document.querySelector('[data-modal-subtitle]')
  const modalBody = document.querySelector('[data-modal-body]')
  const modalForm = document.querySelector('[data-modal-form]')
  const modalError = document.querySelector('[data-modal-error]')
  const modalCancel = document.querySelector('[data-modal-cancel]')

  if (!modal || !modalForm) {
    console.error('[admin] Элементы модального окна не найдены')
    return
  }

  // В admin.html у модалки есть inline display:flex.
  // hidden сам по себе из-за этого может быть визуально перебит.
  // Поэтому дополнительно управляем display вручную.
  modal.style.display = 'none'

  let currentModal = {
    type: null,
    mode: null,
    item: null,
  }

  function openModal(type, mode, item) {
    if (mode === 'edit' && (!item || !item.id)) {
      console.error('[admin] Невозможно открыть редактирование без item/id:', item)
      alert('Не удалось открыть товар для редактирования')
      return
    }

    currentModal = { type, mode, item }

    if (modalError) {
      modalError.hidden = true
      modalError.textContent = ''
    }

    if (type === 'product') {
      if (modalTitle) {
        modalTitle.textContent =
          mode === 'create' ? 'Новый товар' : 'Редактировать товар'
      }

      if (modalSub) {
        modalSub.textContent =
          mode === 'create' ? 'Заполните поля' : `ID: ${item.id}`
      }

      if (modalBody) {
        modalBody.innerHTML = productFormHTML(item)
      }
    } else {
      if (modalTitle) {
        modalTitle.textContent =
          mode === 'create' ? 'Новый промокод' : 'Редактировать промокод'
      }

      if (modalSub) {
        modalSub.textContent =
          mode === 'create' ? 'Заполните поля' : `ID: ${item.id}`
      }

      if (modalBody) {
        modalBody.innerHTML = promoFormHTML(item)
      }
    }

    modal.hidden = false
    modal.style.display = 'flex'
  }

  function closeModal() {
    modal.hidden = true
    modal.style.display = 'none'

    currentModal = {
      type: null,
      mode: null,
      item: null,
    }
  }

  modalCancel?.addEventListener('click', closeModal)

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal()
    }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) {
      closeModal()
    }
  })

  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    const fd = new FormData(modalForm)
    const modalType = currentModal.type

    try {
      if (!currentModal.type) {
        throw new Error('Модальное окно не инициализировано')
      }

      if (!currentModal.mode) {
        throw new Error('Режим модального окна не определён')
      }

      if (currentModal.mode === 'edit' && !currentModal.item?.id) {
        throw new Error('Не удалось определить ID редактируемого объекта')
      }

      if (modalType === 'product') {
        await submitProduct(fd)
      } else if (modalType === 'promo') {
        await submitPromo(fd)
      } else {
        throw new Error(`Неизвестный тип модального окна: ${modalType}`)
      }

      closeModal()

      if (modalType === 'product') {
        await loadProducts()
      } else if (modalType === 'promo') {
        await loadPromos()
      }
    } catch (err) {
      console.error('[admin] Ошибка сохранения:', err)

      if (modalError) {
        modalError.textContent = err?.message || 'Ошибка'
        modalError.hidden = false
      }
    }
  })

  // ---------- формы ----------
  function productFormHTML(p) {
    const images = (p?.images || [])
      .map(normalizeImageUrl)
      .filter(Boolean)
      .join('\n')

    const tags = (p?.tags || []).join(', ')
    const specs = (p?.specs || []).join('\n')
    const highs = (p?.highlights || []).join('\n')
    const thumbnail = normalizeImageUrl(p?.thumbnail)

    return `
      <label style="display:block; margin-bottom:0.75rem;">
        <span class="cart-summary_label">Название</span>
        <input class="cart-summary_input" style="width:100%; box-sizing:border-box;"
               name="title" required maxlength="200" value="${escapeAttr(p?.title)}">
      </label>

      <label style="display:block; margin-bottom:0.75rem;">
        <span class="cart-summary_label">Краткое описание</span>
        <textarea class="cart-summary_input" style="width:100%; box-sizing:border-box;
                  min-height:60px; font-family:inherit;" name="description"
                  required>${escapeHtml(p?.description)}</textarea>
      </label>

      <label style="display:block; margin-bottom:0.75rem;">
        <span class="cart-summary_label">Полное описание (опционально)</span>
        <textarea class="cart-summary_input" style="width:100%; box-sizing:border-box;
                  min-height:60px; font-family:inherit;"
                  name="fullDescription">${escapeHtml(p?.fullDescription)}</textarea>
      </label>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.5rem; margin-bottom:0.75rem;">
        <label>
          <span class="cart-summary_label">Цена, $</span>
          <input class="cart-summary_input" style="width:100%; box-sizing:border-box;"
                 type="number" step="0.01" min="0.01" name="price" required
                 value="${p?.price ?? ''}">
        </label>

        <label>
          <span class="cart-summary_label">Рейтинг 0–5</span>
          <input class="cart-summary_input" style="width:100%; box-sizing:border-box;"
                 type="number" step="0.1" min="0" max="5" name="rating"
                 value="${p?.rating ?? 0}">
        </label>

        <label>
          <span class="cart-summary_label">Остаток</span>
          <input class="cart-summary_input" style="width:100%; box-sizing:border-box;"
                 type="number" min="0" name="stockQuantity"
                 value="${p?.stockQuantity ?? 0}">
        </label>
      </div>

      <label style="display:block; margin-bottom:0.75rem;">
        <span class="cart-summary_label">
          URL картинок (по одной на строку, минимум 3)
        </span>

        <textarea class="cart-summary_input"
                  style="width:100%; box-sizing:border-box;
                         min-height:80px; font-family:monospace; font-size:0.85rem;"
                  name="images"
                  required
                  placeholder="https://...&#10;https://...&#10;https://..."
        >${escapeHtml(images)}</textarea>
      </label>

      <label style="display:block; margin-bottom:0.75rem;">
        <span class="cart-summary_label">
          URL миниатюры (пусто — первая картинка)
        </span>

        <input class="cart-summary_input"
               style="width:100%; box-sizing:border-box;"
               name="thumbnail"
               value="${escapeAttr(thumbnail)}">
      </label>

      <label style="display:block; margin-bottom:0.75rem;">
        <span class="cart-summary_label">Теги (через запятую)</span>

        <input class="cart-summary_input"
               style="width:100%; box-sizing:border-box;"
               name="tags"
               value="${escapeAttr(tags)}">
      </label>

      <label style="display:block; margin-bottom:0.75rem;">
        <span class="cart-summary_label">
          Характеристики (по одной на строку)
        </span>

        <textarea class="cart-summary_input"
                  style="width:100%; box-sizing:border-box;
                         min-height:60px; font-family:inherit;"
                  name="specs">${escapeHtml(specs)}</textarea>
      </label>

      <label style="display:block;">
        <span class="cart-summary_label">
          Преимущества (по одному на строку)
        </span>

        <textarea class="cart-summary_input"
                  style="width:100%; box-sizing:border-box;
                         min-height:60px; font-family:inherit;"
                  name="highlights">${escapeHtml(highs)}</textarea>
      </label>
    `
  }

  function promoFormHTML(p) {
    return `
      <label style="display:block; margin-bottom:0.75rem;">
        <span class="cart-summary_label">Код</span>

        <input class="cart-summary_input"
               style="width:100%; box-sizing:border-box;
                      text-transform:uppercase;"
               name="code"
               required
               maxlength="64"
               value="${escapeAttr(p?.code)}">
      </label>

      <label style="display:block; margin-bottom:0.75rem;">
        <span class="cart-summary_label">Скидка, % (1–100)</span>

        <input class="cart-summary_input"
               style="width:100%; box-sizing:border-box;"
               type="number"
               min="1"
               max="100"
               name="discountPercentage"
               required
               value="${p?.discountPercentage ?? ''}">
      </label>

      <label style="display:flex; align-items:center; gap:0.5rem;">
        <input
          type="checkbox"
          name="isActive"
          ${p?.isActive !== false ? 'checked' : ''}
        >

        <span class="cart-summary_label" style="margin:0;">
          Активен
        </span>
      </label>
    `
  }

  const splitList = (v) =>
    String(v || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

  const splitComma = (v) =>
    String(v || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  async function submitProduct(fd) {
    const images = splitList(fd.get('images'))
      .map(normalizeImageUrl)
      .filter(Boolean)

    if (images.length < 3) {
      throw new Error('Нужно минимум 3 URL картинок')
    }

    const title = String(fd.get('title') || '').trim()
    const description = String(fd.get('description') || '').trim()
    const fullDescription = String(fd.get('fullDescription') || '').trim()
    const price = Number(fd.get('price'))
    const rating = Number(fd.get('rating')) || 0
    const stockQuantity = Number(fd.get('stockQuantity')) || 0

    if (!title) {
      throw new Error('Введите название товара')
    }

    if (!description) {
      throw new Error('Введите краткое описание')
    }

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Цена должна быть больше 0')
    }

    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      throw new Error('Рейтинг должен быть от 0 до 5')
    }

    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      throw new Error('Остаток не может быть отрицательным')
    }

    const body = {
      title,
      description,
      fullDescription,
      price,
      rating,
      stockQuantity,
      images,
      tags: splitComma(fd.get('tags')),
      specs: splitList(fd.get('specs')),
      highlights: splitList(fd.get('highlights')),
    }

    const thumb = normalizeImageUrl(fd.get('thumbnail'))

    if (thumb) {
      body.thumbnail = thumb
    }

    if (currentModal.mode === 'create') {
      await window.USklad.request('POST', '/api/products', {
        auth: true,
        body,
      })

      return
    }

    if (currentModal.mode === 'edit') {
      const id = Number(currentModal.item?.id)

      if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Не удалось определить ID товара для редактирования')
      }

      await window.USklad.request('PATCH', `/api/products/${id}`, {
        auth: true,
        body,
      })

      return
    }

    throw new Error(`Неизвестный режим товара: ${currentModal.mode}`)
  }

  async function submitPromo(fd) {
    const code = String(fd.get('code') || '')
      .trim()
      .toUpperCase()

    const discountPercentage = Number(fd.get('discountPercentage'))
    const isActive = fd.get('isActive') === 'on'

    if (!code) {
      throw new Error('Введите промокод')
    }

    if (
      !Number.isInteger(discountPercentage) ||
      discountPercentage < 1 ||
      discountPercentage > 100
    ) {
      throw new Error('Скидка должна быть целым числом от 1 до 100')
    }

    const body = {
      code,
      discountPercentage,
      isActive,
    }

    if (currentModal.mode === 'create') {
      await window.USklad.request('POST', '/api/promo-codes', {
        auth: true,
        body,
      })

      return
    }

    if (currentModal.mode === 'edit') {
      const id = Number(currentModal.item?.id)

      if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Не удалось определить ID промокода для редактирования')
      }

      await window.USklad.request('PATCH', `/api/promo-codes/${id}`, {
        auth: true,
        body,
      })

      return
    }

    throw new Error(`Неизвестный режим промокода: ${currentModal.mode}`)
  }

  // ---------- список товаров ----------
  function productRow(p) {
    const thumbnail = normalizeImageUrl(p.thumbnail)

    return `
      <article class="cart-item" data-product-id="${p.id}">
        <img
          class="cart-item_image"
          src="${escapeAttr(thumbnail)}"
          alt=""
        >

        <div class="cart-item_content">
          <h3 class="cart-item_title">
            ${escapeHtml(p.title)}
          </h3>

          <p class="cart-item_subtitle">
            $${Number(p.price).toFixed(2)}
            · остаток: ${p.stockQuantity}
            · ★ ${Number(p.rating).toFixed(1)}
          </p>
        </div>

        <div class="cart-item_actions">
          <button
            type="button"
            class="cart-item_remove"
            data-action="edit-product"
            title="Редактировать"
          >
            <i class="fa-solid fa-pen"></i>
          </button>

          <button
            type="button"
            class="cart-item_remove"
            data-action="delete-product"
            title="Удалить"
          >
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </article>
    `
  }

  async function loadProducts() {
    const listEl = document.querySelector('[data-products-list]')
    const countEl = document.querySelector('[data-products-count]')

    if (!listEl) return

    listEl.innerHTML =
      '<p style="color:#6b7280;">Загрузка…</p>'

    try {
      const res = await window.USklad.loadProducts({ limit: 100 })

      if (countEl) {
        countEl.textContent = `${res.meta.total_items} товар(ов)`
      }

      if (!res.items.length) {
        listEl.innerHTML =
          '<div class="catalog_empty">Товаров пока нет</div>'
        return
      }

      listEl.innerHTML = res.items.map(productRow).join('')
    } catch (e) {
      console.error('[admin] Ошибка загрузки товаров:', e)

      listEl.innerHTML =
        `<div class="catalog_empty">
          Ошибка: ${escapeHtml(e.message)}
        </div>`
    }
  }

  document
    .querySelector('[data-products-list]')
    ?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]')
      const card = e.target.closest('[data-product-id]')

      if (!btn || !card) return

      const id = Number(card.dataset.productId)

      if (!Number.isInteger(id) || id <= 0) {
        alert('Некорректный ID товара')
        return
      }

      try {
        if (btn.dataset.action === 'edit-product') {
          const p = await window.USklad.getProductById(id)

          if (!p) {
            throw new Error('Товар не найден')
          }

          if (!p.id) {
            throw new Error('API вернул товар без ID')
          }

          openModal('product', 'edit', p)
          return
        }

        if (btn.dataset.action === 'delete-product') {
          if (!confirm(`Удалить товар #${id}?`)) {
            return
          }

          await window.USklad.request(
            'DELETE',
            `/api/products/${id}`,
            { auth: true },
          )

          await loadProducts()
        }
      } catch (err) {
        console.error('[admin] Ошибка операции с товаром:', err)
        alert(err.message || 'Ошибка')
      }
    })

  document
    .querySelector('[data-product-new]')
    ?.addEventListener('click', () => {
      openModal('product', 'create', null)
    })

  // ---------- список промокодов ----------
  function promoRow(p) {
    return `
      <article class="cart-item" data-promo-id="${p.id}">
        <div class="cart-item_content">
          <h3 class="cart-item_title">
            ${escapeHtml(p.code)}
          </h3>

          <p class="cart-item_subtitle">
            -${p.discountPercentage}%
            · ${p.isActive ? 'активен' : 'выключен'}
          </p>
        </div>

        <div class="cart-item_actions">
          <button
            type="button"
            class="cart-item_remove"
            data-action="toggle-promo"
            title="Вкл/выкл"
          >
            <i class="fa-solid fa-power-off"></i>
          </button>

          <button
            type="button"
            class="cart-item_remove"
            data-action="delete-promo"
            title="Удалить"
          >
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </article>
    `
  }

  let promoCache = []

  async function loadPromos() {
    const listEl = document.querySelector('[data-promos-list]')
    const countEl = document.querySelector('[data-promos-count]')

    if (!listEl) return

    listEl.innerHTML =
      '<p style="color:#6b7280;">Загрузка…</p>'

    try {
      promoCache = await window.USklad.request(
        'GET',
        '/api/promo-codes',
        { auth: true },
      )

      if (countEl) {
        countEl.textContent = `${promoCache.length} промокодов`
      }

      if (!promoCache.length) {
        listEl.innerHTML =
          '<div class="catalog_empty">Промокодов пока нет</div>'
        return
      }

      listEl.innerHTML = promoCache.map(promoRow).join('')
    } catch (e) {
      console.error('[admin] Ошибка загрузки промокодов:', e)

      listEl.innerHTML =
        `<div class="catalog_empty">
          Ошибка: ${escapeHtml(e.message)}
        </div>`
    }
  }

  document
    .querySelector('[data-promos-list]')
    ?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]')
      const card = e.target.closest('[data-promo-id]')

      if (!btn || !card) return

      const id = Number(card.dataset.promoId)

      if (!Number.isInteger(id) || id <= 0) {
        alert('Некорректный ID промокода')
        return
      }

      const promo = promoCache.find((p) => p.id === id)

      if (!promo) {
        alert('Промокод не найден')
        return
      }

      try {
        if (btn.dataset.action === 'toggle-promo') {
          await window.USklad.request(
            'PATCH',
            `/api/promo-codes/${id}`,
            {
              auth: true,
              body: {
                isActive: !promo.isActive,
              },
            },
          )

          await loadPromos()
          return
        }

        if (btn.dataset.action === 'delete-promo') {
          if (!confirm(`Удалить промокод «${promo.code}»?`)) {
            return
          }

          await window.USklad.request(
            'DELETE',
            `/api/promo-codes/${id}`,
            { auth: true },
          )

          await loadPromos()
        }
      } catch (err) {
        console.error(
          '[admin] Ошибка операции с промокодом:',
          err,
        )

        alert(err.message || 'Ошибка')
      }
    })

  document
    .querySelector('[data-promo-new]')
    ?.addEventListener('click', () => {
      openModal('promo', 'create', null)
    })

  // ---------- табы ----------
  const tabButtons =
    document.querySelectorAll('[data-tab-btn]')

  const tabSections =
    document.querySelectorAll('[data-tab]')

  function setTab(name) {
    tabButtons.forEach((b) => {
      const active = b.dataset.tabBtn === name
      b.style.background = active ? '' : '#6b7280'
    })

    tabSections.forEach((s) => {
      s.hidden = s.dataset.tab !== name
    })

    if (name === 'products') {
      loadProducts()
    }

    if (name === 'promos') {
      loadPromos()
    }
  }

  tabButtons.forEach((b) => {
    b.addEventListener('click', () => {
      setTab(b.dataset.tabBtn)
    })
  })

  // Стартуем с товаров.
  setTab('products')
})