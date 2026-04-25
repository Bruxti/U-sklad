(() => {
  const PRODUCTS_URL = './data.json';
  const CART_STORAGE_KEY = 'pawsstore_cart_ids';

  function normalizeId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  function toProduct(raw, cartIds = []) {
    const id = normalizeId(raw.id);

    return {
      id,
      name: String(raw.name ?? ''),
      thumbnail: String(raw.thumbnail ?? ''),
      price: Number(raw.price ?? 0),
      rating: Number(raw.rating ?? 0),
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
      description: String(raw.description ?? ''),
      specs: Array.isArray(raw.specs) ? raw.specs.map(String) : [],
      highlights: Array.isArray(raw.highlights) ? raw.highlights.map(String) : [],
      isInTheCart: id !== null ? cartIds.includes(id) : false
    };
  }

  function getCartIds() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map(normalizeId)
        .filter((id) => id !== null);
    } catch {
      return [];
    }
  }

  function saveCartIds(ids) {
    const validIds = ids
      .map(normalizeId)
      .filter((id) => id !== null);

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(validIds));
    return validIds;
  }

  function addToCart(productId) {
    const id = normalizeId(productId);
    if (id === null) return getCartIds();

    const cartIds = getCartIds();
    cartIds.push(id);

    return saveCartIds(cartIds);
  }

  function removeOneFromCart(productId) {
    const id = normalizeId(productId);
    if (id === null) return getCartIds();

    const cartIds = getCartIds();
    const index = cartIds.indexOf(id);

    if (index !== -1) {
      cartIds.splice(index, 1);
    }

    return saveCartIds(cartIds);
  }

  function removeAllFromCart(productId) {
    const id = normalizeId(productId);
    if (id === null) return getCartIds();

    const cartIds = getCartIds().filter((itemId) => itemId !== id);
    return saveCartIds(cartIds);
  }

  function clearInvalidCartIds(validProducts) {
    const validIds = new Set(validProducts.map((product) => product.id));
    const filtered = getCartIds().filter((id) => validIds.has(id));
    return saveCartIds(filtered);
  }

  async function loadProducts() {
    const response = await fetch(PRODUCTS_URL);

    if (!response.ok) {
      throw new Error(`Failed to load data.json: ${response.status}`);
    }

    const rawProducts = await response.json();
    const cartIds = getCartIds();

    return Array.isArray(rawProducts)
      ? rawProducts
          .map((raw) => toProduct(raw, cartIds))
          .filter((product) => product.id !== null)
      : [];
  }

  async function getHomeProducts(limit = 6) {
    const products = await loadProducts();

    return products.slice(0, limit).map((product) => ({
      id: product.id,
      name: product.name,
      thumbnail: product.thumbnail,
      price: product.price,
      rating: product.rating
    }));
  }

  async function getProductById(id) {
    const productId = normalizeId(id);
    if (productId === null) return null;

    const products = await loadProducts();
    return products.find((product) => product.id === productId) || null;
  }

  async function filterProducts({
    minPrice = 0,
    maxPrice = Number.POSITIVE_INFINITY,
    minRating = 0,
    limit = 6
  } = {}) {
    const products = await loadProducts();

    return products
      .filter((product) => {
        return (
          product.price >= minPrice &&
          product.price <= maxPrice &&
          product.rating >= minRating
        );
      })
      .slice(0, limit);
  }

  async function getCartProducts() {
    const products = await loadProducts();
    const cartIds = getCartIds();
    const productMap = new Map(products.map((product) => [product.id, product]));

    return cartIds
      .map((id) => productMap.get(id))
      .filter(Boolean)
      .map((product) => ({
        id: product.id,
        name: product.name,
        tag: product.tags[0] || '',
        thumbnail: product.thumbnail,
        price: product.price
      }));
  }

  window.PawsStore = {
    normalizeId,
    toProduct,
    getCartIds,
    saveCartIds,
    addToCart,
    removeOneFromCart,
    removeAllFromCart,
    clearInvalidCartIds,
    loadProducts,
    getHomeProducts,
    getProductById,
    filterProducts,
    getCartProducts
  };
})();