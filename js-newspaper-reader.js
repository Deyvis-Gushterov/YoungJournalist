
(() => {
'use strict';

const $ = id => document.getElementById(id);

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

let issues = [];
let issue = null;
let index = 0;

const safeImage = value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch (_) {
    return '';
  }
};

/* Safely display formatted text while supporting old plain-text issues. */
function safeArticleHtml(value) {
  let raw = String(value ?? '').trim();

  const textarea = document.createElement('textarea');

  // Decode repeatedly until HTML tags are restored.
  for (let i = 0; i < 5; i++) {
    if (!/&(?:amp;)*lt;\/?(?:p|br|strong|b|em|i|u|h[2-4]|ul|ol|li|blockquote|a)\b/i.test(raw)) {
      break;
    }

    textarea.innerHTML = raw;
    const decoded = textarea.value;

    if (decoded === raw) break;
    raw = decoded;
  }

  const doc = new DOMParser().parseFromString(raw, 'text/html');

  const allowed = new Set([
    'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U',
    'H2', 'H3', 'H4', 'UL', 'OL', 'LI',
    'BLOCKQUOTE', 'A'
  ]);

  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent);
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createDocumentFragment();
    }

    const fragment = document.createDocumentFragment();

    if (!allowed.has(node.tagName)) {
      [...node.childNodes].forEach(child => fragment.append(clean(child)));
      return fragment;
    }

    const element = document.createElement(node.tagName.toLowerCase());

    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';

      try {
        const url = new URL(href, location.href);

        if (['https:', 'http:'].includes(url.protocol)) {
          element.href = url.href;
          element.rel = 'noopener noreferrer';
          element.target = '_blank';
        }
      } catch (error) {}
    }

    [...node.childNodes].forEach(child => element.append(clean(child)));

    fragment.append(element);
    return fragment;
  }

  const output = document.createElement('div');
[...doc.body.childNodes].forEach(node => output.append(clean(node)));

output.querySelectorAll('p').forEach(p => {
  if (!p.textContent.trim() && !p.querySelector('br')) {
    p.remove();
  }
});

return output.innerHTML;
}

/* Select a predictable layout for each existing page template. */
function getLayout(template) {
  const layouts = {
    cover: 'np-layout-cover',
    news: 'np-layout-news',
    interview: 'np-layout-interview',
    features: 'np-layout-features',
    creative: 'np-layout-creative',
    fun: 'np-layout-fun'
  };

  return layouts[template] || layouts.news;
}

function render() {
  const paper = $('npPaper');

  paper.classList.remove('np-turn');
  void paper.offsetWidth;
  paper.classList.add('np-turn');

  const page = issue.pages[index];
  if (!page) return;

  const template = page.template || 'news';
  const layout = getLayout(template);
  const image = safeImage(page.image);

  $('npPageSection').textContent =
    (page.title || 'СТРАНИЦА').toLocaleUpperCase('bg-BG');

  $('npPageNumber').textContent =
    String(index + 1).padStart(2, '0');

  $('npPageBottomNumber').textContent = index + 1;

  const figure = image
    ? `<figure class="np-figure">
         <img src="${image}"
              alt="${esc(page.caption || page.title)}"
              loading="lazy">
         ${page.caption
           ? `<figcaption>${esc(page.caption)}</figcaption>`
           : ''}
       </figure>`
    : '';

  const heading = `
    <header class="np-story-heading">
      <p class="np-overline">${esc(page.subtitle || issue.title || 'МЛАД ЖУРНАЛИСТ')}</p>
      <h1>${esc(page.title || '')}</h1>
    </header>`;

const articleHtml = safeArticleHtml(page.body || '');

const body = `
  <div class="np-copy">
    ${template === 'interview' ? figure : ''}
    ${articleHtml}
  </div>`;

  let content = '';

  if (template === 'cover') {
    /* Cover: photograph first, then headline and introduction. */
    content = `
      <div class="np-layout np-cover ${layout}">
        ${figure}
        ${heading}
        <div class="np-story-content">${body}</div>
      </div>`;
  } else {
    /*
      Interior pages: separate image and text into controlled
      grid areas instead of floating the image through paragraphs.
    */
    const imagePosition =
      template === 'interview' ? 'image-right' :
      template === 'creative' ? 'image-full' :
      template === 'fun' ? 'image-top' :
      'image-left';

    content = `
  <div class="np-layout np-${esc(template)} ${layout} ${imagePosition}">
    ${heading}
    <div class="np-story-grid ${image ? 'has-image' : 'no-image'}">
      <div class="np-story-content">
        ${template === 'interview' ? body : figure + body}
      </div>
    </div>
  </div>`;
  }

  $('npPageContent').innerHTML = content;

  $('npPageCounter').textContent =
    `Страница ${index + 1} от ${issue.pages.length}`;

  $('npPrev').disabled = index === 0;
  $('npNext').disabled = index === issue.pages.length - 1;
  $('npPageSelect').value = String(index);
}

