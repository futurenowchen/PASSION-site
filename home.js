(() => {
  const newsHost = document.getElementById('home-news-list');
  const activityHost = document.getElementById('home-activity-list');
  const heroCarousel = document.getElementById('home-hero-carousel');
  let heroSlides = [];
  let heroOptimized = null;
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

  // The ordered photo pool is maintained by the /admin/ CMS.
  // Only repository-hosted images can become carousel sources.
  function safeHeroImagePath(source) {
    if (typeof source !== 'string') return null;
    let path = source.trim();
    if (path.startsWith('/PASSION-site/')) path = path.slice('/PASSION-site/'.length);
    else if (path.startsWith('/')) path = path.slice(1);
    if (!path.startsWith('images/hero/')) return null;
    if (path.split('/').some((part) => !part || part === '.' || part === '..')) return null;
    if (!/\.(?:jpe?g|png|webp|avif)$/i.test(path)) return null;
    if (/[?#\\]/.test(path) || /%2f|%5c|%2e/i.test(path)) return null;
    return path;
  }

  async function loadHeroCarousel() {
    if (!heroCarousel) return;
    const slidesHost = heroCarousel.querySelector('.home-hero-slides');
    if (!slidesHost) return;

    try {
      const response = await fetch('data/hero.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Hero config HTTP ' + response.status);
      const data = await response.json();
      // Optimized variants are published separately; fall back to originals until ready.
      try {
        const optimizedResponse = await fetch('data/hero-optimized.json', { cache: 'no-cache' });
        if (optimizedResponse.ok) {
          const candidate = await optimizedResponse.json();
          if (candidate.version === 1 && candidate.variants) heroOptimized = candidate.variants;
        }
      } catch (_) { /* Original JPEG remains valid. */ }
      if (!Array.isArray(data.slides) || !data.slides.length) {
        throw new Error('Hero config: slides must contain at least one image');
      }
      // The reserved cover always displays first even if the CMS reorders the JSON.
      const orderedSlides = [...data.slides];
      const pinnedIndex = orderedSlides.findIndex((item) =>
        safeHeroImagePath(item && item.src) === 'images/hero/00-cover.jpg'
      );
      if (pinnedIndex > 0) orderedSlides.unshift(...orderedSlides.splice(pinnedIndex, 1));
      const slides = orderedSlides.map((item) => ({
        src: safeHeroImagePath(item && item.src),
        alt: item && typeof item.alt === 'string' ? item.alt.trim() : ''
      }));
      if (slides.some((slide) => !slide.src || !slide.alt)) {
        throw new Error('Hero config: invalid image path or missing alternative text');
      }

      // Only the first load shows 00-cover.jpg. Other photos are shuffled
      // without repetition until the current round finishes.
      if (!window.PassionHeroPlayback) throw new Error('Hero playback script unavailable');
      const playback = window.PassionHeroPlayback.createPlaybackOrder(
        slides.length, slides[0].src === 'images/hero/00-cover.jpg'
      );
      const initialIndex = playback.current();
      const upcomingIndex = playback.peekNext();
      const slideNodes = document.createDocumentFragment();

      slides.forEach((item, index) => {
        const figure = document.createElement('figure');
        figure.className = 'home-hero-slide' + (index === initialIndex ? ' is-active' : '');
        figure.dataset.heroSlide = '';
        figure.setAttribute('aria-hidden', String(index !== initialIndex));

        const image = document.createElement('img');
        const preload = index === initialIndex || index === upcomingIndex;
        const original = item.src;
        const variants = heroOptimized && heroOptimized['/PASSION-site/' + original];
        let picture = null;
        if (variants && ['avif', 'webp', 'jpeg'].every(k =>
          Array.isArray(variants[k]) && variants[k].length > 0 &&
          variants[k].every(x => /^images\/hero-optimized\/[a-f0-9]{24}-\d+\.(avif|webp|jpg)$/.test(x.src) &&
            Number.isInteger(x.width) && x.width > 0 && x.width <= 1600))) {
          picture = document.createElement('picture');
          for (const [format, mime] of [['avif', 'image/avif'], ['webp', 'image/webp']]) {
            const source = document.createElement('source');
            source.type = mime;
            source.dataset.srcset = variants[format].map(x => x.src + ' ' + x.width + 'w').join(', ');
            source.sizes = '(max-width: 760px) 100vw, 60vw';
            picture.append(source);
          }
          image.dataset.srcset = variants.jpeg.map(x => x.src + ' ' + x.width + 'w').join(', ');
          image.sizes = '(max-width: 760px) 100vw, 60vw';
          image.dataset.optimizedFallback = variants.jpeg.at(-1).src;
        }
        if (preload) image.src = picture ? image.dataset.optimizedFallback : original;
        else image.dataset.lazySrc = picture ? image.dataset.optimizedFallback : original;
        image.alt = item.alt;
        image.loading = preload ? 'eager' : 'lazy';
        image.decoding = 'async';
        if (index === initialIndex) image.fetchPriority = 'high';
        if (picture) picture.append(image);
        figure.append(picture || image);
        if (preload && picture) {
          for (const source of picture.querySelectorAll('source')) {
            source.srcset = source.dataset.srcset;
            delete source.dataset.srcset;
          }
          image.srcset = image.dataset.srcset;
          delete image.dataset.srcset;
        }
        slideNodes.append(figure);

      });

      slidesHost.replaceChildren(slideNodes);
      heroSlides = [...heroCarousel.querySelectorAll('[data-hero-slide]')];
      heroCarousel.classList.toggle('is-single-slide', heroSlides.length < 2);
      if (heroSlides.length > 1) initHeroCarousel(playback);
    } catch (error) {
      console.error('首頁輪播照片池載入失敗：', error);
      slidesHost.textContent = '輪播照片目前無法載入。';
      slidesHost.classList.add('home-hero-loading');
      heroCarousel.classList.add('is-single-slide');
    }
  }

  function initHeroCarousel(playback) {
    if (!heroCarousel || heroSlides.length < 2) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const intervalMs = 5000;
    let timer = null;
    let touchStartX = null;

    const show = (currentIndex) => {
      for (const i of [currentIndex, playback.peekNext()]) {
        if (i === null) continue;
        const img = heroSlides[i].querySelector('img');
        if (img && img.dataset.lazySrc) {
          const picture = img.parentElement;
          if (picture && picture.tagName === 'PICTURE') {
            for (const source of picture.querySelectorAll('source')) {
              if (source.dataset.srcset) {
                source.srcset = source.dataset.srcset;
                delete source.dataset.srcset;
              }
            }
            if (img.dataset.srcset) {
              img.srcset = img.dataset.srcset;
              delete img.dataset.srcset;
            }
          }
          img.src = img.dataset.lazySrc;
          delete img.dataset.lazySrc;
        }
      }

      heroSlides.forEach((slide, index) => {
        const active = index === currentIndex;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });

    };

    const stop = () => {
      if (!timer) return;
      window.clearInterval(timer);
      timer = null;
    };

    const start = () => {
      if (reduceMotion || timer || document.hidden) return;
      timer = window.setInterval(() => show(playback.next()), intervalMs);
    };

    heroPrev?.addEventListener('click', () => {
      show(playback.previous());
      stop();
      start();
    });

    heroNext?.addEventListener('click', () => {
      show(playback.next());
      stop();
      start();
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
        show(delta < 0 ? playback.next() : playback.previous());
      }
      start();
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    show(playback.current());
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

  loadHeroCarousel();

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