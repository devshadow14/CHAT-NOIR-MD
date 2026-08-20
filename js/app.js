// ============================================================
// 📦 ÉTAT GLOBAL & NAVIGATION
// ============================================================

let currentUser = null;
let currentCategory = 'WhatsApp';
let currentCountry = 'Sénégal';

function refreshAll() {
    if (!currentUser) return;
    const users = getUsers();
    const updated = users.find(u => u.id === currentUser.id);
    if (updated) currentUser = updated;
    renderDashboard();
    navigateTo('dashboard');
    if (currentUser.role === 'admin') {
        renderAdminPanel();
    }
}

function navigateTo(page, data = null) {
    document.querySelectorAll('.page-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('.bottom-nav .nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'nokos': renderCategories(); break;
        case 'countries': if (data) currentCategory = data; renderCountries(); break;
        case 'numbers': if (data) currentCountry = data; renderNumbers(); break;
        case 'deposit': renderDeposits(); break;
        case 'history': renderHistory(); break;
        case 'profile': renderDashboard(); break;
    }
}

// Exposer navigateTo globalement
window.navigateTo = navigateTo;

// ============================================================
// 📊 TABLEAU DE BORD
// ============================================================

function renderDashboard() {
    if (!currentUser) return;
    document.getElementById('userDisplayName').textContent = currentUser.displayName || 'Utilisateur';
    document.getElementById('userBalance').textContent = formatCurrency(currentUser.balance || 0);
    document.getElementById('profileName').textContent = currentUser.displayName || 'Utilisateur';
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileBalance').textContent = formatCurrency(currentUser.balance || 0) + ' FCFA';
    document.getElementById('profileRole').textContent = currentUser.role || 'user';

    const numbers = getNumbers();
    const userTransactions = numbers.filter(n => n.purchasedBy === currentUser.id && n.status === 'sold');
    document.getElementById('statTotalOrders').textContent = userTransactions.length;
    document.getElementById('statPendingOrders').textContent = '0';
    document.getElementById('statSuccessOrders').textContent = userTransactions.length;

    const deposits = getDeposits();
    const today = new Date().toDateString();
    const dailyTotal = deposits.filter(d => d.userId === currentUser.id && d.status === 'verified' && new Date(d.date).toDateString() === today).reduce((s, d) => s + d.amount, 0);
    document.getElementById('dailyDeposit').textContent = formatCurrency(dailyTotal) + ' FCFA';

    const adminPanel = document.getElementById('adminPanel');
    if (currentUser.role === 'admin') {
        adminPanel.classList.remove('hidden');
        renderAdminPanel();
    } else {
        adminPanel.classList.add('hidden');
    }
}

// Exposer renderDashboard globalement
window.renderDashboard = renderDashboard;