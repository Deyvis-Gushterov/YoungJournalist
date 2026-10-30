// ========== ADMIN RUBRICS MANAGER ========== //
// Manages rubric creation and deletion from the admin panel

class AdminRubricsManager {
    constructor() {
        this.currentType = null;
        this.rubrics = [];
        this.currentPage = 1;
        this.isLoading = false;
        this.init();
    }

    async init() {
        this.loadRubricTypes();
        this.loadStatistics();
        this.loadRubrics();
        this.setupEventListeners();
    }

    loadRubricTypes() {
        const groups = window.RubricsDB.getTypesByCategory();
        const container = document.getElementById('rubricTypeSelector');
        if (!container) return;

        // Cards grouped by category
        container.style.display = 'block';
        container.innerHTML = groups.map(({ category, types }) => `
            <div class="rubric-category-block" style="margin-bottom: 35px;">
                <h4 style="margin: 0 0 15px; color: ${category.color}; font-size: 1.1rem;
                           border-bottom: 2px solid ${category.color}33; padding-bottom: 8px;">
                    ${category.icon} ${category.name}
                </h4>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:25px;">
                    ${types.map(type => `
                        <div class="rubric-type-card" data-type="${type.id}" style="border-color: ${type.color};">
                            <div class="rubric-type-icon">${type.icon}</div>
                            <h3 style="color: ${type.color}; margin-bottom: 10px;">${type.name}</h3>
                            <p style="color: #7f8c8d; font-size: 0.95rem;">${type.description}</p>
                            <button class="btn" style="margin-top: 15px; background: ${type.color}; color: white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer;">
                                Добави
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Filter dropdown (grouped) for the "latest rubrics" list
        const filter = document.getElementById('rubricFilterType');
        if (filter) {
            filter.innerHTML = '<option value="all">Всички типове</option>' + groups.map(({ category, types }) => `
                <optgroup label="${category.icon} ${category.name}">
                    ${types.map(t => `<option value="${t.id}">${t.icon} ${t.name}</option>`).join('')}
                </optgroup>
            `).join('');
        }

        // Attach click listeners after rendering
        container.querySelectorAll('.rubric-type-card').forEach(card => {
            card.addEventListener('click', () => this.showRubricForm(card.dataset.type));
        });
    }

    async loadStatistics() {
        try {
            const result = await window.RubricsDB.getStatistics();
            if (result.success) this.displayStatistics(result.stats);
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    displayStatistics(stats) {
        const container = document.getElementById('rubricQuickStats');
        if (!container) return;

        const groups = window.RubricsDB.getTypesByCategory();
        const countFor = (types) => types.reduce((sum, t) => sum + (stats.byType[t.id] || 0), 0);
        container.innerHTML = `
            <div class="stats-card">
                <div style="font-size:2.5rem;font-weight:bold;color:#3498db;">${stats.total}</div>
                <div style="color:#7f8c8d;">Общо публикации</div>
            </div>
            ${groups.map(({ category, types }) => `
                <div class="stats-card" style="border-left:4px solid ${category.color};">
                    <div style="font-size:2rem;font-weight:bold;color:${category.color};">${countFor(types)}</div>
                    <div style="color:#7f8c8d;">${category.icon} ${category.name}</div>
                </div>
            `).join('')}
            <div class="stats-card">
                <div style="font-size:2rem;font-weight:bold;color:#2ecc71;">${stats.recentCount}</div>
                <div style="color:#7f8c8d;">Тази седмица</div>
            </div>
        `;
    }

    async loadRubrics() {
        if (this.isLoading) return;
        this.isLoading = true;

        const listContainer = document.getElementById('rubricsList');
        if (listContainer && this.currentPage === 1) {
            listContainer.innerHTML = `<div style="text-align:center;padding:40px;">
                <div style="width:40px;height:40px;border:4px solid #f3f3f3;border-top-color:#3498db;
                            border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
                <p>Зареждане на рубрики...</p></div>`;
        }

        try {
            const filter = document.getElementById('rubricFilterType')?.value || 'all';
            const result = filter === 'all'
                ? await window.RubricsDB.getAllRubrics(this.currentPage * 10)
                : await window.RubricsDB.getRubricsByType(filter, this.currentPage * 10);

            if (result.success) {
                this.rubrics = result.rubrics;
                this.displayRubrics();
            }
        } catch (error) {
            console.error('Error loading rubrics:', error);
            if (listContainer) {
                listContainer.innerHTML = `<div style="text-align:center;padding:40px;color:#e74c3c;">
                    <div style="font-size:3rem;margin-bottom:20px;">❌</div>
                    <p>Грешка при зареждане на рубриките</p>
                    <button onclick="window.adminRubricsManager.loadRubrics()" class="btn">Опитай отново</button>
                </div>`;
            }
        } finally {
            this.isLoading = false;
        }
    }

    displayRubrics() {
        const container = document.getElementById('rubricsList');
        if (!container) return;

        if (this.rubrics.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:#7f8c8d;">
                <div style="font-size:3rem;margin-bottom:20px;">📭</div>
                Все още няма публикувани рубрики</div>`;
            return;
        }

        container.innerHTML = this.rubrics.map(rubric => {
            const type = window.RubricsDB.getTypeById(rubric.type);
            const date = new Date(rubric.date).toLocaleDateString('bg-BG', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const preview = rubric.content.length > 150
                ? rubric.content.substring(0, 150) + '...'
                : rubric.content;

            return `
                <div class="rubric-item" data-id="${rubric.id}" style="border-left-color:${type?.color || '#3498db'};">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15px;">
                        <div>
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                                <span style="font-size:1.2rem;">${type?.icon || '📄'}</span>
                                <h3 style="margin:0;color:#2c3e50;">${rubric.title}</h3>
                                <span style="background:${type?.color}20;color:${type?.color};
                                      padding:3px 10px;border-radius:20px;font-size:.85rem;">
                                    ${type?.name || 'Рубрика'}
                                </span>
                            </div>
                            <div style="color:#7f8c8d;font-size:.9rem;">👤 ${rubric.author} | 📅 ${date}</div>
                        </div>
                        <button onclick="window.adminRubricsManager.deleteRubric('${rubric.id}')"
                                style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:1.2rem;"
                                title="Изтрий">🗑️</button>
                    </div>
                    <div style="color:#5d6d7e;margin-bottom:15px;line-height:1.5;">${preview}</div>
                    ${rubric.imageUrl ? `<div style="margin:15px 0;">
                        <img src="${rubric.imageUrl}" alt="${rubric.title}"
                             style="max-width:200px;border-radius:8px;"></div>` : ''}
                    ${rubric.tags ? `<div style="margin-top:15px;">
                        ${rubric.tags.split(',').map(tag =>
                            `<span style="background:#f0f0f0;padding:3px 8px;border-radius:4px;
                                  margin-right:5px;font-size:.85rem;color:#7f8c8d;">#${tag.trim()}</span>`
                        ).join('')}</div>` : ''}
                </div>`;
        }).join('');
    }

    setupEventListeners() {
        document.getElementById('rubricForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRubric();
        });

        document.getElementById('rubricCancelBtn')?.addEventListener('click', () => {
            this.hideRubricForm();
        });

        document.getElementById('rubricFilterType')?.addEventListener('change', () => {
            this.currentPage = 1;
            this.loadRubrics();
        });

        document.getElementById('rubricRefreshBtn')?.addEventListener('click', () => {
            this.currentPage = 1;
            this.loadRubrics();
            this.loadStatistics();
        });
    }

