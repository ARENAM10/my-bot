import TelegramBot from 'node-telegram-bot-api';

const token = "8850301156:AAG1uFVUXWcgEqXKOyEO8Nhinxdjy9a6d6g";

const bot = new TelegramBot(token, { polling: true });

console.log("Bot is running successfully...");

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

    bot.answerCallbackQuery(query.id);
});
