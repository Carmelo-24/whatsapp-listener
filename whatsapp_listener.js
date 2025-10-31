import puppeteer from "puppeteer";
import axios from "axios";

const n8nWebhook = "https://TUO_N8N_URL/webhook/whatsapp_in"; // 👈 cambia questo dopo

(async () => {
  const browser = await puppeteer.launch({
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer"
  ],
});


  const page = await browser.newPage();
  await page.goto("https://web.whatsapp.com");

  console.log("📲 Scansiona il QR code con il tuo WhatsApp iPhone per collegarlo...");

  // Aspetta che WhatsApp sia caricato
  await page.waitForSelector("canvas", { timeout: 0 });
  await page.waitForSelector("#pane-side", { timeout: 0 });

  console.log("✅ WhatsApp collegato! In ascolto di nuovi messaggi...");

  // Espone funzione per inviare a n8n
  await page.exposeFunction("sendToN8N", async (sender, message) => {
    try {
      await axios.post(n8nWebhook, { sender, message });
      console.log(`📤 Inviato a n8n: ${sender} → ${message}`);
    } catch (err) {
      console.error("Errore invio a n8n:", err.message);
    }
  });

  // Osserva nuovi messaggi nella chat
  await page.evaluate(async () => {
    const chatObserver = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node.querySelector("[data-pre-plain-text]")) {
            const meta = node.querySelector("[data-pre-plain-text]").dataset.prePlainText;
            const match = meta.match(/\[(.*?)\]\s(.*?):/);
            const sender = match ? match[2] : "Sconosciuto";
            const message = node.innerText.replace(/\[(.*?)\]\s(.*?):/, "").trim();
            await window.sendToN8N(sender, message);
          }
        }
      }
    });
    chatObserver.observe(document.body, { childList: true, subtree: true });
  });
})();
