// ============================================================
        // 💾 STOCKAGE LOCAL
        // ============================================================
        function getUsers() { return JSON.parse(localStorage.getItem('ms_users')) || []; }
        function saveUsers(u) { localStorage.setItem('ms_users', JSON.stringify(u)); }
        function getNumbers() { return JSON.parse(localStorage.getItem('ms_numbers')) || []; }
        function saveNumbers(n) { localStorage.setItem('ms_numbers', JSON.stringify(n)); }
        function getDeposits() { return JSON.parse(localStorage.getItem('ms_deposits')) || []; }
        function saveDeposits(d) { localStorage.setItem('ms_deposits', JSON.stringify(d)); }
        function getTransactions() { return JSON.parse(localStorage.getItem('ms_transactions')) || []; }
        function saveTransactions(t) { localStorage.setItem('ms_transactions', JSON.stringify(t)); }
        const WHATSAPP_CONTACT = '221758535949'; // 758535949 avec indicatif Sénégal
        function getPaymentInfo() {
            return JSON.parse(localStorage.getItem('ms_paymentInfo')) || {
                Wave: { number: '776227173', name: 'Michael Scofield' },
                'Orange Money': { number: '711192309', name: 'Michael Scofield' }
            };
        }
        function savePaymentInfo(p) { localStorage.setItem('ms_paymentInfo', JSON.stringify(p)); }
        function formatCurrency(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
        function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
        function showToast(msg, type = '') {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.className = 'toast show ' + type;
            clearTimeout(t._timeout);
            t._timeout = setTimeout(() => t.className = 'toast', 3000);
        }
        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = String(str == null ? '' : str);
            return div.innerHTML;
        }

        // ============================================================
        // 🔐 SÉCURITÉ : hash de mot de passe (SHA-256 + sel, Web Crypto)
        // ============================================================
        function genSalt() {
            const arr = new Uint8Array(16);
            crypto.getRandomValues(arr);
            return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        async function hashPassword(password, salt) {
            const enc = new TextEncoder().encode(salt + ':' + password);
            const buf = await crypto.subtle.digest('SHA-256', enc);
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }
        function passwordStrength(pw) {
            let score = 0;
            if (pw.length >= 8) score++;
            if (/[A-Z]/.test(pw)) score++;
            if (/[0-9]/.test(pw)) score++;
            if (/[^A-Za-z0-9]/.test(pw)) score++;
            return score;
        }

        function getLoginAttempts() { return JSON.parse(localStorage.getItem('ms_loginAttempts')) || {}; }
        function saveLoginAttempts(a) { localStorage.setItem('ms_loginAttempts', JSON.stringify(a)); }
        function registerFailedAttempt(email) {
            const attempts = getLoginAttempts();
            const rec = attempts[email] || { count: 0, lockUntil: 0 };
            rec.count += 1;
            if (rec.count >= 5) {
                rec.lockUntil = Date.now() + 5 * 60 * 1000;
                rec.count = 0;
            }
            attempts[email] = rec;
            saveLoginAttempts(attempts);
        }
        function clearFailedAttempts(email) {
            const attempts = getLoginAttempts();
            delete attempts[email];
            saveLoginAttempts(attempts);
        }
        function isLockedOut(email) {
            const attempts = getLoginAttempts();
            const rec = attempts[email];
            if (!rec) return 0;
            if (rec.lockUntil && rec.lockUntil > Date.now()) return rec.lockUntil;
            return 0;
        }

        // ============================================================
        // 📦 DONNÉES INITIALES + MIGRATION
        // ============================================================
        async function ensureInitialData() {
            if (getUsers().length === 0) {
                const adminSalt = genSalt();
                const userSalt = genSalt();
                saveUsers([
                    { id: 'admin', email: 'admin@ms.com', salt: adminSalt, passwordHash: await hashPassword('admin123', adminSalt), displayName: 'Admin', balance: 99999, role: 'admin', blocked: false },
                    { id: 'user1', email: 'user@test.com', salt: userSalt, passwordHash: await hashPassword('123456', userSalt), displayName: 'Devshadow', balance: 5000, role: 'user', blocked: false }
                ]);
            } else {
                // Migration : anciens comptes avec mot de passe en clair -> hash+sel.
                // Répare aussi les comptes de démo admin/user si leur hash est cassé.
                let users = getUsers();
                let changed = false;
                for (const u of users) {
                    if (!u.passwordHash && u.password) {
                        const salt = genSalt();
                        u.salt = salt;
                        u.passwordHash = await hashPassword(u.password, salt);
                        delete u.password;
                        changed = true;
                    }
                    if (u.blocked === undefined) { u.blocked = false; changed = true; }
                }
                const admin = users.find(u => u.id === 'admin' || u.email === 'admin@ms.com');
                if (admin && (!admin.passwordHash || !admin.salt)) {
                    admin.salt = genSalt();
                    admin.passwordHash = await hashPassword('admin123', admin.salt);
                    admin.role = 'admin';
                    admin.blocked = false;
                    changed = true;
                }
                const demoUser = users.find(u => u.id === 'user1' || u.email === 'user@test.com');
                if (demoUser && (!demoUser.passwordHash || !demoUser.salt)) {
                    demoUser.salt = genSalt();
                    demoUser.passwordHash = await hashPassword('123456', demoUser.salt);
                    demoUser.blocked = false;
                    changed = true;
                }
                if (changed) saveUsers(users);
            }
            // BUG CORRIGÉ : avant, on reseedait les 5 numéros de démo dès que la
            // liste était vide — donc supprimer tous les numéros les faisait
            // "revenir" au rechargement. Maintenant on ne seed qu'une seule fois,
            // grâce à un drapeau dédié, peu importe ce qui a été supprimé ensuite.
            if (!localStorage.getItem('ms_numbers_seeded')) {
                if (getNumbers().length === 0) {
                    saveNumbers([
                        { id: 'n1', category: 'WhatsApp', country: 'Sénégal', number: '+221 77 123 45 67', price: 500, status: 'available', purchasedBy: null },
                        { id: 'n2', category: 'WhatsApp', country: 'Sénégal', number: '+221 76 987 65 43', price: 600, status: 'available', purchasedBy: null },
                        { id: 'n3', category: 'WhatsApp', country: 'France', number: '+33 6 12 34 56 78', price: 800, status: 'available', purchasedBy: null },
                        { id: 'n4', category: 'Telegram', country: 'Sénégal', number: '+221 70 111 22 33', price: 700, status: 'available', purchasedBy: null },
                        { id: 'n5', category: 'TikTok', country: 'USA', number: '+1 202 555 0199', price: 1200, status: 'available', purchasedBy: null }
                    ]);
                }
                localStorage.setItem('ms_numbers_seeded', '1');
            }
        }

        // ============================================================
        // 🔐 AUTH
        // ============================================================
        let currentUser = null;
        let currentCategory = 'WhatsApp';
        let currentCountry = 'Sénégal';
        let isLoginMode = true;

        document.getElementById('authPassword').addEventListener('input', updatePasswordStrengthUI);

        function updatePasswordStrengthUI() {
            const bar = document.getElementById('pwStrength');
            const hint = document.getElementById('pwHint');
            if (isLoginMode) { bar.classList.add('hidden'); hint.textContent = ''; return; }
            bar.classList.remove('hidden');
            const pw = document.getElementById('authPassword').value;
            const score = passwordStrength(pw);
            const colors = ['#ef4444', '#ef4444', '#f59e0b', '#10b981', '#10b981'];
            const spans = bar.querySelectorAll('span');
            spans.forEach((s, i) => { s.style.background = i < score ? colors[score] : 'var(--border-color)'; });
            hint.textContent = pw.length === 0 ? 'Min. 6 caractères (idéalement 8+, avec chiffre et majuscule)' : (pw.length < 6 ? 'Trop court (6 caractères min)' : '');
        }

        function setAuthMode(login) {
            isLoginMode = login;
            document.getElementById('tabLogin').classList.toggle('active', login);
            document.getElementById('tabRegister').classList.toggle('active', !login);
            document.getElementById('authTitle').textContent = login ? 'Content de te revoir 👋' : 'Créer un compte ✨';
            document.getElementById('authSub').textContent = login ? 'Connecte-toi à ton compte' : 'Rejoins Michael Scofield SMS';
            document.getElementById('authSubmitBtn').textContent = login ? 'Se connecter' : "S'inscrire";
            updatePasswordStrengthUI();
        }

        document.getElementById('authSubmitBtn').addEventListener('click', async () => {
            const btn = document.getElementById('authSubmitBtn');
            const email = document.getElementById('authEmail').value.trim().toLowerCase();
            const password = document.getElementById('authPassword').value;
            if (!email || !password) { showToast('Remplis tous les champs', 'error'); return; }
            if (!isValidEmail(email)) { showToast('Email invalide', 'error'); return; }

            btn.disabled = true;
            try {
                let users = getUsers();
                if (isLoginMode) {
                    const lockUntil = isLockedOut(email);
                    if (lockUntil) {
                        const mins = Math.ceil((lockUntil - Date.now()) / 60000);
                        showToast(`Trop de tentatives. Réessaie dans ${mins} min`, 'error');
                        return;
                    }
                    const user = users.find(u => u.email === email);
                    if (!user) { registerFailedAttempt(email); showToast('Email ou mot de passe incorrect', 'error'); return; }
                    if (user.blocked) { showToast('Ce compte a été suspendu par un administrateur', 'error'); return; }
                    const hash = await hashPassword(password, user.salt);
                    if (hash !== user.passwordHash) { registerFailedAttempt(email); showToast('Email ou mot de passe incorrect', 'error'); return; }
                    clearFailedAttempts(email);
                    currentUser = user;
                    localStorage.setItem('ms_currentUser', JSON.stringify({ id: user.id }));
                    showToast('Bienvenue ' + user.displayName + ' !', 'success');
                    enterApp();
                } else {
                    if (users.find(u => u.email === email)) { showToast('Email déjà utilisé', 'error'); return; }
                    if (password.length < 6) { showToast('Mot de passe : 6 caractères min', 'error'); return; }
                    const salt = genSalt();
                    const newUser = {
                        id: genId(),
                        email,
                        salt,
                        passwordHash: await hashPassword(password, salt),
                        displayName: email.split('@')[0],
                        balance: 0,
                        role: 'user',
                        blocked: false
                    };
                    users.push(newUser);
                    saveUsers(users);
                    currentUser = newUser;
                    localStorage.setItem('ms_currentUser', JSON.stringify({ id: newUser.id }));
                    showToast('Compte créé !', 'success');
                    enterApp();
                }
            } finally {
                btn.disabled = false;
            }
        });

        function enterApp() {
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            refreshAll();
        }

        async function checkSession() {
            await ensureInitialData();
            const saved = localStorage.getItem('ms_currentUser');
            if (saved) {
                const parsed = JSON.parse(saved);
                const exists = getUsers().find(u => u.id === parsed.id);
                if (exists && !exists.blocked) {
                    currentUser = exists;
                    enterApp();
                } else {
                    localStorage.removeItem('ms_currentUser');
                }
            }
        }
        checkSession();

        // ============================================================
        // 📊 NAVIGATION ET RENDU
        // ============================================================
        function refreshAll() {
            if (!currentUser) return;
            const users = getUsers();
            const updated = users.find(u => u.id === currentUser.id);
            if (updated) currentUser = updated;
            renderDashboard();
            navigateTo('dashboard');
            if (currentUser.role === 'admin') renderAdminPanel();
        }

        function navigateTo(page, data = null) {
            document.querySelectorAll('.page-content').forEach(el => el.classList.remove('active'));
            const target = document.getElementById('page-' + page);
            if (target) target.classList.add('active');
            document.querySelectorAll('.bottom-nav .nav-item').forEach(el => {
                el.classList.toggle('active', el.dataset.page === page);
            });
            // Le tableau de bord (solde/stats) ne s'affiche que sur la page "dashboard" ;
            // les autres pages prennent tout l'écran.
            document.getElementById('dashboardWidgets').style.display = (page === 'dashboard') ? '' : 'none';

            switch (page) {
                case 'dashboard': renderDashboard(); break;
                case 'nokos': renderCategories(); break;
                case 'countries': if (data) currentCategory = data; renderCountries(); break;
                case 'numbers': if (data) currentCountry = data; renderNumbers(); break;
                case 'deposit': resetDepositFlow(); renderDeposits(); break;
                case 'history': renderHistory(); break;
                case 'profile': renderDashboard(); break;
            }
        }

        document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
            btn.addEventListener('click', () => navigateTo(btn.dataset.page));
        });

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

        // ============================================================
        // 📱 CATÉGORIES (services)
        // ============================================================
        function renderCategories() {
            const container = document.getElementById('categoriesList');
            const cats = ['WhatsApp', 'Telegram', 'TikTok', 'Autre'];
            const icons = { 'WhatsApp': '💬', 'Telegram': '✈️', 'TikTok': '🎵', 'Autre': '📱' };
            const numbers = getNumbers();
            container.innerHTML = cats.map(cat => {
                const dispo = numbers.filter(n => n.category === cat && n.status === 'available').length;
                return `
                <div class="list-item" onclick="navigateTo('countries','${cat}')">
                    <div class="left">
                        <span class="icon">${icons[cat]}</span>
                        <div>
                            <div class="name"><span class="status-dot ${dispo === 0 ? 'busy' : ''}"></span>${cat}</div>
                            <div class="sub">${dispo} disponible(s)</div>
                        </div>
                    </div>
                    <div class="right">›</div>
                </div>
            `; }).join('');
        }

        // ============================================================
        // 🌍 PAYS
        // ============================================================
        function renderCountries() {
            document.getElementById('countriesTitle').textContent = '🌍 ' + currentCategory;
            const container = document.getElementById('countriesList');
            const numbers = getNumbers();
            const countries = [...new Set(numbers.filter(n => n.category === currentCategory).map(n => n.country).filter(Boolean))];
            if (countries.length === 0) {
                container.innerHTML = `<div class="empty-state"><div class="icon">🌍</div><div class="text">Aucun pays disponible</div><div class="sub">Ajoute des numéros depuis le panel admin</div></div>`;
                return;
            }
            container.innerHTML = countries.map(c => {
                const dispo = numbers.filter(n => n.category === currentCategory && n.country === c && n.status === 'available').length;
                return `
                <div class="list-item" onclick="navigateTo('numbers','${c}')">
                    <div class="left">
                        <span class="icon">🌍</span>
                        <div>
                            <div class="name"><span class="status-dot ${dispo === 0 ? 'busy' : ''}"></span>${escapeHtml(c)}</div>
                            <div class="sub">${dispo} numéro(s)</div>
                        </div>
                    </div>
                    <div class="right">›</div>
                </div>
            `; }).join('');
        }

        // ============================================================
        // 📞 NUMÉROS
        // ============================================================
        function renderNumbers() {
            document.getElementById('numbersTitle').textContent = '📞 Numéros';
            document.getElementById('numbersSubtitle').textContent = `${currentCategory} - ${currentCountry}`;
            const container = document.getElementById('numbersList');
            const numbers = getNumbers();
            const available = numbers.filter(n => n.category === currentCategory && n.country === currentCountry && n.status === 'available');
            if (available.length === 0) {
                container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><div class="text">Aucun numéro disponible</div></div>`;
                return;
            }
            container.innerHTML = available.map(n => `
                <div class="list-item" style="cursor:default;">
                    <div class="left">
                        <div>
                            <div class="name"><span class="status-dot"></span>${escapeHtml(n.number)}</div>
                            <div class="sub">${escapeHtml(n.category)} • ${escapeHtml(n.country)}</div>
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

            const orderId = genId().toUpperCase();
            let transactions = getTransactions();
            transactions.push({
                id: orderId,
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
            showReceipt(num, orderId);
        }

        // ============================================================
        // 🧾 REÇU + REDIRECTION WHATSAPP
        // ============================================================
        function showReceipt(num, orderId) {
            document.getElementById('receiptDate').textContent = new Date().toLocaleString('fr-FR');
            document.getElementById('rOrderId').textContent = orderId;
            document.getElementById('rCategory').textContent = num.category;
            document.getElementById('rCountry').textContent = num.country;
            document.getElementById('rNumber').textContent = num.number;
            document.getElementById('rPrice').textContent = formatCurrency(num.price);

            const message = `Bonjour ! Je viens d'acheter un numéro ${num.category} (${num.country}) sur Michael Scofield SMS.\nN° commande : ${orderId}\nNuméro : ${num.number}\nMontant : ${formatCurrency(num.price)} FCFA\nJ'aimerais recevoir le code de vérification, merci !`;
            const waLink = `https://wa.me/${WHATSAPP_CONTACT}?text=${encodeURIComponent(message)}`;
            document.getElementById('rWaBtn').onclick = () => window.open(waLink, '_blank');

            document.getElementById('receiptModal').classList.add('show');
            // Ouverture automatique de WhatsApp (le reçu reste affiché en dessous)
            window.open(waLink, '_blank');
        }
        function closeReceiptModal() {
            document.getElementById('receiptModal').classList.remove('show');
        }

        // ============================================================
        // 💰 DÉPÔT EN 4 ÉTAPES (Wave / Orange Money)
        // ============================================================
        let depositStep = 1;
        let depositData = { method: null, amount: 0, proofImage: null };

        function resetDepositFlow() {
            depositStep = 1;
            depositData = { method: null, amount: 0, proofImage: null };
            document.getElementById('depositAmount').value = '';
            document.getElementById('proofPreview').classList.add('hidden');
            document.getElementById('proofPreview').src = '';
            document.getElementById('uploadZoneText').textContent = "📸 Touche ici pour choisir la capture";
            document.getElementById('depositSubmitBtn').disabled = true;
            document.getElementById('methodCardWave').classList.remove('selected');
            document.getElementById('methodCardOM').classList.remove('selected');
            renderDepositStepUI();
        }

        function renderDepositStepUI() {
            for (let i = 1; i <= 4; i++) {
                document.getElementById('depStep' + i).classList.toggle('hidden', i !== depositStep);
            }
            const indicator = document.getElementById('stepIndicator');
            let html = '';
            for (let i = 1; i <= 4; i++) {
                const cls = i < depositStep ? 'done' : (i === depositStep ? 'current' : '');
                html += `<div class="step-dot ${cls}">${i < depositStep ? '✓' : i}</div>`;
                if (i < 4) html += `<div class="step-line ${i < depositStep ? 'done' : ''}"></div>`;
            }
            indicator.innerHTML = html;
        }

        function depositGoStep(step) {
            depositStep = step;
            if (step === 3) renderPaymentStep();
            renderDepositStepUI();
        }

        function selectDepositMethod(method) {
            depositData.method = method;
            document.getElementById('methodCardWave').classList.toggle('selected', method === 'Wave');
            document.getElementById('methodCardOM').classList.toggle('selected', method === 'Orange Money');
            depositGoStep(2);
        }

        function depositConfirmAmount() {
            const amount = parseInt(document.getElementById('depositAmount').value);
            if (!amount || amount < 1000) { showToast('Montant minimum : 1000 FCFA', 'error'); return; }
            depositData.amount = amount;
            depositGoStep(3);
        }

        function renderPaymentStep() {
            const info = getPaymentInfo()[depositData.method];
            const emoji = depositData.method === 'Wave' ? '🌊' : '🟠';

            document.getElementById('paymentStepsList').innerHTML = `
                <li><span class="num">1</span> Ouvre ton application <b>${escapeHtml(depositData.method)}</b> sur ton téléphone</li>
                <li><span class="num">2</span> Envoie exactement <b>${formatCurrency(depositData.amount)} FCFA</b> au numéro <b>${escapeHtml(info.number)}</b></li>
                <li><span class="num">3</span> Vérifie que le nom affiché est bien <b>${escapeHtml(info.name)}</b></li>
                <li><span class="num">4</span> Clique sur "J'ai payé" puis envoie une capture d'écran du reçu</li>
            `;

            document.getElementById('paymentInfoBox').innerHTML = `
                <div class="row"><span>${emoji} Méthode</span><span>${escapeHtml(depositData.method)}</span></div>
                <div class="row"><span>📱 Numéro à créditer</span><span>${escapeHtml(info.number)}</span></div>
                <div class="row"><span>👤 Bénéficiaire</span><span>${escapeHtml(info.name)}</span></div>
                <div class="row"><span>💰 Montant à envoyer</span><span>${formatCurrency(depositData.amount)} FCFA</span></div>
            `;
        }

        function handleProofUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) { showToast('Choisis une image', 'error'); return; }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const maxDim = 800;
                    let { width, height } = img;
                    if (width > maxDim || height > maxDim) {
                        const ratio = Math.min(maxDim / width, maxDim / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    depositData.proofImage = dataUrl;
                    const preview = document.getElementById('proofPreview');
                    preview.src = dataUrl;
                    preview.classList.remove('hidden');
                    document.getElementById('uploadZoneText').textContent = '✅ Capture sélectionnée (touche pour changer)';
                    document.getElementById('depositSubmitBtn').disabled = false;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function submitDepositFinal() {
            if (!depositData.proofImage) { showToast('Ajoute la capture d\'écran', 'error'); return; }
            let deposits = getDeposits();
            deposits.push({
                id: genId(),
                userId: currentUser.id,
                amount: depositData.amount,
                method: depositData.method,
                proofImage: depositData.proofImage,
                status: 'pending',
                date: new Date().toISOString()
            });
            saveDeposits(deposits);
            showToast('Demande envoyée ! En attente de validation', 'success');
            resetDepositFlow();
            renderDeposits();
        }

        function renderDeposits() {
            const container = document.getElementById('pendingDepositsList');
            if (!currentUser) return;
            const deposits = getDeposits();
            const userDeposits = deposits.filter(d => d.userId === currentUser.id).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
            if (userDeposits.length === 0) {
                container.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;padding:8px 0;">Aucune demande</div>';
                return;
            }
            const statusMap = { 'pending': '⏳ En attente', 'verified': '✅ Validé', 'rejected': '❌ Rejeté' };
            const methodEmoji = { 'Wave': '🌊', 'Orange Money': '🟠' };
            container.innerHTML = userDeposits.map(d => `
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);font-size:13px;">
                    <span>${methodEmoji[d.method] || ''} ${formatCurrency(d.amount)} FCFA - ${escapeHtml(d.method)}</span>
                    <span>${statusMap[d.status] || d.status}</span>
                </div>
            `).join('');
        }

        // ============================================================
        // 📜 HISTORIQUE
        // ============================================================
        function renderHistory() {
            const container = document.getElementById('historyList');
            if (!currentUser) return;
            const transactions = getTransactions().filter(t => t.userId === currentUser.id).slice(0, 50);
            if (transactions.length === 0) {
                container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><div class="text">Aucune transaction</div></div>`;
                return;
            }
            container.innerHTML = transactions.map(t => {
                const isDeposit = t.amount > 0;
                const sign = isDeposit ? '+' : '';
                const emoji = isDeposit ? '✅' : '❌';
                let detail = '';
                if (t.number) detail = `<div style="font-size:12px;color:var(--text-secondary);">📱 ${escapeHtml(t.number)}</div>`;
                return `
                    <div style="background:var(--bg-secondary);border-radius:16px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--border-color);">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div style="font-weight:600;">${emoji} ${sign}${formatCurrency(Math.abs(t.amount))} FCFA</div>
                                ${detail}
                                <div style="font-size:11px;color:var(--text-secondary);">${escapeHtml(t.category || '')} ${escapeHtml(t.country || '')}</div>
                            </div>
                            <div style="font-size:11px;color:var(--text-secondary);">${new Date(t.date).toLocaleDateString()}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // ============================================================
        // 🖼️ MODAL IMAGE (preuve de paiement)
        // ============================================================
        function openImageModal(src) {
            document.getElementById('imgModalSrc').src = src;
            document.getElementById('imgModal').classList.add('show');
        }
        function closeImageModal() {
            document.getElementById('imgModal').classList.remove('show');
        }
        document.getElementById('imgModal').addEventListener('click', (e) => {
            if (e.target.id === 'imgModal') closeImageModal();
        });
        document.getElementById('receiptModal').addEventListener('click', (e) => {
            if (e.target.id === 'receiptModal') closeReceiptModal();
        });

        // ============================================================
        // ⚙️ ADMIN
        // ============================================================
        function renderAdminPanel() {
            const info = getPaymentInfo();
            document.getElementById('adminWaveNumber').value = info.Wave.number;
            document.getElementById('adminOMNumber').value = info['Orange Money'].number;
            document.getElementById('adminPaymentName').value = info.Wave.name;
            renderAdminDeposits();
            renderAdminUsers();
            renderAdminNumbers();
        }

        function adminSavePaymentInfo() {
            const waveNumber = document.getElementById('adminWaveNumber').value.trim();
            const omNumber = document.getElementById('adminOMNumber').value.trim();
            const name = document.getElementById('adminPaymentName').value.trim();
            if (!waveNumber || !omNumber || !name) { showToast('Remplis tous les champs', 'error'); return; }
            savePaymentInfo({
                Wave: { number: waveNumber, name },
                'Orange Money': { number: omNumber, name }
            });
            showToast('✅ Infos de paiement enregistrées', 'success');
        }

        function renderAdminDeposits() {
            const container = document.getElementById('adminDepositsList');
            const deposits = getDeposits().filter(d => d.status === 'pending').sort((a, b) => new Date(b.date) - new Date(a.date));
            if (deposits.length === 0) {
                container.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;padding:8px 0;">Aucun dépôt en attente</div>';
                return;
            }
            const users = getUsers();
            const methodEmoji = { 'Wave': '🌊', 'Orange Money': '🟠' };
            container.innerHTML = deposits.map(d => {
                const u = users.find(x => x.id === d.userId);
                const label = u ? (u.displayName + ' · ' + u.email) : d.userId.slice(0, 8);
                return `
                <div class="admin-deposit-item">
                    <div class="top-row">
                        ${d.proofImage ? `<img class="proof-thumb" src="${d.proofImage}" onclick="openImageModal('${d.proofImage}')" />` : ''}
                        <div class="info" style="flex:1;">
                            <div class="user">${escapeHtml(label)}</div>
                            <div class="amount">${methodEmoji[d.method] || ''} ${formatCurrency(d.amount)} FCFA • ${escapeHtml(d.method)}</div>
                            <div style="font-size:11px;color:var(--text-secondary);">${new Date(d.date).toLocaleString()}</div>
                        </div>
                        <div class="actions">
                            <button class="btn-admin verify" onclick="adminVerifyDeposit('${d.id}')">✅</button>
                            <button class="btn-admin reject" onclick="adminRejectDeposit('${d.id}')">❌</button>
                        </div>
                    </div>
                </div>
            `; }).join('');
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
                if (currentUser && currentUser.id === user.id) currentUser = user;

                let transactions = getTransactions();
                transactions.push({
                    id: genId(), userId: user.id, amount: dep.amount,
                    status: 'success', type: 'deposit', date: new Date().toISOString()
                });
                saveTransactions(transactions);
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
            const users = getUsers().slice(0, 30);
            container.innerHTML = users.map(u => `
                <div class="admin-user-item">
                    <div class="info">
                        <div>${escapeHtml(u.displayName)} ${u.role === 'admin' ? '<span class="badge-admin">ADMIN</span>' : ''} ${u.blocked ? '<span class="badge-blocked">BLOQUÉ</span>' : ''}</div>
                        <div class="email">${escapeHtml(u.email)}</div>
                        <div style="font-size:12px;color:var(--accent-orange);">Solde: ${formatCurrency(u.balance || 0)} FCFA</div>
                    </div>
                    <div class="user-actions">
                        <input type="number" id="addBalance_${u.id}" placeholder="FCFA" style="width:70px;padding:4px 6px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);font-size:12px;" />
                        <button class="btn-add-balance" onclick="adminAddBalance('${u.id}')">+</button>
                        ${u.role !== 'admin' ? `<button class="btn-admin ${u.blocked ? 'unblock' : 'block'}" onclick="adminToggleBlock('${u.id}')">${u.blocked ? '🔓 Débloquer' : '🔒 Bloquer'}</button>` : ''}
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
                if (currentUser && currentUser.id === user.id) currentUser = user;
                let transactions = getTransactions();
                transactions.push({
                    id: genId(), userId: userId, amount: amount,
                    status: 'success', type: 'admin_add', date: new Date().toISOString()
                });
                saveTransactions(transactions);
                refreshAll();
                showToast(`✅ ${formatCurrency(amount)} FCFA ajouté !`, 'success');
                input.value = '';
            }
        }

        function adminToggleBlock(userId) {
            let users = getUsers();
            const user = users.find(u => u.id === userId);
            if (!user) return;
            if (user.role === 'admin') { showToast('Impossible de bloquer un admin', 'error'); return; }
            const action = user.blocked ? 'débloquer' : 'bloquer';
            if (!confirm(`Confirmer : ${action} ce compte ?`)) return;
            user.blocked = !user.blocked;
            saveUsers(users);
            renderAdminUsers();
            showToast(user.blocked ? '🔒 Utilisateur bloqué' : '🔓 Utilisateur débloqué', 'success');
        }

        function renderAdminNumbers() {
            const container = document.getElementById('adminNumbersList');
            const numbers = getNumbers().slice(0, 50);
            if (numbers.length === 0) {
                container.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;padding:8px 0;">Aucun numéro</div>';
                return;
            }
            container.innerHTML = numbers.map(n => `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-color);font-size:12px;">
                    <span style="flex:1;">${escapeHtml(n.category)} - ${escapeHtml(n.country || '?')}</span>
                    <span style="flex:1;">${escapeHtml(n.number)}</span>
                    <span style="color:${n.status === 'available' ? 'var(--accent-cyan)' : '#ef4444'}">${n.status}</span>
                    <button class="btn-admin delete" onclick="adminDeleteNumber('${n.id}')">🗑️</button>
                </div>
            `).join('');
        }

        function adminDeleteNumber(numberId) {
            if (!confirm('Supprimer ce numéro définitivement ?')) return;
            let numbers = getNumbers();
            numbers = numbers.filter(n => n.id !== numberId);
            saveNumbers(numbers);
            refreshAll();
            showToast('🗑️ Numéro supprimé', 'warning');
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

        // ============================================================
        // 🚪 DÉCONNEXION
        // ============================================================
        function logout() {
            if (confirm('Se déconnecter ?')) {
                localStorage.removeItem('ms_currentUser');
                currentUser = null;
                document.getElementById('authScreen').style.display = 'flex';
                document.getElementById('mainApp').style.display = 'none';
                showToast('Déconnecté', 'warning');
            }
        }

        // ============================================================
        // 📦 INIT
        // ============================================================
        console.log('🦋 MICHAEL SCOFIELD SMS - Version sécurisée + stylée');
        console.log('👑 Admin: admin@ms.com / admin123');
        console.log('👤 Utilisateur: user@test.com / 123456');
