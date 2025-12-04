const wppconnect = require("@wppconnect-team/wppconnect");
const fetch = require("node-fetch");

// שליחת נתונים ל-Google Sheets
async function sendToSheets(row) {
  try {
    await fetch(process.env.SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
  } catch (err) {
    console.error("Error sending to Sheets:", err);
  }
}

// חילוץ שולח
function extractSender(message) {
  if (message.sender && message.sender.pushname) return message.sender.pushname;
  if (message.sender && message.sender.shortName) return message.sender.shortName;
  if (message.sender && message.sender.id) return message.sender.id;

  if (message.author) return message.author;
  if (message.chat && message.chat.contact && message.chat.contact.pushname)
    return message.chat.contact.pushname;
  if (message.chat && message.chat.id && message.chat.id.user)
    return message.chat.id.user;

  return "Unknown";
}

wppconnect
  .create({
    session: "monitor-session",
    headless: true,
    tokenStore: "file",
    tokenStoreDir: "./tokens",

    browserArgs: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--single-process",
      "--no-zygote",
    ],
  })
  .then((client) => start(client))
  .catch((error) => console.error("WPPConnect init error:", error));

async function start(client) {
  console.log("WhatsApp connected!");

  client.onMessage(async (message) => {
    try {
      // רק בקבוצות
      if (!message.from.endsWith("@g.us")) return;

      // רק הקבוצה שלך
      if (message.from !== process.env.TARGET_GROUP_ID) return;

      // התעלם מהודעות מערכת
      if (message.isNotification) return;

      const sender = extractSender(message);
      const text = message.body || "";

      await sendToSheets({
        timestamp: new Date().toISOString(),
        sender: sender,
        text: text,
        messageId: message.id || "",
      });

      console.log("Message exported:", sender, "→", text);
    } catch (err) {
      console.error("Message handler error:", err);
    }
  });

  client.onStateChange((state) => {
    console.log("State changed:", state);
    if (state === "CONFLICT" || state === "UNLAUNCHED" || state === "UNPAIRED") {
      client.forceRefocus();
    }
  });
}