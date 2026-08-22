import TelegramBot from 'node-telegram-bot-api';

// خواندن توکن از متغیر محیطی ریلی (برای امنیت بیشتر) یا استفاده از توکن مستقیم
const token = process.env.BOT_TOKEN || "8850301156:AAFHdC0BvS5h0W-QnhndZm6wXr9W8v51NMw";

const bot = new TelegramBot(token, { polling: true });

console.log("Bot is running successfully...");

// منوی استارت و دکمه‌های شیشه‌ای مدیریت
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "کاربر";

    const welcomeMessage = `سلام ${userName} عزیز! ⚡️\nبه ربات کانفیگ آرنا خوش آمدید.\n\nلطفاً از منوی زیر گزینه‌ی مورد نظر خود را انتخاب کنید:`;

    bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🛒 خرید اشتراک", callback_data: "buy_sub" },
                    { text: "👤 حساب کاربری من", callback_data: "my_account" }
                ],
                [
                    { text: "📞 پشتیبانی", callback_data: "support" }
                ]
            ]
        }
    });
});

// مدیریت کلیک روی دکمه‌های شیشه‌ای
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'buy_sub') {
        bot.sendMessage(chatId, "⚡️ اشتراک مدنظر خود را انتخاب کنید:\n\n1️⃣ ۵ گیگابایت - ۳۰,۰۰۰ تومان");
    } else if (data === 'my_account') {
        bot.sendMessage(chatId, `👤 مشخصات حساب شما:\n🆔 شناسه کاربری: ${chatId}\nstatus: فعال ✅`);
    } else if (data === 'support') {
        bot.sendMessage(chatId, "💬 برای ارتباط با پشتیبانی به آیدی زیر پیام دهید:\n@Support_ID");
    }

    // بستن حالت لودینگ دکمه در تلگرام
    bot.answerCallbackQuery(query.id);
});
