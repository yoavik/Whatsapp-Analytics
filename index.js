// index.js – גרסת CommonJS יציבה ל-Render

const wppconnect = require("@wppconnect-team/wppconnect");

// שליחת נתונים ל-Google Sheets דרך fetch המובנה של Node 18
async function sendToSheets(row) {
  try {
    const url = process.env.SHEETS_WEBHOOK_URL;
    if (!url) {
      console.error("SHEETS_WEBHOOK_URL is not set");
      return;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      console.error("Sheets webhook HTTP error:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Error sending to Sheets:", err);
  }
}

// חילוץ שם/ID שולח בצורה סלחנית
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
    tokenStoreDir: "./tokens", // ממופה לדיסק ב-/app/tokens
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

function start(client) {
  console.log("WhatsApp connected!");

  client.onMessage(async (message) => {
    try {
      // רק הודעות מקבוצות
      if (!message.from.endsWith("@g.us")) return;

      // רק הקבוצה שלך
      if (message.from !== process.env.TARGET_GROUP_ID) return;

      // התעלם מהודעות מערכת
      if (message.isNotification) return;

      const sender = extractSender(message);
      const text = message.body || "";

      await sendToSheets({
        timestamp: new Date().toISOString(),
        sender,
        text,
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