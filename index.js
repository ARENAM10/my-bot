import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";

// پاک کردن وب‌هوک‌های قبلی و شروع پولینگ تمیز
const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "سلام! ربات با موفقیت و از صفر پاکسازی و اجرا شد. ✅");
    console.log("پیام استارت دریافت شد!");
});

console.log("ربات در حال اجراست...");
