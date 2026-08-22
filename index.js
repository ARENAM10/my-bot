import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAEH94AQeKKpf4-eBAgfrwsnvoIRph4--Y4";
const bot = new TelegramBot(TOKEN, { polling: true });

console.log("🤖 ربات روشن شد و منتظر پیام است...");

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ? msg.text.trim().toLowerCase() : "";

    if (text === "سلام" || text === "hi" || text === "hello") {
        bot.sendMessage(chatId, "سلام! ربات کاملاً زنده و سر حال است و پاسخ می‌دهد. 🔥");
    } else {
        bot.sendMessage(chatId, `پیام شما دریافت شد: ${msg.text}`);
    }
});
