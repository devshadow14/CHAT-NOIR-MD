// ============================================================
// 🔐 AUTHENTIFICATION
// ============================================================

let isLoginMode = true;

document.getElementById('authSwitchLink').addEventListener('click', toggleAuthMode);
document.getElementById('authSwitchBtn').addEventListener('click', toggleAuthMode);

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('authTitle').textContent = isLoginMode ? 'Connexion' : 'Inscription';
    document.getElementById('authSub').textContent = isLoginMode ? 'Connectez-vous à votre compte' : 'Créez votre compte Michael Scofield';
    document.getElementById('authSubmitBtn').textContent = isLoginMode ? 'Se connecter' : 'S\'inscrire';
    document.getElementById('authSwitchBtn').textContent = isLoginMode ? 'Créer un compte' : 'Déjà un compte';
    document.getElementById('authSwitchText').innerHTML = isLoginMode
        ? 'Pas encore de compte ? <span id="authSwitchLink">S\'inscrire</span>'
        : 'Déjà un compte ? <span id="authSwitchLink">Se connecter</span>';
    document.getElementById('authSwitchLink').addEventListener('click', toggleAuthMode);
}

document.getElementById('authSubmitBtn').addEventListener('click', () => {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    if (!email || !password) { showToast('Remplis tous les champs', 'error'); return; }

    let users = getUsers();
    if (isLoginMode) {
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) { showToast('Email ou mot de passe incorrect', 'error'); return; }
        currentUser = user;
        localStorage.setItem('ms_currentUser', JSON.stringify(user));
        showToast('Bienvenue ' + user.displayName + ' !', 'success');
        enterApp();
    } else {
        if (users.find(u => u.email === email)) { showToast('Email déjà utilisé', 'error'); return; }
        if (password.length < 6) { showToast('Mot de passe : 6 caractères min', 'error'); return; }
        const newUser = {
            id: genId(),
            email,
            password,
            displayName: email.split('@')[0],
            balance: 0,
            role: 'user'
        };
        users.push(newUser);
        saveUsers(users);
        currentUser = newUser;
        localStorage.setItem('ms_currentUser', JSON.stringify(newUser));
        showToast('Compte créé !', 'success');
        enterApp();
    }
});

function enterApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    refreshAll();
}

// Vérifier session
const saved = localStorage.getItem('ms_currentUser');
if (saved) {
    const parsed = JSON.parse(saved);
    const exists = getUsers().find(u => u.id === parsed.id);
    if (exists) {
        currentUser = exists;
        enterApp();
    } else {
        localStorage.removeItem('ms_currentUser');
    }
}

function logout() {
    if (confirm('Se déconnecter ?')) {
        localStorage.removeItem('ms_currentUser');
        currentUser = null;
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        showToast('Déconnecté', 'warning');
    }
}