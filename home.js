(() => {
  const newsHost = document.getElementById('home-news-list');
  const activityHost = document.getElementById('home-activity-list');
  const heroImage = document.getElementById('home-hero-image');
  const heroCaption = document.getElementById('home-hero-caption');
  const heroStory = document.getElementById('home-hero-story');

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

    const feature = latest.find((item) => item.cover) || latest[0];
    if (feature && heroStory) {
      heroStory.href = 'activity-detail.html?id=' + encodeURIComponent(feature.id);
      heroStory.setAttribute('aria-label', '閱讀最新活動紀實：' + feature.title);
    }
    if (feature && feature.cover && heroImage) {
      heroImage.src = feature.cover;
    }
    if (feature && heroCaption) {
      heroCaption.textContent = feature.title;
    }
  }

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