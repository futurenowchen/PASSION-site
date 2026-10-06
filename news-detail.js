(() => {
  const host=document.getElementById('news-detail-content');
  const esc=(value='')=>value.replace(/[&<>"']/g,(c)=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));
  const newsType=(item)=>{
    const text=(item.title+' '+item.summary).replace(/\s+/g,' ');
    if(/說明會/.test(text))return '說明會';
    if(/招生|招募|報名|申請|甄選|徵選/.test(text))return '招生／報名';
    if(/預告|活動|論壇|成果展|講座|工作坊/.test(text))return '活動預告';
    return '最新消息';
  };
  const id=new URLSearchParams(window.location.search).get('id');

  if(!id){
    host.innerHTML='<p>找不到消息資料。</p>';
    return;
  }

  fetch('data/news.json',{cache:'no-cache'})
    .then((response)=>{
      if(!response.ok)throw new Error('HTTP '+response.status);
      return response.json();
    })
    .then((data)=>{
      const item=(data.news||[]).find((entry)=>entry.id===id);
      if(!item){
        host.innerHTML='<p>找不到消息資料。</p>';
        return;
      }

      document.title=item.title+'｜PASSION 最新消息';
      const full=item.body||item.summary||'';
      host.innerHTML=
        '<header class="news-detail-header">'+
          '<div class="news-detail-meta"><time datetime="'+esc(item.date)+'">'+esc(item.date.replace(/-/g,'.'))+'</time><span class="news-type">'+esc(newsType(item))+'</span></div>'+
          '<h1>'+esc(item.title)+'</h1>'+
        '</header>'+
        '<div class="news-detail-body">'+esc(full).replace(/\n/g,'<br />')+'</div>'+
        (item.source?'<div class="news-detail-source"><strong>資料來源</strong><span>'+esc(item.source)+'</span></div>':'');
    })
    .catch((error)=>{
      console.error(error);
      host.innerHTML='<p>目前無法載入最新消息。</p>';
    });
})();