(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const defaults = [
    ['Корица','cover'],['От редактора + новини','news'],['Интервю с директора','interview'],
    ['Нашите шампиони','features'],['Учителите отблизо','features'],['AI & Ние','features'],
    ['Творческа работилница','creative'],['Забавна страница и предстоящи събития','fun']
  ];
  let issueId = null, pages = [];
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say = (id,msg,bad=false) => { const el=$(id); if(el){el.textContent=msg;el.classList.toggle('error',bad);} };
  const validUrl = value => { try { const u=new URL(value); return u.protocol==='https:' ? u.href : ''; } catch (_) { return ''; } };
  function drawPages() {
    const host=$('npPagesEditor'); if(!host)return;
    host.innerHTML = pages.map((p,i)=>`<article class="np-admin-page" data-index="${i}">
      <div class="np-admin-page-head"><strong>Страница ${i+1}</strong><div><button type="button" data-up="${i}" ${i===0?'disabled':''}>↑</button><button type="button" data-down="${i}" ${i===pages.length-1?'disabled':''}>↓</button><button type="button" data-remove="${i}" aria-label="Изтрий">×</button></div></div>
      <label>Заглавие<input data-field="title" value="${esc(p.title)}" maxlength="120" required></label>
      <label>Тип оформление<select data-field="template">${[['cover','Корица'],['news','Новини / колони'],['interview','Интервю'],['features','Материал със снимка'],['creative','Творчество'],['fun','Забавна страница']].map(([v,t])=>`<option value="${v}" ${p.template===v?'selected':''}>${t}</option>`).join('')}</select></label>
      <label>Подзаглавие<input data-field="subtitle" value="${esc(p.subtitle||'')}" maxlength="180"></label>
      <label>Текст<textarea data-field="body" rows="5" maxlength="12000" placeholder="Текст на страницата...">${esc(p.body||'')}</textarea></label>
      <label>HTTPS адрес на снимка<input data-field="image" type="url" value="${esc(p.image||'')}" placeholder="https://..."></label>
      <label>Надпис към снимката<input data-field="caption" value="${esc(p.caption||'')}" maxlength="180"></label>
    </article>`).join('') || '<p class="muted">Добавете първата страница към броя.</p>';
  }
  function collectPages() {
    return [...document.querySelectorAll('.np-admin-page')].map(card=>{
      const val=k=>card.querySelector(`[data-field="${k}"]`).value.trim();
      return {title:val('title'),template:val('template'),subtitle:val('subtitle'),body:val('body'),image:val('image'),caption:val('caption')};
    });
  }
  async function loadIssues() {
    const host=$('npIssuesArchive'); if(!window.db){host.textContent='Firebase не е наличен.';return;}
    const snap=await db.ref('newspaperIssues').once('value'), data=snap.val()||{};
    const items=Object.entries(data).map(([id,v])=>({id,...v})).sort((a,b)=>(Number(b.issueNumber)||0)-(Number(a.issueNumber)||0));
    host.innerHTML=items.length?items.map(x=>`<div class="manage-row"><div><strong>${esc(x.title||'Без заглавие')}</strong><small>Брой №${esc(x.issueNumber||'—')} · ${x.status==='published'?'Публикуван':'Чернова'}</small></div><button type="button" data-load-issue="${esc(x.id)}">Отвори</button></div>`).join(''):'<p class="muted">Все още няма създадени броеве.</p>';
  }
  async function loadIssue(id) {
    const snap=await db.ref(`newspaperIssues/${id}`).once('value'), data=snap.val();
    if(!data) throw new Error('Броят не беше намерен.');
    issueId=id; $('npIssueTitle').value=data.title||''; $('npIssueNumber').value=data.issueNumber||1;
    $('npIssueDescription').value=data.description||''; $('npIssueStatus').value=data.status||'draft';
    pages=Array.isArray(data.pages)?data.pages:[];
    drawPages(); say('npIssueFeedback',`Отворен е брой №${data.issueNumber||'—'}.`);
  }
  async function saveIssue(e) {
    e.preventDefault();
    try {
      const data={title:$('npIssueTitle').value.trim(),issueNumber:Number($('npIssueNumber').value)||1,description:$('npIssueDescription').value.trim(),status:$('npIssueStatus').value,updatedAt:Date.now(),updatedBy:auth.currentUser.uid};
      if(data.status==='published') data.publishedAt=Date.now();
      if(!data.title) throw new Error('Въведете заглавие на броя.');
      if(!issueId){const ref=db.ref('newspaperIssues').push();issueId=ref.key;data.createdAt=Date.now();}
      await db.ref(`newspaperIssues/${issueId}`).update(data);
      const full=(await db.ref(`newspaperIssues/${issueId}`).once('value')).val();
      if(full.status==='published') await db.ref(`publishedNewspaperIssues/${issueId}`).set(full); else await db.ref(`publishedNewspaperIssues/${issueId}`).remove();
      say('npIssueFeedback','Настройките на броя са запазени.');
      await loadIssues();
    } catch(err){say('npIssueFeedback',err.message||err.code,true);}
  }
  async function savePages() {
    try {
      if(!issueId) throw new Error('Първо запазете настройките на броя.');
      const next=collectPages();
      if(!next.length) throw new Error('Добавете поне една страница.');
      if(next.some(p=>!p.title)) throw new Error('Всяка страница трябва да има заглавие.');
      if(next.some(p=>p.image && !validUrl(p.image))) throw new Error('Снимките трябва да са с валиден HTTPS адрес.');
      await db.ref(`newspaperIssues/${issueId}/pages`).set(next);
      pages=next;
      const meta=(await db.ref(`newspaperIssues/${issueId}`).once('value')).val();
      if(meta && meta.status==='published') await db.ref(`publishedNewspaperIssues/${issueId}`).set({...meta,pages:next}); drawPages(); say('npPagesFeedback','Страниците са запазени.');
    } catch(err){say('npPagesFeedback',err.message||err.code,true);}
  }
  function bind() {
    $('newspaperIssueForm')?.addEventListener('submit',saveIssue);
    $('npNewIssue')?.addEventListener('click',()=>{issueId=null;pages=defaults.map(([title,template])=>({title,template,subtitle:'',body:'',image:'',caption:''}));$('npIssueTitle').value='';$('npIssueNumber').value='1';$('npIssueDescription').value='';$('npIssueStatus').value='draft';drawPages();say('npIssueFeedback','Нов брой — попълнете настройките и ги запазете.');});
    $('npAddPage')?.addEventListener('click',()=>{pages=collectPages();pages.push({title:'Нова страница',template:'news',body:''});drawPages();});
    $('npSavePages')?.addEventListener('click',savePages);
    $('npRefreshIssues')?.addEventListener('click',loadIssues);
    $('npPagesEditor')?.addEventListener('click',e=>{
      const up=e.target.closest('[data-up]'),down=e.target.closest('[data-down]'),del=e.target.closest('[data-remove]');
      if(!up&&!down&&!del)return; pages=collectPages();
      if(up){const i=+up.dataset.up;[pages[i-1],pages[i]]=[pages[i],pages[i-1]];}
      if(down){const i=+down.dataset.down;[pages[i+1],pages[i]]=[pages[i],pages[i+1]];}
      if(del)pages.splice(+del.dataset.remove,1); drawPages();
    });
    $('npIssuesArchive')?.addEventListener('click',e=>{const b=e.target.closest('[data-load-issue]');if(b)loadIssue(b.dataset.loadIssue).catch(err=>say('npIssueFeedback',err.message,true));});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    if(!$('panel-newspaper'))return;
    if(!window.auth||!window.db)return;
    window.auth.onAuthStateChanged(async user=>{
      if(!user)return;
      try{const role=(await db.ref(`users/${user.uid}/role`).once('value')).val();if(role!=='admin')return;bind();await loadIssues();}
      catch(err){say('npIssueFeedback',err.message||err.code,true);}
    });
  });
})();