(() => {
'use strict';
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let issues=[],issue=null,index=0;
const safeImage=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch(_){return ''}};
function render(){
 const paper=$('npPaper'); paper.classList.remove('np-turn'); void paper.offsetWidth; paper.classList.add('np-turn');
 const p=issue.pages[index]; if(!p)return;
 $('npPageSection').textContent=(p.title||'СТРАНИЦА').toLocaleUpperCase('bg-BG');
 $('npPageNumber').textContent=String(index+1).padStart(2,'0');$('npPageBottomNumber').textContent=index+1;
 $('npPageContent').innerHTML=`<div class="np-layout np-${esc(p.template||'news')}">
 ${p.image&&safeImage(p.image)?`<figure class="np-figure"><img src="${safeImage(p.image)}" alt="${esc(p.caption||p.title)}" loading="lazy">${p.caption?`<figcaption>${esc(p.caption)}</figcaption>`:''}</figure>`:''}
 <p class="np-overline">${esc(p.subtitle||issue.title||'МЛАД ЖУРНАЛИСТ')}</p><h1>${esc(p.title)}</h1><div class="np-copy">${esc(p.body||'').split(/\n{2,}/).map(x=>`<p>${esc(x).replace(/\n/g,'<br>')}</p>`).join('')}</div></div>`;
 $('npPageCounter').textContent=`Страница ${index+1} от ${issue.pages.length}`;
 $('npPrev').disabled=index===0;$('npNext').disabled=index===issue.pages.length-1;$('npPageSelect').value=String(index);
}
function selectIssue(id){issue=issues.find(x=>x.id===id)||issues[0];if(!issue)return;index=0;$('npIssueTitle').textContent=issue.title||'Нашият вестник';$('npIssueDescription').textContent=issue.description||'Истории, идеи и гласове от училищната общност.';$('npIssueMeta').textContent=`БРОЙ №${issue.issueNumber||'—'}`;$('npIssueDate').textContent=issue.publishedAt?new Date(issue.publishedAt).toLocaleDateString('bg-BG',{month:'long',year:'numeric'}):'ДИГИТАЛНО ИЗДАНИЕ';$('npPageSelect').innerHTML=issue.pages.map((p,i)=>`<option value="${i}">${i+1}. ${esc(p.title)}</option>`).join('');$('npPageSelect').disabled=false;$('npPaper').hidden=false;$('npLoading').hidden=true;render();}
function init(){
 if(!window.db){$('npLoading').textContent='Вестникът временно не може да се зареди.';return;}
 db.ref('publishedNewspaperIssues').once('value').then(snap=>{
  const data=snap.val()||{};issues=Object.entries(data).map(([id,v])=>({id,...v,pages:Array.isArray(v.pages)?v.pages:[]})).filter(x=>x.pages.length).sort((a,b)=>(Number(b.issueNumber)||0)-(Number(a.issueNumber)||0));
  if(!issues.length){$('npLoading').innerHTML='Очаквайте първия брой на <strong>„Млад журналист“</strong>. Скоро тук ще откриете нашите истории.';$('npArchiveList').textContent='Все още няма публикувани броеве.';return;}
  $('npArchiveList').innerHTML=issues.map(x=>`<button type="button" data-issue="${esc(x.id)}"><strong>№${esc(x.issueNumber||'—')}</strong><span>${esc(x.title)}</span></button>`).join('');
  selectIssue(new URLSearchParams(location.search).get('issue')||issues[0].id);
 }).catch(()=>{$('npLoading').textContent='Възникна проблем при зареждането на вестника. Опитайте отново по-късно.';});
 $('npPrev').addEventListener('click',()=>{if(index>0){index--;render();}});
 $('npNext').addEventListener('click',()=>{if(issue&&index<issue.pages.length-1){index++;render();}});
 $('npPageSelect').addEventListener('change',e=>{index=Number(e.target.value)||0;render();});
 $('npArchiveList').addEventListener('click',e=>{const b=e.target.closest('[data-issue]');if(b)selectIssue(b.dataset.issue);});
 let startX=0; $('npPaper').addEventListener('touchstart',e=>{startX=e.changedTouches[0].clientX;},{passive:true});
 $('npPaper').addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-startX;if(Math.abs(dx)>55){if(dx<0)$('npNext').click();else $('npPrev').click();}},{passive:true});
}
document.addEventListener('DOMContentLoaded',init);
})();