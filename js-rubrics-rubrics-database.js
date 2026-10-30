// ========== RUBRICS DATABASE STRUCTURE ========== //
// This defines how rubrics are stored in Firebase

class RubricsDatabase {
    constructor() {
        // Rubric categories - used to group rubrics in the public tabs and the admin panel
        this.CATEGORIES = {
            school:     { id: 'school',     icon: '📰', name: 'Рубрики за училищния живот', color: '#3498db' },
            journalism: { id: 'journalism', icon: '🎤', name: 'Журналистически рубрики',    color: '#e74c3c' },
            education:  { id: 'education',  icon: '🎓', name: 'Образователни рубрики',      color: '#8e44ad' },
            creative:   { id: 'creative',   icon: '💡', name: 'Творчески рубрики',          color: '#f39c12' },
            modern:     { id: 'modern',     icon: '🌍', name: 'Актуални и модерни рубрики', color: '#16a085' },
            fun:        { id: 'fun',        icon: '😊', name: 'Забавни рубрики',            color: '#e67e22' },
            original:   { id: 'original',   icon: '⭐', name: 'По-оригинални идеи',         color: '#d35400' },
            classic:    { id: 'classic',    icon: '🎪', name: 'Други рубрики',              color: '#4ECDC4' }
        };

        // Sections = the 4 big groups shown in the site navigation, homepage and rubrics page
        this.SECTIONS = {
            school:   { id: 'school',   icon: '🏫', name: 'Училищен живот',        navName: 'Училищен живот', categories: ['school', 'journalism', 'original'] },
            creative: { id: 'creative', icon: '🎨', name: 'Творчество и култура',  navName: 'Творчество',     categories: ['creative'] },
            useful:   { id: 'useful',   icon: '🧠', name: 'Полезно и любопитно',   navName: 'Полезно',        categories: ['education', 'modern'] },
            fun:      { id: 'fun',      icon: '🎉', name: 'Свободно време',        navName: 'Забавление',     categories: ['fun', 'classic'] }
        };

        // Rubric types (completely separate from articles)
        // To add a new rubric: add one line here - tabs, admin cards, filters and badges update automatically.
        // [id, category, icon, name, description]
        const rubricDefs = [
            // 📰 Рубрики за училищния живот
            ['behind_the_bell',      'school',     '🔔', 'Зад звънеца',               'Любопитни истории от ежедневието в училище, забавни случки, интересни инициативи и събития.'],
            ['face_of_issue',        'school',     '🙂', 'Лице на броя',              'Интервю с ученик, учител, служител или бивш възпитаник на училището.'],
            ['our_champions',        'school',     '🏆', 'Нашите шампиони',           'Представяне на ученици с постижения в науката, спорта, изкуствата или доброволчеството.'],
            // 🎤 Журналистически рубрики
            ['five_questions',       'journalism', '❓', '5 въпроса към...',          'Кратко интервю с интересна личност.'],
            // 🎓 Образователни рубрики
            ['did_you_know',         'education',  '🧠', 'Знаете ли, че...',          'Любопитни факти от науката, историята и културата.'],
            ['word_of_issue',        'education',  '📖', 'Дума на броя',              'Интересна българска дума, произход и правилна употреба.'],
            // 💡 Творчески рубрики
            ['pen_and_imagination',  'creative',   '✍️', 'Перо и въображение',        'Ученически разкази, стихотворения и есета.'],
            ['comic_page',           'creative',   '🗯️', 'Комикс страница',           'Кратки комикси, създадени от ученици.'],
            // 🌍 Актуални и модерни рубрики
            ['trendometer',          'modern',     '📈', 'Трендомер',                 'Мода, музика, книги – какво е модерно сред младите хора и какви са новите тенденции.'],
            ['eco_patrol',           'modern',     '🌱', 'Еко патрул',                'Зелени инициативи и идеи за опазване на природата.'],
            ['travel_with_us',       'modern',     '✈️', 'Пътувай с нас',             'Ученически впечатления от екскурзии и пътешествия.'],
            // 😊 Забавни рубрики
            ['hallway_poll',         'fun',        '🗳️', 'Анкета на коридора',        'Кратки въпроси към учениците по актуална тема.'],
            // ⭐ По-оригинални идеи
            ['hundred_seconds',      'original',   '⏱️', '100 секунди с Корольовец',  'Много кратък блиц-портрет на ученик от ПМГ.'],
            ['secret_reporter',      'original',   '🕵️', 'Тайният репортер',          'Анонимни журналисти описват интересни училищни случки.'],
            ['from_the_first_desk',  'original',   '🎒', 'От първия чин',             'Ученици споделят своя гледна точка по важни теми.'],
            ['person_behind_success','original',   '🌟', 'Човекът зад успеха',        'За учители, треньори и ментори, помогнали на учениците да постигнат успех.']
        ];

        this.TYPES = {};
        rubricDefs.forEach(([id, category, icon, name, description]) => {
            this.TYPES[id] = {
                id, category, icon, name, description,
                color: this.CATEGORIES[category].color
            };
        });

        // Original rubrics (kept so that already published content keeps working)
        this.TYPES.recipes = {
            id: 'recipes', category: 'classic', icon: '🍽️', name: 'Рецепти',
            color: '#FF6B6B', description: 'Вкусни рецепти и кулинарни съвети'
        };
        this.TYPES.interesting = {
            id: 'interesting', category: 'classic', icon: '🔍', name: 'Интересно',
            color: '#4ECDC4', description: 'Любопитни факти и истории'
        };
        this.TYPES.jokes = {
            id: 'jokes', category: 'classic', icon: '😂', name: 'Шеги',
            color: '#FFD166', description: 'Смешни вицове и анекдоти'
        };

        // Initialize Firebase if not already
        if (typeof db === 'undefined') {
            console.error('Firebase database not initialized!');
        }
    }

