(() => {
  const newsHost = document.getElementById('home-news-list');
  const activityHost = document.getElementById('home-activity-list');
  const heroCarousel = document.getElementById('home-hero-carousel');
  const heroSlides = heroCarousel ? [...heroCarousel.querySelectorAll('[data-hero-slide]')] : [];
  const heroDots = heroCarousel ? [...heroCarousel.querySelectorAll('[data-hero-dot]')] : [];
  const heroPrev = heroCarousel ? heroCarousel.querySelector('[data-hero-prev]') : null;
  const heroNext = heroCarousel ? heroCarousel.querySelector('[data-hero-next]') : null;

  const activityLabels = {
    summer: '暑期實習',
    international: '國際志工',
    '國際志工': '國際志工',
    training: '師資培育',
    remote: '遠距教學',
    exchange: '交流合作',
    field: '教學現場'
  };

  const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));

  const formatDate = (value = '') => value.replace(/-/g, '.');

  function initHeroCarousel() {
    if (!heroCarousel || heroSlides.length < 2) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const intervalMs = 5000;
    let current = 0;
    let timer = null;
    let touchStartX = null;

    const show = (nextIndex) => {
      current = (nextIndex + heroSlides.length) % heroSlides.length;

      heroSlides.forEach((slide, index) => {
        const active = index === current;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });

      heroDots.forEach((dot, index) => {
        const active = index === current;
        dot.classList.toggle('is-active', active);
        if (active) {
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.removeAttribute('aria-current');
        }
      });
    };

    const stop = () => {
      if (!timer) return;
      window.clearInterval(timer);
      timer = null;
    };

    const start = () => {
      if (reduceMotion || timer || document.hidden) return;
      timer = window.setInterval(() => show(current + 1), intervalMs);
    };

    heroPrev?.addEventListener('click', () => {
      show(current - 1);
      stop();
      start();
    });

    heroNext?.addEventListener('click', () => {
      show(current + 1);
      stop();
      start();
    });

    heroDots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        show(index);
        stop();
        start();
      });
    });

    heroCarousel.addEventListener('mouseenter', stop);
    heroCarousel.addEventListener('mouseleave', start);
    heroCarousel.addEventListener('focusin', stop);
    heroCarousel.addEventListener('focusout', (event) => {
      if (!heroCarousel.contains(event.relatedTarget)) start();
    });

    heroCarousel.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? null;
      stop();
    }, { passive: true });

    heroCarousel.addEventListener('touchend', (event) => {
      if (touchStartX === null) return;
      const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
      const delta = touchEndX - touchStartX;
      touchStartX = null;

      if (Math.abs(delta) >= 45) {
        show(current + (delta < 0 ? 1 : -1));
      }
      start();
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    show(0);
    start();
  }

  const newsType = (item) => {
    const text = ((item.title || '') + ' ' + (item.summary || '')).replace(/\s+/g, ' ');
    if (/說明會/.test(text)) return '說明會';
    if (/招生|招募|報名|申請|甄選|徵選/.test(text)) return '招生／報名';
    if (/預告|活動|論壇|成果展|講座|工作坊/.test(text)) return '活動預告';
    return '最新消息';
  };

  const sortNewest = (items) => [...items].sort((a, b) => {
    const byDate = (b.date || '').localeCompare(a.date || '');
    if (byDate !== 0) return byDate;
    return (b.id || '').localeCompare(a.id || '');
  });

  function renderNews(items) {
    if (!newsHost) return;
    const latest = sortNewest(items).slice(0, 3);

    if (!latest.length) {
      newsHost.innerHTML = '<p class="home-loading">目前沒有最新消息。</p>';
      return;
    }

    newsHost.innerHTML = latest.map((item) => {
      const href = 'news-detail.html?id=' + encodeURIComponent(item.id);
      return '<article class="home-news-item">' +
        '<div class="home-news-meta">' +
          '<time datetime="' + esc(item.date) + '">' + esc(formatDate(item.date)) + '</time>' +
          '<span>' + esc(newsType(item)) + '</span>' +
        '</div>' +
        '<h4><a href="' + href + '">' + esc(item.title) + '</a></h4>' +
        '<p>' + esc(item.summary || '') + '</p>' +
        '<a class="home-inline-link" href="' + href + '">閱讀全文 →</a>' +
      '</article>';
    }).join('');
  }

  function renderActivities(items) {
    if (!activityHost) return;
    const latest = sortNewest(items).slice(0, 3);

    if (!latest.length) {
      activityHost.innerHTML = '<p class="home-loading">目前沒有活動紀實。</p>';
      return;
    }

    activityHost.innerHTML = latest.map((item) => {
      const href = 'activity-detail.html?id=' + encodeURIComponent(item.id);
      const label = activityLabels[item.category] || '活動紀實';
      const cover = item.cover
        ? '<img src="' + esc(item.cover) + '" alt="" loading="lazy" />'
        : '<div class="home-activity-placeholder" aria-hidden="true"><span>PASSION</span></div>';

      return '<article class="home-activity-card">' +
        '<a class="home-activity-image" href="' + href + '">' + cover + '</a>' +
        '<div class="home-activity-copy">' +
          '<div class="home-activity-meta"><time datetime="' + esc(item.date) + '">' + esc(formatDate(item.date)) + '</time><span>' + esc(label) + '</span></div>' +
          '<h4><a href="' + href + '">' + esc(item.title) + '</a></h4>' +
          '<a class="home-inline-link" href="' + href + '">閱讀完整紀實 →</a>' +
        '</div>' +
      '</article>';
    }).join('');

  }

  initHeroCarousel();

  Promise.all([
    fetch('data/news.json', { cache: 'no-cache' }).then((response) => {
      if (!response.ok) throw new Error('news HTTP ' + response.status);
      return response.json();
    }),
    fetch('data/activities.json', { cache: 'no-cache' }).then((response) => {
      if (!response.ok) throw new Error('activities HTTP ' + response.status);
      return response.json();
    })
  ])
    .then(([newsData, activityData]) => {
      renderNews(newsData.news || []);
      renderActivities(activityData.activities || []);
    })
    .catch((error) => {
      console.error('首頁動態資料載入失敗：', error);
      if (newsHost) newsHost.innerHTML = '<p class="home-loading">目前無法載入最新消息，請前往最新消息頁查看。</p>';
      if (activityHost) activityHost.innerHTML = '<p class="home-loading">目前無法載入活動紀實，請前往活動紀實頁查看。</p>';
    });
})();