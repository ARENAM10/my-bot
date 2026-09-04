const TelegramBot = require('node-telegram-bot-api');

// توکن ربات خود را اینجا قرار دهید
const TOKEN = '8850301156:AAH1MryTDXakGuKYsAxTlmVO2h_lSw9lnoM';

// راه‌اندازی ربات با حالت polling
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🤖 ربات با موفقیت روشن شد و در حال گوش دادن به پیام‌هاست...');

// پاسخ به دستور /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'کاربر';
    
    bot.sendMessage(chatId, `سلام ${name} عزیز! 👋\nربات با موفقیت تست شد و بهه‌روز کار می‌کند.`);
});

// پاسخ به هر پیام متنی ساده
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    
    if (msg.text && !msg.text.startsWith('/start')) {
        bot.sendMessage(chatId, `پیام شما دریافت شد: "${msg.text}" ✅`);
    }
});
