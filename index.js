import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_USERNAME = "amir_85m10";
const ADMIN_CHAT_ID = "8923324852";

// متغیرهای قابل تغییر از طریق پنل مدیریت
let paymentConfig = {
    cardNumber: "6037-9971-xxxx-xxxx",
    cardHolder: "نام صاحب کارت"
};

let botTexts = {
    welcomeMessage: "✨ به پنل اختصاصی خوش آمدید.\n\nلطفاً از گزینه‌های زیر انتخاب کنید:",
    buyMenuText: "محصول مورد نظر را انتخاب کنید: 💎\n\n🎮 Gaming\n\nنامحدود ماهانه | 1 3 5 کاربر\n\nحجمی | نامحدود کاربر و زمان"
};

let subscriptionsList = [
    { id: "sub_1", name: "نامحدود ۱ ماهه - ۱ کاربر", price: 50000 },
    { id: "sub_2", name: "نامحدود ۱ ماهه - ۳ کاربر", price: 90000 },
    { id: "sub_3", name: "حجمی ۱۰۰ گیگ", price: 70000 }
];

const bot = new TelegramBot(TOKEN, { polling: true });

const userState = {};
const userBalances = {};
const allUsers = new Set();

function isAdmin(user) {
    if (!user) return false;
    const username = user.username ? user.username.toLowerCase() : "";
    const userId = user.id ? user.id.toString() : "";
    return username === ADMIN_USERNAME.toLowerCase() || userId === ADMIN_CHAT_ID;
}

