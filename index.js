import TelegramBot from "node-telegram-bot-api";
import http from "http";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "سلام! ربات با موفقیت روشن شد. 🚀");
});

http.createServer((req, res) => {
    res.end("Bot is alive!");
}).listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
