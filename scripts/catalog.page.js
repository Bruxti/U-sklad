document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('products-grid');
  const template = document.getElementById('product-card-template');
  const countEl = document.querySelector('.catalog__count');

  if (!grid || !template || !window.PawsStore) return;

  const products = await window.PawsStore.getHomeProducts(6);

  if (countEl) {
    countEl.textContent = `${products.length} product${products.length === 1 ? '' : 's'}`;
  }

  function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.25 && rating - fullStars < 0.75;

    const stars = [];
    for (let i = 0; i < 5; i += 1) {
      if (i < fullStars) {
        stars.push('<i class="fa-solid fa-star"></i>');
      } else if (i === fullStars && hasHalfStar) {
        stars.push('<i class="fa-solid fa-star-half-stroke"></i>');
      } else {
        stars.push('<i class="fa-regular fa-star"></i>');
      }
    }

    return stars.join('');
  }

  grid.innerHTML = '';

  products.forEach((product) => {
    const node = template.content.cloneNode(true);

    const image = node.querySelector('[data-product-image]');
    const price = node.querySelector('[data-product-price]');
    const title = node.querySelector('[data-product-title]');
    const rating = node.querySelector('[data-product-rating]');
    const reviews = node.querySelector('[data-product-reviews]');
    const stars = node.querySelector('.product-card__stars');

    if (image) {
      image.src = product.thumbnail;
      image.alt = product.name;
    }

    if (price) {
      price.textContent = `$${Number(product.price).toFixed(2)}`;
    }

    if (title) {
      title.textContent = product.name;
    }

    if (rating) {
      rating.setAttribute('aria-label', `Rating ${product.rating} out of 5`);
    }

    if (reviews) {
      reviews.textContent = `(${product.rating.toFixed(1)})`;
    }

    if (stars) {
      stars.innerHTML = renderStars(product.rating);
    }

    grid.appendChild(node);
  });
});