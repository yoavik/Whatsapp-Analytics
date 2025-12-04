const wppconnect = require('@wppconnect-team/wppconnect');
const axios = require('axios');

const WEBHOOK_URL = "PASTE_WEBHOOK_URL_HERE";

wppconnect
  .create({
    session: 'monitor-session',
    puppeteerOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    }
  })
  .then((client) => start(client))
  .catch((error) => console.log(error));

function start(client) {
  client.onMessage(async (msg) => {
    if (msg.isGroupMsg) {
      axios.post(WEBHOOK_URL, {
        sender: msg.sender?.pushname || msg.sender?.id || "",
        message: msg.body || "",
        chatId: msg.chat.id
      }).catch(err => console.log("Webhook error:", err));
    }
  });
}