import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const bot = new TelegramBot(TOKEN, { polling: true });

console.log("ربات روشن شد...");

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "سلام! ربات آنلاین است. 🚀");
});

bot.on("message", (msg) => {
    if (msg.text && msg.text.toLowerCase() === "سلام") {
        bot.sendMessage(msg.chat.id, "سلام! چطور می‌تونم کمکت کنم؟");
    }
});
