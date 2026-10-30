// ========== HOMEPAGE WIDGETS: spotlight, 4 sections, poll, footer ========== //
(function () {
    const cfg = window.HOME_CONFIG;
    if (!cfg) return;
    const esc = (v) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const $ = (id) => document.getElementById(id);

    // ---------- Spotlight ----------
    async function renderSpotlight() {
        const box = $('homeSpotlight');
        if (!box) return;
        let s = cfg.spotlight;
        try {
            if (window.db) {
                const snap = await window.db.ref('siteContent/spotlight').once('value');
                if (snap.exists()) s = { ...s, ...snap.val() };
            }
        } catch (error) { console.warn('Spotlight uses the local fallback:', error.code || error.message); }
        const href = String(s.buttonLink || '#publications');
        const safeHref = /^(https?:|#|pages\/|\.\/|\/)/i.test(href) ? href : '#publications';
        box.innerHTML = `
            <p class="spot-kicker">★ ${esc(s.kicker || 'Акцент на месеца')}</p>
            <h2>${esc(s.title || 'Историите на нашето училище')}</h2>
            <p class="spot-text">${esc(s.text || '')}</p>
            <div class="spot-actions">
                <a href="${esc(safeHref)}" class="btn">${esc(s.buttonText || 'Прочети повече')}</a>
                <a href="#contact" class="btn spot-secondary">Присъедини се към клуба</a>
            </div>`;
    }

    // ---------- Four sections (latest rubric per section) ----------
    async function renderSections() {
        const grid = $('homeSections');
        if (!grid || !window.RubricsDB) return;
        const sections = window.RubricsDB.getSections();

        // Latest rubric per section (falls back to placeholders if Firebase is empty/unavailable)
        const latest = {};
        try {
            const res = await window.RubricsDB.getAllRubrics(50);   // newest first
            if (res.success) {
                res.rubrics.forEach(r => {
                    const sec = window.RubricsDB.getSectionOfType(r.type);
                    if (sec && !latest[sec.id]) latest[sec.id] = r;
                });
            }
        } catch (e) { /* placeholders are used */ }

        grid.innerHTML = sections.map(sec => {
            const r = latest[sec.id];
            const type = r ? window.RubricsDB.getTypeById(r.type) : null;
            const headline = r ? r.title : ((cfg.sections[sec.id] || {}).placeholder || '');
            const thumb = r && r.imageUrl
                ? `<img src="${esc(r.imageUrl)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('no-img');this.remove()">`
                : '';
            return `
                <a class="home-card ${r && r.imageUrl ? '' : 'no-img'}" href="page-rubrics-public.html?type=sec:${sec.id}">
                    <div class="home-card-thumb">${thumb}<span class="home-card-emoji">${sec.icon}</span></div>
                    <div class="home-card-body">
                        <h3>${sec.icon} ${esc(sec.name)}</h3>
                        ${type ? `<span class="home-card-tag">${type.icon} ${esc(type.name)}</span>` : ''}
                        <p>${esc(headline)}</p>
                        <span class="home-card-more">Всички материали →</span>
                    </div>
                </a>`;
        }).join('');
    }

    // ---------- Poll ----------
    function initPoll() {
        const box = $('homePoll'), p = cfg.poll;
        if (!box || !p) return;
        const voteKey = 'poll_voted_' + p.id;
        let voted = null;
        let voting = false;
        try { voted = localStorage.getItem(voteKey); } catch (e) {}
        if (voted !== null && (!Number.isInteger(Number(voted)) || Number(voted) < 0 || Number(voted) >= p.options.length)) {
            voted = null;
        }
        const ref = (window.db && window.db.ref) ? window.db.ref('polls/' + p.id + '/votes') : null;

        const draw = (counts, msg) => {
            const total = counts.reduce((a, b) => a + b, 0);
            box.innerHTML = `
                <h3>📊 Анкета: „${esc(p.question)}“</h3>
                <div class="poll-options">
                    ${p.options.map((o, i) => {
                        if (voted === null) {
                            return `<button type="button" class="poll-option" data-i="${i}"><span class="poll-radio">( )</span> ${esc(o)}</button>`;
                        }
                        const pct = total ? Math.round(counts[i] / total * 100) : 0;
                        return `<div class="poll-result ${String(i) === String(voted) ? 'mine' : ''}">
                            <div class="poll-bar" style="width:${pct}%"></div>
                            <span class="poll-label">${String(i) === String(voted) ? '(•)' : '( )'} ${esc(o)}</span>
                            <span class="poll-pct">${pct}%</span></div>`;
                    }).join('')}
                </div>
                <p class="poll-note">${msg || (voted === null ? 'Кликни върху отговор, за да гласуваш.' : `Благодарим за гласа! Общо гласове: ${total}.`)}</p>`;
            if (voted === null) box.querySelectorAll('.poll-option').forEach(b => {
                b.disabled = voting;
                b.addEventListener('click', () => vote(+b.dataset.i));
            });
        };

        const read = async () => {
            const counts = p.options.map(() => 0);
            if (!ref) return counts;
            const snap = await ref.once('value');
            const v = snap.val() || {};
            p.options.forEach((_, i) => { counts[i] = Number(v[i]) || 0; });
            return counts;
        };

        const vote = async (i) => {
            if (voting || voted !== null || !Number.isInteger(i) || i < 0 || i >= p.options.length) return;
            voting = true;
            box.querySelectorAll('.poll-option').forEach(button => { button.disabled = true; });
            try {
                if (!ref) throw new Error('Firebase Database is unavailable');
                const result = await ref.child(String(i)).transaction(n => (Number(n) || 0) + 1);
                if (!result.committed) throw new Error('Vote was not committed');
                voted = String(i);
                try { localStorage.setItem(voteKey, voted); } catch (e) {}
                draw(await read());
            } catch (e) {
                console.error('Poll vote failed:', e);
                voting = false;
                draw(p.options.map(() => 0), 'Гласуването временно не е достъпно. Опитайте отново по-късно.');
            }
        };

        draw(p.options.map(() => 0));
        if (voted !== null) read().then(draw).catch(() => {});
    }

    // ---------- Footer ----------
    function renderFooter() {
        const f = cfg.footer, box = $('homeFooterLinks');
        if (!box || !f) return;
        box.innerHTML = `
            <a href="${esc(f.instagramUrl)}" target="_blank" rel="noopener">📸 Последвайте ни в Instagram (@${esc(f.instagramHandle)})</a>
            <span class="footer-sep">|</span>
            <a href="mailto:${esc(f.newsEmail)}?subject=${encodeURIComponent('Новина за училищния вестник')}">📩 Изпрати ни новина: ${esc(f.newsEmail)}</a>`;
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderSpotlight();
        renderSections();
        // Dynamic polls are rendered by js-polls-core.js.
        renderFooter();
    });
})();
