// ============================================================
// 📜 HISTORIQUE DES TRANSACTIONS
// ============================================================

function renderHistory() {
    const container = document.getElementById('historyList');
    if (!currentUser) return;
    const transactions = getTransactions().filter(t => t.userId === currentUser.id).slice(0, 50);
    if (transactions.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div style="font-size:40px;">📭</div>
            <div style="color:var(--text-secondary);">Aucune transaction</div>
        </div>`;
        return;
    }
    container.innerHTML = transactions.map(t => {
        const isDeposit = t.amount > 0;
        const sign = isDeposit ? '+' : '';
        const emoji = isDeposit ? '✅' : '❌';
        let detail = '';
        if (t.number) detail = `<div style="font-size:12px;color:var(--text-secondary);">📱 ${t.number}</div>`;
        return `
            <div style="background:var(--bg-secondary);border-radius:16px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--border-color);">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-weight:600;">${emoji} ${sign}${formatCurrency(Math.abs(t.amount))} FCFA</div>
                        ${detail}
                        <div style="font-size:11px;color:var(--text-secondary);">${t.category || ''} ${t.country || ''}</div>
                    </div>
                    <div style="font-size:11px;color:var(--text-secondary);">${new Date(t.date).toLocaleDateString()}</div>
                </div>
            </div>
        `;
    }).join('');
}