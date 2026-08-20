// ============================================================
// 🛠️ FONCTIONS UTILITAIRES
// ============================================================

function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.className = 'toast', 3000);
}

function formatCurrency(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getUsers() {
    return JSON.parse(localStorage.getItem('ms_users')) || [];
}

function saveUsers(u) {
    localStorage.setItem('ms_users', JSON.stringify(u));
}

function getNumbers() {
    return JSON.parse(localStorage.getItem('ms_numbers')) || [];
}

function saveNumbers(n) {
    localStorage.setItem('ms_numbers', JSON.stringify(n));
}

function getDeposits() {
    return JSON.parse(localStorage.getItem('ms_deposits')) || [];
}

function saveDeposits(d) {
    localStorage.setItem('ms_deposits', JSON.stringify(d));
}

function getTransactions() {
    return JSON.parse(localStorage.getItem('ms_transactions')) || [];
}

function saveTransactions(t) {
    localStorage.setItem('ms_transactions', JSON.stringify(t));
}