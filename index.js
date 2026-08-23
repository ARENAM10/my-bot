import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_USERNAME = "amir_85m10";
const ADMIN_CHAT_ID = "8923324852";
const CARD_NUMBER = "6037-9971-xxxx-xxxx"; 
const CARD_HOLDER = "نام صاحب کارت";       

const bot = new TelegramBot(TOKEN, { polling: true });

// پایگاه داده ساده در حافظه (برای ربات‌های تست و سبک)
const userState = {};
const userBalances = {};
const allUsers = new Set(); // ذخیره آیدی تمام کاربرانی که استارت زده‌اند

function isAdmin(user) {
    if (!user) return false;
    const username = user.username ? user.username.toLowerCase() : "";
    const userId = user.id ? user.id.toString() : "";
    return username === ADMIN_USERNAME.toLowerCase() || userId === ADMIN_CHAT_ID;
}

// دکمه‌های همیشگی پایین صفحه
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
    const userId = msg.from.id.toString();
    userState[userId] = { step: null };
    allUsers.add(userId); // ذخیره کاربر برای آمار و ارسال همگانی

    // اگر مالک ربات باشد، دکمه پنل مدیریت هم به او نمایش داده می‌شود
    if (isAdmin(msg.from)) {
        bot.sendMessage(chatId, `✨ به پنل مدیریت و کاربری خوش آمدید مالک عزیز 👑\n\nبرای ورود به پنل مدیریت از دستور /admin استفاده کنید.`, {
            reply_markup: {
                keyboard: [
                    [{ text: "🎛 پنل مدیریت کل" }],
                    ...persistentKeyboard.reply_markup.keyboard
                ],
                resize_keyboard: true
            }
        });
        return;
    }

    bot.sendMessage(chatId, `✨ به پنل اختصاصی خوش آمدید.\n\nلطفاً از گزینه‌های زیر انتخاب کنید:`, persistentKeyboard);
});

// دستور یا دکمه پنل مدیریت
bot.onText(/\/admin/, (msg) => {
    openAdminPanel(msg.chat.id, msg.from);
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;

    if (text === "🎛 پنل مدیریت کل" && isAdmin(msg.from)) {
        openAdminPanel(chatId, msg.from);
        return;
    }
});

function openAdminPanel(chatId, user) {
    if (!isAdmin(user)) {
        bot.sendMessage(chatId, "❌ شما دسترسی به پنل مدیریت ندارید.");
        return;
    }

    bot.sendMessage(chatId, `🎛 **پنل مدیریت پیشرفته و عملیاتی مالک**\n\nیک گزینه را انتخاب کنید:`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "📊 آمار واقعی ربات", callback_data: "adm_stats" }, { text: "📢 ارسال پیام همگانی", callback_data: "adm_broadcast" }],
                [{ text: "💰 شارژ دستی کاربر", callback_data: "adm_charge_manual" }, { text: "📁 لیست کاربران", callback_data: "adm_users_list" }]
            ]
        },
        parse_mode: "Markdown"
    });
}

// مدیریت کلیک دکمه‌های شیشه‌ای
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (!userState[userId]) userState[userId] = { step: null };

    // بخش‌های مدیریت (غیرنمایشی و واقعی)
    if (data === "adm_stats") {
        if (!isAdmin(query.from)) return;
        const totalUsers = allUsers.size;
        let totalMoney = 0;
        Object.values(userBalances).forEach(b => totalMoney += b);

        bot.sendMessage(chatId, `📊 **آمار واقعی ربات:**\n\n👥 کل کاربران استارت زده: **${totalUsers} نفر**\n💰 مجموع موجودی کیف پول‌ها: **${totalMoney.toLocaleString()} تومان**`, { parse_mode: "Markdown" });
        return;
    }

    if (data === "adm_broadcast") {
        if (!isAdmin(query.from)) return;
        userState[userId].step = "waiting_for_broadcast_text";
        bot.sendMessage(chatId, `📢 لطفاً پیام همگانی خود را بفرستید (متن، عکس یا...) تا به تمام ${allUsers.size} کاربر ارسال شود:\n\n(برای لغو کلمه «انصراف» را بفرستید)`);
        return;
    }

    if (data === "adm_charge_manual") {
        if (!isAdmin(query.from)) return;
        userState[userId].step = "waiting_for_charge_id";
        bot.sendMessage(chatId, `💰 لطفاً **آیدی عددی کاربر** مورد نظر را بفرستید:`);
        return;
    }

    if (data === "adm_users_list") {
        if (!isAdmin(query.from)) return;
        const usersArray = Array.from(allUsers);
        bot.sendMessage(chatId, `📁 لیست آخرین آیدی‌های عددی کاربران ربات:\n\n\`{ ${usersArray.join(", ")} }\``, { parse_mode: "Markdown" });
        return;
    }

    if (data.startsWith("approve_")) {
        if (!isAdmin(query.from)) return;
        const [, targetUserId, amountStr] = data.split("_");
        const amount = parseInt(amountStr);

        if (!userBalances[targetUserId]) userBalances[targetUserId] = 0;
        userBalances[targetUserId] += amount;

        bot.sendMessage(targetUserId, `✅ پرداخت شما به مبلغ ${amount.toLocaleString()} تومان تایید و کیف پول شما شارژ شد! 🎉`);
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
            `⚠️ **توجه بسیار مهم:** لطفاً مبلغ را به هیچ وجه رند نکنید و دقیقاً همین مبلغ را واریز کنید.\n\n` +
            `پس از واریز، عکس رسید یا کد پیگیری را همینجا بفرستید.`,
            { parse_mode: "Markdown" }
        );
    }
});

