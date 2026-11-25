document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadComponent('header', 'components/header.html'),
    loadComponent('footer', 'components/footer.html')
  ]);
  /////
if (window.USklad?.getToken()) {
  document.querySelectorAll('[data-login-link]').forEach((el) => (el.hidden = true))
  document.querySelectorAll('[data-logout-btn]').forEach((el) => (el.hidden = false))
}
document.querySelectorAll('[data-logout-btn]').forEach((el) =>
  el.addEventListener('click', () => {
    window.USklad.logout()
    window.location.href = 'index.html'
  }),
)
////

  async function updateBadge() {
    if (window.USklad) await window.USklad.refreshCartBadge()
  }

  updateBadge();
  if (window.USklad) {
    window.addEventListener('USklad:cartchange', updateBadge);
  }

  const header = document.querySelector('.site-header');
  const toggle = header?.querySelector('.navbar__menu-toggle');

  toggle?.addEventListener('click', () => {
    header.classList.toggle('site-header--menu-open');
  });
});

async function loadComponent(targetId, url) {
  const target = document.getElementById(targetId);
  if (!target) return;


    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    const html = await response.text();
    target.innerHTML = html;
    if (targetId === 'header' && window.USklad) {
      window.USklad.updateCartBadges();
    }
    if (header && !header.style.position) {
        header.style.position = 'sticky';
        header.style.top = '0';
        header.style.zIndex = '50';
      }
      
      if (navbar) {
        navbar.style.position = 'relative';
      }
    
}