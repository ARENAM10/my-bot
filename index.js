import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_CHAT_ID = "8923324852"; // آیدی عددی شما به عنوان مالک مطلق
const CARD_NUMBER = "6037-9971-xxxx-xxxx"; 
const CARD_HOLDER = "نام صاحب کارت";       

const bot = new TelegramBot(TOKEN, { polling: true });

const userState = {};
const userBalances = {};

// دستور /start برای منوی اصلی
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
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

// مدیریت تمام پیام‌ها (تشخیص خودکار ادمین بدون نیاز به دستور خاص)
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;
    const photo = msg.photo;

    // اگر پیام از طرف مالک باشد و دستوری مثل start نباشد، پنل مدیریت را مستقیم نشان بده
    if (userId === ADMIN_CHAT_ID && text && !text.startsWith("/")) {
        if (text === "انصراف") {
            userState[userId] = { step: null };
            bot.sendMessage(chatId, "❌ عملیات لغو شد.");
            return;
        }
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
                            { text: "❌ رد فیش", callback_data: `reject_${userId}` }
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

// مدیریت کلیک روی دکمه‌ها
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (!userState[userId]) userState[userId] = { step: null };

    // تایید پرداخت توسط ادمین
    if (data.startsWith("approve_")) {
        if (userId !== ADMIN_CHAT_ID) return;
        const [, targetUserId, amountStr] = data.split("_");
        const amount = parseInt(amountStr);

        if (!userBalances[targetUserId]) userBalances[targetUserId] = 0;
        userBalances[targetUserId] += amount;

        bot.sendMessage(targetUserId, `✅ پرداخت شما به مبلغ ${amount.toLocaleString()} تومان تایید و حساب شما شارژ شد! 🎉`);
        bot.sendMessage(chatId, `✅ فیش کاربر تایید شد و مبلغ ${amount.toLocaleString()} تومان به حسابش واریز گردید.`);
        return;
    }

    // رد فیش توسط ادمین
    if (data.startsWith("reject_")) {
        if (userId !== ADMIN_CHAT_ID) return;
        const [, targetUserId] = data.split("_");

        bot.sendMessage(targetUserId, `❌ فیش واریزی شما توسط پشتیبانی رد شد. لطفاً با پشتیبانی در ارتباط باشید.`);
        bot.sendMessage(chatId, `❌ فیش کاربر رد شد.`);
        return;
    }

    // بخش کاربران عادی
    if (data === "buy_sub") bot.sendMessage(chatId, "🛒 بخش خرید اشتراک");
    else if (data === "speed_test") bot.sendMessage(chatId, "🚀 ابزار تست سرعت سرورها");
    else if (data === "daily_gift") bot.sendMessage(chatId, "🎁 هدیه روزانه شما");
    else if (data === "account") {
        const balance = userBalances[userId] || 0;
        userState[userId].step = "waiting_for_amount";
        bot.sendMessage(chatId, `💳 حساب کاربری شما\n\n💰 موجودی کیف پول: ${balance.toLocaleString()} تومان\n\nلطفاً مبلغ مورد نظر برای شارژ حساب (به تومان) را وارد کنید:\n\n(برای لغو کلمه «انصراف» را بفرستید)`);
    } 
    else if (data === "my_subs") bot.sendMessage(chatId, "📁 شما در حال حاضر اشتراک فعالی ندارید.");
    else if (data === "guide") bot.sendMessage(chatId, "📖 راهنمای اتصال");
    else if (data === "agency") bot.sendMessage(chatId, "🤝 شرایط اخذ نمایندگی");
    else if (data === "invite") bot.sendMessage(chatId, "🌐 لینک معرفی به دوستان");
    else if (data === "support") bot.sendMessage(chatId, "📞 ارتباط با پشتیبانی: @ARENAM_10");
    else if (data === "back_to_main") bot.sendMessage(chatId, `✨ به پنل اختصاصی ARENA CONFIG خوش آمدید.`);

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
