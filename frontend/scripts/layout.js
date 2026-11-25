document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadComponent('header', 'components/header.html'),
    loadComponent('footer', 'components/footer.html'),
  ])

  async function updateBadge() {
    if (window.USklad) {
      await window.USklad.refreshCartBadge().catch(() => {})
    }
  }

  await updateBadge()
  if (window.USklad) {
    window.addEventListener('USklad:cartchange', updateBadge)
  }

  const header = document.querySelector('.site-header')
  const toggle = header?.querySelector('.navbar__menu-toggle')
  toggle?.addEventListener('click', () => header.classList.toggle('site-header--menu-open'))
})

async function loadComponent(targetId, url) {
  const target = document.getElementById(targetId)
  if (!target) return

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`)
  }
  target.innerHTML = await response.text()

  if (targetId === 'header' && window.USklad) {
    await window.USklad.refreshCartBadge().catch(() => {})
  }

  const header = document.querySelector('.site-header')
  if (header && !header.style.position) {
    header.style.position = 'sticky'
    header.style.top = '0'
    header.style.zIndex = '50'
  }
  const navbar = header?.querySelector('.navbar')
  if (navbar) navbar.style.position = 'relative'
}