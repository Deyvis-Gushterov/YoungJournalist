// ========== HOMEPAGE CONTENT (edit this file to change the front page) ========== //
window.HOME_CONFIG = {
    // 🌟 "Акцент на месеца" - the big banner at the top
    spotlight: {
        kicker: 'Акцент на месеца',
        title: 'Коледният базар – училището в пълен блясък',
        text: 'Празникът, който събира ученици, учители и родители. Научете какво ни очаква, кой подготвя изненадите и как можете да се включите.',
        buttonText: 'Прочети повече',
        buttonLink: '#publications'
    },

    // 🗳️ Interactive poll (votes are stored in Firebase under polls/<id>)
    poll: {
        id: 'christmas_bazaar_2026',
        question: 'Коя кауза да подкрепим на Коледния базар?',
        options: ['Зелена кауза', 'Приют за животни', 'Ремонт на физкултурния салон']
    },

    // 📰 The four homepage sections. Each shows the newest rubric from its section,
    // or the sample headline below while nothing has been published yet.
    // (Section ids come from RubricsDB.SECTIONS in js-rubrics-rubrics-database.js)
    sections: {
        school:   { placeholder: 'Интервю с новия учител по история: „Учениците ме изненадаха...“' },
        creative: { placeholder: 'Пролетни вдъхновения: Разказ на Мария от 11.А клас' },
        useful:   { placeholder: 'Съвети за учене и справяне със стреса преди изпити' },
        fun:      { placeholder: 'Кой тип ученик си по време на контролно? – куиз' }
    },

    // Footer
    footer: {
        instagramHandle: 'school_news',                  // TODO: put the real Instagram handle
        instagramUrl: 'https://www.instagram.com/school_news/',
        newsEmail: 'mladjournalist@abv.bg'                     // TODO: put the real e-mail for tips
    }
};