// مدیریت پیام‌ها، فرآیند خرید، شارژ کیف پول و ارسال همگانی
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;
    const photo = msg.photo;

    if (!userState[userId]) userState[userId] = { step: null };
    const currentState = userState[userId].step;

    if (text === "انصراف") {
        userState[userId].step = null;
        bot.sendMessage(chatId, "❌ عملیات لغو شد.", persistentKeyboard);
        return;
    }

    // مدیریت ارسال همگانی واقعی توسط ادمین
    if (isAdmin(msg.from) && currentState === "waiting_for_broadcast_text") {
        userState[userId].step = null;
        let successCount = 0;
        let failCount = 0;

        bot.sendMessage(chatId, `⏳ ارسال پیام همگانی آغاز شد...`);

        allUsers.forEach(async (targetId) => {
            try {
                if (photo) {
                    const fileId = photo[photo.length - 1].file_id;
                    await bot.sendPhoto(targetId, fileId, { caption: msg.caption || "" });
                } else if (text) {
                    await bot.sendMessage(targetId, text);
                }
                successCount++;
            } catch (e) {
                failCount++;
            }
        });

        setTimeout(() => {
            bot.sendMessage(chatId, `✅ ارسال همگانی به پایان رسید.\n\n✔️ موفق: ${successCount}\n❌ ناموفق (بلاک کرده‌ یا ربات را استارت نکده‌اند): ${failCount}`);
        }, 2000);
        return;
    }

    // شارژ دستی واقعی کیف پول توسط ادمین
    if (isAdmin(msg.from) && currentState === "waiting_for_charge_id") {
        userState[userId].targetUserToCharge = text;
        userState[userId].step = "waiting_for_charge_amount";
        bot.sendMessage(chatId, `💰 کاربر هدف ثبت شد. حالا **مبلغ شارژ (تومان)** را وارد کنید:`);
        return;
    }
    if (isAdmin(msg.from) && currentState === "waiting_for_charge_amount") {
        const targetId = userState[userId].targetUserToCharge;
        const amount = parseInt(text);

        if (isNaN(amount)) {
            bot.sendMessage(chatId, `⚠️ لطفاً یک عدد معتبر وارد کنید:`);
            return;
        }

        if (!userBalances[targetId]) userBalances[targetId] = 0;
        userBalances[targetId] += amount;

        userState[userId].step = null;
        bot.sendMessage(chatId, `✅ کیف پول کاربر \`${targetId}\` به مبلغ ${amount.toLocaleString()} تومان شارژ شد.`);
        bot.sendMessage(targetId, `🎁 حساب شما توسط مدیریت به مبلغ ${amount.toLocaleString()} تومان شارژ شد!`).catch(() => {});
        return;
    }

    // دکمه‌های منوی اصلی کاربران
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
        const balance = userBalances[userId] || 0;
        userState[userId].step = "waiting_for_amount";
        
        bot.sendMessage(chatId, 
            `💎 شناسه کاربری: \`${userId}\`\n` +
            `💎 موجودی شما: ${balance.toLocaleString()} تومان\n` +
            `💎 تاریخ عضویت: فعال\n\n` +
            `💎 لطفاً مبلغ مورد نظر برای شارژ کیف پول خود را وارد کنید (تومان):`,
            {
                reply_markup: {
                    keyboard: [[{ text: "انصراف" }]],
                    resize_keyboard: true
                }
            }
        );
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
        bot.sendMessage(chatId, "🌐 لینک دعوت از دوستان شما: https://t.me/" + bot.options.username + "?start=" + userId);
        return;
    }
    if (text === "📞 پشتیبانی") {
        bot.sendMessage(chatId, `📞 ارتباط با پشتیبانی: @${ADMIN_USERNAME}`);
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

        bot.sendMessage(chatId, `💎 برای شارژ مبلغ ${amount.toLocaleString()} تومان، روش پرداخت را انتخاب کنید:`, {
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
            `⚠️ لطفاً مبلغ را دقیقاً واریز کرده و عکس رسید یا کد پیگیری را بفرستید.`,
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

            bot.sendMessage(chatId, "✅ فیش شما برای پشتیبانی ارسال شد. پس از بررسی، کیف پول شما شارژ خواهد شد.", persistentKeyboard);
            userState[userId].step = null;
        }
    }
});