    // Get all rubric types
    getAllTypes() {
        return Object.values(this.TYPES);
    }

    // Get type by ID (falls back to a neutral type so old/unknown data never breaks the UI)
    getTypeById(typeId) {
        return this.TYPES[typeId] || {
            id: typeId, category: 'classic', icon: '📄', name: 'Рубрика',
            color: '#7f8c8d', description: ''
        };
    }

    // Sections (nav groups)
    getSections() {
        return Object.values(this.SECTIONS);
    }

    getTypesBySection(sectionId) {
        const sec = this.SECTIONS[sectionId];
        if (!sec) return [];
        return this.getAllTypes().filter(t => sec.categories.includes(t.category));
    }

    getSectionOfType(typeId) {
        const t = this.TYPES[typeId];
        return t ? this.getSections().find(sec => sec.categories.includes(t.category)) : undefined;
    }

    // Get all categories
    getAllCategories() {
        return Object.values(this.CATEGORIES);
    }

    // Get types grouped by category: [{ category, types: [...] }, ...] (empty categories skipped)
    getTypesByCategory() {
        return this.getAllCategories()
            .map(category => ({
                category,
                types: this.getAllTypes().filter(t => t.category === category.id)
            }))
            .filter(group => group.types.length > 0);
    }

    // Create a new rubric in Firebase
    async createRubric(rubricData) {
        try {
            // Validate required fields
            if (!rubricData.type || !rubricData.title || !rubricData.content || !rubricData.author) {
                throw new Error('Моля, попълнете всички задължителни полета');
            }

            // Validate type
            if (!this.TYPES[rubricData.type]) {
                throw new Error('Невалиден тип рубрика');
            }

            // Add metadata
            const fullRubricData = {
                ...rubricData,
                date: new Date().toISOString(),
                published: true,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };

            // Save to Firebase
            const newRef = await db.ref('rubrics').push(fullRubricData);
            
            return {
                success: true,
                id: newRef.key,
                message: 'Рубриката е създадена успешно!'
            };

        } catch (error) {
            console.error('Error creating rubric:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get all rubrics
    async getAllRubrics(limit = 50) {
        try {
            const snapshot = await db.ref('rubrics')
                .orderByChild('date')
                .limitToLast(limit)
                .once('value');

            const rubrics = [];
            snapshot.forEach(child => {
                const rubric = child.val();
                rubric.id = child.key;
                rubrics.push(rubric);
            });

            // Sort by date (newest first)
            rubrics.sort((a, b) => new Date(b.date) - new Date(a.date));

            return {
                success: true,
                rubrics: rubrics
            };

        } catch (error) {
            console.error('Error getting rubrics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get rubrics by type
    async getRubricsByType(type, limit = 20) {
        try {
            const snapshot = await db.ref('rubrics')
                .orderByChild('date')
                .once('value');

            const rubrics = [];
            snapshot.forEach(child => {
                const rubric = child.val();
                if (rubric.type === type) {
                    rubric.id = child.key;
                    rubrics.push(rubric);
                }
            });

            // Sort by date (newest first) and limit
            rubrics.sort((a, b) => new Date(b.date) - new Date(a.date));
            const limited = rubrics.slice(0, limit);

            return {
                success: true,
                rubrics: limited,
                total: rubrics.length
            };

        } catch (error) {
            console.error('Error getting rubrics by type:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Delete a rubric
    async deleteRubric(rubricId) {
        try {
            await db.ref('rubrics/' + rubricId).remove();
            return {
                success: true,
                message: 'Рубриката е изтрита успешно!'
            };
        } catch (error) {
            console.error('Error deleting rubric:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update a rubric
    async updateRubric(rubricId, updateData) {
        try {
            await db.ref('rubrics/' + rubricId).update(updateData);
            return {
                success: true,
                message: 'Рубриката е обновена успешно!'
            };
        } catch (error) {
            console.error('Error updating rubric:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get statistics
    async getStatistics() {
        try {
            const snapshot = await db.ref('rubrics').once('value');
            
            const stats = {
                total: 0,
                byType: {},
                recentCount: 0
            };

            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            snapshot.forEach(child => {
                const rubric = child.val();
                stats.total++;
                
                // Count by type
                if (!stats.byType[rubric.type]) {
                    stats.byType[rubric.type] = 0;
                }
                stats.byType[rubric.type]++;
                
                // Count recent (last week)
                const rubricDate = new Date(rubric.date);
                if (rubricDate > oneWeekAgo) {
                    stats.recentCount++;
                }
            });

            return {
                success: true,
                stats: stats
            };

        } catch (error) {
            console.error('Error getting statistics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Make globally available
window.RubricsDB = new RubricsDatabase();