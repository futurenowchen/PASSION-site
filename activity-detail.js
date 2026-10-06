(() => {
  const host = document.getElementById('activity-detail-content');
  const labels = {
    summer: '暑期實習',
    international: '國際志工',
    '國際志工': '國際志工',
    training: '師資培育',
    remote: '遠距教學',
    exchange: '交流合作',
    field: '教學現場'
  };
  const escapeHtml = (value = '') => value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    host.innerHTML = '<p>找不到活動資料。</p>';
    return;
  }

  fetch('data/activities.json', { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then((data) => {
      const item = (data.activities || []).find((entry) => entry.id === id);
      if (!item) {
        host.innerHTML = '<p>找不到活動資料。</p>';
        return;
      }

      const category = labels[item.category] || '活動紀實';
      document.title = item.title + '｜PASSION 活動紀實';

      host.innerHTML =
        '<header class="activity-detail-header">' +
          '<div class="activity-meta"><time datetime="' + escapeHtml(item.date) + '">' +
          escapeHtml(item.date.replace(/-/g, '.')) + '</time><span>' + escapeHtml(category) + '</span></div>' +
          '<h1>' + escapeHtml(item.title) + '</h1>' +
        '</header>' +
        (item.cover ? '<figure class="activity-detail-cover"><img src="' + escapeHtml(item.cover) + '" alt="" /></figure>' : '') +
        '<div class="activity-detail-body">' + escapeHtml(item.body).replace(/\n/g, '<br />') + '</div>';
    })
    .catch((error) => {
      console.error(error);
      host.innerHTML = '<p>目前無法載入活動紀實。</p>';
    });
})();