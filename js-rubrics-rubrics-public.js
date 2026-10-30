class PublicRubricsDisplay {
  constructor() { this.rubrics = []; this.currentFilter = 'all'; this.init(); }
  esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  safeUrl(value) { try { const u=new URL(String(value || ''),location.href); return ['https:','http:'].includes(u.protocol)?u.href:''; } catch (_) { return ''; } }
  async init() {
    if (!window.RubricsDB) { this.showError('Модулът за рубрики не е зареден.'); return; }
    this.renderTabs(); await this.loadRubrics(); this.setupEventListeners();
  }
  getTypeLabel(filter) {
    if (String(filter).startsWith('sec:')) { const sec=window.RubricsDB.SECTIONS[filter.slice(4)]; return sec?`${sec.icon} ${sec.name}`:'рубрики'; }
    const t=window.RubricsDB.getTypeById(filter); return `${t.icon} ${t.name}`;
  }
  renderTabs() {
    const container=document.getElementById('rubricsTabs'); if (!container) return;
    const db=window.RubricsDB, sections=db.getSections();
    container.classList.add('two-level');
    container.innerHTML=`<div class="rubric-cats"><button class="rubric-tab active" data-type="all">Всички рубрики</button>${sections.map(s=>`<button class="rubric-cat" data-sec="${this.esc(s.id)}">${this.esc(s.icon)} ${this.esc(s.navName)}</button>`).join('')}</div><div class="rubric-subtabs">${sections.map(s=>`<div class="rubric-subgroup" data-sec="${this.esc(s.id)}" hidden>${db.getTypesBySection(s.id).map(t=>`<button class="rubric-tab" data-type="${this.esc(t.id)}">${this.esc(t.icon)} ${this.esc(t.name)}</button>`).join('')}</div>`).join('')}</div>`;
    container.querySelectorAll('.rubric-cat').forEach(btn=>btn.addEventListener('click',()=>this.setFilter('sec:'+btn.dataset.sec)));
  }
  setFilter(filter) {
    this.currentFilter=filter; const db=window.RubricsDB; let secId=null;
    if (filter.startsWith('sec:')) secId=filter.slice(4); else if(filter!=='all') secId=(db.getSectionOfType(filter)||{}).id||null;
    document.querySelectorAll('.rubric-tab').forEach(t=>t.classList.toggle('active',t.dataset.type===filter));
    document.querySelectorAll('.rubric-cat').forEach(c=>c.classList.toggle('active',c.dataset.sec===secId));
    document.querySelectorAll('.rubric-subgroup').forEach(g=>{g.hidden=g.dataset.sec!==secId;});
    this.displayRubrics();
  }
  async loadRubrics() {
    const box=document.getElementById('rubricsContent'); this.showLoading();
    try { const result=await window.RubricsDB.getAllRubrics(100); if(!result.success) throw new Error(result.error || 'Firebase read failed'); this.rubrics=result.rubrics.filter(r=>r.published!==false); this.displayRubrics(); }
    catch(error) { console.error('Rubrics loading failed:',error); this.showError(`Рубриките не могат да се заредят: ${error.code || error.message}`); }
  }
  displayRubrics() {
    const container=document.getElementById('rubricsContent'); if(!container)return;
    let items=this.rubrics;
    if(this.currentFilter.startsWith('sec:')) { const ids=window.RubricsDB.getTypesBySection(this.currentFilter.slice(4)).map(t=>t.id); items=items.filter(r=>ids.includes(r.type)); }
    else if(this.currentFilter!=='all') items=items.filter(r=>r.type===this.currentFilter);
    if(!items.length) { container.innerHTML=`<div class="empty-rubrics"><div class="empty-icon">✎</div><h3>Тази страница чака своята история.</h3><p>Все още няма публикувани материали ${this.currentFilter==='all'?'в рубриките':`в „${this.esc(this.getTypeLabel(this.currentFilter))}“`}.</p></div>`; return; }
    container.innerHTML=`<div class="rubrics-count">Показваме ${items.length} публикации ${this.currentFilter==='all'?'от всички рубрики':`в „${this.esc(this.getTypeLabel(this.currentFilter))}“`}.</div><div class="rubrics-grid">${items.map(r=>this.createRubricCard(r)).join('')}</div>`;
    container.querySelectorAll('[data-open-rubric]').forEach(btn=>btn.addEventListener('click',()=>this.openRubricModal(btn.dataset.openRubric)));
  }
  imageList(r) {
    const values = [...(Array.isArray(r.imageUrls) ? r.imageUrls : []), r.imageUrl];
    return [...new Set(values.map(value => this.safeUrl(value)).filter(Boolean))].slice(0, 6);
  }
  createRubricCard(r) {
    const type=window.RubricsDB.getTypeById(r.type), date=new Date(r.date), dateText=Number.isNaN(date.getTime())?'Наскоро':date.toLocaleDateString('bg-BG',{day:'numeric',month:'long',year:'numeric'});
    const body=String(r.content||''), preview=body.length>250?body.slice(0,250)+'…':body;
    const images=this.imageList(r), image=images[0] || '';
    return `<article class="rubric-card"><div class="rubric-header"><div class="rubric-type-badge" style="background:${this.esc(type.color)}20;color:${this.esc(type.color)}">${this.esc(type.icon)} ${this.esc(type.name)}</div><h3 class="rubric-title">${this.esc(r.title||'Без заглавие')}</h3></div>${image?`<div class="rubric-image"><img src="${this.esc(image)}" alt="${this.esc(r.title||'') }" loading="lazy"></div>`:''}<div class="rubric-content"><p>${this.esc(preview).replace(/\n/g,'<br>')}</p></div><div class="rubric-footer"><div class="rubric-meta"><span>✍ ${this.esc(r.author||'Редакцията')}</span><span>${this.esc(dateText)}</span></div>${r.tags?`<div class="rubric-tags">${String(r.tags).split(',').slice(0,4).map(t=>`<span class="tag">#${this.esc(t.trim())}</span>`).join('')}</div>`:''}${body.length>250||images.length>1?`<button class="rubric-read-more-btn" type="button" data-open-rubric="${this.esc(r.id)}">Прочети повече →</button>`:''}</div></article>`;
  }
  openRubricModal(id) {
    const r=this.rubrics.find(x=>x.id===id); if(!r)return;
    const t=window.RubricsDB.getTypeById(r.type), images=this.imageList(r);
    const date=new Date(r.date), dateText=Number.isNaN(date.getTime())?'Наскоро':date.toLocaleDateString('bg-BG',{year:'numeric',month:'long',day:'numeric'});
    const body=String(r.content||'').split(/\n{2,}|\n/).filter(Boolean).map(p=>`<p>${this.esc(p)}</p>`).join('');
    document.getElementById('rubricModalBody').innerHTML=`<div class="rubric-modal-type-badge" style="background:${this.esc(t.color)}20;color:${this.esc(t.color)}">${this.esc(t.icon)} ${this.esc(t.name)}</div><h2 class="rubric-modal-title">${this.esc(r.title||'Без заглавие')}</h2><div class="rubric-modal-meta"><span>✍ ${this.esc(r.author||'Редакцията')}</span><span>▦ ${this.esc(dateText)}</span></div>${images.length?`<div class="rubric-modal-gallery">${images.map((image,i)=>`<img src="${this.esc(image)}" alt="${this.esc(r.title||'')} — ${i+1}" loading="lazy">`).join('')}</div>`:''}<div class="rubric-modal-content">${body}</div>${r.tags?`<div class="rubric-modal-tags">${String(r.tags).split(',').map(tag=>`<span class="tag">#${this.esc(tag.trim())}</span>`).join('')}</div>`:''}`;
    const modal=document.getElementById('rubricModal'); modal.style.display='flex'; document.body.style.overflow='hidden';
  }
  closeRubricModal() { const m=document.getElementById('rubricModal'); if(m)m.style.display='none'; document.body.style.overflow=''; }
  setupEventListeners() {
    document.querySelectorAll('.rubric-tab').forEach(tab=>tab.addEventListener('click',()=>{this.setFilter(tab.dataset.type);history.pushState({type:tab.dataset.type},'',`?type=${encodeURIComponent(tab.dataset.type)}`);}));
    const type=new URLSearchParams(location.search).get('type'); if(type&&(type==='all'||window.RubricsDB.TYPES[type]||(type.startsWith('sec:')&&window.RubricsDB.SECTIONS[type.slice(4)])))this.setFilter(type);
    window.addEventListener('popstate',e=>this.setFilter(e.state?.type||'all'));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')this.closeRubricModal();});
  }
  showLoading(){const box=document.getElementById('rubricsContent');if(box)box.innerHTML='<div class="loading-rubrics"><div class="spinner"></div><p>Зареждаме рубриките…</p></div>';}
  showError(message){const box=document.getElementById('rubricsContent');if(box)box.innerHTML=`<div class="error-state"><h3>Временно недостъпно</h3><p>${this.esc(message)}</p><button onclick="location.reload()" class="btn">Опитай отново</button></div>`;}
}
document.addEventListener('DOMContentLoaded',()=>{if(document.querySelector('.rubrics-content-section'))window.publicRubricsDisplay=new PublicRubricsDisplay();});
