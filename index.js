const wppconnect = require('@wppconnect-team/wppconnect');
const axios = require('axios');

const WEBHOOK_URL = process.env.WEBHOOK_URL;

wppconnect
  .create({
    session: 'monitor-session',
    autoClose: false,              // ⬅ ביטול Auto-close
    qrTimeout: 0,                  // ⬅ QR לא יפוג
    authTimeout: 0,                // ⬅ לא מייצר timeout
    puppeteerOptions: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--single-process',
        '--no-zygote',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-breakpad',
        '--disable-default-apps',
        '--disable-features=TranslateUI',
        '--mute-audio'
      ]
    }
  })
  .then((client) => start(client))
  .catch((error) => console.error("WPPConnect init error:", error));

function start(client) {
  console.log("📡 WhatsApp monitor is running…");

  client.onMessage(async (msg) => {
    try {
      if (msg.isGroupMsg) {
        await axios.post(WEBHOOK_URL, {
          sender: msg.sender?.pushname || msg.sender?.id || "",
          message: msg.body || "",
          chatId: msg.chat.id
        });

        console.log("✔ sent to webhook:", msg.body);
      }
    } catch (err) {
      console.error("Webhook error:", err.message);
    }
  });
}