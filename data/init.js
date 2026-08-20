// ============================================================
// 📦 DONNÉES INITIALES (si localStorage vide)
// ============================================================

if (getUsers().length === 0) {
    saveUsers([
        { id: 'admin', email: 'admin@ms.com', password: 'admin123', displayName: 'Admin', balance: 99999, role: 'admin' },
        { id: 'user1', email: 'user@test.com', password: '123456', displayName: 'Devshadow', balance: 5000, role: 'user' }
    ]);
}

if (getNumbers().length === 0) {
    saveNumbers([
        { id: 'n1', category: 'WhatsApp', country: 'Sénégal', number: '+221 77 123 45 67', price: 500, status: 'available', purchasedBy: null },
        { id: 'n2', category: 'WhatsApp', country: 'Sénégal', number: '+221 76 987 65 43', price: 600, status: 'available', purchasedBy: null },
        { id: 'n3', category: 'WhatsApp', country: 'France', number: '+33 6 12 34 56 78', price: 800, status: 'available', purchasedBy: null },
        { id: 'n4', category: 'Telegram', country: 'Sénégal', number: '+221 70 111 22 33', price: 700, status: 'available', purchasedBy: null },
        { id: 'n5', category: 'TikTok', country: 'USA', number: '+1 202 555 0199', price: 1200, status: 'available', purchasedBy: null }
    ]);
}