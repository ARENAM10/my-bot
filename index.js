import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_USERNAME = "amir_85m10";
const ADMIN_CHAT_ID = "8923324852";
const CARD_NUMBER = "6037-9971-xxxx-xxxx"; 
const CARD_HOLDER = "نام صاحب کارت";       

const bot = new TelegramBot(TOKEN, { polling: true });

const userState = {};
const userBalances = {};

// تابع بررسی ادمین
function isAdmin(user) {
    if (!user) return false;
    const username = user.username ? user.username.toLowerCase() : "";
    const userId = user.id ? user.id.toString() : "";
    return username === ADMIN_USERNAME.toLowerCase() || userId === ADMIN_CHAT_ID;
}

// چیدمان دقیق دکمه‌های پایین صفحه دقیقاً مطابق عکس ارسالی شما
const persistentKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🛒 خرید اشتراک" }],
            [{ text: "🎁 اشتراک رایگان" }, { text: "🚀 سرور تست" }],
            [{ text: "💳 کیف پول" }],
            [{ text: "📦 اشتراک‌های من" }, { text: "📖 آموزش اتصال" }],
            [{ text: "🤝 درخواست نمایندگی" }],
            [{ text: "👥 دعوت دوستان" }, { text: "📞 پشتیبانی" }]
        ],
        resize_keyboard: true
    }
};

// دستور /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    userState[userId] = { step: null };

    bot.sendMessage(chatId, `✨ به پنل اختصاصی ARENA CONFIG خوش آمدید.\n\nلطفاً از گزینه‌های زیر انتخاب کنید:`, persistentKeyboard);
});

// دستور پنل مدیریت (مختص مالک)
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;

    if (!isAdmin(msg.from)) {
        bot.sendMessage(chatId, "❌ شما دسترسی به پنل مدیریت ندارید.");
        return;
    }

    bot.sendMessage(chatId, `🎛 **پنل مدیریت اختصاصی مالک (ARENA)**\n\nگزینه مورد نظر را انتخاب کنید:`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 مدیریت اشتراک", callback_data: "adm_manage_sub" }, { text: "📦 سوابق اشتراک‌ها", callback_data: "adm_history" }],
                [{ text: "💰 شارژ کیف پول", callback_data: "adm_charge" }, { text: "📁 رسیدها و فیش‌ها", callback_data: "adm_receipts" }],
                [{ text: "👥 کاربران", callback_data: "adm_users" }, { text: "📊 آمار کل", callback_data: "adm_stats" }],
                [{ text: "💳 تنظیمات پرداخت", callback_data: "adm_payment" }, { text: "💬 پیام مشتریان", callback_data: "adm_messages" }],
                [{ text: "📢 ارسال همگانی", callback_data: "adm_broadcast" }]
            ]
        },
        parse_mode: "Markdown"
    });
});

// مدیریت کلیک دکمه‌های شیشه‌ای (مدیریت و پرداخت)
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (!userState[userId]) userState[userId] = { step: null };

    if (data.startsWith("adm_")) {
        if (!isAdmin(query.from)) {
            bot.sendMessage(chatId, "❌ دسترسی غیرمجاز.");
            return;
        }

        const adminResponses = {
            "adm_manage_sub": "🛒 بخش مدیریت اشتراک‌ها و سرورها",
            "adm_history": "📦 سوابق کل اشتراک‌های فروخته شده",
            "adm_charge": "💰 بخش شارژ دستی کیف پول کاربران",
            "adm_receipts": "📁 لیست فیش‌ها و رسیدهای در انتظار بررسی",
            "adm_users": "👥 لیست و آمار کاربران ربات",
            "adm_stats": "📊 آمار کلی درآمد و فروش",
            "adm_payment": "💳 تنظیمات شماره کارت و درگاه پرداخت",
            "adm_messages": "💬 لیست پیام‌های پشتیبانی دریافتی",
            "adm_broadcast": "📢 ارسال پیام همگانی به تمام کاربران"
        };

        bot.sendMessage(chatId, adminResponses[data] || "بخش مدیریت");
        return;
    }

    if (data.startsWith("approve_")) {
        if (!isAdmin(query.from)) return;
        const [, targetUserId, amountStr] = data.split("_");
        const amount = parseInt(amountStr);

        if (!userBalances[targetUserId]) userBalances[targetUserId] = 0;
        userBalances[targetUserId] += amount;

        bot.sendMessage(targetUserId, `✅ پرداخت شما به مبلغ ${amount.toLocaleString()} تومان تایید و حساب شما شارژ شد! 🎉`);
        bot.sendMessage(chatId, `✅ فیش کاربر تایید شد و مبلغ ${amount.toLocaleString()} تومان به حسابش واریز گردید.`);
        return;
    }

    if (data.startsWith("reject_")) {
        if (!isAdmin(query.from)) return;
        const [, targetUserId] = data.split("_");

        bot.sendMessage(targetUserId, `❌ فیش واریزی شما توسط پشتیبانی رد شد. لطفاً با پشتیبانی در ارتباط باشید.`);
        bot.sendMessage(chatId, `❌ فیش کاربر رد شد.`);
        return;
    }

    if (data.startsWith("pay_card_")) {
        const amount = data.split("_")[2];
        userState[userId].step = "waiting_for_receipt";
        userState[userId].amount = amount;

        bot.sendMessage(chatId, 
            `💳 **اطلاعات کارت به کارت**\n\n` +
            `مبلغ: **${parseInt(amount).toLocaleString()} تومان**\n` +
            `شماره کارت: \`${CARD_NUMBER}\`\n` +
            `به نام: ${CARD_HOLDER}\n\n` +
            `لطفاً پس از واریز وجه، **عکس فیش واریزی** یا **کد پیگیری** را همینجا بفرستید.`,
            { parse_mode: "Markdown" }
        );
    }
});

