// ============================================================
// ⚙️ PANEL ADMIN
// ============================================================

function renderAdminPanel() {
    renderAdminDeposits();
    renderAdminUsers();
    renderAdminNumbers();
}

function renderAdminDeposits() {
    const container = document.getElementById('adminDepositsList');
    const deposits = getDeposits();
    const pending = deposits.filter(d => d.status === 'pending');
    if (pending.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;padding:8px 0;">Aucun dépôt en attente</div>';
        return;
    }
    container.innerHTML = pending.map(d => `
        <div class="admin-deposit-item">
            <div class="info">
                <div class="user">${d.userId.slice(0,8)}</div>
                <div class="amount">${formatCurrency(d.amount)} FCFA</div>
                <div style="font-size:11px;color:var(--text-secondary);">${d.method} • 📸 Preuve</div>
            </div>
            <div class="actions">
                <button class="btn-admin verify" onclick="adminVerifyDeposit('${d.id}')">✅</button>
                <button class="btn-admin reject" onclick="adminRejectDeposit('${d.id}')">❌</button>
            </div>
        </div>
    `).join('');
}

function adminVerifyDeposit(depositId) {
    if (!confirm('Valider ce dépôt ?')) return;
    let deposits = getDeposits();
    const dep = deposits.find(d => d.id === depositId);
    if (!dep || dep.status !== 'pending') return;
    dep.status = 'verified';

    let users = getUsers();
    const user = users.find(u => u.id === dep.userId);
    if (user) {
        user.balance = (user.balance || 0) + dep.amount;
        saveUsers(users);
        if (currentUser && currentUser.id === user.id) {
            currentUser = user;
            localStorage.setItem('ms_currentUser', JSON.stringify(user));
        }
    }
    saveDeposits(deposits);
    refreshAll();
    showToast('✅ Dépôt validé !', 'success');
}

function adminRejectDeposit(depositId) {
    if (!confirm('Rejeter ce dépôt ?')) return;
    let deposits = getDeposits();
    const dep = deposits.find(d => d.id === depositId);
    if (dep) {
        dep.status = 'rejected';
        saveDeposits(deposits);
        refreshAll();
        showToast('❌ Dépôt rejeté', 'warning');
    }
}

function renderAdminUsers() {
    const container = document.getElementById('adminUsersList');
    const users = getUsers().slice(0, 20);
    container.innerHTML = users.map(u => `
        <div class="admin-user-item">
            <div class="info">
                <div>${u.displayName} ${u.role === 'admin' ? '<span class="badge-admin">ADMIN</span>' : ''}</div>
                <div class="email">${u.email}</div>
                <div style="font-size:12px;color:var(--accent-orange);">Solde: ${formatCurrency(u.balance || 0)} FCFA</div>
            </div>
            <div>
                <input type="number" id="addBalance_${u.id}" placeholder="FCFA" style="width:80px;padding:4px 6px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);font-size:12px;" />
                <button class="btn-add-balance" onclick="adminAddBalance('${u.id}')">+</button>
            </div>
        </div>
    `).join('');
}

function adminAddBalance(userId) {
    const input = document.getElementById('addBalance_' + userId);
    const amount = parseInt(input.value);
    if (!amount || amount <= 0) { showToast('Montant invalide', 'error'); return; }
    if (!confirm(`Ajouter ${formatCurrency(amount)} FCFA ?`)) return;

    let users = getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        user.balance = (user.balance || 0) + amount;
        saveUsers(users);
        if (currentUser && currentUser.id === user.id) {
            currentUser = user;
            localStorage.setItem('ms_currentUser', JSON.stringify(user));
        }
        let transactions = getTransactions();
        transactions.push({
            id: genId(),
            userId: userId,
            amount: amount,
            status: 'success',
            type: 'admin_add',
            date: new Date().toISOString()
        });
        saveTransactions(transactions);
        refreshAll();
        showToast(`✅ ${formatCurrency(amount)} FCFA ajouté !`, 'success');
        input.value = '';
    }
}

function renderAdminNumbers() {
    const container = document.getElementById('adminNumbersList');
    const numbers = getNumbers().slice(0, 20);
    if (numbers.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;padding:8px 0;">Aucun numéro</div>';
        return;
    }
    container.innerHTML = numbers.map(n => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);font-size:13px;">
            <span>${n.category} - ${n.country || '?'}</span>
            <span>${n.number}</span>
            <span style="color:${n.status === 'available' ? 'var(--accent-cyan)' : '#ef4444'}">${n.status}</span>
        </div>
    `).join('');
}

function adminAddNumber() {
    const category = document.getElementById('adminNumberCategory').value;
    const country = document.getElementById('adminNumberCountry').value.trim();
    const number = document.getElementById('adminNumberValue').value.trim();
    const price = parseInt(document.getElementById('adminNumberPrice').value);
    if (!country || !number || !price) { showToast('Remplis tous les champs', 'error'); return; }
    if (price < 1) { showToast('Prix invalide', 'error'); return; }

    let numbers = getNumbers();
    numbers.push({
        id: genId(),
        category: category,
        country: country,
        number: number,
        price: price,
        status: 'available',
        purchasedBy: null
    });
    saveNumbers(numbers);
    showToast('✅ Numéro ajouté !', 'success');
    document.getElementById('adminNumberCountry').value = '';
    document.getElementById('adminNumberValue').value = '';
    document.getElementById('adminNumberPrice').value = '';
    refreshAll();
}