const TelegramBot = require('node-telegram-bot-api');

// توکن جدید شما
const TOKEN = '8850301156:AAGr1yWbbtDwWii__eC1TDvXcygzN7TC5JA';

// راه‌اندازی ربات با حالت polling
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🤖 ربات با توکن جدید با موفقیت روشن شد...');

// پاسخ به دستور /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'کاربر';
    
    bot.sendMessage(chatId, `سلام ${name} عزیز! 👋\nتوکن جدید با موفقیت روی ربات تست شد.`);
});

// پاسخ به پیام‌های متنی
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    
    if (msg.text && !msg.text.startsWith('/start')) {
        bot.sendMessage(chatId, `پیام شما با توکن جدید دریافت شد: "${msg.text}" ✅`);
    }
});
