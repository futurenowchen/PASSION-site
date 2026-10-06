(() => {
  const list=document.getElementById('activity-list');
  const count=document.getElementById('activity-count');
  const empty=document.getElementById('activity-empty');
  const yearFilters=document.getElementById('activity-year-filters');
  const categoryFilters=document.getElementById('activity-category-filters');
  const labels={summer:'暑期實習',international:'國際志工',training:'師資培育',remote:'遠距教學',exchange:'交流合作',field:'教學現場'};
  let activities=[],activeYear='2026',activeCategory='all';
  const escapeHtml=(value='')=>value.replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const formatDate=(date)=>date.replace(/-/g,'.');

  function makeYearFilters(){
    const years=[...new Set(activities.map((item)=>item.year))].sort((a,b)=>b.localeCompare(a));
    yearFilters.innerHTML=['<button class="activity-filter" type="button" data-year="all">全部年份</button>',...years.map((year)=>'<button class="activity-filter'+(year===activeYear?' is-active':'')+'" type="button" data-year="'+year+'">'+year+'</button>')].join('');
  }
  function mediaNote(item){
    const parts=[];
    if(item.image_count)parts.push('原貼文 '+item.image_count+' 張相片');
    if(item.video_count)parts.push(item.video_count+' 段影片');
    return parts.join(' · ');
  }
  function render(){
    const visible=activities.filter((item)=>(activeYear==='all'||item.year===activeYear)&&(activeCategory==='all'||item.category===activeCategory));
    count.textContent=visible.length+' 筆活動紀實';
    empty.hidden=visible.length>0;
    list.innerHTML=visible.map((item)=>{
      const category=labels[item.category]||'活動紀實';
      const cover=item.cover?'<img src="'+escapeHtml(item.cover)+'" alt="" loading="lazy" />':'<div class="activity-cover-placeholder"><span>'+escapeHtml(item.year)+'</span><strong>'+escapeHtml(category)+'</strong></div>';
      const media=mediaNote(item);
      return '<article class="activity-card"><div class="activity-cover">'+cover+'</div><div class="activity-card-body"><div class="activity-meta"><time datetime="'+escapeHtml(item.date)+'">'+formatDate(item.date)+'</time><span>'+escapeHtml(category)+'</span></div><h3>'+escapeHtml(item.title)+'</h3><p class="activity-summary">'+escapeHtml(item.summary)+'</p>'+(media?'<div class="activity-source-note">'+escapeHtml(media)+'</div>':'')+'<a class="activity-read-more" href="activity-detail.html?id='+encodeURIComponent(item.id)+'">閱讀完整紀實 →</a></div></article>';
    }).join('');
  }
  function setFilter(container,value,type){container.querySelectorAll('.activity-filter').forEach((button)=>button.classList.toggle('is-active',button.dataset[type]===value));}
  yearFilters.addEventListener('click',(event)=>{const button=event.target.closest('[data-year]');if(!button)return;activeYear=button.dataset.year;setFilter(yearFilters,activeYear,'year');render();});
  categoryFilters.addEventListener('click',(event)=>{const button=event.target.closest('[data-category]');if(!button)return;activeCategory=button.dataset.category;setFilter(categoryFilters,activeCategory,'category');render();});
  fetch('data/activities.json',{cache:'no-cache'}).then((response)=>{if(!response.ok)throw new Error('HTTP '+response.status);return response.json();}).then((data)=>{activities=data.activities||[];if(activities.length&&!activities.some((item)=>item.year===activeYear))activeYear=activities[0].year;makeYearFilters();render();}).catch((error)=>{console.error('無法載入活動紀實：',error);count.textContent='活動資料載入失敗';empty.hidden=false;empty.textContent='目前無法載入活動紀實，請稍後再試。';});
})();