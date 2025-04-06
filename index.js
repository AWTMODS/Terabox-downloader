require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");
const { MongoClient } = require("mongodb");
const https = require("https");

const bot = new Telegraf(process.env.BOT_TOKEN);
const BASE_URL = "https://alphaapis.org/terabox/v3/dl?url=";
const CHANNEL_USERNAME = "@awt_bots";
const MONGO_URI = process.env.MONGO_URI;

// HTTP agent for better performance
const agent = new https.Agent({ keepAlive: true, maxSockets: 10 });

const client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
let usersCollection;

(async () => {
    await client.connect();
    usersCollection = client.db("telegramBot").collection("users");
    console.log("📂 Connected to MongoDB");
})();

async function isUserMember(userId) {
    try {
        const chatMember = await bot.telegram.getChatMember(CHANNEL_USERNAME, userId);
        return ["member", "administrator", "creator"].includes(chatMember.status);
    } catch (error) {
        console.error("Error checking membership:", error.message);
        return false;
    }
}

async function saveUser(userId) {
    await usersCollection.updateOne({ userId }, { $set: { userId } }, { upsert: true });
}

bot.start((ctx) => {
    ctx.reply("Send me a TeraBox link (e.g. https://1024terabox.com/s/xxxxxx), and I'll download it for you!");
});

bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId))) {
        return ctx.reply(`❌ You must join ${CHANNEL_USERNAME} to use this bot.`);
    }

    await saveUser(userId);

    const text = ctx.message.text.trim();
    const validLink = text.match(/^https:\/\/1024terabox\.com\/s\/[a-zA-Z0-9_-]+$/);

    if (!validLink) {
        return ctx.reply("❌ Invalid TeraBox link. Please send a full valid URL like https://1024terabox.com/s/xxxx");
    }

    console.log("TeraBox URL:", text);
    const processingMsg = await ctx.reply("⏳ Fetching video link...");

    try {
        const response = await axios.get(`${BASE_URL}${encodeURIComponent(text)}`, { httpsAgent: agent });
        console.log("API Response:", response.data);

        if (!response.data || response.data.success !== true) {
            return ctx.reply("❌ Failed to fetch video. Please check the link.");
        }

        const downloadUrl = response.data.data.downloadLink;
        const fileSize = parseInt(response.data.data.size, 10) || 0;

        if (!downloadUrl) {
            return ctx.reply("❌ No download link found.");
        }

        if (fileSize > 50000000) {
            return ctx.reply(`🚨 Video is too large for Telegram! Download manually: ${downloadUrl}`);
        }

        await ctx.reply("✅ Video found! 🔄 Downloading...");

        const videoStream = await axios({
            method: "GET",
            url: downloadUrl,
            responseType: "stream",
        });

        await ctx.replyWithVideo(
            { source: videoStream.data },
            { disable_notification: true }
        );

        await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    } catch (error) {
        console.error("Error fetching Terabox video:", error.message);
        ctx.reply("❌ Something went wrong. Try again later.");
    }
});

bot.launch();
console.log("🚀 TeraBox Video Bot is running...");
