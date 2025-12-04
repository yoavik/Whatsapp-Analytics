// index.js — גרסת CommonJS מלאה ויציבה ל-Render

const wppconnect = require("@wppconnect-team/wppconnect");

// שליחת נתונים ל-Google Sheets
async function sendToSheets(row) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) {
    console.error("❌ SHEETS_WEBHOOK_URL is not set");
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      console.error("❌ Sheets error:", res.status, await res.text());
    }
  } catch (err) {
    console.error("❌ Error sending to Sheets:", err);
  }
}

// חילוץ שם שולח בצורה סלחנית
function extractSender(message) {
  if (message.sender?.pushname) return message.sender.pushname;
  if (message.sender?.shortName) return message.sender.shortName;
  if (message.sender?.id) return message.sender.id;
  if (message.author) return message.author;

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
  .then(start)
  .catch((error) => console.error("❌ WPPConnect init error:", error));

function start(client) {
  console.log("✅ WhatsApp connected!");

  let targetGroup = process.env.TARGET_GROUP_ID;

  if (!targetGroup) {
    console.log("⚠️ TARGET_GROUP_ID not set — detecting automatically…");
  }

  // ========== קבלת הודעות ==========
  client.onMessage(async (message) => {
    try {
      // רק הודעות מקבוצות
      if (!message.from.endsWith("@g.us")) return;

      // אם עדיין אין TARGET_GROUP_ID – זיהוי אוטומטי
      if (!targetGroup) {
        console.log("\n🎯 DETECTED GROUP ID:", message.from);
        console.log("👉 העתק את זה ל־TARGET_GROUP_ID ב־Render:");
        console.log(message.from, "\n");

        targetGroup = message.from;
      }

      // רק הקבוצה הספציפית
      if (message.from !== targetGroup) return;

      // התעלמות מהודעות מערכת
      if (message.isNotification) return;

      const sender = extractSender(message);
      const text = message.body || "";
      const messageId = message.id || "";

      console.log("📨 Message:", { sender, text });

      await sendToSheets({
        timestamp: new Date().toISOString(),
        groupId: targetGroup,
        sender,
        text,
        messageId,
      });

      console.log("✅ Exported to Sheets");
    } catch (err) {
      console.error("❌ Message handler error:", err);
    }
  });

  // ========== ניטור מצבים ==========
  client.onStateChange((state) => {
    console.log("📡 State changed:", state);
    if (["CONFLICT", "UNLAUNCHED", "UNPAIRED"].includes(state)) {
      console.log("🔄 Forcing refocus…");
      client.forceRefocus();
    }
  });
}