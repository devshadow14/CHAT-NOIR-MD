// ============================================================
// 📱 GESTION DES CATÉGORIES, PAYS, NUMÉROS
// ============================================================

function renderCategories() {
    const container = document.getElementById('categoriesList');
    const cats = ['WhatsApp', 'Telegram', 'TikTok', 'Autre'];
    const icons = { 'WhatsApp': '💬', 'Telegram': '✈️', 'TikTok': '🎵', 'Autre': '📱' };
    const numbers = getNumbers();
    container.innerHTML = cats.map(cat => `
        <div class="list-item" onclick="navigateTo('countries','${cat}')">
            <div class="left">
                <span class="icon">${icons[cat]}</span>
                <div>
                    <div class="name">${cat}</div>
                    <div class="sub">${numbers.filter(n => n.category === cat && n.status === 'available').length} disponible(s)</div>
                </div>
            </div>
            <div class="right">›</div>
        </div>
    `).join('');
}

function renderCountries() {
    document.getElementById('countriesTitle').textContent = '🌍 ' + currentCategory;
    const container = document.getElementById('countriesList');
    const numbers = getNumbers();
    const countries = [...new Set(numbers.filter(n => n.category === currentCategory).map(n => n.country).filter(Boolean))];
    if (countries.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div style="font-size:40px;">🌍</div>
            <div style="color:var(--text-secondary);">Aucun pays disponible</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">Ajoute des numéros depuis le panel admin</div>
        </div>`;
        return;
    }
    container.innerHTML = countries.map(c => `
        <div class="list-item" onclick="navigateTo('numbers','${c}')">
            <div class="left">
                <span class="icon">🌍</span>
                <div>
                    <div class="name">${c}</div>
                    <div class="sub">${numbers.filter(n => n.category === currentCategory && n.country === c && n.status === 'available').length} numéro(s)</div>
                </div>
            </div>
            <div class="right">›</div>
        </div>
    `).join('');
}

function renderNumbers() {
    document.getElementById('numbersTitle').textContent = '📞 Numéros';
    document.getElementById('numbersSubtitle').textContent = `${currentCategory} - ${currentCountry}`;
    const container = document.getElementById('numbersList');
    const numbers = getNumbers();
    const available = numbers.filter(n => n.category === currentCategory && n.country === currentCountry && n.status === 'available');
    if (available.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div style="font-size:40px;">📭</div>
            <div style="color:var(--text-secondary);">Aucun numéro disponible</div>
        </div>`;
        return;
    }
    container.innerHTML = available.map(n => `
        <div class="list-item" style="cursor:default;">
            <div class="left">
                <div>
                    <div class="name">${n.number}</div>
                    <div class="sub">${n.category} • ${n.country}</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
                <span class="price-tag">${formatCurrency(n.price)} FCFA</span>
                <button class="btn-buy" onclick="buyNumber('${n.id}')">Acheter</button>
            </div>
        </div>
    `).join('');
}

function buyNumber(numberId) {
    if (!currentUser) { showToast('Connecte-toi', 'error'); return; }
    const numbers = getNumbers();
    const num = numbers.find(n => n.id === numberId);
    if (!num || num.status !== 'available') { showToast('Numéro déjà vendu', 'error'); return; }
    if (currentUser.balance < num.price) {
        showToast(`Solde insuffisant ! ${formatCurrency(currentUser.balance)} FCFA`, 'error');
        return;
    }
    if (!confirm(`Acheter ${num.number} pour ${formatCurrency(num.price)} FCFA ?`)) return;

    num.status = 'sold';
    num.purchasedBy = currentUser.id;
    num.purchasedAt = new Date().toISOString();
    saveNumbers(numbers);

    let users = getUsers();
    const user = users.find(u => u.id === currentUser.id);
    user.balance -= num.price;
    saveUsers(users);
    currentUser = user;
    localStorage.setItem('ms_currentUser', JSON.stringify(user));

    let transactions = getTransactions();
    transactions.push({
        id: genId(),
        userId: currentUser.id,
        numberId: num.id,
        number: num.number,
        category: num.category,
        country: num.country,
        amount: -num.price,
        status: 'success',
        date: new Date().toISOString()
    });
    saveTransactions(transactions);

    refreshAll();
    showToast('🎉 Achat réussi !', 'success');
}