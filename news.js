(() => {
  const list=document.getElementById('news-list');
  const count=document.getElementById('news-count');
  const filters=document.getElementById('news-year-filters');
  let items=[];
  let year='2026';
  const esc=(value='')=>value.replace(/[&<>"']/g,(c)=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));
  function render(){
    const visible=items.filter((item)=>year==='all'||item.year===year);
    count.textContent=visible.length+' 則消息';
    filters.querySelectorAll('button').forEach((button)=>{
      button.classList.toggle('is-active',button.dataset.year===year);
    });
    list.innerHTML=visible.map((item)=>
      '<article class="news-row">'+
        '<time>'+esc(item.date.replace(/-/g,'.'))+'</time>'+
        '<div><h2>'+esc(item.title)+'</h2><p>'+esc(item.summary)+'</p></div>'+
      '</article>'
    ).join('');
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