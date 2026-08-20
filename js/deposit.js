// ============================================================
// 💰 GESTION DES DÉPÔTS
// ============================================================

function renderDeposits() {
    const container = document.getElementById('pendingDepositsList');
    if (!currentUser) return;
    const deposits = getDeposits();
    const userDeposits = deposits.filter(d => d.userId === currentUser.id).slice(0, 10);
    if (userDeposits.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;padding:8px 0;">Aucune demande</div>';
        return;
    }
    const statusMap = { 'pending': '⏳ En attente', 'verified': '✅ Validé', 'rejected': '❌ Rejeté' };
    container.innerHTML = userDeposits.map(d => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);font-size:13px;">
            <span>${formatCurrency(d.amount)} FCFA - ${d.method}</span>
            <span>${statusMap[d.status] || d.status}</span>
        </div>
    `).join('');
}

function requestDeposit() {
    const amount = parseInt(document.getElementById('depositAmount').value);
    const method = document.getElementById('depositMethod').value;
    const proof = document.getElementById('depositProof').value.trim();
    if (!amount || amount < 1000) { showToast('Montant minimum : 1000 FCFA', 'error'); return; }
    if (!proof) { showToast('Veuillez fournir un lien de preuve', 'error'); return; }

    let deposits = getDeposits();
    deposits.push({
        id: genId(),
        userId: currentUser.id,
        amount: amount,
        method: method,
        proof: proof,
        status: 'pending',
        date: new Date().toISOString()
    });
    saveDeposits(deposits);
    showToast('Demande envoyée !', 'success');
    document.getElementById('depositAmount').value = '';
    document.getElementById('depositProof').value = '';
    renderDeposits();
}