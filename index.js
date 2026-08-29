const TelegramBot = require('node-telegram-bot-api');

// توکن استخراج‌شده از کد شما
const TOKEN ='8850301156:AAH1MryTDXakGuKYsAxTlmVO2h_lSw9lnoM';
';

const bot = new TelegramBot(TOKEN, { polling: true });

console.log('Bot is running and waiting for messages...');

// پاسخ ساده به دستور /start برای تست عملکرد ربات
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'دوست عزیز';
    
    bot.sendMessage(chatId, `سلام ${name} جان! 👋\nربات با موفقیت روشن شد و بدون مشکل کار می‌کند. 🚀`, {
        parse_mode: 'Markdown'
    });
});

// پاسخ به هر متن دیگری برای اطمینان از دریافت پیام‌ها
bot.on('message', (msg) => {
    if (msg.text && !msg.text.startsWith('/start')) {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, `پیام شما دریافت شد: "${msg.text}" ✅`);
    }
});
