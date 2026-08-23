import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_USERNAME = "amir_85m10";
const ADMIN_CHAT_ID = "8923324852";

let paymentConfig = {
    cardNumber: "6037-9971-xxxx-xxxx",
    cardHolder: "نام صاحب کارت"
};

let botTexts = {
    welcomeMessage: "✨ به پنل اختصاصی خوش آمدید.\n\nلطفاً از گزینه‌های زیر انتخاب کنید:",
    buyMenuText: "محصول مورد نظر را انتخاب کنید: 💎"
};

// ساختار حرفه‌ای اشتراک‌ها مطابق درخواست شما
let subscriptionsList = [
    {
        id: "sub_1",
        name: "نامحدود ۱ ماهه - ۱ کاربر",
        price: 50000,
        volume: "نامحدود",
        duration: "۳۰ روز",
        usersCount: "۱ کاربر",
        type: "Gaming",
        config: "vless://example-config-1...",
        status: true // true مخفف 🟢 فعال و false مخفف 🔴 غیرفعال
    },
    {
        id: "sub_2",
        name: "حجمی ۱۰۰ گیگ",
        price: 70000,
        volume: "100 GB",
        duration: "۶۰ روز",
        usersCount: "نامحدود",
        type: "General",
        config: "vmess://example-config-2...",
        status: true
    }
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
        bot.sendMessage(chatId, `✨ به پنل مدیریت خوش آمدید مالک عزیز 👑`, {
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

    bot.sendMessage(chatId, `🎛 **پنل مدیریت پیشرفته مالک**\n\nبخش مورد نظر را انتخاب کنید:`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 مدیریت اشتراک‌ها", callback_data: "adm_manage_subs" }],
                [{ text: "💳 تنظیمات پرداخت", callback_data: "adm_payment_settings" }, { text: "✏️ ویرایش متن‌ها", callback_data: "adm_edit_texts" }],
                [{ text: "💰 شارژ دستی کاربر", callback_data: "adm_charge_manual" }, { text: "📊 آمار واقعی ربات", callback_data: "adm_stats" }],
                [{ text: "📢 ارسال همگانی", callback_data: "adm_broadcast" }]
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

    // --- مدیریت حرفه‌ای اشتراک‌ها ---
    if (data === "adm_manage_subs") {
        if (!isAdmin(query.from)) return;
        bot.sendMessage(chatId, `🛒 **بخش مدیریت اشتراک‌ها**\n\nگزینه مورد نظر را انتخاب کنید:`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📋 لیست اشتراک‌ها", callback_data: "sub_list" }],
                    [{ text: "➕ افزودن اشتراک", callback_data: "sub_add" }],
                    [{ text: "✏️ ویرایش اشتراک", callback_data: "sub_edit_menu" }, { text: "🗑 حذف اشتراک", callback_data: "sub_del_menu" }],
                    [{ text: "🔴/🟢 تغییر وضعیت فعال/غیرفعال", callback_data: "sub_status_menu" }],
                    [{ text: "🔙 بازگشت به پنل اصلی", callback_data: "adm_back_main" }]
                ]
            },
            parse_mode: "Markdown"
        });
        return;
    }

    if (data === "sub_list") {
        if (!isAdmin(query.from)) return;
        if (subscriptionsList.length === 0) {
            bot.sendMessage(chatId, "⚠️ هیچ اشتراکی ثبت نشده است.");
            return;
        }
        let textMsg = "📋 **لیست کامل اشتراک‌ها:**\n\n";
        subscriptionsList.forEach((s, idx) => {
            textMsg += `${idx + 1}. **نام:** ${s.name}\n` +
                       `   - ID: \`${s.id}\`\n` +
                       `   - قیمت: ${s.price.toLocaleString()} تومان\n` +
                       `   - حجم: ${s.volume} | مدت: ${s.duration}\n` +
                       `   - تعداد کاربر: ${s.usersCount} | نوع: ${s.type}\n` +
                       `   - وضعیت: ${s.status ? "🟢 فعال" : "🔴 غیرفعال"}\n` +
                       `   - کانفیگ: \`${s.config}\`\n----------------------------------\n`;
        });
        bot.sendMessage(chatId, textMsg, { parse_mode: "Markdown" });
        return;
    }

    if (data === "sub_add") {
        if (!isAdmin(query.from)) return;
        userState[userId].step = "sub_add_name";
        bot.sendMessage(chatId, `➕ **مرحله ۱ از ۷:**\nنام اشتراک را وارد کنید (مثلا: نامحدود ماهانه):`);
        return;
    }

    if (data === "sub_edit_menu") {
        if (!isAdmin(query.from)) return;
        if (subscriptionsList.length === 0) {
            bot.sendMessage(chatId, "⚠️ اشتراکی برای ویرایش وجود ندارد.");
            return;
        }
        let buttons = subscriptionsList.map(s => [{ text: `✏️ ویرایش: ${s.name}`, callback_data: `edit_sub_${s.id}` }]);
        buttons.push([{ text: "🔙 بازگشت", callback_data: "adm_manage_subs" }]);
        bot.sendMessage(chatId, "لطفاً اشتراکی که می‌خواهید ویرایش کنید را انتخاب کنید:", {
            reply_markup: { inline_keyboard: buttons }
        });
        return;
    }

    if (data.startsWith("edit_sub_")) {
        if (!isAdmin(query.from)) return;
        const subId = data.replace("edit_sub_", "");
        userState[userId].editingSubId = subId;
        userState[userId].step = "sub_edit_new_name";
        bot.sendMessage(chatId, `✏️ نام جدید برای اشتراک را وارد کنید:`);
        return;
    }

    if (data === "sub_del_menu") {
        if (!isAdmin(query.from)) return;
        if (subscriptionsList.length === 0) {
            bot.sendMessage(chatId, "⚠️ اشتراکی وجود ندارد.");
            return;
        }
        let buttons = subscriptionsList.map(s => [{ text: `🗑 حذف: ${s.name}`, callback_data: `del_sub_${s.id}` }]);
        buttons.push([{ text: "🔙 بازگشت", callback_data: "adm_manage_subs" }]);
        bot.sendMessage(chatId, "لطفاً اشتراک مورد نظر برای حذف را انتخاب کنید:", {
            reply_markup: { inline_keyboard: buttons }
        });
        return;
    }

    if (data.startsWith("del_sub_")) {
        if (!isAdmin(query.from)) return;
        const subId = data.replace("del_sub_", "");
        subscriptionsList = subscriptionsList.filter(s => s.id !== subId);
        bot.sendMessage(chatId, "✅ اشتراک مورد نظر با موفقیت حذف شد.");
        return;
    }

    if (data === "sub_status_menu") {
        if (!isAdmin(query.from)) return;
        if (subscriptionsList.length === 0) {
            bot.sendMessage(chatId, "⚠️ اشتراکی وجود ندارد.");
            return;
        }
        let buttons = subscriptionsList.map(s => [{ text: `${s.status ? "🟢 فعال (کلیک برای غیرفعال‌سازی)" : "🔴 غیرفعال (کلیک برای فعال‌سازی)"} - ${s.name}`, callback_data: `toggle_status_${s.id}` }]);
        buttons.push([{ text: "🔙 بازگشت", callback_data: "adm_manage_subs" }]);
        bot.sendMessage(chatId, "وضعیت کدام اشتراک را می‌خواهید تغییر دهید؟", {
            reply_markup: { inline_keyboard: buttons }
        });
        return;
    }

    if (data.startsWith("toggle_status_")) {
        if (!isAdmin(query.from)) return;
        const subId = data.replace("toggle_status_", "");
        const sub = subscriptionsList.find(s => s.id === subId);
        if (sub) {
            sub.status = !sub.status;
            bot.sendMessage(chatId, `✅ وضعیت اشتراک «${sub.name}» به ${sub.status ? "🟢 فعال" : "🔴 غیرفعال"} تغییر یافت.`);
        }
        return;
    }

    // --- سایر بخش‌های مدیریت ---
    if (data === "adm_payment_settings") {
        if (!isAdmin(query.from)) return;
        bot.sendMessage(chatId, `💳 شماره کارت: \`${paymentConfig.cardNumber}\`\nنام صاحب کارت: ${paymentConfig.cardHolder}`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✏️ تغییر کارت", callback_data: "adm_edit_card" }],
                    [{ text: "🔙 بازگشت", callback_data: "adm_back_main" }]
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
        userState[userId].step = "waiting_for_new_welcome";
        bot.sendMessage(chatId, `📝 متن جدید خوش‌آمدگویی را ارسال کنید:`);
        return;
    }

    if (data === "adm_stats") {
        if (!isAdmin(query.from)) return;
        let totalMoney = 0;
        Object.values(userBalances).forEach(b => totalMoney += b);
        bot.sendMessage(chatId, `📊 **آمار:**\n👥 کل کاربران: **${allUsers.size} نفر**\n💰 مجموع موجودی کیف پول‌ها: **${totalMoney.toLocaleString()} تومان**`, { parse_mode: "Markdown" });
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

    if (data === "adm_back_main") {
        openAdminPanel(chatId, query.from);
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
        bot.sendMessage(chatId, `💳 مبلغ: 💎 **${parseInt(amount).toLocaleString()} تومان**\nشماره کارت: \`${paymentConfig.cardNumber}\`\nبه نام: ${paymentConfig.cardHolder}\n\nمبلغ را واریز کرده و رسید بفرستید.`, { parse_mode: "Markdown" });
    }
});

// مدیریت مرحله‌ای پیام‌ها و ویزارد افزودن اشتراک
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

    if (isAdmin(msg.from)) {
        // ویزارد مرحله‌به‌مرحله افزودن اشتراک جدید
        if (currentState === "sub_add_name") {
            userState[userId].newSub = { id: "sub_" + Date.now(), name: text, status: true };
            userState[userId].step = "sub_add_price";
            bot.sendMessage(chatId, `💵 **مرحله ۲ از ۷:**\nقیمت اشتراک را به تومان وارد کنید (فقط عدد):`);
            return;
        }
        if (currentState === "sub_add_price") {
            const price = parseInt(text);
            if (isNaN(price)) { bot.sendMessage(chatId, "⚠️ لطفاً عدد معتبر وارد کنید:"); return; }
            userState[userId].newSub.price = price;
            userState[userId].step = "sub_add_volume";
            bot.sendMessage(chatId, `📦 **مرحله ۳ از ۷:**\nحجم اشتراک را وارد کنید (مثلا: 50 GB یا نامحدود):`);
            return;
        }
        if (currentState === "sub_add_volume") {
            userState[userId].newSub.volume = text;
            userState[userId].step = "sub_add_duration";
            bot.sendMessage(chatId, `⏳ **مرحله ۴ از ۷:**\nمدت زمان اشتراک را وارد کنید (مثلا: ۳۰ روز):`);
            return;
        }
        if (currentState === "sub_add_duration") {
            userState[userId].newSub.duration = text;
            userState[userId].step = "sub_add_users";
            bot.sendMessage(chatId, `👥 **مرحله ۵ از ۷:**\nتعداد کاربر مجاز را وارد کنید (مثلا: ۲ کاربر):`);
            return;
        }
        if (currentState === "sub_add_users") {
            userState[userId].newSub.usersCount = text;
            userState[userId].step = "sub_add_type";
            bot.sendMessage(chatId, `🏷 **مرحله ۶ از ۷:**\nنوع اشتراک را وارد کنید (مثلا: Gaming):`);
            return;
        }
        if (currentState === "sub_add_type") {
            userState[userId].newSub.type = text;
            userState[userId].step = "sub_add_config";
            bot.sendMessage(chatId, `🔗 **مرحله ۷ از ۷:**\nلینک کانفیگ مربوطه را وارد کنید:`);
            return;
        }
        if (currentState === "sub_add_config") {
            userState[userId].newSub.config = text;
            subscriptionsList.push(userState[userId].newSub);
            userState[userId].step = null;
            bot.sendMessage(chatId, `✅ اشتراک جدید با تمام جزئیات با موفقیت ساخته و اضافه شد! 🎉`);
            return;
        }

        // ویزارد ویرایش اشتراک
        if (currentState === "sub_edit_new_name") {
            userState[userId].editName = text;
            userState[userId].step = "sub_edit_new_price";
            bot.sendMessage(chatId, `✏️ قیمت جدید را وارد کنید:`);
            return;
        }
        if (currentState === "sub_edit_new_price") {
            const price = parseInt(text);
            const sub = subscriptionsList.find(s => s.id === userState[userId].editingSubId);
            if (sub && !isNaN(price)) {
                sub.name = userState[userId].editName;
                sub.price = price;
                bot.sendMessage(chatId, `✅ اشتراک با موفقیت ویرایش شد!`);
            } else {
                bot.sendMessage(chatId, `⚠️ خطا در ویرایش.`);
            }
            userState[userId].step = null;
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

    // دکمه‌های منوی کاربران (فقط اشتراک‌های فعال 🟢 نمایش داده می‌شوند)
    if (text === "🛒 خرید اشتراک") {
        sendActivityLog(msg.from, "وارد منوی «خرید اشتراک» شد.");
        const activeSubs = subscriptionsList.filter(s => s.status === true);
        if (activeSubs.length === 0) {
            bot.sendMessage(chatId, "⚠️ در حال حاضر هیچ اشتراک فعالی برای فروش وجود ندارد.");
            return;
        }
        let replyMarkupKeys = activeSubs.map(sub => [{ text: `${sub.name} - ${sub.price.toLocaleString()} تومان` }]);
        bot.sendMessage(chatId, botTexts.buyMenuText, {
            reply_markup: {
                keyboard: [...replyMarkupKeys, [{ text: "🔙 بازگشت" }]],
                resize_keyboard: true
            }
        });
        return;
    }

    const selectedSub = subscriptionsList.find(sub => text === `${sub.name} - ${sub.price.toLocaleString()} تومان` && sub.status === true);
    if (selectedSub) {
        userState[userId].amount = selectedSub.price;
        sendActivityLog(msg.from, `اشتراک «${selectedSub.name}» را انتخاب کرد.`);
        bot.sendMessage(chatId, 
            `✅ شما اشتراک زیر را انتخاب کردید:\n\n` +
            `🏷 نام: ${selectedSub.name}\n` +
            `💰 قیمت: ${selectedSub.price.toLocaleString()} تومان\n` +
            `📦 حجم: ${selectedSub.volume}\n` +
            `⏳ مدت: ${selectedSub.duration}\n` +
            `👥 تعداد کاربر: ${selectedSub.usersCount}\n` +
            `🎮 نوع: ${selectedSub.type}\n\n` +
            `لطفاً روش پرداخت را انتخاب کنید:`, {
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
        bot.sendMessage(chatId, `💎 موجودی شما: ${balance.toLocaleString()} تومان\n\nمبلغ مورد نظر برای شارژ کیف پول (تومان) را وارد کنید:`, {
            reply_markup: { keyboard: [[{ text: "انصراف" }]], resize_keyboard: true }
        });
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
        bot.sendMessage(chatId, "🌐 لینک دعوت: https://t.me/" + bot.options.username + "?start=" + userId);
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
            reply_markup: { keyboard: [[{ text: "💳 کارت به کارت" }], [{ text: "انصراف" }]], resize_keyboard: true }
        });
        return;
    }

    if (text === "💳 کارت به کارت") {
        const amount = userState[userId].amount || 50000;
        userState[userId].step = "waiting_for_receipt";
        sendActivityLog(msg.from, `درخواست کارت به کارت برای مبلغ ${amount} تومان داد.`);
        bot.sendMessage(chatId, `💳 مبلغ: 💎 **${parseInt(amount).toLocaleString()} تومان**\nشماره کارت: \`${paymentConfig.cardNumber}\`\nبه نام: ${paymentConfig.cardHolder}\n\nمبلغ را واریز کرده و رسید بفرستید.`, { parse_mode: "Markdown" });
        return;
    }

    if (currentState === "waiting_for_receipt") {
        const amount = userState[userId].amount || 50000;
        if (photo || text) {
            sendActivityLog(msg.from, `رسید پرداخت به مبلغ ${amount} تومان را ارسال کرد.`);
            const userInfo = `👤 کاربر: [${msg.from.first_name || "کاربر"}](tg://user?id=${userId}) (ID: \`${userId}\`)\n💰 مبلغ: ${parseInt(amount).toLocaleString()} تومان`;
            const adminKeyboard = {
                reply_markup: {
                    inline_keyboard: [[{ text: "✅ تایید و شارژ", callback_data: `approve_${userId}_${amount}` }, { text: "❌ رد فیش", callback_data: `reject_${userId}` }]]
                },
                parse_mode: "Markdown"
            };

            if (photo) {
                bot.sendPhoto(ADMIN_CHAT_ID, photo[photo.length - 1].file_id, { caption: `📥 **فیش واریزی جدید**\n\n${userInfo}`, ...adminKeyboard }).catch(() => {});
            } else if (text) {
                bot.sendMessage(ADMIN_CHAT_ID, `📥 **کد پیگیری جدید**\n\n${userInfo}\n📝 متن: ${text}`, adminKeyboard).catch(() => {});
            }

            bot.sendMessage(chatId, "✅ فیش شما برای پشتیبانی ارسال شد.", persistentKeyboard);
            userState[userId].step = null;
        }
    }
});