// مدیریت پیام‌ها و دکمه‌های پایین صفحه
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;
    const photo = msg.photo;

    if (text === "🛒 خرید اشتراک") {
        bot.sendMessage(chatId, "🛒 بخش خرید اشتراک و تعرفه‌ها");
        return;
    }
    if (text === "🎁 اشتراک رایگان") {
        bot.sendMessage(chatId, "🎁 بخش دریافت اشتراک رایگان");
        return;
    }
    if (text === "🚀 سرور تست") {
        bot.sendMessage(chatId, "🚀 بخش دریافت سرور تست رایگان");
        return;
    }
    if (text === "💳 کیف پول") {
        const balance = userBalances[userId] || 0;
        userState[userId] = { step: "waiting_for_amount" };
        bot.sendMessage(chatId, `💳 حساب کاربری شما\n\n💰 موجودی کیف پول: ${balance.toLocaleString()} تومان\n\nلطفاً مبلغ مورد نظر برای شارژ حساب (به تومان) را وارد کنید:\n\n(برای لغو کلمه «انصراف» را بفرستید)`);
        return;
    }
    if (text === "📦 اشتراک‌های من") {
        bot.sendMessage(chatId, "📁 شما در حال حاضر اشتراک فعالی ندارید.");
        return;
    }
    if (text === "📖 آموزش اتصال") {
        bot.sendMessage(chatId, "📖 راهنمای اتصال به سرورها در سیستم‌عامل‌های مختلف");
        return;
    }
    if (text === "🤝 درخواست نمایندگی") {
        bot.sendMessage(chatId, "🤝 شرایط و قوانین اخذ نمایندگی");
        return;
    }
    if (text === "👥 دعوت دوستان") {
        bot.sendMessage(chatId, "🌐 لینک معرفی به دوستان و کسب درآمد");
        return;
    }
    if (text === "📞 پشتیبانی") {
        bot.sendMessage(chatId, "📞 ارتباط با پشتیبانی: @amir_85m10");
        return;
    }

    if (!userState[userId]) userState[userId] = { step: null };
    const currentState = userState[userId].step;

    if (text === "انصراف") {
        userState[userId].step = null;
        bot.sendMessage(chatId, "❌ عملیات لغو شد. برای بازگشت به منو /start را بزنید.");
        return;
    }

    if (currentState === "waiting_for_amount") {
        if (!text || text.startsWith("/")) return;
        const amount = parseInt(text);
        
        if (isNaN(amount) || amount <= 0) {
            bot.sendMessage(chatId, "⚠️ لطفاً یک مبلغ معتبر به صورت عدد (تومان) وارد کنید:");
            return;
        }

        userState[userId].amount = amount;
        userState[userId].step = null;

        bot.sendMessage(chatId, `✅ مبلغ ${amount.toLocaleString()} تومان ثبت شد.\n\nلطفاً روش پرداخت را انتخاب کنید:`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "💳 کارت به کارت", callback_data: `pay_card_${amount}` }],
                    [{ text: "❌ انصراف", callback_data: "account" }]
                ]
            }
        });
    }
    else if (currentState === "waiting_for_receipt") {
        const amount = userState[userId].amount;

        if (photo || text) {
            const userInfo = `👤 کاربر: [${msg.from.first_name || "کاربر"}](tg://user?id=${userId}) (ID: \`${userId}\`)\n💰 مبلغ: ${parseInt(amount).toLocaleString()} تومان`;
            const adminKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ تایید و شارژ", callback_data: `approve_${userId}_${amount}` },
                            { text: "❌ رد فیش", callback_data: "reject_${userId}" }
                        ]
                    ]
                },
                parse_mode: "Markdown"
            };

            if (photo) {
                const fileId = photo[photo.length - 1].file_id;
                bot.sendPhoto(ADMIN_CHAT_ID, fileId, {
                    caption: `📥 **فیش واریزی جدید**\n\n${userInfo}`,
                    ...adminKeyboard
                }).catch((err) => console.log("خطا در ارسال عکس به ادمین:", err.message));
            } else if (text) {
                bot.sendMessage(ADMIN_CHAT_ID, `📥 **کد پیگیری / رسید متنی جدید**\n\n${userInfo}\n📝 متن: ${text}`, adminKeyboard)
                .catch((err) => console.log("خطا در ارسال متن به ادمین:", err.message));
            }

            bot.sendMessage(chatId, "✅ فیش شما برای پشتیبانی ارسال شد. پس از تایید، حساب شما شارژ خواهد شد.");
            userState[userId].step = null;
        }
    }
});
