document.addEventListener('DOMContentLoaded', async () => {
  if (!window.PawsStore) return;

  const productId = new URLSearchParams(window.location.search).get('id');

  const titleEl = document.querySelector('[data-product-title]');
  const imageEl = document.querySelector('[data-product-image]');
  const priceEl = document.querySelector('[data-product-price]');
  const ratingEl = document.querySelector('[data-product-rating]');
  const descriptionEl = document.querySelector('[data-product-description]');
  const specsEl = document.querySelector('[data-product-specs]');
  const highlightsEl = document.querySelector('[data-product-highlights]');
  const tagsEl = document.querySelector('[data-product-tags]');
  const addButton = document.querySelector('[data-product-add-to-cart]');
  const minusButton = document.querySelector('[data-quantity-minus]');
  const plusButton = document.querySelector('[data-quantity-plus]');
  const quantityValue = document.querySelector('[data-quantity-value]');
  const thumbsRoot = document.querySelector('[data-product-thumbs]');
  const prevButton = document.querySelector('[data-slider-prev]');
  const nextButton = document.querySelector('[data-slider-next]');
  const accordionToggle = document.querySelector('[data-accordion-toggle]');
  const accordionPanel = document.querySelector('[data-accordion-panel]');

  let quantity = 1;
  let currentImageIndex = 0;
  const maxQuantity = 99;

  function formatMoney(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  function renderQuantity() {
    if (quantityValue) {
      quantityValue.textContent = String(quantity);
    }
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

  function setActiveImage(product) {
    const images = (product.images && product.images.length ? product.images : [product.thumbnail])
      .filter(Boolean);

    const safeIndex = Math.max(0, Math.min(currentImageIndex, images.length - 1));
    currentImageIndex = safeIndex;

    if (imageEl) {
      imageEl.src = images[safeIndex];
      imageEl.alt = product.name;
    }

    if (thumbsRoot) {
      thumbsRoot.innerHTML = images
        .map((src, index) => {
          const isActive = index === safeIndex ? ' product-page__thumb--active' : '';
          return `
            <button type="button" class="product-page__thumb${isActive}" data-thumb-index="${index}" aria-label="Show image ${index + 1}">
              <img src="${src}" alt="">
            </button>
          `;
        })
        .join('');

      thumbsRoot.querySelectorAll('[data-thumb-index]').forEach((button) => {
        button.addEventListener('click', () => {
          currentImageIndex = Number(button.dataset.thumbIndex);
          setActiveImage(product);
        });
      });
    }
  }

  function toggleAccordion() {
    if (!accordionToggle || !accordionPanel) return;

    const isOpen = accordionToggle.getAttribute('aria-expanded') === 'true';
    accordionToggle.setAttribute('aria-expanded', String(!isOpen));
    accordionPanel.hidden = isOpen;
  }

  const product = await window.PawsStore.getProductById(productId);

  if (!product) {
    if (titleEl) titleEl.textContent = 'Product not found';
    if (descriptionEl) descriptionEl.textContent = 'The requested product is unavailable.';
    if (addButton) addButton.disabled = true;
    return;
  }

  if (titleEl) titleEl.textContent = product.name;

  if (priceEl) {
    priceEl.textContent = formatMoney(product.price);
  }

  if (ratingEl) {
    ratingEl.innerHTML = `
      <div class="product-page__stars" aria-hidden="true">
        ${renderStars(product.rating)}
      </div>
      <span class="product-page__rating-text">${product.rating.toFixed(1)} out of 5 stars</span>
    `;
  }

  if (tagsEl) {
    tagsEl.innerHTML = (product.tags || [])
      .map((tag) => `<span class="product-page__tag-chip">${tag}</span>`)
      .join('');
  }

  if (descriptionEl) {
    descriptionEl.textContent = product.description;
  }

  if (specsEl) {
    specsEl.innerHTML = (product.specs || [])
      .map((item) => `<li class="product-page__spec-item">${item}</li>`)
      .join('');
  }

  if (highlightsEl) {
    highlightsEl.innerHTML = (product.highlights || [])
      .map((item) => `<li class="product-page__highlight-item">${item}</li>`)
      .join('');
  }

  setActiveImage(product);

  if (minusButton) {
    minusButton.addEventListener('click', () => {
      quantity = Math.max(1, quantity - 1);
      renderQuantity();
    });
  }

  if (plusButton) {
    plusButton.addEventListener('click', () => {
      quantity = Math.min(maxQuantity, quantity + 1);
      renderQuantity();
    });
  }

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      const images = (product.images && product.images.length ? product.images : [product.thumbnail]).filter(Boolean);
      currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
      setActiveImage(product);
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      const images = (product.images && product.images.length ? product.images : [product.thumbnail]).filter(Boolean);
      currentImageIndex = (currentImageIndex + 1) % images.length;
      setActiveImage(product);
    });
  }

  if (accordionToggle) {
    accordionToggle.addEventListener('click', toggleAccordion);
  }

  if (addButton) {
    addButton.addEventListener('click', () => {
      for (let index = 0; index < quantity; index += 1) {
        window.PawsStore.addToCart(product.id);
      }

      addButton.classList.add('product-page__cart-button--active');
      setTimeout(() => {
        addButton.classList.remove('product-page__cart-button--active');
      }, 180);
    });
  }

  renderQuantity();
});