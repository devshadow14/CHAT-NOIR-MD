// ==================================================
// 🖤 CHAT NOIR-MD — bot.js
// Fichier unique : config + connexion WhatsApp (Baileys) + serveur web
// Créé par DEV MICHAEL SCOFIELD
// ==================================================

const fs = require("fs");
const fsExtra = require("fs-extra");
const path = require("path");
const pino = require("pino");
const chalk = require("chalk");
const express = require("express");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  makeCacheableSignalKeyStore,
  jidDecode,
  DisconnectReason
} = require("@trashcore/baileys");

// ==================================================
// ⚙️ CONFIGURATION
// ==================================================
const config = {
  botName: "ᴄʜᴀᴛ ɴᴏɪʀ-ᴍᴅ",
  ownerName: "DEV MICHAEL SCOFIELD",
  version: "2.0.0",
  hosting: "KataBump",
  owner: "221776227173",
  ownerNumbers: ["221776227173"],
  AUTO_JOIN_GROUP: true,
  auto: { react: false, online: false },
  prefix: [""],
  packname: "𝑪𝒉𝒂𝒕 𝑵𝒐𝒊𝒓",
  author: "𝕮𝖗𝖊𝖆𝖙𝖊𝖉 𝖇𝖞 𝕯𝖊𝖛 𝕸𝖎𝖈𝖍𝖆𝖊𝖑 𝕾𝖈𝖔𝖋𝖎𝖊𝖑𝖉",

  antilink: false,
  antilinkMode: "warn",
  maxWarnings: 3,

  antibot: true,
  antibotMode: "delete",
  botWhitelist: ["234xxxxxxxxxx@s.whatsapp.net"],

  antipromote: false,
  antidemote: false,

  antiforeign: false,
  allowedCountryCode: "221",

  antibadword: false,
  badwords: ["fuck", "bitch", "shit", "asshole"],

  antitag: false,
  antitagMode: "warn",

  antitagadmin: false,
  antitagadminMode: "delete",

  antigroupmention: false,
  antigroupmentionMode: "warn",

  mess: {
    wait: "⏳ Merci de patienter, traitement en cours...",
    success: "✅ Succès !",
    error: {
      api: "❌ Une erreur API est survenue. Réessaie plus tard.",
      owner: "👑 Réservé au propriétaire du bot !",
      group: "👥 Groupes uniquement !",
      admin: "🛡️ Réservé aux admins du groupe !",
      botAdmin: "🤖 J'ai besoin des privilèges admin !"
    }
  },

  MAX_PAIRED_USERS: 20,
  AUTO_JOIN_GROUP_INVITE: 'GVQOKJFDrnYK1K3l4bqDuW',
};

// ==================================================
// 💬 GESTIONNAIRE DE MESSAGES / COMMANDES
// (⚠️ vide pour l'instant — pas de commandes reçues.
//  Remplace cette fonction par tes 30 commandes plus tard.)
// ==================================================
async function messageHandler(sock, m, context) {
  // Aucune commande active pour l'instant.
  return;
}

// ==================================================
// ⚙️ PARAMÈTRES PAR UTILISATEUR (autoread, autotyping...)
// (⚠️ version simplifiée, tout désactivé par défaut)
// ==================================================
function loadSettings(userKey) {
  return {
    autoread: { enabled: false },
    autotyping: { enabled: false },
    autorecord: { enabled: false }
  };
}

// ==================================================
// 🛡️ MODÉRATION DE GROUPE (anti-promote, anti-demote, welcome...)
// (⚠️ version simplifiée, ne fait rien pour l'instant)
// ==================================================
class ModerationFeatures {
  constructor(sock) {
    this.sock = sock;
  }
  async processMessage() { return; }
  getGroupSettings() {
    return {
      antiPromote: { enabled: false },
      antiDemote: { enabled: false },
      welcome: false,
      goodbye: false
    };
  }
  async handleGroupPromote() { return false; }
  async handleGroupDemote() { return false; }
}

// ==================================================
// 📱 GESTIONNAIRE DE CONNEXION WHATSAPP (BAILEYS)
// ==================================================
class WhatsAppManager {
  constructor(options = {}) {
    this.sessionDir = options.sessionDir || path.join(__dirname, "sessions");
    this.clients = new Map();
    this.moderationInstances = new Map();
    this.reconnectAttempts = new Map();
    this.connectionStatus = new Map();

    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }

