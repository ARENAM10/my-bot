import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_USERNAME = "amir_85m10";
const ADMIN_CHAT_ID = "8923324852";

const bot = new TelegramBot(TOKEN, { polling: true });

// منوی ساده و اصلی ربات
const persistentKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🛒 خرید اشتراک" }],
            [{ text: "📦 اشتراک‌های من" }, { text: "💳 کیف پول" }],
            [{ text: "📞 پشتیبانی" }]
        ],
        resize_keyboard: true
    }
};

// دستور استارت
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "✨ سلام! به ربات آرنا خوش آمدید.\nلطفاً از منوی زیر استفاده کنید:", persistentKeyboard);
});

// پاسخ به دکمه‌ها
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === "🛒 خرید اشتراک") {
        bot.sendMessage(chatId, "💎 لیست اشتراک‌های فعال:\n\n۱. اشتراک ماهانه - ۵۰,۰۰۰ تومان", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "💳 خرید و پرداخت", callback_data: "buy_sub" }]
                ]
            }
        });
        return;
    }

    if (text === "💳 کیف پول") {
        bot.sendMessage(chatId, "💎 موجودی کیف پول شما: ۰ تومان");
        return;
    }

    if (text === "📦 اشتراک‌های من") {
        bot.sendMessage(chatId, "📁 شما در حال حاضر هیچ اشتراک فعالی ندارید.");
        return;
    }

    if (text === "📞 پشتیبانی") {
        bot.sendMessage(chatId, `📞 ارتباط با پشتیبانی: @${ADMIN_USERNAME}`);
        return;
    }
});

// مدیریت کلیک دکمه‌ها
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    await bot.answerCallbackQuery(query.id).catch(() => {});
    
    if (query.data === "buy_sub") {
        bot.sendMessage(chatId, "💳 لطفاً مبلغ را واریز کرده و رسید خود را ارسال کنید.");
    }
});

console.log("ربات با موفقیت روشن شد و آماده به کار است...");
