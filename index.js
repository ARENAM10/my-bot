import TelegramBot from "node-telegram-bot-api";

// توکن ربات شما
const TOKEN = "8850301156:AAHfNQeFI2tWfBQg_PZTzuvoW-R5TGPe4mo";

// راه‌اندازی ربات با حالت polling
const bot = new TelegramBot(TOKEN, { polling: true });

console.log("🤖 ربات با موفقیت روشن شد و در حال گوش دادن است...");

// پاسخ به دستور /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || "دوست عزیز";

    bot.sendMessage(chatId, `سلام ${name}! ربات با موفقیت روشن شد و کار می‌کند. 🔥`);
});
