import { create } from "@wppconnect-team/wppconnect";
import fetch from "node-fetch";

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

// נורמליזציה של שם שולח
function extractSender(message) {
  // לפעמים יש sender תקין:
  if (message.sender?.pushname) return message.sender.pushname;
  if (message.sender?.shortName) return message.sender.shortName;
  if (message.sender?.id) return message.sender.id;

  // לפעמים המידע נמצא במקום אחר:
  if (message.author) return message.author;
  if (message.chat?.contact?.pushname) return message.chat.contact.pushname;
  if (message.chat?.id?.user) return message.chat.id.user;

  // במקרים נדירים — כלום:
  return "Unknown";
}

create({
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
      // סינון — רק הודעות בקבוצה
      if (!message.from.endsWith("@g.us")) return;

      // סינון — רק הקבוצה שלך
      if (message.from !== process.env.TARGET_GROUP_ID) return;

      // סינון — הודעות מערכת לא רלוונטיות
      if (message.isNotification) return;

      // חילוץ שולח
      const sender = extractSender(message);

      // טקסט — גם אם אין body
      const text = message.body || "";

      const row = {
        timestamp: new Date().toISOString(),
        sender: sender,
        text: text,
        messageId: message.id || "",
      };

      await sendToSheets(row);

      console.log("Message exported:", sender, "→", text);
    } catch (err) {
      console.error("Message handler error:", err);
    }
  });

  // טיפול בניתוק
  client.onStateChange((state) => {
    console.log("State changed:", state);
    if (state === "CONFLICT" || state === "UNLAUNCHED" || state === "UNPAIRED") {
      client.forceRefocus();
    }
  });
}