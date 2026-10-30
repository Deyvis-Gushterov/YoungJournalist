document.addEventListener('DOMContentLoaded', loadPublicEvents);
function escapeEventText(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function loadPublicEvents() {
    const container = document.getElementById('publicEventsList');
    if (!container) return;
    if (!window.db) { container.innerHTML = '<div class="no-events-public">Календарът временно не е достъпен.</div>'; return; }
    window.db.ref('events').orderByChild('timestamp').once('value').then(snapshot => {
        const events = [];
        snapshot.forEach(child => { const event = child.val() || {}; if (Number.isFinite(Number(event.timestamp))) events.push({...event, id: child.key}); });
        const today = new Date(); today.setHours(0,0,0,0);
        const upcoming = events.filter(event => Number(event.timestamp) >= today.getTime()).sort((a,b)=>Number(a.timestamp)-Number(b.timestamp));
        if (!upcoming.length) { container.innerHTML = '<div class="no-events-public">📅 Няма предстоящи събития. Провери отново скоро!</div>'; return; }
        container.innerHTML = upcoming.slice(0,6).map(event => {
            const date = new Date(Number(event.timestamp)), isToday = date.toDateString() === new Date().toDateString();
            const dateText = isToday ? `🎯 Днес · ${date.toLocaleTimeString('bg-BG',{hour:'2-digit',minute:'2-digit'})}` : date.toLocaleDateString('bg-BG',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
            return `<article class="public-event-card ${isToday?'today':'upcoming'}"><div class="public-event-date"><strong>${escapeEventText(dateText)}</strong></div><h3 class="public-event-title">${escapeEventText(event.title || 'Училищно събитие')}</h3>${event.description?`<p class="public-event-description">${escapeEventText(event.description)}</p>`:''}${event.location?`<p class="public-event-location">📍 ${escapeEventText(event.location)}</p>`:''}</article>`;
        }).join('');
    }).catch(error => { console.error('Error loading public events:',error); container.innerHTML = '<div class="no-events-public">Не успяхме да заредим календара. Проверете Firebase връзката.</div>'; });
}
