document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('joinForm');
  if (!form) return;
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const message = document.getElementById('formMessage');
    const button = form.querySelector('button[type="submit"]');
    // Honeypot: silently ignore bots that fill every field.
    if (document.getElementById('website')?.value.trim()) return;
    if (!window.db) {
      message.textContent = 'Формулярът временно не е достъпен. Моля, опитайте отново по-късно или ни пишете по имейл.';
      message.className = 'form-message error-message'; return;
    }
    const data = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      class: document.getElementById('class').value.trim(),
      desiredRole: document.getElementById('desiredRole')?.value || 'reporter',
      message: document.getElementById('message').value.trim(),
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      status: 'new'
    };
    if (!data.name || data.name.length < 2 || !data.email || !data.class || !data.message || data.message.length < 10 || data.message.length > 1500) {
      message.textContent = 'Попълнете всички полета. Съобщението трябва да е между 10 и 1500 символа.'; message.className = 'form-message error-message'; return;
    }
    const old = button.textContent; button.disabled = true; button.textContent = 'Изпращане…';
    try {
      await window.db.ref('applications').push(data);
      message.textContent = 'Кандидатурата е изпратена успешно! Редакцията ще се свърже с теб.';
      message.className = 'form-message success-message'; form.reset();
    } catch (error) {
      console.error('Application submission failed:', error);
      message.textContent = `Не успяхме да изпратим кандидатурата (${error.code || 'Firebase error'}). Моля, опитайте отново или ни пишете по имейл.`;
      message.className = 'form-message error-message';
    } finally { button.disabled = false; button.textContent = old; }
  });
});
