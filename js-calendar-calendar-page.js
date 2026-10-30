(() => {
  const $ = id => document.getElementById(id);
  const grid = $('calendarGrid'), agenda = $('calendarAgenda'), monthLabel = $('calendarMonth');
  if (!grid || !agenda || !monthLabel) return;
  const state = { cursor: new Date(), events: [] };
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const formatDate = date => date.toLocaleDateString('bg-BG', { day:'numeric', month:'long', year:'numeric' });

  function render() {
    const year = state.cursor.getFullYear(), month = state.cursor.getMonth();
    monthLabel.textContent = state.cursor.toLocaleDateString('bg-BG', { month:'long', year:'numeric' });
    const first = new Date(year, month, 1), offset = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const cells = Math.ceil((offset + days) / 7) * 7;
    const eventDays = new Map();
    state.events.forEach(ev => { const d = new Date(Number(ev.timestamp)); if (!Number.isNaN(d.getTime())) { const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; eventDays.set(key, (eventDays.get(key)||0)+1); } });
    const today = startOfDay(new Date());
    grid.innerHTML = ['Пон','Вто','Сря','Чет','Пет','Съб','Нед'].map(d => `<div class="calendar-weekday">${d}</div>`).join('') + Array.from({length:cells}, (_, i) => {
      const day = i - offset + 1, inMonth = day > 0 && day <= days;
      if (!inMonth) return '<div class="calendar-day outside" aria-hidden="true"></div>';
      const date = new Date(year, month, day), key = `${year}-${month}-${day}`, count = eventDays.get(key)||0;
      const isToday = date.getTime() === today.getTime();
      return `<button type="button" class="calendar-day ${isToday?'is-today':''} ${count?'has-events':''}" data-date="${key}" aria-label="${day} ${monthLabel.textContent}${count?`, ${count} събития`:''}"><span>${day}</span>${count?`<i>${count} ${count===1?'събитие':'събития'}</i>`:''}</button>`;
    }).join('');
    grid.querySelectorAll('[data-date]').forEach(btn => btn.addEventListener('click', () => renderAgendaFor(btn.dataset.date)));
    renderAgenda();
  }
  function eventCard(ev) {
    const d = new Date(Number(ev.timestamp));
    return `<article class="agenda-card"><time>${escapeHTML(formatDate(d))} · ${escapeHTML(d.toLocaleTimeString('bg-BG',{hour:'2-digit',minute:'2-digit'}))}</time><h3>${escapeHTML(ev.title || 'Училищно събитие')}</h3>${ev.description?`<p>${escapeHTML(ev.description)}</p>`:''}${ev.location?`<span>⌖ ${escapeHTML(ev.location)}</span>`:''}</article>`;
  }
  function renderAgenda() {
    const now = Date.now();
    const upcoming = state.events.filter(e => Number(e.timestamp) >= now).sort((a,b)=>Number(a.timestamp)-Number(b.timestamp));
    agenda.innerHTML = upcoming.length ? upcoming.map(eventCard).join('') : '<p class="empty-state">Няма обявени предстоящи събития. Проверете отново скоро.</p>';
  }
  function renderAgendaFor(key) {
    const [y,m,d] = key.split('-').map(Number);
    const matches = state.events.filter(e => { const x = new Date(Number(e.timestamp)); return x.getFullYear()===y && x.getMonth()===m && x.getDate()===d; });
    agenda.innerHTML = `<h3 class="agenda-date">${escapeHTML(new Date(y,m,d).toLocaleDateString('bg-BG',{weekday:'long',day:'numeric',month:'long'}))}</h3>` + (matches.length ? matches.map(eventCard).join('') : '<p class="empty-state">Няма събития за тази дата.</p>');
  }
  function move(delta) { state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth()+delta, 1); render(); }
  $('calendarPrev').addEventListener('click',()=>move(-1));
  $('calendarNext').addEventListener('click',()=>move(1));
  $('calendarToday').addEventListener('click',()=>{state.cursor=new Date();render();});
  if (!window.db) { grid.innerHTML='<p class="error-note">Firebase не е инициализиран. Проверете връзката и настройките.</p>'; agenda.innerHTML=''; $('calendarStatus').textContent = window.firebaseInitError?.message || 'Realtime Database SDK не е наличен.'; return; }
  window.db.ref('events').orderByChild('timestamp').once('value').then(snapshot => {
    state.events=[]; snapshot.forEach(child => state.events.push({...child.val(), id:child.key})); render();
    $('calendarStatus').textContent = 'Календарът е зареден.';
  }).catch(error => { console.error('Calendar load failed',error); grid.innerHTML='<p class="error-note">Не успяхме да заредим събитията.</p>'; agenda.innerHTML='<p class="empty-state">Опитайте отново по-късно.</p>'; $('calendarStatus').textContent = `Firebase: ${error.code || error.message}`; });
})();
