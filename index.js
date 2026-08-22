import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAHfNQeFI2tWfBQg_PZTzuvoW-R5TGPe4mo";
const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `🔥 سلام ${msg.from.first_name}\nبه ربات آرنا خوش آمدید.`);
});

console.log("🚀 Bot is running...");
