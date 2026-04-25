function toProduct(raw) {
  return {
    ...raw,
    isInTheCart: false
  };
}
async function loadProducts() {
  const response = await fetch('./data.json');

  if (!response.ok) {
    throw new Error(`Failed to load data.json: ${response.status}`);
  }

  const rawProducts = await response.json();
  return rawProducts.map(toProduct);
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
  const products = await loadProducts();
  return products.find((product) => product.id === Number(id)) || null;
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

  return products
    .filter((product) => product.isInTheCart)
    .map((product) => ({
      id: product.id,
      name: product.name,
      tag: product.tags[0] || '',
      thumbnail: product.thumbnail,
      price: product.price
    }));
}
async function addToCart(productId) {
  const products = await loadProducts();
  const product = products.find((item) => item.id === Number(productId));

  if (product) {
    product.isInTheCart = true;
  }

  return product || null;
}