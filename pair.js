const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')

const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;
    
    async function MALVIN_XD_PAIR_CODE() {
        const {
            state,
            saveCreds
        } = await useMultiFileAuthState('./temp/' + id);
        
        try {
            var items = ["Safari"];
            function selectRandomItem(array) {
                var randomIndex = Math.floor(Math.random() * array.length);
                return array[randomIndex];
            }
            var randomItem = selectRandomItem(items);
            
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                generateHighQualityLinkPreview: true,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                syncFullHistory: false,
                browser: Browsers.macOS(randomItem),
                getMessage: async (key) => {
                    return { conversation: 'hello' }
                }
            });
            
            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }
            
            sock.ev.on('creds.update', saveCreds);
            
            sock.ev.on("connection.update", async (s) => {
                const {
                    connection,
                    lastDisconnect
                } = s;
                
                if (connection == "open") {
                    console.log("Connection opened, waiting for stabilization...");
                    
                    // Connection stabilize වෙන්න වැඩි time එකක් දෙන්න
                    await delay(10000);
                    
                    try {
                        // Check if socket is still connected
                        if (!sock.user) {
                            throw new Error("Socket user not available");
                        }
                        
                        let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                        let rf = __dirname + `/temp/${id}/creds.json`;
                        
                        // Upload to mega
                        const mega_url = await upload(fs.createReadStream(rf), `${sock.user.id}.json`);
                        const string_session = mega_url.replace('https://mega.nz/file/', '');
                        let md = "GODZILA~" + string_session;
                        
                        console.log("Sending session message...");
                        
                        // Session ID message send කරන්න retry logic එකක් සමග
                        let code;
                        let retries = 3;
                        while (retries > 0) {
                            try {
                                code = await sock.sendMessage(sock.user.id, { 
                                    text: md 
                                });
                                console.log("Session message sent successfully");
                                break;
                            } catch (sendError) {
                                retries--;
                                console.log(`Failed to send session message, retries left: ${retries}`);
                                if (retries > 0) {
                                    await delay(3000);
                                } else {
                                    throw sendError;
                                }
                            }
                        }
                        
                        // Welcome message
                        let desc = `
╭─▢〘 🐉 *GODZILLA MD SESSION CREATED!* 〙▢─╮
│ 👋🏻 *Hey there, GODZILLA MD User!*
│ 
│ ⚙️ Your session has been successfully created!  
│ 🔐 *Session ID:* Sent above  
│ ⚠️ *Keep it safe!* Never share it with anyone.  
│ 
│ 🌐 *Stay Updated:*  
│ ✦ Join our official WhatsApp Channel  
│   → https://whatsapp.com/channel/0029Vb6BQQmFnSz7bmxefu40  
│ 
│ 💻 *Source Code:*  
│ ✦ Explore & Fork on GitHub  
│   → https://github.com/Nimeshkamihiran/GODZILLA-MD.git  
│ 
╰───────────────────────────▢╯
> © Powered by *Nimeshka Mihiran* 🧙
> Stay powerful – unleash the monster within. 🐲🔥
`;
                        
                        // Welcome message send කරන්න retry logic එකක් සමග
                        retries = 3;
                        while (retries > 0) {
                            try {
                                await sock.sendMessage(sock.user.id, {
                                    text: desc,
                                    contextInfo: {
                                        externalAdReply: {
                                            title: "ɢᴏᴅᴢɪʟʟᴀ",
                                            thumbnailUrl: "https://files.catbox.moe/fk0uuz.jpg",
                                            sourceUrl: "https://whatsapp.com/channel/0029Vb6BQQmFnSz7bmxefu40",
                                            mediaType: 1,
                                            renderLargerThumbnail: true
                                        }  
                                    }
                                }, { quoted: code });
                                console.log("Welcome message sent successfully");
                                break;
                            } catch (sendError) {
                                retries--;
                                console.log(`Failed to send welcome message, retries left: ${retries}`);
                                if (retries > 0) {
                                    await delay(3000);
                                } else {
                                    // Welcome message fail වුනත් session එක send වෙලා තියෙනවා නම් OK
                                    console.log("Welcome message failed but session was sent");
                                }
                            }
                        }
                        
                    } catch (e) {
                        console.error("Error during message sending:", e);
                        
                        // Error වුනත් session එක send කරන්න try කරන්න
                        try {
                            let errorMsg = `⚠️ Session created but encountered an error. Please check your session ID above.`;
                            await sock.sendMessage(sock.user.id, { text: errorMsg });
                        } catch (finalError) {
                            console.error("Failed to send error message:", finalError);
                        }
                    }
                    
                    // Cleanup and exit
                    await delay(2000);
                    console.log(`💤 ${sock.user.id} 𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗲𝗱 ✅ 𝗥𝗲𝘀𝘁𝗮𝗿𝘁𝗶𝗻𝗴 𝗽𝗿𝗼𝗰𝗲𝘀𝘀...`);
                    
                    try {
                        await sock.ws.close();
                    } catch (closeError) {
                        console.log("Socket already closed");
                    }
                    
                    await removeFile('./temp/' + id);
                    await delay(1000);
                    process.exit(0);
                    
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    console.log("Connection closed, retrying...");
                    await delay(3000);
                    MALVIN_XD_PAIR_CODE();
                }
            });
            
        } catch (err) {
            console.error("Service error:", err);
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "● Service Unavailable" });
            }
        }
    }
    
    return await MALVIN_XD_PAIR_CODE();
});

module.exports = router;
