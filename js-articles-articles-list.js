(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => { try { const raw = typeof value === 'object' && value ? (value.downloadURL || value.downloadUrl || value.url || value.src || value.fullPath || value.storagePath || value.path || value.imageUrl || '') : value; const u = new URL(String(raw || ''), location.href); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } };
  const imageValues = article => {
    const values = [];
    if (Array.isArray(article.imageUrls)) values.push(...article.imageUrls);
    else if (article.imageUrls && typeof article.imageUrls === 'object') values.push(...Object.values(article.imageUrls));
    values.push(article.images, article.photos, article.coverImage, article.thumbnail, article.image, article.imageUrl, article.imageUrl2, article.imageUrl3, article.imageUrl4, article.imageUrl5, article.imageUrl6);
    return [...new Set(values.filter(Boolean))].slice(0, 6);
  };
  async function resolveImage(value) {
    const raw = typeof value === 'object' && value ? (value.downloadURL || value.downloadUrl || value.url || value.src || value.fullPath || value.storagePath || value.path || value.imageUrl || '') : String(value || '');
    if (!raw) return '';
    const direct = safeUrl(raw);
    if (direct) return direct;
    if (!window.storage) return '';
    try {
      if (/^gs:\/\//i.test(raw)) return await window.storage.refFromURL(raw).getDownloadURL();
      return await window.storage.ref(raw.replace(/^\/+/, '')).getDownloadURL();
    } catch (error) {
      console.warn('Article image could not be resolved:', raw, error.code || error.message);
      return '';
    }
  }
  async function resolveArticleImages(article) {
    const urls = await Promise.all(imageValues(article).map(resolveImage));
    article._resolvedImages = [...new Set(urls.filter(Boolean))];
    return article;
  }
  const categoryNames = {news:'Новини',interview:'Интервю',opinion:'Мнение',culture:'Култура',school:'Училищен живот',useful:'Полезно и любопитно',fun:'Свободно време'};
  let articles = [], selected = new Set();
  const $ = id => document.getElementById(id);
  const dateLabel = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Наскоро' : d.toLocaleDateString('bg-BG',{day:'numeric',month:'long',year:'numeric'}); };

  function render() {
    const box = $('articlesContainer'); if (!box) return;
    const term = ($('articleSearch')?.value || '').trim().toLocaleLowerCase('bg-BG');
    const category = $('categoryFilter')?.value || 'all';
    const filtered = articles.filter(a => {
      const matchesCategory = category === 'all' || a.category === category;
      const text = `${a.title || ''} ${a.excerpt || ''} ${a.content || ''}`.toLocaleLowerCase('bg-BG');
      return matchesCategory && (!term || text.includes(term));
    });
    $('searchResultsInfo') && ($('searchResultsInfo').textContent = `Показваме ${filtered.length} от ${articles.length} публикувани материала.`);
    if (!filtered.length) { box.innerHTML = `<div class="archive-empty"><span>✎</span><h2>${articles.length ? 'Няма съвпадения' : 'Първите истории предстоят'}</h2><p>${articles.length ? 'Опитайте друга дума или категория.' : 'Когато редакцията публикува статии, те ще се появят тук.'}</p></div>`; updateSelection(); return; }
    box.innerHTML = filtered.map((a,index) => {
      const image = a._resolvedImages?.[0] || '';
      const id = esc(a.id);
      const articleHref = 'page-article.html';
      return `<article class="article-card editorial-article-card ${index===0?'lead-card':''}" data-article-id="${id}">
        <label class="article-pick"><input type="checkbox" class="article-select-checkbox" data-id="${id}" ${selected.has(a.id)?'checked':''}><span>Избери</span></label>
        <a class="article-card-image ${image?'':'no-image'}" href="${articleHref}?id=${encodeURIComponent(a.id)}" aria-label="Прочети ${esc(a.title || 'статия')}">
          ${image ? `<img src="${esc(image)}" alt="${esc(a.title || '')}" loading="lazy" decoding="async" onerror="this.closest('.article-card-image').classList.add('no-image');this.remove()">` : `<span class="article-image-fallback"><b>МЖ</b><small>МЛАД ЖУРНАЛИСТ</small></span>`}
        </a>
        <div class="article-card-content"><span class="article-category">${esc(categoryNames[a.category] || a.category || 'Статия')}</span><h2 class="article-card-title"><a href="${articleHref}?id=${encodeURIComponent(a.id)}">${esc(a.title || 'Без заглавие')}</a></h2><p class="article-card-excerpt">${esc(a.excerpt || '')}</p><div class="article-card-meta"><span>${esc(a.author || 'Редакцията')}</span><time>${esc(dateLabel(a.publishedAt || a.date))}</time></div><a class="article-read-more" href="${articleHref}?id=${encodeURIComponent(a.id)}">Прочети историята ↗</a></div>
      </article>`;
    }).join('');
    box.querySelectorAll('.article-select-checkbox').forEach(input => input.addEventListener('change', () => { input.checked ? selected.add(input.dataset.id) : selected.delete(input.dataset.id); updateSelection(); }));
    updateSelection();
  }
  function updateSelection() {
    const controls = $('newspaperControls'); if (!controls) return;
    controls.style.display = selected.size ? 'flex' : 'none';
    $('selectedCount') && ($('selectedCount').textContent = selected.size);
  }
   function load() {
    const box = $('articlesContainer');

    if (!window.db) {
        if (box) {
            box.innerHTML = `
                <div class="archive-empty">
                    <h2>Архивът е временно недостъпен</h2>
                    <p>Проверете връзката с Firebase Realtime Database.</p>
                </div>`;
        }
        return;
    }

    window.db.ref('publishedArticles').on('value', async snap => {
        try {
            const updatedArticles = [];

            snap.forEach(child => {
                const a = child.val() || {};

                if (a.status === 'published' || !a.status) {
                    updatedArticles.push({
                        ...a,
                        id: child.key
                    });
                }
            });

            updatedArticles.sort((a, b) =>
                new Date(b.publishedAt || b.date || 0) -
                new Date(a.publishedAt || a.date || 0)
            );

            await Promise.all(updatedArticles.map(resolveArticleImages));

            articles = updatedArticles;

            // Remove selections for articles that no longer exist.
            const existingIds = new Set(articles.map(a => a.id));
            selected = new Set(
                [...selected].filter(id => existingIds.has(id))
            );

            render();

        } catch (error) {
            console.error('Article rendering failed:', error);
        }
    }, error => {
        console.error('Firebase article listener failed:', error);

        if (box) {
            box.innerHTML = `
                <div class="archive-empty">
                    <h2>Не успяхме да заредим статиите</h2>
                    <p>${esc(error.message)}</p>
                </div>`;
        }
    });
}
  function setupSearch() {
    $('articleSearch')?.addEventListener('input', render);
    $('categoryFilter')?.addEventListener('change', render);
    $('clearSearch')?.addEventListener('click', () => { if ($('articleSearch')) $('articleSearch').value=''; if ($('categoryFilter')) $('categoryFilter').value='all'; render(); });
  }
  function openSelectedEdition() {
    const chosen = articles.filter(a => selected.has(a.id)); if (!chosen.length) return;
    const html = `<main class="print-edition"><h1>МЛАД ЖУРНАЛИСТ</h1><p class="edition-date">ИЗБРАНО ИЗДАНИЕ · ${new Date().toLocaleDateString('bg-BG')}</p>${chosen.map(a=>`<article><h2>${esc(a.title)}</h2><p class="byline">${esc(a.author || 'Редакцията')} · ${esc(dateLabel(a.date))}</p>${safeUrl(a.imageUrl)?`<img src="${esc(safeUrl(a.imageUrl))}" alt="">`:''}<p>${esc(a.content || a.excerpt || '').replace(/\n/g,'<br>')}</p></article>`).join('')}</main>`;
    const win = window.open('', '_blank'); if (!win) return alert('Разрешете изскачащите прозорци, за да създадете изданието.');
    win.document.write(`<!doctype html><html lang="bg"><head><meta charset="utf-8"><title>Млад журналист</title><style>body{font-family:Georgia,serif;color:#191a18;padding:35px;max-width:900px;margin:auto}.print-edition>h1{text-align:center;border-bottom:5px double #191a18;padding:12px;font-size:36px}.edition-date{text-align:center;letter-spacing:2px}article{border-bottom:1px solid #aaa;padding:25px 0;break-inside:avoid}article h2{font-size:27px}article img{max-width:100%;max-height:360px;object-fit:cover}.byline{font-size:12px;color:#666}@media print{body{padding:0}}</style></head><body>${html}<script>window.onload=()=>window.print()<\/script></body></html>`); win.document.close();
  }
  function bindEdition() {
    $('clearSelectionBtn')?.addEventListener('click', () => { selected.clear(); render(); });
    $('createNewspaperBtn')?.addEventListener('click', openSelectedEdition);
    $('closeNewspaperBtn')?.addEventListener('click', () => { if ($('newspaperModal')) $('newspaperModal').style.display='none'; });
    $('downloadNewspaperBtn')?.addEventListener('click', openSelectedEdition);
    $('printNewspaperBtn')?.addEventListener('click', openSelectedEdition);
    $('shareNewspaperBtn')?.addEventListener('click', async () => { const text = `Избрани статии от Млад журналист: ${Array.from(selected).map(id=>articles.find(a=>a.id===id)?.title).filter(Boolean).join(', ')}`; try { await navigator.clipboard.writeText(text); alert('Списъкът със заглавия е копиран.'); } catch (_) { alert(text); } });
  }
  document.addEventListener('DOMContentLoaded', () => { setupSearch(); bindEdition(); load(); });
})();
