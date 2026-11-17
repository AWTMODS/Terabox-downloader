require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");
const { MongoClient } = require("mongodb");
const https = require("https");

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error("⚠️ WARNING: BOT_TOKEN is not defined in environment variables!");
}

const bot = new Telegraf(BOT_TOKEN || "");
const BASE_URL = process.env.TERABOX_API_URL || "https://alphaapis.org/terabox/v3/dl?url=";
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || "";
const MONGO_URI = process.env.MONGO_URI;

// HTTP agent for keep-alive connections
const agent = new https.Agent({ keepAlive: true, maxSockets: 10 });

let client = null;
let usersCollection = null;

async function getCollection() {
    if (!MONGO_URI) return null;
    if (usersCollection) return usersCollection;
    try {
        if (!client) {
            client = new MongoClient(MONGO_URI);
        }
        await client.connect();
        usersCollection = client.db("telegramBot").collection("users");
        console.log("📂 Connected to MongoDB");
        return usersCollection;
    } catch (error) {
        console.error("⚠️ MongoDB connection error:", error.message);
        return null;
    }
}

// Attempt non-blocking connection on start if MONGO_URI is set
if (MONGO_URI) {
    getCollection().catch(() => {});
}

async function isUserMember(userId) {
    if (!CHANNEL_USERNAME || CHANNEL_USERNAME.trim() === "") {
        return true;
    }
    try {
        const chatMember = await bot.telegram.getChatMember(CHANNEL_USERNAME, userId);
        return ["member", "administrator", "creator"].includes(chatMember.status);
    } catch (error) {
        console.error("⚠️ Error checking membership:", error.message);
        // If bot is not admin in the channel or check fails, do not block the user
        return true;
    }
}

async function saveUser(userId) {
    try {
        const col = await getCollection();
        if (col) {
            await col.updateOne(
                { userId },
                { $set: { userId, updatedAt: new Date() } },
                { upsert: true }
            );
        }
    } catch (error) {
        console.error("⚠️ Error saving user:", error.message);
    }
}

bot.start((ctx) => {
    ctx.reply(
        "👋 Welcome! Send me any TeraBox link (e.g. https://1024terabox.com/s/xxxxxx or terabox.com/s/xxxxxx), and I'll download it for you!"
    );
});

bot.help((ctx) => {
    ctx.reply(
        "ℹ️ Just paste a valid TeraBox link in this chat and I'll fetch and send your video.\n\n" +
        "Supported link formats include 1024terabox.com, terabox.com, teraboxapp.com, etc."
    );
});

bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId))) {
        return ctx.reply(`❌ You must join ${CHANNEL_USERNAME} to use this bot.`);
    }

    await saveUser(userId);

    const text = ctx.message.text.trim();
    // Match common Terabox domains and patterns
    const teraboxRegex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:terabox|1024terabox|teraboxapp|teraboxlink|mirrobox|nephobox|freeterabox|4funbox)\.com\/[^\s]+/i;
    const match = text.match(teraboxRegex);

    if (!match) {
        return ctx.reply(
            "❌ Invalid TeraBox link. Please send a valid link like:\nhttps://1024terabox.com/s/xxxx or https://teraboxapp.com/s/xxxx"
        );
    }

    const teraboxUrl = match[0];
    console.log("🔗 TeraBox URL received:", teraboxUrl);
    const processingMsg = await ctx.reply("⏳ Fetching video link...");

    try {
        const apiUrl = `${BASE_URL}${encodeURIComponent(teraboxUrl)}`;
        const response = await axios.get(apiUrl, { httpsAgent: agent, timeout: 30000 });
        console.log("API Response:", response.data);

        if (!response.data || response.data.success !== true) {
            const errorReason = response.data?.message || "Please check the link and try again.";
            return ctx.reply(`❌ Failed to fetch video. ${errorReason}`);
        }

        const downloadData = response.data.data;
        const downloadUrl = downloadData?.downloadLink || downloadData?.dlink || downloadData?.url;
        const fileSize = parseInt(downloadData?.size || 0, 10);
        const fileName = downloadData?.fileName || downloadData?.title || "video.mp4";

        if (!downloadUrl) {
            return ctx.reply("❌ No download link found from provider.");
        }

        if (fileSize > 50000000) {
            return ctx.reply(
                `🚨 Video is too large for Telegram (>50MB)!\n\n📥 Download manually here:\n${downloadUrl}`
            );
        }

        await ctx.reply("✅ Video found! 🔄 Downloading & uploading to Telegram...");

        const videoStream = await axios({
            method: "GET",
            url: downloadUrl,
            responseType: "stream",
            timeout: 60000,
        });

        await ctx.replyWithVideo(
            { source: videoStream.data, filename: fileName },
            { disable_notification: true, caption: `🎬 ${fileName}` }
        );

        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
        } catch (_) {}
    } catch (error) {
        console.error("❌ Error fetching Terabox video:", error.message);
        ctx.reply("❌ Something went wrong while fetching the video. Try again later.");
    }
});

module.exports = { bot, isUserMember, saveUser };
