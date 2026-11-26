window.SHOP_CONFIG = {
  apiBase:
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000'
      : 'https://shop-api.onrender.com', // ← замените на ваш Render URL
}