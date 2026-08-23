import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_CHAT_ID = "YOUR_ADMIN_ID_HERE"; // <--- آیدی عددی خودت رو اینجا بذار
const CARD_NUMBER = "6037-9971-xxxx-xxxx"; // شماره کارت شما
const CARD_HOLDER = "نام صاحب کارت";       // نام صاحب کارت

const bot = new TelegramBot(TOKEN, { polling: true });
const userState = {};

// دستور /start و نمایش منوی شیشه‌ای دقیقاً مشابه عکس
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || "کاربر";

    userState[userId] = { step: null };

    bot.sendMessage(chatId, `✨ به پنل اختصاصی ARENA CONFIG خوش آمدید.\n\nلطفاً از گزینه‌های زیر انتخاب کنید:`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 خرید اشتراک", callback_data: "buy_sub" }],
                [{ text: "🚀 تست سرعت", callback_data: "speed_test" }, { text: "🎁 هدیه روزانه", callback_data: "daily_gift" }],
                [{ text: "💳 حساب کاربری", callback_data: "account" }, { text: "📁 اشتراک‌های من", callback_data: "my_subs" }],
                [{ text: "📖 راهنمای اتصال", callback_data: "guide" }, { text: "🤝 اخذ نمایندگی", callback_data: "agency" }],
                [{ text: "🌐 معرفی به دوستان", callback_data: "invite" }, { text: "📞 ارتباط با پشتیبانی", callback_data: "support" }]
            ]
        }
    });
});

// مدیریت کلیک روی دکمه‌های شیشه‌ای
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (!userState[userId]) userState[userId] = { step: null };

    if (data === "buy_sub") {
        bot.sendMessage(chatId, "🛒 بخش خرید اشتراک (در قدم‌های بعدی تکمیل می‌شود)");
    } 
    else if (data === "speed_test") {
        bot.sendMessage(chatId, "🚀 ابزار تست سرعت و سرورهای مناسب (به زودی)");
    }
    else if (data === "daily_gift") {
        bot.sendMessage(chatId, "🎁 هدیه روزانه شما (به زودی)");
    }
    else if (data === "account") {
        userState[userId].step = "waiting_for_amount";
        bot.sendMessage(chatId, "💳 لطفاً مبلغ مورد نظر برای شارژ حساب (به تومان) را وارد کنید:\n\n(برای لغو کلمه «انصراف» را بفرستید)");
    } 
    else if (data === "my_subs") {
        bot.sendMessage(chatId, "📁 شما در حال حاضر اشتراک فعالی ندارید.");
    }
    else if (data === "guide") {
        bot.sendMessage(chatId, "📖 راهنمای اتصال به کانفیگ‌ها (به زودی)");
    }
    else if (data === "agency") {
        bot.sendMessage(chatId, "🤝 شرایط اخذ نمایندگی");
    }
    else if (data === "invite") {
        bot.sendMessage(chatId, "🌐 لینک معرفی به دوستان");
    }
    else if (data === "support" || data === "back_to_menu") {
        // بازگشت به منوی اصلی یا پشتیبانی
        if (data === "support") {
            bot.sendMessage(chatId, "📞 ارتباط با پشتیبانی: @ARENAM_10");
        }
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
            `لطفاً پس از واریز وجه، **عکس فیش واریزی** یا **کد پیگیری** را همینجا بفرستید تا حساب شما شارژ شود.`,
            { parse_mode: "Markdown" }
        );
    }
});

// مدیریت پیام‌های متنی و عکس‌های ارسالی کاربران
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const photo = msg.photo;

    if (!userState[userId]) userState[userId] = { step: null };
    const currentState = userState[userId].step;

    if (text === "انصراف") {
        userState[userId].step = null;
        bot.sendMessage(chatId, "❌ عملیات لغو شد. برای بازگشت به منو /start را بزنید.");
        return;
    }

    // مرحله دریافت مبلغ
    if (currentState === "waiting_for_amount") {
        if (!text || text.startsWith("/")) return;
        const amount = parseInt(text);
        
        if (isNaN(amount) || amount <= 0) {
            bot.sendMessage(chatId, "⚠️ لطفاً یک مبلغ معتبر به صورت عدد (تومان) وارد کنید:\n(یا کلمه «انصراف» را بفرستید)");
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

    // مرحله دریافت فیش یا رسید از کاربر
    else if (currentState === "waiting_for_receipt") {
        const amount = userState[userId].amount;

        if (photo || text) {
            const userInfo = `👤 کاربر: [${msg.from.first_name}](tg://user?id=${userId}) (ID: \`${userId}\`)\n💰 مبلغ: ${parseInt(amount).toLocaleString()} تومان`;

            if (photo) {
                const fileId = photo[photo.length - 1].file_id;
                bot.sendPhoto(ADMIN_CHAT_ID, fileId, {
                    caption: `📥 **فیش واریزی جدید**\n\n${userInfo}`,
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "✅ تایید و شارژ", callback_data: `approve_${userId}_${amount}` },
                                { text: "❌ رد فیش", callback_data: `reject_${userId}` }
                            ]
                        ]
                    }
                });
            } else if (text) {
                bot.sendMessage(ADMIN_CHAT_ID, `📥 **کد پیگیری / رسید متنی جدید**\n\n${userInfo}\n📝 متن: ${text}`, {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "✅ تایید و شارژ", callback_data: `approve_${userId}_${amount}` },
                                { text: "❌ رد فیش", callback_data: `reject_${userId}` }
                            ]
                        ]
                    }
                });
            }

            bot.sendMessage(chatId, "✅ فیش شما با موفقیت برای پشتیبانی ارسال شد. پس از بررسی و تایید، حساب شما شارژ خواهد شد.");
            userState[userId].step = null;
        }
    }
});