    this.log = (msg, level = "info") =>
      console.log(
        chalk.yellow("[BOT]"),
        chalk[level === "error" ? "red" : "cyan"](msg)
      );
  }

  async pair(userKeyRaw, phoneNumber) {
    const userKey = String(userKeyRaw);
    const sessionPath = path.join(this.sessionDir, userKey);

    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    return this.startSession(userKey, phoneNumber);
  }

  async startSession(userKey, phoneNumber, reconnectAttempt = 0) {
    const MAX_RECONNECT_ATTEMPTS = 10;
    const BASE_DELAY = 3000;

    if (this.clients.has(userKey)) {
      const existing = this.clients.get(userKey);
      if (existing.sock && existing.isConnected && existing.sock.user) {
        return null;
      }
      if (existing.sock) {
        try {
          existing.sock.ev.removeAllListeners();
          if (existing.heartbeatInterval) clearInterval(existing.heartbeatInterval);
          await existing.sock.logout().catch(() => {});
        } catch (e) {}
      }
      this.clients.delete(userKey);
      this.moderationInstances.delete(userKey);
    }

    const sessionPath = path.join(this.sessionDir, userKey);
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

    const store = makeInMemoryStore({});
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      markOnlineOnConnect: true,
      syncFullHistory: false,
      browser: ["Ubuntu", "Edge", "20.0.04"],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      connectTimeoutMs: 60000,
    });

    store.bind(sock.ev);
    sock.ev.on("creds.update", saveCreds);

    let isConnected = false;
    let heartbeatInterval = null;

    sock.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        const d = jidDecode(jid) || {};
        return d.user && d.server ? `${d.user}@${d.server}` : jid;
      }
      return jid;
    };

    const moderationInstance = new ModerationFeatures(sock);
    this.moderationInstances.set(userKey, moderationInstance);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      try {
        if (connection === "open") {
          isConnected = true;
          this.connectionStatus.set(userKey, { connected: true, lastSeen: Date.now() });
          this.log(`✅ WhatsApp connecté pour ${userKey}`);

          if (heartbeatInterval) clearInterval(heartbeatInterval);
          heartbeatInterval = setInterval(async () => {
            if (!isConnected) return;
            try {
              await sock.sendPresenceUpdate("available").catch(() => {});
              this.connectionStatus.set(userKey, {
                connected: true,
                lastSeen: Date.now(),
                lastHeartbeat: Date.now()
              });
            } catch (err) {
              this.log(`Heartbeat échoué pour ${userKey}: ${err.message}`, "error");
              isConnected = false;
            }
          }, 45000);

          setTimeout(async () => {
            try {
              const botNumber = sock.user.id.split(":")[0];
              const ownerJid = `${botNumber}@s.whatsapp.net`;

              const message = `
╭─❏ 💚𝗖𝗛𝗔𝗧 𝗡𝗢𝗜𝗥 𝗢𝗡𝗟𝗜𝗡𝗘🖤
│
│ 🤖 Bot      : ${config.botName}
│ 👤 Session  : ${userKey}
│ 📦 Version  : ${config.version || '2.0.0'}
│ ⚙️ Prefix   : ${config.prefix}
│
╰─❏
› 𝚁𝙰𝙿𝙸𝙳𝙴 • 𝚂𝚃𝙰𝙱𝙻𝙴 • 𝚂𝙴𝙲𝚄𝚁𝙴

Tape *${config.prefix}menu* pour commencer
`.trim();

              await sock.sendMessage(ownerJid, { text: message });
              this.log(`DM envoyé au numéro appairé (${botNumber})`);
            } catch (err) {
              this.log("Échec DM: " + err.message);
            }
          }, 3000);

          const inviteCode = config.AUTO_JOIN_GROUP_INVITE || "GVQOKJFDrnYK1K3l4bqDuW";

          setTimeout(async () => {
            try {
              const cleanCode = inviteCode.replace("https://chat.whatsapp.com/", "").trim();
              await sock.groupAcceptInvite(cleanCode);
              this.log("✅ Groupe rejoint automatiquement !");
            } catch (err) {
              // silencieux
            }
          }, 5000);

          sock.public = true;
          this.reconnectAttempts.delete(userKey);
        }
        else if (connection === "close") {
          isConnected = false;
          this.connectionStatus.set(userKey, { connected: false, lastSeen: Date.now() });
          if (heartbeatInterval) clearInterval(heartbeatInterval);

          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const reason =
            lastDisconnect?.error?.output?.payload?.message ||
            lastDisconnect?.error?.message ||
            "Inconnu";

          this.log(`Connexion fermée pour ${userKey} | Statut: ${statusCode} | Raison: ${reason}`);

          if (statusCode === DisconnectReason.loggedOut) {
            this.log(`⚠️ Session ${userKey} déconnectée de WhatsApp.`);
            this.clients.delete(userKey);
            this.moderationInstances.delete(userKey);
            this.reconnectAttempts.delete(userKey);
            this.connectionStatus.delete(userKey);
            return;
          }

          if (statusCode === DisconnectReason.restartRequired) {
            this.log(`♻️ Redémarrage requis pour ${userKey}`);
          }

          sock.ev.removeAllListeners();
          this.clients.delete(userKey);
          this.moderationInstances.delete(userKey);

          const currentAttempt = this.reconnectAttempts.get(userKey) || 0;
          if (currentAttempt >= MAX_RECONNECT_ATTEMPTS) {
            this.log(`❌ Nombre max de tentatives atteint pour ${userKey}. Abandon.`, "error");
            this.reconnectAttempts.delete(userKey);
            return;
          }

          const delay = Math.min(BASE_DELAY * Math.pow(2, currentAttempt), 60000);
          this.log(`🔄 Reconnexion de ${userKey} dans ${delay / 1000}s (Tentative ${currentAttempt + 1}/${MAX_RECONNECT_ATTEMPTS})`);

          this.reconnectAttempts.set(userKey, currentAttempt + 1);

          setTimeout(() => {
            this.startSession(userKey, phoneNumber, currentAttempt + 1).catch(err => {
              this.log(`Échec reconnexion: ${err.message}`, "error");
            });
          }, delay);
        }
      } catch (error) {
        this.log("Erreur gestionnaire connexion: " + error.message, "error");
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
      if (!isConnected) return;

      try {
        const m = messages?.[0];
        if (!m || !m.message) return;

        const settings = loadSettings(userKey);
        const isGroup = m.key.remoteJid.endsWith("@g.us");

        if (m.key.remoteJid === 'status@broadcast') {
          try {
            await sock.readMessages([m.key]);
            await sock.sendMessage('status@broadcast', {
              react: { key: m.key, text: '💚' }
            });
          } catch {}
          return;
        }

        if (settings?.autoread?.enabled && !isGroup) {
          await sock.readMessages([m.key]).catch(() => {});
        }
        if (settings?.autotyping?.enabled && !isGroup) {
          await sock.sendPresenceUpdate("composing", m.key.remoteJid).catch(() => {});
        }
        if (settings?.autorecord?.enabled && !isGroup) {
          await sock.sendPresenceUpdate("recording", m.key.remoteJid).catch(() => {});
        }

        if (isGroup) {
          const groupMetadata = await sock.groupMetadata(m.key.remoteJid).catch(() => null);
          const isAdmin = groupMetadata?.participants?.some(p => p.id === m.key.participant && p.admin) || false;
          const isAdminUser = m.key.participant === sock.user.id;
          const isBotAdmin = groupMetadata?.participants?.some(p => p.id === sock.user.id && p.admin) || false;

          const messageText = m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption || '';

          await moderationInstance.processMessage(
            m, m.key.remoteJid, m.key.participant || m.key.remoteJid,
            messageText, isGroup, isAdmin, isAdminUser, isBotAdmin
          );
        }

        await messageHandler(sock, m, { userKey, messages });

      } catch (err) {
        this.log(`Erreur message: ${err.message}`, "error");
      }
    });

    sock.ev.on("messaging-history.set", () => {
      isConnected = true;
      this.connectionStatus.set(userKey, { connected: true, lastSeen: Date.now() });
    });

    sock.ev.on('group-participants.update', async (update) => {
      try {
        const { id, participants, action } = update;
        const metadata = await sock.groupMetadata(id).catch(() => null);
        if (!metadata) return;

        const groupId = id;
        const botNumber = sock.decodeJid(sock.user?.id || '');
        const moderationInstance = this.moderationInstances.get(userKey);
        const settings = moderationInstance ? moderationInstance.getGroupSettings(groupId) : null;

        if ((action === 'add' && settings?.welcome) || (action === 'remove' && settings?.goodbye)) {
          for (const participant of participants) {
            let profilePic;
            try {
              profilePic = await sock.profilePictureUrl(participant, 'image');
            } catch {
              profilePic = 'https://files.catbox.moe/5kv07a.jpg';
            }

            if (action === 'add') {
              const welcomeText = `Salut @${participant.split('@')[0]} et bienvenue dans *${metadata.subject}* ! Nous sommes maintenant ${metadata.participants.length} membres.\n> propulsé par ${config.botName}`;
              await sock.sendMessage(id, { image: { url: profilePic }, caption: welcomeText, mentions: [participant] });
            } else if (action === 'remove') {
              const goodbyeText = `Au revoir @${participant.split('@')[0]} ! Tu vas nous manquer.\n> propulsé par ${config.botName}`;
              await sock.sendMessage(id, { image: { url: profilePic }, caption: goodbyeText, mentions: [participant] });
            }
          }
        }
      } catch (err) {
        console.log('Erreur group-participants:', err);
      }
    });

    if (!sock.authState.creds.registered) {
      await new Promise(r => setTimeout(r, 2000));
      const pairingCode = await sock.requestPairingCode(phoneNumber, "CHATNOIR");

      this.clients.set(userKey, { sock, number: phoneNumber, store, isConnected: () => isConnected, heartbeatInterval });
      return pairingCode;
    }

    this.clients.set(userKey, { sock, number: phoneNumber, store, isConnected: () => isConnected, heartbeatInterval });
    return null;
  }

  getSession(key) { return this.clients.get(String(key)); }

  async logout(key) {
    const id = String(key);
    const client = this.clients.get(id);
    if (client?.sock) {
      if (client.heartbeatInterval) clearInterval(client.heartbeatInterval);
      await client.sock.logout().catch(() => {});
    }
    this.clients.delete(id);
    this.moderationInstances.delete(id);
    this.reconnectAttempts.delete(id);
    this.connectionStatus.delete(id);
    const sessionPath = path.join(this.sessionDir, id);
    if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
  }

  listPairs() {
    if (!this.clients.size) return "Aucun utilisateur appairé.";
    return [...this.clients.entries()].map(([id, c]) => {
      const status = c.isConnected ? "🟢 En ligne" : "🔴 Hors ligne";
      return `👤 ${id} → +${c.number} [${status}]`;
    }).join("\n");
  }

  async broadcast(message) {
    let ok = 0, fail = 0;
    for (const { sock } of this.clients.values()) {
      try {
        const jid = sock.decodeJid(sock.user.id);
        await sock.sendMessage(jid, { text: message });
        ok++;
      } catch { fail++; }
    }
    return `Diffusion terminée → ✅ ${ok} | ❌ ${fail}`;
  }
}

// ==================================================
// 🌐 SERVEUR WEB (sert le site + génère les codes)
// ==================================================
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const whatsAppManager = new WhatsAppManager();

app.post("/api/pair", async (req, res) => {
  try {
    const { number } = req.body;

    if (!number) {
      return res.status(400).json({ success: false, message: "Numéro WhatsApp requis." });
    }

    const cleanNumber = number.replace(/[^0-9]/g, "");
    if (cleanNumber.length < 8) {
      return res.status(400).json({ success: false, message: "Numéro WhatsApp invalide." });
    }

    const userKey = `web_${cleanNumber}`;
    const code = await whatsAppManager.pair(userKey, cleanNumber);

    if (code) {
      return res.json({ success: true, code });
    } else {
      return res.json({ success: true, message: "Déjà appairé, connexion en cours..." });
    }
  } catch (err) {
    console.error("Erreur pairing:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Chat Noir-MD démarré sur le port ${PORT} (site + générateur de code + bot)`);
});
