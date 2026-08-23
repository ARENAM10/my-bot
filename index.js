import TelegramBot from "node-telegram-bot-api";

// توکن ربات
const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const bot = new TelegramBot(TOKEN, { polling: true });

// منوی ساده
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🛒 خرید اشتراک" }],
            [{ text: "📞 پشتیبانی" }]
        ],
        resize_keyboard: true
    }
};

// دستور استارت
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "سلام! ربات روشن است و کار می‌کند. ✅", mainKeyboard);
});

console.log("Bot is running...");
