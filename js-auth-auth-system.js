
console.log('🔐 Auth System Loading...');

let currentUser = null;
let userRole = 'user';
// ─── Inactivity Auto-Logout ──────────────────────────────────────────────
// If a logged-in user leaves the page idle for INACTIVITY_LIMIT ms they are
// automatically signed out, protecting shared computers.
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
let inactivityTimer = null;

function resetInactivityTimer() {
    if (!currentUser) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(async () => {
        console.warn("Auto-logout: inactivity limit reached");
        await auth.signOut();
        alert("Сесията ви изтече поради неактивност. Моля, влезте отново.");
        window.location.reload();
    }, INACTIVITY_LIMIT);
}

function startInactivityWatch() {
    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(evt =>
        document.addEventListener(evt, resetInactivityTimer, { passive: true })
    );
    resetInactivityTimer();
}

function stopInactivityWatch() {
    clearTimeout(inactivityTimer);
    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(evt =>
        document.removeEventListener(evt, resetInactivityTimer)
    );
}
// ─────────────────────────────────────────────────────────────────────────────


function initAuthSystem() {
    console.log('🔐 Initializing auth system...');
    
    
    createAuthUIContainer();
    
    
    auth.onAuthStateChanged(async (user) => {
        console.log('🔐 Auth state changed:', user ? user.email : 'No user');
        
        if (user) {
            currentUser = user;
            await ensureUserInDatabase(user);
            userRole = await getUserRole(user.uid);
            updateUIForLoggedInUser(user, userRole);
            updateNavigationForRole(userRole);
            startInactivityWatch(); // start idle timer when logged in
        } else {
            currentUser = null;
            userRole = 'user';
            stopInactivityWatch(); // clear idle timer when logged out
            updateUIForLoggedOutUser();
            resetNavigation();
        }
    });
}

function createAuthUIContainer() {
    
    if (document.getElementById('authContainer')) return;
    
    const authContainer = document.createElement('div');
    authContainer.id = 'authContainer';
    authContainer.className = 'auth-container';
    
    
    const headerContainer = document.querySelector('header .container');
    const nav = document.querySelector('nav');
    
    if (headerContainer && nav) {
        headerContainer.insertBefore(authContainer, nav);
    }
    
    
    addAuthStyles();
}

