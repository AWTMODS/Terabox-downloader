require("dotenv").config();
const express = require("express");
const { bot } = require("./bot");

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL.trim().replace(/\/$/, "") : null;
const WEBHOOK_PATH = process.env.WEBHOOK_PATH ? (process.env.WEBHOOK_PATH.startsWith("/") ? process.env.WEBHOOK_PATH : `/${process.env.WEBHOOK_PATH}`) : "/webhook";

app.use(express.json());

// 1. Health check & status endpoint (Prevents sleep on Render / Koyeb / Glitch via UptimeRobot)
app.get("/", (req, res) => {
    res.status(200).json({
        status: "online",
        message: "🤖 TeraBox Downloader Bot is running without VPS!",
        mode: WEBHOOK_URL ? "webhook" : "polling",
        port: PORT,
        webhook_registered_domain: WEBHOOK_URL || "none (polling mode)",
        webhook_endpoint: WEBHOOK_PATH,
        endpoints: {
            status: "/",
            set_webhook: "/set-webhook",
            webhook_info: "/webhook-info",
            delete_webhook: "/delete-webhook"
        },
        timestamp: new Date().toISOString()
    });
});

// 2. Telegram Webhook Callback
app.use(WEBHOOK_PATH, bot.webhookCallback(WEBHOOK_PATH));

// 3. Helper endpoint: Set Webhook directly from browser or webhook trigger
app.get("/set-webhook", async (req, res) => {
    try {
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        const autoDetectedUrl = `${protocol}://${host}${WEBHOOK_PATH}`;
        const targetUrl = req.query.url || (WEBHOOK_URL ? `${WEBHOOK_URL}${WEBHOOK_PATH}` : autoDetectedUrl);

        await bot.telegram.setWebhook(targetUrl);
        const info = await bot.telegram.getWebhookInfo();

        console.log(`🔗 Webhook registered successfully with Telegram: ${targetUrl}`);
        res.status(200).json({
            success: true,
            message: `Webhook successfully configured to: ${targetUrl}`,
            webhook_info: info
        });
    } catch (err) {
        console.error("❌ Failed to set webhook:", err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 4. Helper endpoint: View Webhook status from Telegram
app.get("/webhook-info", async (req, res) => {
    try {
        const info = await bot.telegram.getWebhookInfo();
        res.status(200).json({
            success: true,
            webhook_info: info
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 5. Helper endpoint: Delete Webhook (allows switching back to polling)
app.get("/delete-webhook", async (req, res) => {
    try {
        await bot.telegram.deleteWebhook();
        res.status(200).json({
            success: true,
            message: "Telegram webhook deleted successfully. Bot can now use polling mode."
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Start server
const server = app.listen(PORT, async () => {
    console.log(`🚀 HTTP Server listening on port ${PORT}`);

    if (WEBHOOK_URL) {
        const fullWebhookUrl = `${WEBHOOK_URL}${WEBHOOK_PATH}`;
        try {
            await bot.telegram.setWebhook(fullWebhookUrl);
            console.log(`🔗 Webhook registered automatically: ${fullWebhookUrl}`);
        } catch (err) {
            console.error("⚠️ Failed to auto-register webhook with Telegram:", err.message);
            console.log(`👉 You can configure it manually by visiting: ${fullWebhookUrl}/set-webhook`);
        }
    } else {
        console.log("ℹ️ No WEBHOOK_URL specified. Launching bot in Polling mode...");
        bot.launch({
            dropPendingUpdates: true
        }).then(() => {
            console.log("🤖 Bot is polling for updates successfully!");
        }).catch((err) => {
            console.error("❌ Polling launch error:", err.message);
        });
    }
});

// Graceful stop
process.once("SIGINT", () => {
    bot.stop("SIGINT");
    server.close();
});
process.once("SIGTERM", () => {
    bot.stop("SIGTERM");
    server.close();
});

module.exports = app;
