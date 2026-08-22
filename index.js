import TelegramBot from 'node-telegram-bot-api';

const token = 8850301156:AAFHdCOBvS5hOW-QnhndZm6wXr9W8v5lNMw

const bot = new TelegramBot(token, { polling: true });

console.log("Bot is running successfully...");

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "سلام! ربات شما با موفقیت روشن شد.");
});

