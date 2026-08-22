import TelegramBot from 'node-telegram-bot-api';

const token = "8850301156:AAGB5ewQkolWaLg2kjKL-cL8KXDhrbNciHQ";
const bot = new TelegramBot(token, { polling: true });

console.log("🔥 Clean Bot is running...");

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "سلام! ربات پاکسازی شد و آماده‌ی کدنویسی مجدد است.");
});
