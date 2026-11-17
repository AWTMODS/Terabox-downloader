require("dotenv").config();
const { bot } = require("../bot");

module.exports = async (req, res) => {
    const { method, url } = req;

    // Telegram sends updates via POST
    if (method === "POST") {
        try {
            await bot.handleUpdate(req.body, res);
            if (!res.headersSent) {
                res.status(200).send("OK");
            }
        } catch (err) {
            console.error("❌ Error handling Telegram update:", err);
            if (!res.headersSent) {
                res.status(500).send("Error");
            }
        }
        return;
    }

    // Set webhook directly via browser visit: https://your-project.vercel.app/api?action=set
    if (url.includes("action=set") || url.includes("/set-webhook")) {
        try {
            const proto = req.headers["x-forwarded-proto"] || "https";
            const host = req.headers["x-forwarded-host"] || req.headers.host;
            const webhookUrl = `${proto}://${host}/api`;

            await bot.telegram.setWebhook(webhookUrl);
            const info = await bot.telegram.getWebhookInfo();

            return res.status(200).json({
                success: true,
                message: `Webhook successfully registered for Vercel: ${webhookUrl}`,
                webhook_info: info
            });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // Default GET response for health check
    res.status(200).json({
        status: "online",
        platform: "Vercel Serverless (No VPS required)",
        message: "🤖 TeraBox Downloader Bot is active!",
        how_to_set_webhook: "Visit https://<your-vercel-domain>/api?action=set in your browser",
        timestamp: new Date().toISOString()
    });
};