function selectIssue(id) {
  issue = issues.find(item => item.id === id) || issues[0];

  if (!issue) return;

  index = 0;

  $('npIssueTitle').textContent =
    issue.title || 'Нашият вестник';

  $('npIssueDescription').textContent =
    issue.description ||
    'Истории, идеи и гласове от училищната общност.';

  $('npIssueMeta').textContent =
    `БРОЙ №${issue.issueNumber || '—'}`;

  $('npIssueDate').textContent = issue.publishedAt
    ? new Date(issue.publishedAt).toLocaleDateString('bg-BG', {
        month: 'long',
        year: 'numeric'
      })
    : 'ДИГИТАЛНО ИЗДАНИЕ';

  $('npPageSelect').innerHTML = issue.pages
    .map((page, i) =>
      `<option value="${i}">${i + 1}. ${esc(page.title)}</option>`
    )
    .join('');

  $('npPageSelect').disabled = false;
  $('npPaper').hidden = false;
  $('npLoading').hidden = true;

  render();
}

function normalizePages(value) {
  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map(key => value[key]);
  }

  return [];
}

function init() {
  if (!window.db) {
    $('npLoading').textContent =
      'Вестникът временно не може да се зареди.';
    return;
  }

  db.ref('publishedNewspaperIssues').once('value')
    .then(snapshot => {
      const data = snapshot.val() || {};

      issues = Object.entries(data)
        .map(([id, value]) => ({
          id,
          ...value,
          pages: normalizePages(value.pages)
        }))
        .filter(item => item.pages.length)
        .sort((a, b) =>
          (Number(b.issueNumber) || 0) -
          (Number(a.issueNumber) || 0)
        );

      if (!issues.length) {
        $('npLoading').innerHTML =
          'Очаквайте първия брой на <strong>„Млад журналист“</strong>. Скоро тук ще откриете нашите истории.';

        $('npArchiveList').textContent =
          'Все още няма публикувани броеве.';

        return;
      }

      $('npArchiveList').innerHTML = issues.map(item => `
        <button type="button" data-issue="${esc(item.id)}">
          <strong>№${esc(item.issueNumber || '—')}</strong>
          <span>${esc(item.title)}</span>
        </button>
      `).join('');

      selectIssue(
        new URLSearchParams(location.search).get('issue') ||
        issues[0].id
      );
    })
    .catch(() => {
      $('npLoading').textContent =
        'Възникна проблем при зареждането на вестника. Опитайте отново по-късно.';
    });

  $('npPrev').addEventListener('click', () => {
    if (index > 0) {
      index--;
      render();
    }
  });

  $('npNext').addEventListener('click', () => {
    if (issue && index < issue.pages.length - 1) {
      index++;
      render();
    }
  });

  $('npPageSelect').addEventListener('change', event => {
    index = Number(event.target.value) || 0;
    render();
  });

  $('npArchiveList').addEventListener('click', event => {
    const button = event.target.closest('[data-issue]');

    if (button) {
      selectIssue(button.dataset.issue);
    }
  });

  let startX = 0;

  $('npPaper').addEventListener('touchstart', event => {
    startX = event.changedTouches[0].clientX;
  }, { passive: true });

  $('npPaper').addEventListener('touchend', event => {
    const distance = event.changedTouches[0].clientX - startX;

    if (Math.abs(distance) > 55) {
      if (distance < 0) $('npNext').click();
      else $('npPrev').click();
    }
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', init);

})();
