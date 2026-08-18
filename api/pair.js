const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
    }

    try {
        const { number } = req.body;
        if (!number) {
            return res.status(400).json({ success: false, message: 'Numéro requis.' });
        }
        const cleanNumber = number.replace(/[^0-9]/g, '');
        if (cleanNumber.length < 8) {
            return res.status(400).json({ success: false, message: 'Numéro invalide (minimum 8 chiffres).' });
        }

        // Dossier temporaire dans /tmp (Vercel le permet)
        const authFolder = path.join('/tmp', `sessions_${cleanNumber}`);
        if (!fs.existsSync(authFolder)) {
            fs.mkdirSync(authFolder, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(authFolder);
        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['Chrome', 'Windows', '10.0'],
            printQRInTerminal: false,
        });

        sock.ev.on('creds.update', saveCreds);

        // Génération du code
        const code = await sock.requestPairingCode(cleanNumber);
        await sock.logout();

        // Nettoyage
        fs.rmSync(authFolder, { recursive: true, force: true });

        return res.status(200).json({ success: true, code });
    } catch (err) {
        console.error('❌ Erreur pairing:', err.message);
        return res.status(500).json({ success: false, message: `Erreur: ${err.message}` });
    }
};