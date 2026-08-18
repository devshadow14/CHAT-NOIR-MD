// =============================================
// API VERCEL POUR GÉNÉRER LE CODE
// =============================================

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    // 1. CONFIGURATION CORS (pour éviter les erreurs)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 2. GESTION DES OPTIONS (requête préliminaire)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. VÉRIFICATION DE LA MÉTHODE
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            message: 'Méthode non autorisée. Utilise POST.' 
        });
    }

    try {
        // 4. RÉCUPÉRATION DU NUMÉRO
        const { number } = req.body;
        
        if (!number) {
            return res.status(400).json({ 
                success: false, 
                message: 'Numéro WhatsApp requis.' 
            });
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');
        
        if (cleanNumber.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: 'Numéro invalide (minimum 8 chiffres).' 
            });
        }

        console.log(`📡 Génération du code pour ${cleanNumber}...`);

        // 5. DOSSIER DE SESSION (dans /tmp pour Vercel)
        const authFolder = path.join('/tmp', `sessions_${cleanNumber}`);
        
        if (!fs.existsSync(authFolder)) {
            fs.mkdirSync(authFolder, { recursive: true });
        }

        // 6. CONNEXION WHATSAPP
        const { state, saveCreds } = await useMultiFileAuthState(authFolder);
        
        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['Chrome', 'Windows', '10.0'],
            printQRInTerminal: false,
        });

        sock.ev.on('creds.update', saveCreds);

        // 7. GÉNÉRATION DU CODE
        const code = await sock.requestPairingCode(cleanNumber);
        console.log(`✅ Code généré pour ${cleanNumber} : ${code}`);

        // 8. DÉCONNEXION ET NETTOYAGE
        await sock.logout();
        fs.rmSync(authFolder, { recursive: true, force: true });

        // 9. RÉPONSE
        return res.status(200).json({ 
            success: true, 
            code: code 
        });

    } catch (err) {
        console.error('❌ Erreur pairing:', err.message);
        return res.status(500).json({ 
            success: false, 
            message: `Erreur : ${err.message}` 
        });
    }
};