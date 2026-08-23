import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_USERNAME = "amir_85m10";
const ADMIN_CHAT_ID = "8923324852";
const CARD_NUMBER = "6037-9971-xxxx-xxxx"; 
const CARD_HOLDER = "نام صاحب کارت";       

const bot = new TelegramBot(TOKEN, { polling: true });

const userState = {};
const userBalances = {};

function isAdmin(user) {
    if (!user) return false;
    const username = user.username ? user.username.toLowerCase() : "";
    const userId = user.id ? user.id.toString() : "";
    return username === ADMIN_USERNAME.toLowerCase() || userId === ADMIN_CHAT_ID;
}

// دکمه‌های همیشگی پایین صفحه دقیقاً مشابه نمونه
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

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    userState[userId] = { step: null };

    bot.sendMessage(chatId, `✨ به پنل اختصاصی خوش آمدید.\n\nلطفاً از گزینه‌های زیر انتخاب کنید:`, persistentKeyboard);
});

bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;

    if (!isAdmin(msg.from)) {
        bot.sendMessage(chatId, "❌ شما دسترسی به پنل مدیریت ندارید.");
        return;
    }

    bot.sendMessage(chatId, `🎛 **پنل مدیریت اختصاصی مالک**\n\nگزینه مورد نظر را انتخاب کنید:`, {
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
            `مبلغ قابل پرداخت: 💎 **${parseInt(amount).toLocaleString()} تومان**\n` +
            `شماره کارت: \`${CARD_NUMBER}\`\n` +
            `به نام: ${CARD_HOLDER}\n\n` +
            `⚠️ **توجه بسیار مهم:** لطفاً مبلغ را به هیچ وجه رند نکنید و دقیقاً همین مبلغ را واریز کنید. در غیر این صورت واریزی شما تایید نخواهد شد!\n\n` +
            `پس از واریز، لطفاً دکمه زیر را زده و عکس رسید پرداخت را ارسال کنید.\n\n` +
            `📤 ارسال رسید پرداخت 📥`,
            { parse_mode: "Markdown" }
        );
    }
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;
    const photo = msg.photo;

    if (text === "🛒 خرید اشتراک") {
        bot.sendMessage(chatId, 
            `محصول مورد نظر را انتخاب کنید: 💎\n\n` +
            `🎮 Gaming\n\n` +
            `نامحدود ماهانه | 1 3 5 کاربر\n\n` +
            `حجمی | نامحدود کاربر و زمان`
        );
        return;
    }
    if (text === "🎁 اشتراک رایگان") {
        bot.sendMessage(chatId, "🎁 بخش اشتراک رایگان");
        return;
    }
    if (text === "🚀 سرور تست") {
        bot.sendMessage(chatId, "💎 بخش تست در حال حاضر غیرفعال است!");
        return;
    }
    if (text === "💳 کیف پول") {
        const balance = userBalances[userId] || 21000; // پیش‌فرض تستی طبق عکس
        userState[userId] = { step: "waiting_for_amount" };
        
        bot.sendMessage(chatId, 
            `💎 شناسه کاربری: 8923324852\n` +
            `💎 موجودی شما: ${balance.toLocaleString()} تومان\n` +
            `💎 تاریخ عضویت: 1405/04/01\n\n` +
            `💎 برای افزایش موجودی یا وارد کردن کد هدیه از منوی زیر استفاده کنید:\n\n` +
            `شارژ حساب\n` +
            `استفاده از کد هدیه`
        );
        
        setTimeout(() => {
            bot.sendMessage(chatId, "💎 لطفاً مبلغ مورد نظر برای شارژ کیف پول خود را وارد کنید (تومان):", {
                reply_markup: {
                    keyboard: [[{ text: "انصراف" }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            });
        }, 500);
        return;
    }
    if (text === "📦 اشتراک‌های من") {
        bot.sendMessage(chatId, "📁 شما در حال حاضر اشتراک فعالی ندارید.");
        return;
    }
    if (text === "📖 آموزش اتصال") {
        bot.sendMessage(chatId, "📖 راهنمای اتصال به سرورها");
        return;
    }
    if (text === "🤝 درخواست نمایندگی") {
        bot.sendMessage(chatId, "🤝 شرایط اخذ نمایندگی");
        return;
    }
    if (text === "👥 دعوت دوستان") {
        bot.sendMessage(chatId, "🌐 لینک دعوت از دوستان");
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
        bot.sendMessage(chatId, "❌ عملیات لغو شد.", persistentKeyboard);
        return;
    }

    if (currentState === "waiting_for_amount") {
        if (!text || text.startsWith("/")) return;
        const amount = parseInt(text);
        
        if (isNaN(amount) || amount <= 0) {
            bot.sendMessage(chatId, "⚠️ لطفاً یک مبلغ معتبر به صورت عدد وارد کنید:");
            return;
        }

        userState[userId].amount = amount;
        userState[userId].step = null;

        bot.sendMessage(chatId, `💎 برای شارژ مبلغ ${amount.toLocaleString()} تومان، لطفاً یکی از روش‌های زیر را انتخاب کنید`, {
            reply_markup: {
                keyboard: [
                    [{ text: "کارت به کارت" }],
                    [{ text: "انصراف" }]
                ],
                resize_keyboard: true
            }
        });
        return;
    }

    if (text === "کارت به کارت") {
        const amount = userState[userId].amount || 50000;
        userState[userId].step = "waiting_for_receipt";

        bot.sendMessage(chatId, 
            `💳 **اطلاعات کارت به کارت**\n\n` +
            `مبلغ قابل پرداخت: 💎 **${parseInt(amount).toLocaleString()} تومان**\n` +
            `شماره کارت: \`${CARD_NUMBER}\`\n` +
            `به نام: ${CARD_HOLDER}\n\n` +
            `⚠️ **توجه بسیار مهم:** لطفاً مبلغ را به هیچ وجه رند نکنید و دقیقاً همین مبلغ را واریز کنید. در غیر این صورت واریزی شما تایید نخواهد شد!\n\n` +
            `پس از واریز، لطفاً دکمه زیر را زده و عکس رسید پرداخت را ارسال کنید.\n\n` +
            `📤 ارسال رسید پرداخت 📥`,
            { parse_mode: "Markdown" }
        );
        return;
    }

    if (currentState === "waiting_for_receipt") {
        const amount = userState[userId].amount || 50000;

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
                parse_Mode: "Markdown"
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

            bot.sendMessage(chatId, "✅ فیش شما برای پشتیبانی ارسال شد. پس از تایید، حساب شما شارژ خواهد شد.", persistentKeyboard);
            userState[userId].step = null;
        }
    }
});
