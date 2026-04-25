document.addEventListener('DOMContentLoaded', async () => {
  if (!window.PawsStore) return;

  const grid = document.getElementById('products-grid');
  const template = document.getElementById('product-card-template');
  const countEl = document.querySelector('.catalog__count');
  const searchInput = document.querySelector('.catalog__search input');
  const sortSelect = document.querySelector('.catalog__select');
  const ratingInputs = document.querySelectorAll('input[name="rating"]');
  const priceInputs = document.querySelectorAll('.catalog__price-field input');

  if (!grid || !template) return;

  const state = {
    products: []
  };

  function formatMoney(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const remainder = rating - fullStars;

    const stars = [];

    for (let index = 0; index < 5; index += 1) {
      if (index < fullStars) {
        stars.push('<i class="fa-solid fa-star"></i>');
      } else if (index === fullStars && remainder >= 0.25 && remainder < 0.75) {
        stars.push('<i class="fa-solid fa-star-half-stroke"></i>');
      } else if (index === fullStars && remainder >= 0.75) {
        stars.push('<i class="fa-solid fa-star"></i>');
      } else {
        stars.push('<i class="fa-regular fa-star"></i>');
      }
    }

    return stars.join('');
  }

  function getSelectedMinRating() {
    const checkedRatings = Array.from(ratingInputs)
      .filter((input) => input.checked)
      .map((input) => Number(input.value))
      .filter((value) => Number.isFinite(value));

    if (!checkedRatings.length) return 0;
    return Math.min(...checkedRatings);
  }

  function getPriceRange() {
    const [minInput, maxInput] = priceInputs;
    const minValue = Number(minInput?.value);
    const maxValue = Number(maxInput?.value);

    return {
      minPrice: Number.isFinite(minValue) ? minValue : 0,
      maxPrice: Number.isFinite(maxValue) ? maxValue : Number.POSITIVE_INFINITY
    };
  }

  function getSearchQuery() {
    return String(searchInput?.value ?? '').trim().toLowerCase();
  }

  function sortProducts(products) {
    const value = sortSelect?.value || 'name-asc';
    const list = [...products];

    switch (value) {
      case 'name-desc':
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case 'price-asc':
        return list.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return list.sort((a, b) => b.price - a.price);
      case 'rating-desc':
        return list.sort((a, b) => b.rating - a.rating);
      case 'name-asc':
      default:
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  function filterProducts(products) {
    const query = getSearchQuery();
    const { minPrice, maxPrice } = getPriceRange();
    const minRating = getSelectedMinRating();

    return products.filter((product) => {
      const haystack = [
        product.name,
        ...(Array.isArray(product.tags) ? product.tags : [])
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = !query || haystack.includes(query);
      const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
      const matchesRating = product.rating >= minRating;

      return matchesQuery && matchesPrice && matchesRating;
    });
  }

  function buildProductUrl(productId) {
    return `product.html?id=${encodeURIComponent(productId)}`;
  }

  function setLinkTargets(node, productId) {
    const links = node.querySelectorAll('[data-product-link]');
    const url = buildProductUrl(productId);

    links.forEach((link) => {
      link.setAttribute('href', url);
    });
  }

  function renderCard(product) {
    const node = template.content.cloneNode(true);

    const image = node.querySelector('[data-product-image]');
    const price = node.querySelector('[data-product-price]');
    const title = node.querySelector('[data-product-title]');
    const reviews = node.querySelector('[data-product-reviews]');
    const stars = node.querySelector('.product-card__stars');
    const ratingBlock = node.querySelector('[data-product-rating]');
    const addButton = node.querySelector('[data-product-add-to-cart]');

    if (image) {
      image.src = product.thumbnail;
      image.alt = product.name;
    }

    if (price) {
      price.textContent = formatMoney(product.price);
    }

    if (title) {
      title.textContent = product.name;
    }

    if (reviews) {
      reviews.textContent = `(${product.rating.toFixed(1)})`;
    }

    if (stars) {
      stars.innerHTML = renderStars(product.rating);
    }

    if (ratingBlock) {
      ratingBlock.setAttribute('aria-label', `Rating ${product.rating} out of 5 stars`);
    }

    if (addButton) {
      const inCart = Boolean(product.isInTheCart);
      addButton.textContent = inCart ? 'In cart' : 'Add to cart';
      addButton.classList.toggle('product-card__add--active', inCart);
    }

    setLinkTargets(node, product.id);

    if (addButton) {
      addButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        window.PawsStore.addToCart(product.id);
        render();
      });
    }

    return node;
  }

  function render() {
    const filtered = sortProducts(filterProducts(state.products));

    if (countEl) {
      countEl.textContent = `${filtered.length} product${filtered.length === 1 ? '' : 's'}`;
    }

    grid.innerHTML = '';

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'catalog__empty';
      empty.textContent = 'No products found.';
      grid.appendChild(empty);
      return;
    }

    filtered.forEach((product) => {
      grid.appendChild(renderCard(product));
    });
  }

  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener('input', render);
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', render);
    }

    ratingInputs.forEach((input) => {
      input.addEventListener('change', render);
    });

    priceInputs.forEach((input) => {
      input.addEventListener('input', render);
    });

    window.addEventListener('pawsstore:cartchange', async () => {
      state.products = await window.PawsStore.loadProducts();
      render();
    });
  }

  try {
    state.products = await window.PawsStore.loadProducts();
    bindEvents();
    render();
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<div class="catalog__empty">Failed to load products.</div>';
  }
});