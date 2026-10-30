(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => { try { const raw = typeof value === 'object' && value ? (value.downloadURL || value.url || value.src || value.path || '') : value; const u = new URL(String(raw || ''), location.href); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } };
  async function resolveImage(value) {
    const raw = typeof value === 'object' && value ? (value.downloadURL || value.downloadUrl || value.url || value.src || value.fullPath || value.storagePath || value.path || value.imageUrl || '') : String(value || '');
    if (!raw) return '';
    const direct = safeUrl(raw); if (direct) return direct;
    if (!window.storage) return '';
    try {
      if (/^gs:\/\//i.test(raw)) return await window.storage.refFromURL(raw).getDownloadURL();
      return await window.storage.ref(raw.replace(/^\/+/, '')).getDownloadURL();
    } catch (error) { console.warn('Could not resolve article image:', raw, error.code || error.message); return ''; }
  }
  async function resolveArticleImages(article) {
    let values = Array.isArray(article.imageUrls) ? article.imageUrls : (article.imageUrls && typeof article.imageUrls === 'object' ? Object.values(article.imageUrls) : []);
    values = values.concat([article.images, article.photos, article.coverImage, article.thumbnail, article.image, article.imageUrl,article.imageUrl2,article.imageUrl3,article.imageUrl4,article.imageUrl5,article.imageUrl6]).flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
    article._resolvedImages = [...new Set((await Promise.all(values.slice(0,6).map(resolveImage))).filter(Boolean))];
    return article._resolvedImages;
  }
  const categories = {news:'Новини',interview:'Интервю',opinion:'Мнение',culture:'Култура',school:'Училищен живот',useful:'Полезно и любопитно',fun:'Свободно време'};
  const dateLabel = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Наскоро' : d.toLocaleDateString('bg-BG',{year:'numeric',month:'long',day:'numeric'}); };

  function paragraphs(content) {
    return String(content || '').split(/\n{2,}|\n/).map(line=>line.trim()).filter(Boolean).map(line=>{
      const text = esc(line).replace(/(https:\/\/[^\s<]+)/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
      return `<p>${text}</p>`;
    }).join('');
  }
  function videoBlock(value) {
    const url = safeUrl(value); if (!url) return '';
    const parsed = new URL(url); let id = '';
    if (parsed.hostname === 'youtu.be') id = parsed.pathname.slice(1).split('/')[0];
    if (['youtube.com','www.youtube.com','m.youtube.com'].includes(parsed.hostname)) {
      id = parsed.searchParams.get('v') || (parsed.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/) || [])[1] || '';
    }
    if (/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return `<div class="article-video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}" title="Видеоматериал към статията" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    if (parsed.hostname === 'www.tiktok.com' || parsed.hostname === 'tiktok.com' || parsed.hostname === 'm.tiktok.com') {
      const videoId = (parsed.pathname.match(/\/video\/(\d+)/) || [])[1];
      if (videoId) return `<div class="article-video tiktok-video"><blockquote class="tiktok-embed" cite="${esc(url)}" data-video-id="${esc(videoId)}" style="max-width:605px;min-width:280px"><section><a target="_blank" rel="noopener noreferrer" href="${esc(url)}">Гледай видеото в TikTok</a></section></blockquote></div>`;
      return `<div class="article-video-link"><p>🎬 Видео от TikTok</p><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Гледай видеото ↗</a></div>`;
    }
    return '';
  }
  function imageGallery(article) {
    const urls = article._resolvedImages || [];
    if (!urls.length) return '';
    return `<figure class="article-gallery ${urls.length > 1 ? 'multi' : ''}">${urls.map((url,i)=>`<img src="${esc(url)}" alt="${esc(article.title || 'Снимка към статията')} · ${i+1}" loading="lazy" decoding="async" onerror="this.closest('figure')?.classList.add('image-load-warning');this.remove()">`).join('')}</figure>`;
  }
  function renderArticle(article, id) {
    document.title = `${article.title || 'Статия'} — Млад журналист`;
    $('articleContent').innerHTML = `
      <div class="article-kicker">${esc(categories[article.category] || article.category || 'ОТ РЕДАКЦИЯТА')}</div>
      <h1 class="article-title">${esc(article.title || 'Без заглавие')}</h1>
      ${article.excerpt ? `<p class="article-deck">${esc(article.excerpt)}</p>` : ''}
      <div class="article-byline"><span>✍ ${esc(article.author || 'Редакцията')}</span><time>${esc(dateLabel(article.publishedAt || article.date))}</time></div>
      ${imageGallery(article)}
      <div class="article-body">${paragraphs(article.content)}</div>
      ${videoBlock(article.videoUrl)}
      <div class="article-share"><button id="shareArticle" type="button">↗ Сподели статията</button><a href="page-articles.html">Към всички статии →</a></div>`;
    $('shareArticle')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); $('shareArticle').textContent='✓ Линкът е копиран'; } catch (_) { window.prompt('Копирайте линка:', location.href); } });
  }
  async function loadArticle(id) {
    const target = $('articleContent');
    if (!window.db) { target.textContent = 'Връзката с Firebase е временно недостъпна.'; return; }
    target.innerHTML = '<p class="loading-note">Зареждаме историята…</p>';
    try {
      let snap = await window.db.ref(`publishedArticles/${id}`).once('value');
      // Backwards compatibility for older public records only. New publishing always mirrors to publishedArticles.
      if (!snap.exists()) {
        const legacy = await window.db.ref(`articles/${id}`).once('value').catch(() => null);
        const value = legacy?.val();
        if (value?.status === 'published') snap = legacy;
      }
      const article = snap.val();
      if (!article || (article.status && article.status !== 'published')) { target.innerHTML = '<div class="archive-empty"><h2>Статията не е намерена</h2><p>Възможно е материалът да не е публикуван или адресът да е невалиден.</p><a href="page-articles.html">Към архива →</a></div>'; return; }
      await resolveArticleImages(article);
      renderArticle(article, id);
      if (article.videoUrl) { const embedUrl = safeUrl(article.videoUrl); if (embedUrl && ['www.tiktok.com','tiktok.com','m.tiktok.com'].includes(new URL(embedUrl).hostname)) { const script=document.createElement('script'); script.async=true; script.src='https://www.tiktok.com/embed.js'; document.body.appendChild(script); } }
    } catch (error) { console.error(error); target.innerHTML = `<div class="archive-empty"><h2>Не успяхме да заредим статията</h2><p>${esc(error.code || error.message)}</p><a href="page-articles.html">Към архива →</a></div>`; }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const id = new URLSearchParams(location.search).get('id');
    if (!id || !/^[A-Za-z0-9_-]{4,}$/.test(id)) { $('articleContent').textContent = 'Невалиден адрес на статия.'; return; }
    loadArticle(id);
  });
})();
