import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAEH94AQeKKpf4-eBAgfrwsnvoIRph4--Y4";
const bot = new TelegramBot(TOKEN, { polling: true });

console.log("ربات روشن شد و منتظر پیام است...");

// پاسخ به دستور استارت
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "سلام! ربات کاملاً سالم است و کار می‌کند. 🚀");
});

// پاسخ به کلمه سلام
bot.on("message", (msg) => {
    if (msg.text && msg.text.toLowerCase() === "سلام") {
        bot.sendMessage(msg.chat.id, "سلام دادش! ربات الان کاملاً آنلاین و فعاله. چطور می‌تونم کمکت کنم؟");
    }
});
