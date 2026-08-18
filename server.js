const express = require('express');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// WHATSAPPMANAGER - GÉNÈRE LE VRAI CODE
// =============================================
class WhatsAppManager {
  constructor() {
    this.sessions = new Map();
  }

  async pair(userKey, number) {
    if (this.sessions.has(userKey)) {
      console.log(`📱 Session déjà active pour ${userKey}`);
      return null;
    }

    const authFolder = path.join(__dirname, `sessions_${userKey}`);
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

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error?.output?.statusCode) !== DisconnectReason.loggedOut;
        console.log(`❌ Connexion fermée pour ${userKey}`);
        if (shouldReconnect) {
          this.sessions.delete(userKey);
          setTimeout(() => this.pair(userKey, number), 5000);
        }
      }
      if (connection === 'open') {
        console.log(`✅ WhatsApp connecté pour ${userKey}`);
        this.sessions.set(userKey, sock);
      }
    });

    // =============================================
    // COMMANDES DU BOT (14 commandes)
    // =============================================
    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const prefix = '.';

      if (!text.startsWith(prefix)) return;

      const command = text.split(' ')[0].toLowerCase();
      let reply = '';

      switch (command) {
        case `${prefix}ping`: reply = '🏓 Pong !'; break;
        case `${prefix}menu`:
          reply = `🤖 *Chat Noir-MD*\n➜ ${prefix}ping\n➜ ${prefix}menu\n➜ ${prefix}info\n➜ ${prefix}status\n➜ ${prefix}date\n➜ ${prefix}owner\n➜ ${prefix}help\n➜ ${prefix}uptime\n➜ ${prefix}stats\n➜ ${prefix}version\n➜ ${prefix}time\n➜ ${prefix}donate\n➜ ${prefix}social\n➜ ${prefix}about`;
          break;
        case `${prefix}info`:
          reply = `📱 *Chat Noir-MD*\n⚙️ Version 2.0\n💚 Baileys + Node.js\n👤 Créé par DEV MICHAEL SCOFIELD`;
          break;
        case `${prefix}status`:
          reply = `🔌 Statut: ${this.sessions.size > 0 ? '✅ Connecté' : '⏳ En attente'}\n📡 Sessions: ${this.sessions.size}`;
          break;
        case `${prefix}date`:
          reply = `📅 ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' })}`;
          break;
        case `${prefix}owner`:
          reply = `👤 Créateur: DEV MICHAEL SCOFIELD\n📱 221776227173`;
          break;
        case `${prefix}help`:
          reply = `❓ Tape ${prefix}menu`;
          break;
        case `${prefix}uptime`:
          const uptime = process.uptime();
          const s = Math.floor(uptime);
          const m = Math.floor(s / 60);
          const h = Math.floor(m / 60);
          const d = Math.floor(h / 24);
          reply = `⏱️ ${d}j ${h % 24}h ${m % 60}m ${s % 60}s`;
          break;
        case `${prefix}stats`:
          reply = `📊 Sessions: ${this.sessions.size}`;
          break;
        case `${prefix}version`:
          reply = `📦 Version 2.0.0`;
          break;
        case `${prefix}time`:
          reply = `🕐 ${new Date().toLocaleTimeString('fr-FR', { timeZone: 'Africa/Dakar' })}`;
          break;
        case `${prefix}donate`:
          reply = `💝 Wave: 221776227173`;
          break;
        case `${prefix}social`:
          reply = `🌐 GitHub: @michaelscofield`;
          break;
        case `${prefix}about`:
          reply = `🖤 Chat Noir-MD\nBot WhatsApp par DEV MICHAEL SCOFIELD`;
          break;
        default:
          reply = `❓ Commande inconnue. Tape ${prefix}menu`;
      }

      await sock.sendMessage(msg.key.remoteJid, { text: reply });
    });

    try {
      console.log(`📡 Demande de code pour ${number}...`);
      const code = await sock.requestPairingCode(number);
      this.sessions.set(userKey, sock);
      return code;
    } catch (err) {
      console.error(`❌ Erreur pairing:`, err.message);
      throw new Error(`Impossible de générer le code: ${err.message}`);
    }
  }
}

const whatsAppManager = new WhatsAppManager();

// =============================================
// ROUTES API
// =============================================
app.post('/api/pair', async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) {
      return res.status(400).json({ success: false, message: 'Numéro requis.' });
    }
    const cleanNumber = number.replace(/[^0-9]/g, '');
    if (cleanNumber.length < 8) {
      return res.status(400).json({ success: false, message: 'Numéro invalide.' });
    }
    const userKey = `web_${cleanNumber}`;
    const code = await whatsAppManager.pair(userKey, cleanNumber);
    if (code) {
      return res.json({ success: true, code });
    } else {
      return res.json({ success: true, message: 'Déjà appairé' });
    }
  } catch (err) {
    console.error('Erreur:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ status: whatsAppManager.sessions.size > 0 ? 'Connecté' : 'En attente' });
});

// =============================================
// LANCEMENT
// =============================================
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});