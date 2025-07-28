// Required modules
const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');

const { upload } = require('./mega');

// Function to remove temp auth directory
function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

// Main pairing route
router.get('/', async (req, res) => {
    const id = makeid(); // Generate random folder ID
    let num = req.query.number; // Get number from query param

    // Inner pairing function
    async function GIFTED_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);

        try {
            // Choose random browser appearance
            var items = ["Safari"];
            function selectRandomItem(array) {
                return array[Math.floor(Math.random() * array.length)];
            }
            var randomItem = selectRandomItem(items);

            // Create socket
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" }))
                },
                printQRInTerminal: false,
                generateHighQualityLinkPreview: true,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                syncFullHistory: false,
                browser: Browsers.macOS(randomItem)
            });

            // Request pairing code if not registered
            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, ''); // Clean number
                const code = await sock.requestPairingCode(num); // Get pairing code
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            // Save creds on update
            sock.ev.on('creds.update', saveCreds);

            // Handle connection events
            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(5000);

                    // Read session file
                    let rf = __dirname + `/temp/${id}/creds.json`;
                    let data = fs.readFileSync(rf);

                    // Generate random string session ID
                    function generateRandomText() {
                        const prefix = "3EB";
                        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                        let randomText = prefix;
                        for (let i = prefix.length; i < 22; i++) {
                            const randomIndex = Math.floor(Math.random() * characters.length);
                            randomText += characters.charAt(randomIndex);
                        }
                        return randomText;
                    }

                    const randomText = generateRandomText();

                    try {
                        // Upload session to MEGA
                        const mega_url = await upload(fs.createReadStream(rf), `${sock.user.id}.json`);
                        const string_session = mega_url.replace('https://mega.nz/file/', '');
                        let md = "𝗛𝗜𝗥𝗨-𝗫-𝗠𝗗=" + string_session;

                        // Send string session
                        let code = await sock.sendMessage(sock.user.id, { text: md });

                        // Send disclaimer message
                        let desc = `> ශෙයා කරන්න එපා \n\n> ᴅᴏ ɴᴏᴛ ꜱʜᴇʀᴇ ᴛʜɪꜱ \n\n> இதை யாரிடமும் பகிர வேண்டாம்\n\n\n\n> ᴘᴏᴡᴇʀᴅ ʙʏ 𝗵𝗶𝗿𝘂𝗻`;

                        await sock.sendMessage(sock.user.id, {
                            text: desc,
                            contextInfo: {
                                externalAdReply: {
                                    title: "ᴄʜᴀᴍᴀ-ᴍᴅ",
                                    thumbnailUrl: "https://i.ibb.co/Gf4knTt9/4542.jpg",
                                    sourceUrl: "https://whatsapp.com/channel/0029VbAtADv0LKZFPYOW4M2f",
                                    mediaType: 1,
                                    renderLargerThumbnail: true
                                }
                            }
                        }, { quoted: code });

                    } catch (e) {
                        // Send error message
                        let ddd = sock.sendMessage(sock.user.id, { text: e.toString() });
                        let desc = `> ශෙයා කරන්න එපා \n\n> ᴅᴏ ɴᴏᴛ ꜱʜᴇʀᴇ ᴛʜɪꜱ \n\n> இதை யாரிடமும் பகிர வேண்டாம்\n\n\n\n> ᴘᴏᴡᴇʀᴅ ʙʏ 𝗵𝗶𝗿𝘂𝗻`;

                        await sock.sendMessage(sock.user.id, {
                            text: desc,
                            contextInfo: {
                                externalAdReply: {
                                    title: "ᴄʜᴀᴍᴀ-ᴍᴅ",
                                    thumbnailUrl: "https://i.ibb.co/Gf4knTt9/4542.jpg",
                                    sourceUrl: "https://whatsapp.com/channel/0029VbAtADv0LKZFPYOW4M2f",
                                    mediaType: 2,
                                    renderLargerThumbnail: true,
                                    showAdAttribution: true
                                }
                            }
                        }, { quoted: ddd });
                    }

                    // Cleanup
                    await delay(10);
                    await sock.ws.close();
                    await removeFile('./temp/' + id);
                    console.log(`👤 ${sock.user.id} Connected ✅ Restarting process...`);
                    await delay(10);
                    process.exit();

                } else if (
                    connection === "close" &&
                    lastDisconnect &&
                    lastDisconnect.error &&
                    lastDisconnect.error.output.statusCode != 401
                ) {
                    // Retry pairing if not unauthorized disconnect
                    await delay(10);
                    GIFTED_MD_PAIR_CODE();
                }
            });

        } catch (err) {
            console.log("service restated");
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "❗ Service Unavailable" });
            }
        }
    }

    return await GIFTED_MD_PAIR_CODE();
});


/*
// Optional auto restart every 30min
setInterval(() => {
    console.log("☘️ Restarting process...");
    process.exit();
}, 1800000); // 30 minutes
*/

module.exports = router;
