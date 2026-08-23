import TelegramBot from "node-telegram-bot-api";
import db from "./database.js"; // اتصال به دیتابیس

// توکن مستقیم داخل کد
const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";

const bot = new TelegramBot(TOKEN, { polling: true });

// دستور ساده برای تست
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || "کاربر";
    
    bot.sendMessage(chatId, `سلام ${name} عزیز! 🌹\nربات با موفقیت روشن شد و دیتابیس هم متصل است. 🚀`);
    console.log(` پیام استارت از طرف ${name} دریافت شد.`);
});

console.log("🤖 ربات تستی با موفقیت اجرا شد و منتظر پیام است...");