    showRubricForm(type) {
        this.currentType = type;
        const typeInfo = window.RubricsDB.getTypeById(type);
        if (!typeInfo) return;

        const formTitle = document.getElementById('rubricFormTitle');
        if (formTitle) formTitle.textContent = `${typeInfo.icon} Добавяне в рубрика „${typeInfo.name}“`;

        const typeInput = document.getElementById('rubricType');
        if (typeInput) typeInput.value = type;

        const form = document.getElementById('rubricFormContainer');
        if (form) {
            form.style.borderTop = `4px solid ${typeInfo.color}`;
            form.style.display = 'block';
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    hideRubricForm() {
        const form = document.getElementById('rubricFormContainer');
        if (form) form.style.display = 'none';
        document.getElementById('rubricForm')?.reset();
        const msg = document.getElementById('rubricFormMessage');
        if (msg) msg.innerHTML = '';
        this.currentType = null;
    }

    async saveRubric() {
        const type    = document.getElementById('rubricType')?.value;
        const title   = document.getElementById('rubricTitle')?.value.trim();
        const content = document.getElementById('rubricContent')?.value.trim();
        const author  = document.getElementById('rubricAuthor')?.value.trim();
        const imageUrl= document.getElementById('rubricImage')?.value.trim();
        const tags    = document.getElementById('rubricTags')?.value.trim();

        if (!title || !content || !author) {
            this.showFormMessage('Моля, попълнете всички задължителни полета', 'error');
            return;
        }

        const rubricData = { type, title, content, author };
        if (imageUrl) rubricData.imageUrl = imageUrl;
        if (tags)     rubricData.tags = tags;

        const submitBtn = document.querySelector('#rubricForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Запазване...';
        submitBtn.disabled = true;

        try {
            const result = await window.RubricsDB.createRubric(rubricData);
            if (result.success) {
                this.showFormMessage(`✅ ${result.message}`, 'success');
                document.getElementById('rubricForm')?.reset();
                setTimeout(() => {
                    this.loadRubrics();
                    this.loadStatistics();
                    this.hideRubricForm();
                }, 1500);
            } else {
                this.showFormMessage(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            this.showFormMessage(`❌ Грешка: ${error.message}`, 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async deleteRubric(rubricId) {
        if (!confirm('Сигурни ли сте, че искате да изтриете тази рубрика?')) return;

        try {
            const result = await window.RubricsDB.deleteRubric(rubricId);
            if (result.success) {
                const el = document.querySelector(`[data-id="${rubricId}"]`);
                if (el) { el.style.opacity = '0.5'; setTimeout(() => el.remove(), 300); }
                this.loadStatistics();
            } else {
                alert(`Грешка при изтриване: ${result.error}`);
            }
        } catch (error) {
            alert(`Грешка: ${error.message}`);
        }
    }

    showFormMessage(message, type) {
        const container = document.getElementById('rubricFormMessage');
        if (!container) return;
        const bg    = type === 'success' ? '#d4edda' : '#f8d7da';
        const color = type === 'success' ? '#155724' : '#721c24';
        const border= type === 'success' ? '#c3e6cb' : '#f5c6cb';
        container.innerHTML = `<div style="padding:15px;background:${bg};color:${color};
            border:1px solid ${border};border-radius:8px;">${message}</div>`;
        if (type === 'success') setTimeout(() => { container.innerHTML = ''; }, 3000);
    }
}

// Initialize after DOM + Firebase ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('rubricTypeSelector')) {
        // Wait for RubricsDB to be available (rubrics-database.js must load first)
        if (window.RubricsDB) {
            window.adminRubricsManager = new AdminRubricsManager();
        } else {
            // Fallback: poll briefly in case of a race
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (window.RubricsDB) {
                    clearInterval(interval);
                    window.adminRubricsManager = new AdminRubricsManager();
                } else if (attempts > 20) {
                    clearInterval(interval);
                    console.error('❌ RubricsDB failed to initialize after 2s');
                }
            }, 100);
        }
    }
});
