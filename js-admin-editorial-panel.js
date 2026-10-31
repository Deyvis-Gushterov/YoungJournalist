(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safeUrl = (value) => {
    try { const u = new URL(String(value || ''), location.href); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; }
    catch (_) { return ''; }
  };
  const roles = {
    admin: 'Администратор', redactor: 'Редактор', editor: 'Редактор',
    reporter: 'Репортер', photographer: 'Фотограф', designer: 'Дизайнер', user: 'Читател'
  };
  const permissions = {
    admin: ['articles','rubrics','events','applications','team','media','spotlight','polls','newspaper'],
    redactor: ['articles','rubrics','events'],
    editor: ['articles','rubrics','events'],
    reporter: ['articles'],
    photographer: ['media'],
    designer: ['media','rubrics']
  };
  const state = { user: null, role: 'user', articles: [], rubrics: [], events: [], applications: [], users: [], media: [] };

  function notice(message, type = 'info') {
    const box = $('globalNotice'); if (!box) return;
    box.textContent = message; box.className = `notice ${type === 'success' ? 'success' : ''}`; box.hidden = false;
    window.clearTimeout(notice.timer); notice.timer = window.setTimeout(() => { box.hidden = true; }, 7000);
  }
  function feedback(id, message, error = false) {
    const el = $(id); if (!el) return;
    el.textContent = message; el.classList.toggle('error', Boolean(error));
  }
  function can(capability) { return (permissions[state.role] || []).includes(capability); }
  function waitForAuth() {
    return new Promise(resolve => {
      const off = window.auth.onAuthStateChanged(user => { off(); resolve(user); });
    });
  }
  async function readRole(uid) {
    const snap = await window.db.ref(`users/${uid}/role`).once('value');
    return snap.val() || 'user';
  }
  function renderRoleAccess() {
    document.querySelectorAll('[data-capability]').forEach(el => {
      const caps = (el.dataset.capability || '').split(',').map(x => x.trim()).filter(Boolean);
      el.hidden = !caps.every(can);
      if (el.classList.contains('nav-item')) el.style.display = el.hidden ? 'none' : '';
    });
    const nav = $('studioNav');
    nav?.querySelectorAll('[data-panel]').forEach(btn => btn.addEventListener('click', () => openPanel(btn.dataset.panel)));
    document.querySelectorAll('[data-goto]').forEach(btn => {
      if (!btn.dataset.bound) {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => openPanel(btn.dataset.goto));
      }
    });
  }
  function openPanel(name) {
    const target = $(`panel-${name}`);
    if (!target || (target.dataset.capability && !can(target.dataset.capability))) return;
    document.querySelectorAll('.studio-panel').forEach(p => p.classList.remove('active'));
    target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.panel === name));
    const title = document.querySelector(`#studioNav [data-panel="${name}"]`);
    $('pageHeading').textContent = title ? title.textContent.trim().replace(/^\S+\s*/, '') : 'Редакционно студио';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function shortDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Без дата' : date.toLocaleDateString('bg-BG', { day:'numeric', month:'short', year:'numeric' });
  }
  function displayStatus(status) { return ({published:'Публикувана', submitted:'За преглед', draft:'Чернова', approved:'Одобрена', needs_revision:'За корекция', new:'Нова', pending:'Чакаща'})[status] || status || '—'; }
  function statusClass(status) { return ['published','approved'].includes(status) ? 'published' : ['submitted','new','pending','needs_revision'].includes(status) ? 'submitted' : ''; }
  function getAllValues(snapshot) {
    const rows = [];
    snapshot.forEach(child => rows.push({ id: child.key, ...(child.val() || {}) }));
    return rows;
  }
  function disableDuring(button, promise, busyText) {
    if (!button) return promise;
    const old = button.textContent; button.disabled = true; button.textContent = busyText || 'Запазване…';
    return Promise.resolve(promise).finally(() => { button.disabled = false; button.textContent = old; });
  }

  function imageUrlsFromInput(value) {
    return String(value || '').split(/\n|,/).map(v => safeUrl(v.trim())).filter(Boolean).filter(v => /^https:\/\//i.test(v)).slice(0, 6);
  }

  async function saveImageUrl(url, folder, name) {
    const clean = safeUrl(url);
    if (!clean || !/^https:\/\//i.test(clean)) throw new Error('Въведете валиден директен HTTPS адрес на изображение.');
    const ref = window.db.ref('mediaLibrary').push();
    await ref.set({ url: clean, provider: 'external-url', name: name || clean.split('/').pop() || 'Изображение', folder: folder || 'library', uploadedBy: state.user.uid, uploadedByName: state.user.displayName || state.user.email, createdAt: firebase.database.ServerValue.TIMESTAMP });
    return clean;
  }

  async function migratePublishedArticles() {
    if (state.role !== 'admin') return;
    const [snap, publicSnap] = await Promise.all([window.db.ref('articles').once('value'), window.db.ref('publishedArticles').once('value')]);
    const alreadyPublic = new Set(); publicSnap.forEach(child => alreadyPublic.add(child.key));
    const updates = {};
    snap.forEach(child => {
      const article = child.val() || {};
      // Older admin-created articles had no status field; drafts/submissions did.
      if ((article.status === 'published' || !article.status) && article.title && !alreadyPublic.has(child.key)) updates[`publishedArticles/${child.key}`] = { ...article, id: child.key, status: 'published' };
    });
    if (Object.keys(updates).length) await window.db.ref().update(updates);
    $('migrationCard').hidden = Object.keys(updates).length === 0;
    if (Object.keys(updates).length) notice(`Синхронизирани са ${Object.keys(updates).length} стари публикации в публичния архив.`, 'success');
  }

  async function loadOverview() {
    const paths = ['publishedArticles','rubrics','events'];
    const [articlesSnap, rubricsSnap, eventsSnap] = await Promise.all(paths.map(path => window.db.ref(path).once('value')));
    const now = Date.now(); let upcoming = 0;
    eventsSnap.forEach(c => { if (Number(c.val()?.timestamp) >= now) upcoming++; });
    $('statArticles').textContent = articlesSnap.numChildren();
    $('statRubrics').textContent = rubricsSnap.numChildren();
    $('statEvents').textContent = upcoming;
    if (can('articles')) {
      const pendingQuery = state.role === 'reporter' ? window.db.ref('articles').orderByChild('authorId').equalTo(state.user.uid) : window.db.ref('articles').orderByChild('status').equalTo('submitted');
      const pendingSnap = await pendingQuery.once('value').catch(() => null);
      $('statPending').textContent = pendingSnap ? pendingSnap.numChildren() : '—';
    } else $('statPending').textContent = '—';
  }

  function populateRubricTypes() {
    const select = $('rubricType'); if (!select || !window.RubricsDB) return;
    select.innerHTML = window.RubricsDB.getAllTypes().map(t => `<option value="${esc(t.id)}">${esc(t.icon)} ${esc(t.name)}</option>`).join('');
  }

  async function loadArticles() {
    const list = $('editorialArticlesList'); if (!list) return;
    list.innerHTML = '<p class="muted">Зареждане на статиите…</p>';
    try {
      let snap;
      if (['admin','redactor','editor'].includes(state.role)) snap = await window.db.ref('articles').once('value');
      else snap = await window.db.ref('articles').orderByChild('authorId').equalTo(state.user.uid).once('value');
      state.articles = getAllValues(snap).sort((a,b) => Number(b.createdAt || new Date(b.date || 0).getTime()) - Number(a.createdAt || new Date(a.date || 0).getTime()));
      if (!state.articles.length) { list.innerHTML = '<p class="empty-state">Все още няма статии. Създайте първата от формата по-горе.</p>'; return; }
      list.innerHTML = state.articles.map(a => `<article class="manage-row"><div class="manage-row-main"><h4>${esc(a.title || 'Без заглавие')}</h4><p>${esc(a.author || 'Неизвестен автор')} · ${shortDate(a.createdAt || a.date)} · ${esc(a.category || '')}</p><p>${esc(a.excerpt || '')}</p><div class="row-actions"><span class="status-pill ${statusClass(a.status)}">${esc(displayStatus(a.status))}</span><button type="button" data-article-action="edit" data-id="${esc(a.id)}">Редактирай</button>${['admin','redactor','editor'].includes(state.role) && ['submitted','approved'].includes(a.status) ? `<button type="button" data-article-action="publish" data-id="${esc(a.id)}">Публикувай</button>` : ''}${can('spotlight') ? `<button class="danger" type="button" data-article-action="delete" data-id="${esc(a.id)}">Изтрий</button>` : ''}</div></div>${safeUrl(a.imageUrl) ? `<img src="${esc(safeUrl(a.imageUrl))}" alt="">` : ''}</article>`).join('');
    } catch (error) { list.innerHTML = `<p class="empty-state">Неуспешно зареждане: ${esc(error.code || error.message)}. Проверете правилата за достъп до articles.</p>`; }
  }

  async function handleArticleSubmit(event) {
    event.preventDefault();
    const submitter = event.submitter;
    const mode = submitter?.dataset.mode || 'draft';
    const id = $('editingArticleId').value;
    const title = $('articleTitle').value.trim();
    const excerpt = $('articleExcerpt').value.trim();
    const content = $('articleContent').value.trim();
    if (!title || !excerpt || !content) return feedback('articleFormFeedback', 'Попълнете заглавие, кратко описание и текст.', true);
    const btn = submitter || $('saveDraftBtn');
    try {
      await disableDuring(btn, (async () => {
        const fallback = imageUrlsFromInput($('articleImageUrl').value);
        const existing = id ? state.articles.find(a => a.id === id) : null;
        const imageUrls = fallback.length ? fallback : [...(existing?.imageUrls || [])];
        if (!imageUrls.length && existing?.imageUrl) imageUrls.push(existing.imageUrl);
        const roleCanPublish = ['admin','redactor','editor'].includes(state.role);
        const status = !roleCanPublish ? 'submitted' : (mode === 'publish' ? 'published' : 'draft');
        const article = {
          title, excerpt, content, category: $('articleCategory').value,
          author: $('articleAuthor').value.trim() || state.user.displayName || state.user.email,
          authorId: existing?.authorId || state.user.uid,
          authorEmail: state.user.email || '',
          imageUrl: imageUrls[0] || '', imageUrls,
          videoUrl: safeUrl($('articleVideoUrl').value) || '',
          status, updatedAt: firebase.database.ServerValue.TIMESTAMP,
          date: existing?.date || new Date().toISOString(),
          createdAt: existing?.createdAt || firebase.database.ServerValue.TIMESTAMP,
          lastEditedBy: state.user.uid
        };
        if (status === 'published') { article.publishedAt = existing?.publishedAt || firebase.database.ServerValue.TIMESTAMP; article.publishedBy = state.user.uid; }
        let ref;
        if (id) { ref = window.db.ref(`articles/${id}`); await ref.update(article); }
        else { ref = window.db.ref('articles').push(); await ref.set(article); }
        const articleId = id || ref.key;
        if (status === 'published') await window.db.ref(`publishedArticles/${articleId}`).set({ ...article, id: articleId });
        else if (id) await window.db.ref(`publishedArticles/${articleId}`).remove();
        feedback('articleFormFeedback', status === 'published' ? 'Статията е публикувана и вече е в публичния архив.' : status === 'submitted' ? 'Статията е изпратена за редакторски преглед.' : 'Черновата е запазена.');
        resetArticleForm(); await loadArticles(); await loadOverview();
      })(), 'Качване и запазване…');
    } catch (error) { feedback('articleFormFeedback', `Неуспешно запазване: ${error.code || error.message}`, true); }
  }

  function resetArticleForm() {
    $('articleEditorForm').reset(); $('editingArticleId').value = ''; $('articleFormHeading').textContent = 'Напишете история'; $('articleAuthor').value = state.user?.displayName || state.user?.email?.split('@')[0] || '';
    $('cancelArticleEdit').hidden = true; $('publishArticleBtn').hidden = !['admin','redactor','editor'].includes(state.role);
    $('saveDraftBtn').textContent = ['admin','redactor','editor'].includes(state.role) ? 'Запази като чернова' : 'Изпрати за преглед';
  }
  function editArticle(id) {
    const a = state.articles.find(x => x.id === id); if (!a) return;
    if (a.authorId !== state.user.uid && !['admin','redactor','editor'].includes(state.role)) return notice('Можете да редактирате само собствените си материали.', 'error');
    $('editingArticleId').value = id; $('articleTitle').value = a.title || ''; $('articleExcerpt').value = a.excerpt || '';
    $('articleContent').value = a.content || ''; $('articleCategory').value = a.category || 'news'; $('articleAuthor').value = a.author || '';
    $('articleImageUrl').value = safeUrl(a.imageUrl) || ''; $('articleVideoUrl').value = safeUrl(a.videoUrl) || '';
    $('articleFormHeading').textContent = 'Редактирайте историята'; $('cancelArticleEdit').hidden = false;
    $('publishArticleBtn').hidden = !['admin','redactor','editor'].includes(state.role);
    $('articleEditorForm').scrollIntoView({ behavior:'smooth', block:'start' });
  }

  async function deleteArticle(id) {
    if (!can('spotlight') || !confirm('Да изтрием ли статията?')) return;
    try { await window.db.ref().update({ [`articles/${id}`]: null, [`publishedArticles/${id}`]: null, [`queues/adminQueue/${id}`]: null, [`queues/redactorQueue/${id}`]: null }); await loadArticles(); await loadOverview(); }
    catch (error) { notice(`Изтриването не беше успешно: ${error.code || error.message}`, 'error'); }
  }
  async function publishExistingArticle(id) {
    if (!['admin','redactor','editor'].includes(state.role)) return;
    const a = state.articles.find(x => x.id === id); if (!a) return;
    try {
      const updates = { status:'published', publishedAt:firebase.database.ServerValue.TIMESTAMP, publishedBy:state.user.uid, updatedAt:firebase.database.ServerValue.TIMESTAMP };
      await window.db.ref(`articles/${id}`).update(updates);
      await window.db.ref(`publishedArticles/${id}`).set({ ...a, ...updates, id });
      await window.db.ref(`queues/redactorQueue/${id}`).remove(); await window.db.ref(`queues/adminQueue/${id}`).remove();
      await loadArticles(); await loadOverview(); notice('Статията вече е публична.', 'success');
    } catch (error) { notice(`Публикуването не беше успешно: ${error.code || error.message}`, 'error'); }
  }

  async function loadRubrics() {
    const list = $('editorialRubricsList'); if (!list) return;
    try {
      const snap = await window.db.ref('rubrics').orderByChild('date').limitToLast(100).once('value');
      const rubrics = getAllValues(snap).sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
      state.rubrics = rubrics;
      if (!rubrics.length) { list.innerHTML = '<p class="empty-state">Все още няма публикувани материали в рубриките.</p>'; return; }
      list.innerHTML = rubrics.map(r => `<article class="manage-row">${safeUrl(r.imageUrl) ? `<img src="${esc(safeUrl(r.imageUrl))}" alt="">` : ''}<div class="manage-row-main"><h4>${esc(r.title || 'Без заглавие')}</h4><p>${esc(window.RubricsDB?.getTypeById(r.type)?.name || r.type || 'Рубрика')} · ${esc(r.author || '')} · ${shortDate(r.date)}</p><p>${esc(String(r.content || '').slice(0,180))}${String(r.content || '').length > 180 ? '…' : ''}</p><div class="row-actions"><span class="status-pill published">Публична</span><button type="button" data-rubric-edit="${esc(r.id)}">Редактирай</button><button class="danger" type="button" data-rubric-delete="${esc(r.id)}">Изтрий</button></div></div></article>`).join('');
    } catch (error) { list.innerHTML = `<p class="empty-state">Неуспешно зареждане: ${esc(error.code || error.message)}</p>`; }
  }
  async function handleRubricSubmit(event) {
    event.preventDefault();
    try {
      const id = $('editingRubricId').value;
      const existing = id ? state.rubrics?.find(r => r.id === id) : null;
      const enteredImages = imageUrlsFromInput($('rubricImageUrl').value);
      const imageUrl = enteredImages[0] || existing?.imageUrl || '';
      const rubric = { type:$('rubricType').value, title:$('rubricTitle').value.trim(), content:$('rubricContent').value.trim(), author:$('rubricAuthor').value.trim() || state.user.displayName || state.user.email, tags:$('rubricTags').value.trim(), imageUrl, imageUrls:enteredImages.length ? enteredImages : (existing?.imageUrls || (imageUrl ? [imageUrl] : [])), date:existing?.date || new Date().toISOString(), updatedAt:firebase.database.ServerValue.TIMESTAMP, published:true, createdBy:existing?.createdBy || state.user.uid, createdAt:existing?.createdAt || firebase.database.ServerValue.TIMESTAMP, lastEditedBy:state.user.uid };
      if (!rubric.title || !rubric.content || !rubric.author) return feedback('rubricFormFeedback','Попълнете задължителните полета.',true);
      if (id) await window.db.ref(`rubrics/${id}`).update(rubric); else await window.db.ref('rubrics').push(rubric);
      resetRubricForm(); feedback('rubricFormFeedback',id ? 'Промените са запазени.' : 'Материалът е публикуван в рубриките.'); await loadRubrics(); await loadOverview();
    } catch (error) { feedback('rubricFormFeedback',`Грешка: ${error.code || error.message}`,true); }
  }
  function resetRubricForm() {
    $('rubricEditorForm').reset(); $('editingRubricId').value = ''; $('rubricFormHeading').textContent = 'Добавете към рубрика'; $('saveRubricBtn').textContent = 'Публикувай рубрика'; $('cancelRubricEdit').hidden = true;
    $('rubricAuthor').value = state.user?.displayName || state.user?.email?.split('@')[0] || '';
  }
  function editRubric(id) {
    const r = state.rubrics?.find(x => x.id === id); if (!r) return;
    $('editingRubricId').value = id; $('rubricType').value = r.type || ''; $('rubricTitle').value = r.title || ''; $('rubricContent').value = r.content || ''; $('rubricAuthor').value = r.author || ''; $('rubricTags').value = r.tags || ''; $('rubricImageUrl').value = safeUrl(r.imageUrl) || '';
    $('rubricFormHeading').textContent = 'Редактирайте материала'; $('saveRubricBtn').textContent = 'Запази промените'; $('cancelRubricEdit').hidden = false;
    $('rubricEditorForm').scrollIntoView({ behavior:'smooth', block:'start' });
  }
  async function deleteRubric(id) {
    if (!confirm('Да изтрием ли този материал от рубриките?')) return;
    try { await window.db.ref(`rubrics/${id}`).remove(); await loadRubrics(); await loadOverview(); }
    catch (error) { notice(`Грешка: ${error.code || error.message}`, 'error'); }
  }

  async function loadEvents() {
    const list = $('editorialEventsList'); if (!list) return;
    try {
      const snap = await window.db.ref('events').orderByChild('timestamp').once('value');
      const events = getAllValues(snap).sort((a,b) => Number(a.timestamp)-Number(b.timestamp)); state.events = events;
      if (!events.length) { list.innerHTML = '<p class="empty-state">Календарът все още е празен.</p>'; return; }
      list.innerHTML = events.map(e => `<article class="manage-row"><div class="manage-row-main"><h4>${esc(e.title || 'Събитие')}</h4><p>${shortDate(Number(e.timestamp))} · ${esc(e.location || 'Без място')}</p><p>${esc(e.description || '')}</p><div class="row-actions"><span class="status-pill ${Number(e.timestamp) >= Date.now() ? 'published' : ''}">${Number(e.timestamp) >= Date.now() ? 'Предстоящо' : 'Минало'}</span><button type="button" data-event-edit="${esc(e.id)}">Редактирай</button><button class="danger" data-event-delete="${esc(e.id)}" type="button">Изтрий</button></div></div></article>`).join('');
    } catch (error) { list.innerHTML = `<p class="empty-state">Неуспешно зареждане: ${esc(error.code || error.message)}</p>`; }
  }
  function resetEventForm() {
    $('eventEditorForm')?.reset();
    if ($('editingEventId')) $('editingEventId').value = '';
    const heading = $('eventFormHeading'); if (heading) heading.textContent = 'Планирайте дата';
    const submit = $('eventSubmitBtn'); if (submit) submit.textContent = '＋ Добави събитие';
    const cancel = $('cancelEventEdit'); if (cancel) cancel.hidden = true;
  }
  function editEvent(id) {
    const item = state.events.find(e => e.id === id); if (!item) return;
    $('editingEventId').value = id; $('eventTitle').value = item.title || '';
    $('eventDescription').value = item.description || ''; $('eventLocation').value = item.location || '';
    const date = item.date || new Date(Number(item.timestamp)).toISOString().slice(0,10);
    const time = item.time || new Date(Number(item.timestamp)).toTimeString().slice(0,5);
    $('eventDate').value = date; $('eventTime').value = time;
    $('eventFormHeading').textContent = 'Редактирайте събитието';
    $('eventSubmitBtn').textContent = 'Запази промените'; $('cancelEventEdit').hidden = false;
    $('eventEditorForm').scrollIntoView({behavior:'smooth',block:'center'});
  }
  async function handleEventSubmit(event) {
    event.preventDefault();
    const date = $('eventDate').value, time = $('eventTime').value;
    const timestamp = new Date(`${date}T${time}`).getTime();
    if (!Number.isFinite(timestamp)) return feedback('eventFormFeedback','Невалидни дата или час.',true);
    const id = $('editingEventId').value;
    const payload = { title:$('eventTitle').value.trim(), description:$('eventDescription').value.trim(), location:$('eventLocation').value.trim(), date, time, timestamp, updatedAt:firebase.database.ServerValue.TIMESTAMP, updatedBy:state.user.uid };
    if (!payload.title || !payload.location) return feedback('eventFormFeedback','Попълнете име и място на събитието.',true);
    try {
      if (id) await window.db.ref(`events/${id}`).update(payload);
      else await window.db.ref('events').push({...payload, createdAt:firebase.database.ServerValue.TIMESTAMP, createdBy:state.user.uid, createdByName:state.user.displayName || state.user.email});
      resetEventForm(); feedback('eventFormFeedback',id ? 'Промените са запазени и видими в календара.' : 'Събитието е добавено и вече е видимо в календара.'); await loadEvents(); await loadOverview();
    } catch (error) { feedback('eventFormFeedback',`Грешка: ${error.code || error.message}`,true); }
  }
  async function deleteEvent(id) {
    if (!confirm('Да премахнем ли събитието от публичния календар?')) return;
    try { await window.db.ref(`events/${id}`).remove(); await loadEvents(); await loadOverview(); }
    catch (error) { notice(`Грешка: ${error.code || error.message}`, 'error'); }
  }

  async function loadApplications() {
    const list = $('applicationsList'); if (!list) return;
    try {
      const snap = await window.db.ref('applications').once('value'); state.applications = getAllValues(snap).sort((a,b) => Number(b.timestamp || 0)-Number(a.timestamp || 0));
      const pending = state.applications.filter(a => !['approved','rejected'].includes(a.status));
      $('applicationBadge').textContent = pending.length || '';
      if (!state.applications.length) { list.innerHTML = '<p class="empty-state">Няма кандидатури.</p>'; return; }
      list.innerHTML = state.applications.map(a => `<article class="manage-row"><div class="manage-row-main"><h4>${esc(a.name || 'Без име')} · ${esc(a.class || 'Клас не е посочен')}</h4><p><a href="mailto:${encodeURIComponent(a.email || '')}">${esc(a.email || '')}</a> · ${shortDate(a.timestamp || a.date)}</p><p><strong>Желана роля:</strong> ${esc(roles[a.desiredRole] || a.desiredRole || 'Не е посочена')}</p><p>${esc(a.message || '')}</p><div class="row-actions"><span class="status-pill ${statusClass(a.status)}">${esc(displayStatus(a.status))}</span>${!['approved','rejected'].includes(a.status) ? `<button type="button" data-application-action="approve" data-id="${esc(a.id)}">Одобри</button><button class="danger" type="button" data-application-action="reject" data-id="${esc(a.id)}">Откажи</button>` : ''}</div></div></article>`).join('');
    } catch (error) { list.innerHTML = `<p class="empty-state">Неуспешно зареждане: ${esc(error.code || error.message)}. Проверете правилата за applications.</p>`; }
  }
  async function updateApplication(id, status) {
    const a = state.applications.find(x => x.id === id); if (!a) return;
    try {
      let assignedUid = null;
      if (status === 'approved') {
        const applicant = (state.users || []).find(u => String(u.email || '').toLowerCase() === String(a.email || '').toLowerCase());
        if (applicant && ['reporter','photographer','designer','redactor'].includes(a.desiredRole)) {
          await window.db.ref(`users/${applicant.id}`).update({ role:a.desiredRole, roleUpdatedAt:firebase.database.ServerValue.TIMESTAMP, roleUpdatedBy:state.user.uid });
          assignedUid = applicant.id;
        }
      }
      await window.db.ref(`applications/${id}`).update({ status, reviewedAt:firebase.database.ServerValue.TIMESTAMP, reviewedBy:state.user.uid, recommendedRole:status === 'approved' ? (a.desiredRole || 'reporter') : null, assignedUserUid:assignedUid });
      await loadApplications(); if (assignedUid) await loadUsers();
      notice(status === 'approved' ? (assignedUid ? 'Кандидатурата е одобрена и ролята е зададена.' : 'Кандидатурата е одобрена. След регистрация задайте роля от раздел „Екип“.') : 'Кандидатурата е отказана.', 'success');
    } catch (error) { notice(`Грешка при промяна на кандидатурата: ${error.code || error.message}`, 'error'); }
  }

  async function loadUsers() {
    const list = $('usersList'); if (!list) return;
    try {
      const snap = await window.db.ref('users').once('value'); state.users = getAllValues(snap);
      const available = ['user','reporter','photographer','designer','redactor','editor'];
      list.innerHTML = state.users.map(u => `<article class="manage-row"><div class="manage-row-main"><h4>${esc(u.displayName || u.email || u.uid)}</h4><p>${esc(u.email || '')} · UID: ${esc(u.uid || u.id)}</p>${u.role === 'admin' ? '<span class="status-pill published">Администратор · защитен профил</span>' : `<div class="row-actions"><label class="muted">Роля <select class="role-picker" data-role-user="${esc(u.id)}">${available.map(role => `<option value="${role}" ${String(u.role || 'user') === role ? 'selected' : ''}>${esc(roles[role])}</option>`).join('')}</select></label><button type="button" data-role-save="${esc(u.id)}">Запази роля</button></div>`}</div></article>`).join('') || '<p class="empty-state">Няма регистрирани потребители.</p>';
    } catch (error) { list.innerHTML = `<p class="empty-state">Неуспешно зареждане: ${esc(error.code || error.message)}</p>`; }
  }
  async function saveUserRole(uid) {
    const select = document.querySelector(`[data-role-user="${CSS.escape(uid)}"]`); if (!select) return;
    if (uid === state.user.uid && select.value !== 'admin') return notice('Не можете да премахнете собствените си администраторски права от тази сесия.', 'error');
    if (!confirm(`Да зададем ли роля „${roles[select.value]}“?`)) return;
    try { await window.db.ref(`users/${uid}`).update({ role:select.value, roleUpdatedAt:firebase.database.ServerValue.TIMESTAMP, roleUpdatedBy:state.user.uid }); notice('Ролята е актуализирана.', 'success'); await loadUsers(); }
    catch (error) { notice(`Грешка при запазване на роля: ${error.code || error.message}`, 'error'); }
  }


  async function loadMedia() {
    const list = $('mediaList'); if (!list) return;
    try {
      const snap = await window.db.ref('mediaLibrary').orderByChild('uploadedBy').equalTo(state.user.uid).once('value'); state.media = getAllValues(snap).sort((a,b) => Number(b.createdAt||0)-Number(a.createdAt||0));
      list.innerHTML = state.media.map(m => `<article class="media-item"><img src="${esc(safeUrl(m.url))}" alt="${esc(m.name || 'Качено изображение')}"><p>${esc(m.name || 'Изображение')}</p><button type="button" data-copy-media="${esc(m.id)}">Копирай адрес</button></article>`).join('') || '<p class="empty-state">Все още няма качени изображения.</p>';
    } catch (error) { list.innerHTML = `<p class="empty-state">Неуспешно зареждане: ${esc(error.code || error.message)}</p>`; }
  }
  async function handleMediaUpload(event) {
    event.preventDefault();
    try { const urls = imageUrlsFromInput($('mediaImageUrls').value); if (!urls.length) throw new Error('Поставете поне един HTTPS адрес на изображение.'); for (const url of urls) await saveImageUrl(url, 'library'); $('mediaUploadForm').reset(); feedback('mediaFeedback', `Добавени са ${urls.length} адреса на изображения.`); await loadMedia(); }
    catch (error) { feedback('mediaFeedback', `Неуспешно добавяне: ${error.code || error.message}`, true); }
  }

  async function loadSpotlight() {
    try {
      const snap = await window.db.ref('siteContent/spotlight').once('value'), s = snap.val() || {};
      $('spotlightKicker').value = s.kicker || 'Акцент на месеца'; $('spotlightTitle').value = s.title || '';
      $('spotlightText').value = s.text || ''; $('spotlightLink').value = s.buttonLink || 'page-articles.html'; $('spotlightButton').value = s.buttonText || 'Прочети повече';
    } catch (error) { feedback('spotlightFeedback', `Не успяхме да прочетем акцента: ${error.code || error.message}`, true); }
  }
  async function saveSpotlight(event) {
    event.preventDefault();
    try {
      await window.db.ref('siteContent/spotlight').set({ kicker:$('spotlightKicker').value.trim(), title:$('spotlightTitle').value.trim(), text:$('spotlightText').value.trim(), buttonLink:$('spotlightLink').value.trim() || 'page-articles.html', buttonText:$('spotlightButton').value.trim() || 'Прочети повече', updatedAt:firebase.database.ServerValue.TIMESTAMP, updatedBy:state.user.uid });
      feedback('spotlightFeedback','Акцентът на месеца е запазен.');
    } catch (error) { feedback('spotlightFeedback',`Грешка: ${error.code || error.message}`,true); }
  }

  function bindEvents() {
    $('articleEditorForm').addEventListener('submit', handleArticleSubmit);
    $('cancelArticleEdit').addEventListener('click', resetArticleForm);
    $('editorialArticlesList').addEventListener('click', e => {
      const b = e.target.closest('[data-article-action]'); if (!b) return;
      const { articleAction, id } = b.dataset;
      if (articleAction === 'edit') editArticle(id); if (articleAction === 'delete') deleteArticle(id); if (articleAction === 'publish') publishExistingArticle(id);
    });
    $('rubricEditorForm').addEventListener('submit', handleRubricSubmit);
    $('cancelRubricEdit').addEventListener('click', resetRubricForm);
    $('editorialRubricsList').addEventListener('click', e => { const edit=e.target.closest('[data-rubric-edit]'); if (edit) return editRubric(edit.dataset.rubricEdit); const del=e.target.closest('[data-rubric-delete]'); if (del) deleteRubric(del.dataset.rubricDelete); });
    $('eventEditorForm').addEventListener('submit', handleEventSubmit);
    $('cancelEventEdit')?.addEventListener('click', resetEventForm);
    $('editorialEventsList').addEventListener('click', e => { const edit=e.target.closest('[data-event-edit]'); if (edit) return editEvent(edit.dataset.eventEdit); const b=e.target.closest('[data-event-delete]'); if (b) deleteEvent(b.dataset.eventDelete); });
    $('applicationsList').addEventListener('click', e => { const b=e.target.closest('[data-application-action]'); if (b) updateApplication(b.dataset.id, b.dataset.applicationAction === 'approve' ? 'approved' : 'rejected'); });
    $('usersList').addEventListener('click', e => { const b=e.target.closest('[data-role-save]'); if (b) saveUserRole(b.dataset.roleSave); });
    $('mediaUploadForm').addEventListener('submit', handleMediaUpload);
    $('mediaList').addEventListener('click', async e => { const b=e.target.closest('[data-copy-media]'); if (!b) return; const m=state.media.find(x=>x.id===b.dataset.copyMedia); if (m) { try { await navigator.clipboard.writeText(m.url); notice('Адресът на изображението е копиран.', 'success'); } catch (_) { window.prompt('Копирайте адреса:', m.url); } } });
    $('spotlightForm').addEventListener('submit', saveSpotlight);
    $('migrateBtn').addEventListener('click', async () => { try { await migratePublishedArticles(); await loadOverview(); } catch (e) { notice(`Синхронизацията не успя: ${e.code || e.message}`, 'error'); } });
    const refreshMap = { refreshArticlesBtn:loadArticles, refreshRubricsBtn:loadRubrics, refreshEventsBtn:loadEvents, refreshApplicationsBtn:loadApplications, refreshUsersBtn:loadUsers, refreshMediaBtn:loadMedia };
    Object.entries(refreshMap).forEach(([id, fn]) => $(id)?.addEventListener('click', fn));
    $('logoutBtn').addEventListener('click', async () => { await window.auth.signOut(); location.href = 'index.html'; });
  }

  async function start() {
    if (!window.firebaseReady || !window.auth || !window.db) {
      $('loadingState').textContent = `Firebase не е инициализиран. ${window.firebaseInitError?.message || 'Проверете настройките и интернет връзката.'}`;
      return;
    }
    try {
      state.user = await waitForAuth();
      if (!state.user) { location.href = 'index.html'; return; }
      state.role = await readRole(state.user.uid);
      if (!permissions[state.role] || state.role === 'user') {
        $('loadingState').textContent = 'Този профил няма редакционни права. Ще се върнете към публичния вестник.';
        setTimeout(() => { location.href = 'index.html'; }, 1800); return;
      }
      $('loadingState').hidden = true;
      $('profileName').textContent = state.user.displayName || state.user.email || 'Редактор';
      $('profileRole').textContent = roles[state.role] || state.role;
      $('profileInitials').textContent = (state.user.displayName || state.user.email || 'МЖ').split(/[\s@.]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
      renderRoleAccess(); populateRubricTypes(); bindEvents(); resetArticleForm(); resetRubricForm(); resetEventForm();
      await loadOverview();
      if (state.role === 'admin') {
        try { await migratePublishedArticles(); } catch (e) { notice(`Старите публикации не можаха да се синхронизират: ${e.code || e.message}`, 'error'); }
      }
      if (can('articles')) await loadArticles();
      if (can('rubrics')) await loadRubrics();
      if (can('events')) await loadEvents();
      if (can('applications')) await loadApplications();
      if (can('team')) await loadUsers();
      if (can('media')) await loadMedia();
      if (can('spotlight')) await loadSpotlight();
      // Reporter is restricted to submitting; do not offer draft/publish controls that exceed their role.
      if (state.role === 'reporter') { $('saveDraftBtn').textContent = 'Изпрати за преглед'; $('publishArticleBtn').hidden = true; }
    } catch (error) {
      $('loadingState').textContent = `Неуспешна проверка на достъпа: ${error.code || error.message}. Проверете Firebase Authentication и правилата.`;
    }
  }
  document.addEventListener('DOMContentLoaded', start);
})();
