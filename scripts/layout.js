document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadComponent('header', 'components/header.html'),
    loadComponent('footer', 'components/footer.html')
  ]);

  if (window.PawsStore) {
    window.PawsStore.updateCartBadges();
  }
});

async function loadComponent(targetId, url) {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status}`);
    }

    const html = await response.text();
    target.innerHTML = html;
  } catch (error) {
    console.error(error);
  }
}