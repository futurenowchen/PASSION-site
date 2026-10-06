(() => {
  const list=document.getElementById('news-list');
  const count=document.getElementById('news-count');
  const filters=document.getElementById('news-year-filters');
  let items=[];
  let year='2026';
  const esc=(value='')=>value.replace(/[&<>"']/g,(c)=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));
  const withBreaks=(value='')=>esc(value).replace(/\n/g,'<br />');
  const newsType=(item)=>{
    const text=(item.title+' '+item.summary).replace(/\s+/g,' ');
    if(/說明會/.test(text))return '說明會';
    if(/招生|招募|報名|申請|甄選|徵選/.test(text))return '招生／報名';
    if(/預告|活動|論壇|成果展|講座|工作坊/.test(text))return '活動預告';
    return '最新消息';
  };
  function render(){
    const visible=items.filter((item)=>year==='all'||item.year===year);
    count.textContent=visible.length+' 則消息';
    filters.querySelectorAll('button').forEach((button)=>{
      button.classList.toggle('is-active',button.dataset.year===year);
    });
    list.innerHTML=visible.map((item)=>{
      const full=item.body||item.summary||'';
      return '<article class="news-row">'+
        '<div class="news-row-meta"><time datetime="'+esc(item.date)+'">'+esc(item.date.replace(/-/g,'.'))+'</time><span class="news-type">'+esc(newsType(item))+'</span></div>'+
        '<div class="news-row-copy"><h2>'+esc(item.title)+'</h2><p class="news-summary">'+esc(item.summary)+'</p>'+
          (full?'<details class="news-details"><summary>閱讀全文</summary><div class="news-fulltext">'+withBreaks(full)+'</div></details>':'')+
        '</div>'+
      '</article>';
    }).join('');
  }
  fetch('data/news.json',{cache:'no-cache'})
    .then((r)=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then((data)=>{
      items=data.news||[];
      const years=[...new Set(items.map((item)=>item.year))].sort((a,b)=>b.localeCompare(a));
      if(!years.includes(year)) year=years[0]||'all';
      filters.innerHTML=[
        '<button class="activity-filter" data-year="all" type="button">全部年份</button>',
        ...years.map((y)=>'<button class="activity-filter" data-year="'+y+'" type="button">'+y+'</button>')
      ].join('');
      filters.addEventListener('click',(event)=>{
        const button=event.target.closest('[data-year]');
        if(!button)return;
        year=button.dataset.year;
        render();
      });
      render();
    })
    .catch((error)=>{
      console.error(error);
      count.textContent='消息載入失敗';
    });
})();