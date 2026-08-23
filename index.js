import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot("8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo", { polling: true });

const usersMemory = {};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || "کاربر";

    usersMemory[userId] = {
        firstName: firstName,
        joinedAt: new Date().toLocaleTimeString("fa-IR")
    };

    // ارسال پیام همراه با دکمه‌های شیشه‌ای دقیقاً وسط صفحه (مشابه عکس)
    bot.sendMessage(chatId, `✨ به پنل اختصاصی ARENA CONFIG خوش آمدید.\n\nلطفاً از گزینه‌های زیر انتخاب کنید:`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 خرید اشتراک", callback_data: "buy_sub" }],
                [{ text: "💳 حساب کاربری", callback_data: "account" }, { text: "🎁 هدیه روزانه", callback_data: "daily_gift" }],
                [{ text: "📦 اشتراک‌های من", callback_data: "my_subs" }, { text: "🤝 اخذ نمایندگی", callback_data: "agency" }],
                [{ text: "🌐 معرفی به دوستان", callback_data: "invite" }, { text: "📞 ارتباط با پشتیبانی", callback_data: "support" }]
            ]
        }
    });
});

// مدیریت کلیک روی دکمه‌های شیشه‌ای وسط صفحه
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "buy_sub") {
        bot.sendMessage(chatId, "🛒 بخش خرید اشتراک (در قدم‌های بعدی تکمیل می‌شود)");
    } else if (data === "account") {
        bot.sendMessage(chatId, "💳 لطفاً مبلغ مورد نظر برای شارژ حساب (به تومان) را وارد کنید:\n\n(برای لغو کلمه «انصراف» را بفرستید)");
    } else if (data === "daily_gift") {
        bot.sendMessage(chatId, "🎁 هدیه روزانه شما (به زودی)");
    } else if (data === "my_subs") {
        bot.sendMessage(chatId, "📦 شما در حال حاضر اشتراک فعالی ندارید.");
    } else if (data === "agency") {
        bot.sendMessage(chatId, "🤝 شرایط اخذ نمایندگی");
    } else if (data === "invite") {
        bot.sendMessage(chatId, "🌐 لینک معرفی به دوستان");
    } else if (data === "support") {
        bot.sendMessage(chatId, "📞 ارتباط با پشتیبانی: @ARENAM_10");
    }
});
