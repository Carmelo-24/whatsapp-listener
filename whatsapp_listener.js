import puppeteer from "puppeteer";
import axios from "axios";

const n8nWebhook = "https://TUO_N8N_URL/webhook/whatsapp_in"; // cambia con il tuo

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
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

  await page.waitForSelector("canvas", { timeout: 0 });
  await page.waitForSelector("#pane-side", { timeout: 0 });
  console.log("✅ WhatsApp collegato! In ascolto di nuovi messaggi...");

  await page.exposeFunction("sendToN8N", async (sender, message) => {
    try {
      await axios.post(n8nWebhook, { sender, message });
      console.log(`📤 Inviato a n8n: ${sender} → ${message}`);
    } catch (err) {
      console.error("Errore invio a n8n:", err.message);
    }
  });

  await page.evaluate(() => {
    const chatObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node.querySelector("[data-pre-plain-text]")) {
            const meta = node.querySelector("[data-pre-plain-text]").dataset.prePlainText;
            const match = meta.match(/\[(.*?)\]\s(.*?):/);
            const sender = match ? match[2] : "Sconosciuto";
            const message = node.innerText.replace(/\[(.*?)\]\s(.*?):/, "").trim();
            // @ts-ignore
            window.sendToN8N(sender, message);
          }
        }
      }
    });
    chatObserver.observe(document.body, { childList: true, subtree: true });
  });
})();
