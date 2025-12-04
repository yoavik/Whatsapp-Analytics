// =======================
// Whatsapp Monitoring Bot
// Render + WPPConnect
// =======================

const fs = require('fs');
const path = require('path');
const wppconnect = require('@wppconnect-team/wppconnect');
const axios = require('axios');

// ========== CONFIG ==========
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const SESSION_DIR = '/app/tokens/monitor-session';
const CHROME_PROFILE = path.join(SESSION_DIR, 'Default');

// =====================================
// 1. CLEAN SINGLETON LOCK FILES
// (prevents Chrome error 21 / locked profile)
// =====================================
function cleanupLocks() {
  const lockFiles = [
    'SingletonLock',
    'SingletonCookie',
    'SingletonSocket',
    'SSLError Log',
    'Lockfile'
  ];

  lockFiles.forEach((file) => {
    const fullPath = path.join(CHROME_PROFILE, file);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log("[CLEANUP] Removed lock:", file);
      }
    } catch (err) {
      console.log("[CLEANUP] Failed to remove:", file);
    }
  });
}

// Ensure directory exists
try {
  fs.mkdirSync(CHROME_PROFILE, { recursive: true });
} catch {}

cleanupLocks();

// =====================================
// 2. START WPPCONNECT CLIENT
// =====================================
wppconnect
  .create({
    session: 'monitor-session',
    folderNameToken: '/app/tokens',
    deviceName: 'Render Whatsapp Worker',
    autoClose: false,                   // keep browser alive
    authTimeout: 0,                     // no auth timeout
    qrTimeout: 0,                       // QR never expires
    puppeteerOptions: {
      headless: true,
      userDataDir: SESSION_DIR,         // persistent session
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-breakpad',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--disable-features=TranslateUI',
        '--single-process',
        '--no-zygote',
        '--ignore-certificate-errors',
        '--mute-audio'
      ]
    }
  })

  .then((client) => start(client))
  .catch((error) => console.error("WPPConnect init error:", error));


// =====================================
// 3. HANDLE INCOMING WHATSAPP MESSAGES
// =====================================
function start(client) {
  console.log("📡 Whatsapp worker started.");

  client.onMessage(async (msg) => {
    try {
      if (!msg.isGroupMsg) return; // only track group messages

      await axios.post(WEBHOOK_URL, {
        sender: msg.sender?.pushname || msg.sender?.id || "",
        message: msg.body || "",
        chatId: msg.chat.id,
        timestamp: Date.now()
      });

      console.log("✔ Sent to webhook:", msg.body);

    } catch (err) {
      console.error("Webhook Error:", err.message);
    }
  });
}