// تابع ارسال گزارش فعالیت کاربر به ادمین به صورت آنی
function sendActivityLog(user, actionDesc) {
    if (!user) return;
    const userId = user.id;
    const name = user.first_name || "بدون نام";
    const username = user.username ? `@${user.username}` : "ندارد";

    const logText = `🔔 **گزارش فعالیت کاربر**\n\n` +
                    `👤 نام: ${name}\n` +
                    `🔗 یوزرنیم: ${username}\n` +
                    `🆔 آیدی عددی: \`${userId}\`\n` +
                    `⚡️ فعالیت: ${actionDesc}`;

    bot.sendMessage(ADMIN_CHAT_ID, logText, { parse_mode: "Markdown" }).catch(() => {});
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
    allUsers.add(userId);

    sendActivityLog(msg.from, "ربات را استارت کرد (/start)");

    if (isAdmin(msg.from)) {
        bot.sendMessage(chatId, `✨ به پنل مدیریت خوش آمدید مالک عزیز 👑\n\nبرای دسترسی به تنظیمات کامل از دکمه زیر یا دستور /admin استفاده کنید.`, {
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

    bot.sendMessage(chatId, botTexts.welcomeMessage, persistentKeyboard);
});

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

    bot.sendMessage(chatId, `🎛 **پنل مدیریت پیشرفته و فول امکانات مالک**\n\nبخش مورد نظر را انتخاب کنید:`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 مدیریت اشتراک‌ها", callback_data: "adm_manage_subs" }, { text: "💳 تنظیمات پرداخت", callback_data: "adm_payment_settings" }],
                [{ text: "✏️ ویرایش متن‌ها", callback_data: "adm_edit_texts" }, { text: "💰 شارژ دستی کاربر", callback_data: "adm_charge_manual" }],
                [{ text: "📊 آمار واقعی ربات", callback_data: "adm_stats" }, { text: "📢 ارسال همگانی", callback_data: "adm_broadcast" }]
            ]
        },
        parse_mode: "Markdown"
    });
}

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});
    if (!userState[userId]) userState[userId] = { step: null };

    if (data === "adm_manage_subs") {
        if (!isAdmin(query.from)) return;
        let subText = "🛒 **لیست اشتراک‌های فعلی:**\n\n";
        subscriptionsList.forEach((sub, index) => {
            subText += `${index + 1}. **${sub.name}** - ${sub.price.toLocaleString()} تومان\n`;
        });

        bot.sendMessage(chatId, subText, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "➕ افزودن اشتراک جدید", callback_data: "adm_add_sub" }, { text: "🗑 حذف اشتراک‌ها", callback_data: "adm_del_sub" }],
                    [{ text: "🔙 بازگشت به پنل", callback_data: "adm_back_main" }]
                ]
            },
            parse_mode: "Markdown"
        });
        return;
    }

    if (data === "adm_add_sub") {
        if (!isAdmin(query.from)) return;
        userState[userId].step = "waiting_for_new_sub_name";
        bot.sendMessage(chatId, `➕ لطفاً نام و مشخصات اشتراک جدید را وارد کنید:`);
        return;
    }

    if (data === "adm_del_sub") {
        if (!isAdmin(query.from)) return;
        if (subscriptionsList.length === 0) {
            bot.sendMessage(chatId, "⚠️ هیچ اشتراکی وجود ندارد.");
            return;
        }
        let buttons = subscriptionsList.map(sub => [{ text: `🗑 حذف: ${sub.name}`, callback_data: `remove_sub_${sub.id}` }]);
        buttons.push([{ text: "🔙 بازگشت", callback_data: "adm_manage_subs" }]);

        bot.sendMessage(chatId, "🗑 اشتراک مورد نظر برای حذف را انتخاب کنید:", {
            reply_markup: { inline_keyboard: buttons }
        });
        return;
    }

    if (data.startsWith("remove_sub_")) {
        if (!isAdmin(query.from)) return;
        const subId = data.replace("remove_sub_", "");
        subscriptionsList = subscriptionsList.filter(s => s.id !== subId);
        bot.sendMessage(chatId, "✅ اشتراک حذف شد.");
        return;
    }

    if (data === "adm_payment_settings") {
        if (!isAdmin(query.from)) return;
        bot.sendMessage(chatId, 
            `💳 **تنظیمات کارت به کارت**\n\n` +
            `شماره کارت: \`${paymentConfig.cardNumber}\`\n` +
            `نام صاحب کارت: ${paymentConfig.cardHolder}`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✏️ تغییر شماره کارت و نام", callback_data: "adm_edit_card" }],
                    [{ text: "🔙 بازگشت به پنل", callback_data: "adm_back_main" }]
                ]
            },
            parse_mode: "Markdown"
        });
        return;
    }

    if (data === "adm_edit_card") {
        if (!isAdmin(query.from)) return;
        userState[userId].step = "waiting_for_card_number";
        bot.sendMessage(chatId, `💳 شماره کارت جدید را وارد کنید:`);
        return;
    }

    if (data === "adm_edit_texts") {
        if (!isAdmin(query.from)) return;
        bot.sendMessage(chatId, `✏️ انتخاب بخش ویرایش متن:`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📝 متن خوش‌آمدگویی", callback_data: "adm_edit_welcome" }],
                    [{ text: "🛒 متن بخش خرید", callback_data: "adm_edit_buy" }],
                    [{ text: "🔙 بازگشت", callback_data: "adm_back_main" }]
                ]
            }
        });
        return;
    }

    if (data === "adm_edit_welcome") {
        if (!isAdmin(query.from)) return;
        userState[userId].step = "waiting_for_new_welcome";
        bot.sendMessage(chatId, `📝 متن جدید خوش‌آمدگویی را بفرستید:`);
        return;
    }

    if (data === "adm_edit_buy") {
        if (!isAdmin(query.from)) return;
        userState[userId].step = "waiting_for_new_buy";
        bot.sendMessage(chatId, `🛒 متن جدید بخش خرید را بفرستید:`);
        return;
    }

    if (data === "adm_back_main") {
        openAdminPanel(chatId, query.from);
        return;
    }

    if (data === "adm_stats") {
        if (!isAdmin(query.from)) return;
        let totalMoney = 0;
        Object.values(userBalances).forEach(b => totalMoney += b);
        bot.sendMessage(chatId, `📊 **آمار:**\n\n👥 کل کاربران: **${allUsers.size} نفر**\n💰 کل موجودی کیف پول‌ها: **${totalMoney.toLocaleString()} تومان**`, { parse_mode: "Markdown" });
        return;
    }

    if (data === "adm_broadcast") {
        if (!isAdmin(query.from)) return;
        userState[userId].step = "waiting_for_broadcast_text";
        bot.sendMessage(chatId, `📢 پیام همگانی خود را بفرستید:`);
        return;
    }

    if (data === "adm_charge_manual") {
        if (!isAdmin(query.from)) return;
        userState[userId].step = "waiting_for_charge_id";
        bot.sendMessage(chatId, `💰 آیدی عددی کاربر را وارد کنید:`);
        return;
    }

    if (data.startsWith("approve_")) {
        if (!isAdmin(query.from)) return;
        const [, targetUserId, amountStr] = data.split("_");
        const amount = parseInt(amountStr);

        if (!userBalances[targetUserId]) userBalances[targetUserId] = 0;
        userBalances[targetUserId] += amount;

        bot.sendMessage(targetUserId, `✅ پرداخت شما به مبلغ ${amount.toLocaleString()} تومان تایید و کیف پول شما شارژ شد! 🎉`);
        bot.sendMessage(chatId, `✅ فیش تایید شد.`);
        return;
    }

    if (data.startsWith("reject_")) {
        if (!isAdmin(query.from)) return;
        const [, targetUserId] = data.split("_");
        bot.sendMessage(targetUserId, `❌ فیش واریزی شما رد شد.`);
        bot.sendMessage(chatId, `❌ فیش رد شد.`);
        return;
    }

    if (data.startsWith("pay_card_")) {
        const amount = data.split("_")[2];
        userState[userId].step = "waiting_for_receipt";
        userState[userId].amount = amount;

        sendActivityLog(query.from, `روش پرداخت کارت به کارت را برای مبلغ ${amount} تومان انتخاب کرد.`);

        bot.sendMessage(chatId, 
            `💳 **اطلاعات کارت به کارت**\n\n` +
            `مبلغ: 💎 **${parseInt(amount).toLocaleString()} تومان**\n` +
            `شماره کارت: \`${paymentConfig.cardNumber}\`\n` +
            `به نام: ${paymentConfig.cardHolder}\n\n` +
            `⚠️ مبلغ را دقیقاً واریز کرده و رسید بفرستید.`,
            { parse_mode: "Markdown" }
        );
    }
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;
    const photo = msg.photo;

    if (!userState[userId]) userState[userId] = { step: null };
    const currentState = userState[userId].step;

    if (text === "انصراف") {
        userState[userId].step = null;
        sendActivityLog(msg.from, "عملیات را لغو کرد.");
        bot.sendMessage(chatId, "❌ عملیات لغو شد.", persistentKeyboard);
        return;
    }

    if (isAdmin(msg.from)) {
        if (currentState === "waiting_for_new_sub_name") {
            userState[userId].tempSubName = text;
            userState[userId].step = "waiting_for_new_sub_price";
            bot.sendMessage(chatId, `💵 قیمت اشتراک (${text}) را به تومان وارد کنید:`);
            return;
        }
        if (currentState === "waiting_for_new_sub_price") {
            const price = parseInt(text);
            if (isNaN(price)) {
                bot.sendMessage(chatId, "⚠️ قیمت معتبر وارد کنید:");
                return;
            }
            const newId = "sub_" + (subscriptionsList.length + 1);
            subscriptionsList.push({ id: newId, name: userState[userId].tempSubName, price: price });
            userState[userId].step = null;
            bot.sendMessage(chatId, `✅ اشتراک جدید اضافه شد!`);
            return;
        }

        if (currentState === "waiting_for_card_number") {
            userState[userId].tempCardNum = text;
            userState[userId].step = "waiting_for_card_holder";
            bot.sendMessage(chatId, `👤 نام صاحب کارت را وارد کنید:`);
            return;
        }
        if (currentState === "waiting_for_card_holder") {
            paymentConfig.cardNumber = userState[userId].tempCardNum;
            paymentConfig.cardHolder = text;
            userState[userId].step = null;
            bot.sendMessage(chatId, `✅ اطلاعات کارت آپدیت شد.`);
            return;
        }

        if (currentState === "waiting_for_new_welcome") {
            botTexts.welcomeMessage = text;
            userState[userId].step = null;
            bot.sendMessage(chatId, `✅ متن خوش‌آمدگویی تغییر کرد.`);
            return;
        }
        if (currentState === "waiting_for_new_buy") {
            botTexts.buyMenuText = text;
            userState[userId].step = null;
            bot.sendMessage(chatId, `✅ متن بخش خرید تغییر کرد.`);
            return;
        }

        if (currentState === "waiting_for_broadcast_text") {
            userState[userId].step = null;
            let success = 0;
            allUsers.forEach(async (targetId) => {
                try {
                    if (photo) await bot.sendPhoto(targetId, photo[photo.length - 1].file_id, { caption: msg.caption || "" });
                    else if (text) await bot.sendMessage(targetId, text);
                    success++;
                } catch (e) {}
            });
            setTimeout(() => bot.sendMessage(chatId, `✅ پیام همگانی به ${success} کاربر ارسال شد.`), 1500);
            return;
        }

        if (currentState === "waiting_for_charge_id") {
            userState[userId].targetUserToCharge = text;
            userState[userId].step = "waiting_for_charge_amount";
            bot.sendMessage(chatId, `💰 مبلغ شارژ (تومان):`);
            return;
        }
        if (currentState === "waiting_for_charge_amount") {
            const targetId = userState[userId].targetUserToCharge;
            const amount = parseInt(text);
            if (!userBalances[targetId]) userBalances[targetId] = 0;
            userBalances[targetId] += amount;
            userState[userId].step = null;
            bot.sendMessage(chatId, `✅ کیف پول کاربر شارژ شد.`);
            bot.sendMessage(targetId, `🎁 حساب شما توسط مدیریت به مبلغ ${amount.toLocaleString()} تومان شارژ شد!`).catch(() => {});
            return;
        }
    }

    // منوی کاربران و ثبت لاگ فعالیت‌ها
    if (text === "🛒 خرید اشتراک") {
        sendActivityLog(msg.from, "وارد منوی «خرید اشتراک» شد.");
        let replyMarkupKeys = subscriptionsList.map(sub => [{ text: `${sub.name} - ${sub.price.toLocaleString()} تومان` }]);
        bot.sendMessage(chatId, botTexts.buyMenuText, {
            reply_markup: {
                keyboard: [...replyMarkupKeys, [{ text: "🔙 بازگشت" }]],
                resize_keyboard: true
            }
        });
        return;
    }

    const selectedSub = subscriptionsList.find(sub => text === `${sub.name} - ${sub.price.toLocaleString()} تومان`);
    if (selectedSub) {
        userState[userId].amount = selectedSub.price;
        sendActivityLog(msg.from, `اشتراک «${selectedSub.name}» را انتخاب کرد.`);
        bot.sendMessage(chatId, `✅ اشتراک **${selectedSub.name}** انتخاب شد.\n\nمبلغ: ${selectedSub.price.toLocaleString()} تومان\n\nروش پرداخت را انتخاب کنید:`, {
            reply_markup: {
                keyboard: [
                    [{ text: "💳 کارت به کارت" }],
                    [{ text: "🔙 بازگشت" }]
                ],
                resize_keyboard: true
            }
        });
        return;
    }

    if (text === "🎁 اشتراک رایگان") {
        sendActivityLog(msg.from, "روی دکمه «اشتراک رایگان» کلیک کرد.");
        bot.sendMessage(chatId, "🎁 بخش اشتراک رایگان");
        return;
    }
    if (text === "🚀 سرور تست") {
        sendActivityLog(msg.from, "روی دکمه «سرور تست» کلیک کرد.");
        bot.sendMessage(chatId, "💎 بخش تست در حال حاضر غیرفعال است!");
        return;
    }
    if (text === "💳 کیف پول") {
        sendActivityLog(msg.from, "وارد بخش «کیف پول» شد.");
        const balance = userBalances[userId] || 0;
        userState[userId].step = "waiting_for_amount";
        bot.sendMessage(chatId, 
            `💎 شناسه کاربری: \`${userId}\`\n` +
            `💎 موجودی شما: ${balance.toLocaleString()} تومان\n\n` +
            `💎 مبلغ مورد نظر برای شارژ کیف پول (تومان) را وارد کنید:`,
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
        sendActivityLog(msg.from, "بخش «اشتراک‌های من» را بررسی کرد.");
        bot.sendMessage(chatId, "📁 شما در حال حاضر اشتراک فعالی ندارید.");
        return;
    }
    if (text === "📖 آموزش اتصال") {
        sendActivityLog(msg.from, "بخش «آموزش اتصال» را باز کرد.");
        bot.sendMessage(chatId, "📖 راهنمای اتصال به سرورها");
        return;
    }
    if (text === "🤝 درخواست نمایندگی") {
        sendActivityLog(msg.from, "درخواست «نمایندگی» داد.");
        bot.sendMessage(chatId, "🤝 شرایط اخذ نمایندگی");
        return;
    }
    if (text === "👥 دعوت دوستان") {
        sendActivityLog(msg.from, "لینک «دعوت دوستان» را دریافت کرد.");
        bot.sendMessage(chatId, "🌐 لینک دعوت از دوستان شما: https://t.me/" + bot.options.username + "?start=" + userId);
        return;
    }
    if (text === "📞 پشتیبانی") {
        sendActivityLog(msg.from, "روی دکمه «پشتیبانی» کلیک کرد.");
        bot.sendMessage(chatId, `📞 ارتباط با پشتیبانی: @${ADMIN_USERNAME}`);
        return;
    }
    if (text === "🔙 بازگشت") {
        bot.sendMessage(chatId, "منوی اصلی:", persistentKeyboard);
        return;
    }

    if (currentState === "waiting_for_amount") {
        if (!text || text.startsWith("/")) return;
        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0) {
            bot.sendMessage(chatId, "⚠️ لطفاً یک مبلغ معتبر وارد کنید:");
            return;
        }
        userState[userId].amount = amount;
        userState[userId].step = null;

        sendActivityLog(msg.from, `مبلغ ${amount} تومان را برای شارژ کیف پول وارد کرد.`);

        bot.sendMessage(chatId, `💎 مبلغ ${amount.toLocaleString()} تومان ثبت شد. روش پرداخت را انتخاب کنید:`, {
            reply_markup: {
                keyboard: [
                    [{ text: "💳 کارت به کارت" }],
                    [{ text: "انصراف" }]
                ],
                resize_keyboard: true
            }
        });
        return;
    }

    if (text === "💳 کارت به کارت") {
        const amount = userState[userId].amount || 50000;
        userState[userId].step = "waiting_for_receipt";

        sendActivityLog(msg.from, `درخواست کارت به کارت برای مبلغ ${amount} تومان داد.`);

        bot.sendMessage(chatId, 
            `💳 **اطلاعات کارت به کارت**\n\n` +
            `مبلغ: 💎 **${parseInt(amount).toLocaleString()} تومان**\n` +
            `شماره کارت: \`${paymentConfig.cardNumber}\`\n` +
            `به نام: ${paymentConfig.cardHolder}\n\n` +
            `⚠️ مبلغ را دقیقاً واریز کرده و عکس رسید یا کد پیگیری بفرستید.`,
            { parse_mode: "Markdown" }
        );
        return;
    }

    if (currentState === "waiting_for_receipt") {
        const amount = userState[userId].amount || 50000;
        if (photo || text) {
            sendActivityLog(msg.from, `رسید پرداخت / فیش واریزی به مبلغ ${amount} تومان را ارسال کرد.`);

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
                bot.sendPhoto(ADMIN_CHAT_ID, photo[photo.length - 1].file_id, {
                    caption: `📥 **فیش واریزی جدید**\n\n${userInfo}`,
                    ...adminKeyboard
                }).catch(() => {});
            } else if (text) {
                bot.sendMessage(ADMIN_CHAT_ID, `📥 **کد پیگیری / رسید متنی جدید**\n\n${userInfo}\n📝 متن: ${text}`, adminKeyboard).catch(() => {});
            }

            bot.sendMessage(chatId, "✅ فیش شما برای پشتیبانی ارسال شد. پس از بررسی، حساب شما شارژ خواهد شد.", persistentKeyboard);
            userState[userId].step = null;
        }
    }
});
