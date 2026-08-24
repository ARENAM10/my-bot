const TelegramBot = require('node-telegram-bot-api');

// توکن ربات شما
const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';

// راه‌اندازی با روش ساده‌ی Polling برای تست سریع
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('ربات تست روشن شد...');

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'سلام! ربات سالم است و پاسخ می‌دهد. 🚀');
});

bot.on('message', (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        bot.sendMessage(msg.chat.id, `پیام شما دریافت شد: ${msg.text}`);
    }
});
