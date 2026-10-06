(() => {
  const navHost = document.getElementById('site-nav');

  async function loadNav() {
    if (!navHost) return;

    try {
      const response = await fetch('nav.html', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      navHost.innerHTML = await response.text();
      enhanceNav();
    } catch (error) {
      console.error('無法載入導覽列：', error);
    }
  }

  function enhanceNav() {
    const nav = navHost.querySelector('.site-header');
    const toggle = navHost.querySelector('.menu-toggle');
    const menu = navHost.querySelector('#menu');
    const current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

    navHost.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#')) return;

      const target = href.split('/').pop().toLowerCase();
      if (target === current) link.setAttribute('aria-current', 'page');
    });

    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        menu.classList.toggle('is-open', !expanded);
        document.body.classList.toggle('menu-open', !expanded);
      });

      menu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          toggle.setAttribute('aria-expanded', 'false');
          menu.classList.remove('is-open');
          document.body.classList.remove('menu-open');
        });
      });

      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
        document.body.classList.remove('menu-open');
      });
    }

    if (nav) {
      const setScrolled = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
      setScrolled();
      window.addEventListener('scroll', setScrolled, { passive: true });
    }
  }

  function injectFooter() {
    if (document.querySelector('.site-footer')) return;

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="footer-inner">
        <div class="footer-identity">
          <strong>PASSION 扎根教學團隊</strong>
          <span>國立臺灣師範大學 · 心理與教育測驗研究發展中心</span>
        </div>
        <nav class="footer-links" aria-label="頁尾導覽">
          <a href="about.html">關於我們</a>
          <a href="resources.html">教學資源</a>
          <a href="https://passiontw.net/usr/" target="_blank" rel="noopener noreferrer">PASSION偏鄉優質教育學分學程 ↗</a>
          <a href="https://www.facebook.com/PASSION.Teaching.Learning/?locale=zh_TW" target="_blank" rel="noopener noreferrer">Facebook ↗</a>
        </nav>
      </div>
    `;
    document.body.appendChild(footer);
  }

  loadNav();
  injectFooter();
})();