function addAuthStyles() {
    const styleId = 'auth-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
        /* Auth Container */
        .auth-container {
            margin-left: auto;
            display: flex;
            gap: 10px;
            align-items: center;
            padding: 0 20px;
        }
        
        .auth-btn {
            padding: 8px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s;
            font-size: 14px;
        }
        
        .login-btn {
            background: #f8f9fa;
            color: #333;
            border: 1px solid #ddd;
        }
        
        .register-btn {
            background: #3498db;
            color: white;
            border: 1px solid #2980b9;
        }
        
        .auth-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        /* User Info */
        .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .user-greeting {
            color: #333;
            font-weight: 500;
            font-size: 14px;
        }
        
        .user-menu-btn {
            background: none;
            border: 1px solid #ddd;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .user-dropdown {
            position: relative;
        }
        
        .dropdown-content {
            display: none;
            position: absolute;
            right: 0;
            top: 100%;
            background: white;
            min-width: 200px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            border-radius: 8px;
            z-index: 1000;
            padding: 10px 0;
        }
        
        .user-dropdown:hover .dropdown-content {
            display: block;
        }
        
        .dropdown-item {
            display: block;
            padding: 10px 20px;
            text-decoration: none;
            color: #333;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
            font-size: 14px;
        }
        
        .dropdown-item:hover {
            background: #f8f9fa;
        }
        
        .dropdown-content hr {
            margin: 10px 0;
            border: none;
            border-top: 1px solid #eee;
        }
        
        /* Auth Modal */
        .auth-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }
        
        .modal-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            width: 90%;
            max-width: 400px;
            position: relative;
        }
        
        .close-modal {
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        }
        
        .modal-content h2 {
            margin-top: 0;
            margin-bottom: 20px;
            color: #333;
        }
        
        .modal-content form {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .modal-content input {
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
        }
        
        .modal-content .btn {
            background: #3498db;
            color: white;
            padding: 12px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 10px;
        }
        
        .auth-switch {
            text-align: center;
            margin-top: 20px;
            color: #666;
        }
        
        .auth-switch a {
            color: #3498db;
            text-decoration: none;
        }
        
        /* Role badges */
        .role-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 8px;
        }
        
        .role-user { background: #e3f2fd; color: #1565c0; }
        .role-redactor { background: #fff3e0; color: #e65100; }
        .role-admin { background: #f3e5f5; color: #7b1fa2; }
    `;
    
    document.head.appendChild(styles);
}

async function ensureUserInDatabase(user) {
    try {
        const userRef = db.ref(`users/${user.uid}`);
        const snapshot = await userRef.once('value');
        
        if (!snapshot.exists()) {
            
            await userRef.set({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                role: 'user',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                articlesSubmitted: 0,
                articlesPublished: 0,
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });
            console.log('✅ User profile created');
        } else {
            
            await userRef.update({
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });
        }
    } catch (error) {
        console.error('❌ Error ensuring user in database:', error);
    }
}

async function getUserRole(uid) {
    try {
        const snapshot = await db.ref(`users/${uid}/role`).once('value');
        return snapshot.val() || 'user';
    } catch (error) {
        console.error('❌ Error getting user role:', error);
        return 'user';
    }
}

async function registerUser(email, password, displayName) {
    try {
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        
        if (displayName) {
            await user.updateProfile({ displayName: displayName });
        }
        
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loginUser(email, password, rememberMe = false) {
    try {
        // Set persistence based on "Remember me" choice.
        // SESSION (default) clears when the tab/browser closes.
        // LOCAL persists across browser restarts — only use if user explicitly opts in.
        const persistence = rememberMe
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;
        await auth.setPersistence(persistence);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function logoutUser() {
    try {
        await auth.signOut();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function updateUIForLoggedInUser(user, role) {
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;
    
    const roleBadge = getRoleBadge(role);
    
    authContainer.innerHTML = `
        <div class="user-info">
            <span class="user-greeting">Здравей, ${user.displayName || user.email.split('@')[0]}</span>
            <span class="role-badge role-${role}">${roleBadge.text}</span>
            <div class="user-dropdown">
                <button class="user-menu-btn">👤</button>
                <div class="dropdown-content">
                    ${['redactor','admin','editor','reporter','photographer','designer'].includes(role) ? `<a href="${'page-admin.html'}" class="dropdown-item">✎ Редакционно студио</a>` : ''}
                    ${['redactor','admin','editor','reporter'].includes(role) ? `<a href="${'page-user-dashboard.html'}" class="dropdown-item">📝 Моите статии</a>` : ''}
                    <hr>
                    <button class="dropdown-item logout-btn">🚪 Изход</button>
                </div>
            </div>
        </div>
    `;
    
    
    authContainer.querySelector('.logout-btn').addEventListener('click', async () => {
        await logoutUser();
        window.location.reload();
    });
}

function updateUIForLoggedOutUser() {
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;
    
    authContainer.innerHTML = `
        <button class="auth-btn login-btn">Вход</button>
        <button class="auth-btn register-btn">Регистрация</button>
    `;
    
    
    authContainer.querySelector('.login-btn').addEventListener('click', showLoginModal);
    authContainer.querySelector('.register-btn').addEventListener('click', showRegisterModal);
}

function getRoleBadge(role) {
    const roles = {
        'user': { text: 'Потребител', class: 'role-user' },
        'redactor': { text: 'Редактор', class: 'role-redactor' },
        'admin': { text: 'Админ', class: 'role-admin' },
        'editor': { text: 'Редактор', class: 'role-redactor' },
        'reporter': { text: 'Репортер', class: 'role-user' },
        'photographer': { text: 'Фотограф', class: 'role-user' },
        'designer': { text: 'Дизайнер', class: 'role-user' }
    };
    return roles[role] || roles.user;
}

function updateNavigationForRole(role) {
    const nav = document.querySelector('nav ul');
    if (!nav) return;
    
    
    document.querySelectorAll('.role-nav-item').forEach(item => item.remove());
    
    
    if (['redactor','admin','editor','reporter','photographer','designer'].includes(role)) {
        const item = document.createElement('li');
        item.className = 'role-nav-item';
        const href = 'page-admin.html';
        item.innerHTML = `<a href="${href}">✎ Редакционно студио</a>`;
        nav.appendChild(item);
    }
}

function resetNavigation() {
    document.querySelectorAll('.role-nav-item').forEach(item => item.remove());
}

function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="close-modal">×</button>
            <h2>Вход в системата</h2>
            <form id="loginForm">
                <input type="email" placeholder="Имейл" required>
                <input type="password" placeholder="Парола" required>
                <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:#555;cursor:pointer;">
                    <input type="checkbox" id="rememberMe" style="width:16px;height:16px;cursor:pointer;">
                    Запомни ме на това устройство
                </label>
                <button type="submit" class="btn">Вход</button>
            </form>
            <p class="auth-switch">Нямате профил? <a href="#" class="switch-to-register">Регистрирайте се</a></p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    
    modal.querySelector('#loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;
        const submitBtn = form.querySelector('button');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Влизане...';
        
        const rememberMe = form.querySelector('#rememberMe').checked;
        const result = await loginUser(email, password, rememberMe);
        
        if (result.success) {
            modal.remove();
        } else {
            alert(`Грешка при вход: ${result.error}`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Вход';
        }
    });
    
    
    modal.querySelector('.switch-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        modal.remove();
        showRegisterModal();
    });
}

function showRegisterModal() {
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="close-modal">×</button>
            <h2>Регистрация</h2>
            <form id="registerForm">
                <input type="text" placeholder="Име и фамилия" required>
                <input type="email" placeholder="Имейл" required>
                <input type="password" placeholder="Парола" minlength="6" required>
                <button type="submit" class="btn">Регистрация</button>
            </form>
            <p class="auth-switch">Вече имате профил? <a href="#" class="switch-to-login">Влезте</a></p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    
    modal.querySelector('#registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const displayName = form.querySelector('input[type="text"]').value;
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;
        const submitBtn = form.querySelector('button');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Регистриране...';
        
        const result = await registerUser(email, password, displayName);
        
        if (result.success) {
            modal.remove();
            alert('✅ Успешна регистрация! Вече сте влязли в системата.');
        } else {
            alert(`❌ Грешка при регистрация: ${result.error}`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Регистрация';
        }
    });
    
    
    modal.querySelector('.switch-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        modal.remove();
        showLoginModal();
    });
}

async function checkUserRole(requiredRole) {
    const user = auth.currentUser;
    if (!user) return false;
    
    const role = await getUserRole(user.uid);
    return role === requiredRole || role === 'admin';
}

async function protectRoute(requiredRole, redirectUrl = 'index.html') {
    const user = auth.currentUser;
    
    if (!user) {
        alert('Моля, влезте в системата за достъп до тази страница.');
        window.location.href = redirectUrl;
        return false;
    }
    
    const role = await getUserRole(user.uid);
    
    if (role !== requiredRole && role !== 'admin') {
        alert('Нямате необходимите права за достъп до тази страница.');
        window.location.href = redirectUrl;
        return false;
    }
    
    return true;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing auth system...');
    initAuthSystem();
});

window.authSystem = {
    getCurrentUser: () => currentUser,
    getUserRole: () => userRole,
    checkUserRole: (requiredRole) => checkUserRole(requiredRole),
    protectRoute: (requiredRole, redirectUrl) => protectRoute(requiredRole, redirectUrl),
    logout: logoutUser
};