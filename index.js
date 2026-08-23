import TelegramBot from "node-telegram-bot-api";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot is running successfully!");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// خواندن توکن جدید از متغیرهای محیطی Railway
const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "سلام! ربات جدید با موفقیت روشن شد. ✅");
});

console.log("🤖 ربات استارت شد...");
