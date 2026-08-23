import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot("8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo", { polling: true });

const usersMemory = {};
// حافظه موقت برای اینکه بفهمیم کدوم کاربر الان داره مبلغ وارد میکنه
const userState = {};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || "کاربر";

    usersMemory[userId] = {
        firstName: firstName,
        joinedAt: new Date().toLocaleTimeString("fa-IR")
    };
    userState[userId] = null; // ریست کردن حالت کاربر

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

// مدیریت کلیک روی دکمه‌ها
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "buy_sub") {
        bot.sendMessage(chatId, "🛒 بخش خرید اشتراک (در قدم‌های بعدی تکمیل می‌شود)");
    } else if (data === "account") {
        userState[userId] = "waiting_for_amount"; // فعال کردن حالت انتظار برای مبلغ
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

// دریافت پیام‌های متنی از کاربر (مثل ورود مبلغ یا انصراف)
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!text || text.startsWith("/")) return;

    // اگر کاربر در حالت وارد کردن مبلغ شارژ بود
    if (userState[userId] === "waiting_for_amount") {
        if (text === "انصراف") {
            userState[userId] = null;
            bot.sendMessage(chatId, "❌ عملیات لغو شد. برای بازگشت به منو /start را بزنید.");
            return;
        }

        // بررسی اینکه آیا عددی که وارد کرده معتبر است یا نه
        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0) {
            bot.sendMessage(chatId, "⚠️ لطفاً یک مبلغ معتبر به صورت عدد (تومان) وارد کنید:\n(یا کلمه «انصراف» را بفرستید)");
            return;
        }

        // اگر مبلغ درست بود
        userState[userId] = null;
        bot.sendMessage(chatId, `✅ مبلغ ${amount.toLocaleString()} تومان دریافت شد.\n\nبرای شارژ مبلغ ${amount.toLocaleString()} تومان، لطفا یکی از روش‌های زیر را انتخاب کنید:`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "💳 کارت به کارت", callback_data: `pay_card_${amount}` }],
                    [{ text: "❌ انصراف", callback_data: "cancel_pay" }]
                ]
            }
        });
    }
});
