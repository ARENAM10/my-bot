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

// لیست اشتراک‌ها با جزئیات کامل مطابق ساختار شما
let subscriptionsList = [
    {
        id: "sub_1",
        name: "نامحدود ۱ ماهه - ۱ کاربر",
        price: 50000,
        volume: "نامحدود",
        duration: "۳۰ روز",
        usersCount: "۱ کاربر",
        type: "Gaming",
        config: "vless://acc-uuid-1111-gaming-config...",
        status: true
    },
    {
        id: "sub_2",
        name: "حجمی ۱۰۰ گیگ",
        price: 70000,
        volume: "100 GB",
        duration: "۶۰ روز",
        usersCount: "نامحدود",
        type: "General",
        config: "vmess://acc-uuid-2222-general-config...",
        status: true
    }
];

// دیتابیس موقت سفارش‌ها و اشتراک‌های فعال کاربران
const orders = {}; // کلید: orderId
const userActiveSubs = {}; // کلید: userId (آرایه‌ای از اشتراک‌های فعال کاربر)

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

    // مدیریت اشتراک‌ها توسط ادمین
    if (data === "adm_manage_subs") {
        if (!isAdmin(query.from)) return;
        bot.sendMessage(chatId, `🛒 **بخش مدیریت اشتراک‌ها**`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📋 لیست اشتراک‌ها", callback_data: "sub_list" }],
                    [{ text: "➕ افزودن اشتراک", callback_data: "sub_add" }],
                    [{ text: "✏️ ویرایش اشتراک", callback_data: "sub_edit_menu" }, { text: "🗑 حذف اشتراک", callback_data: "sub_del_menu" }],
                    [{ text: "🔴/🟢 فعال/غیرفعال", callback_data: "sub_status_menu" }],
                    [{ text: "🔙 بازگشت", callback_data: "adm_back_main" }]
                ]
            }
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
        bot.sendMessage(chatId, `➕ **مرحله ۱ از ۷:** نام اشتراک را وارد کنید:`);
        return;
    }

    if (data === "sub_edit_menu") {
        if (!isAdmin(query.from)) return;
        let buttons = subscriptionsList.map(s => [{ text: `✏️ ویرایش: ${s.name}`, callback_data: `edit_sub_${s.id}` }]);
        buttons.push([{ text: "🔙 بازگشت", callback_data: "adm_manage_subs" }]);
        bot.sendMessage(chatId, "اشتراک مورد نظر برای ویرایش را انتخاب کنید:", { reply_markup: { inline_keyboard: buttons } });
        return;
    }

    if (data.startsWith("edit_sub_")) {
        if (!isAdmin(query.from)) return;
        userState[userId].editingSubId = data.replace("edit_sub_", "");
        userState[userId].step = "sub_edit_new_name";
        bot.sendMessage(chatId, `✏️ نام جدید اشتراک را وارد کنید:`);
        return;
    }

    if (data === "sub_del_menu") {
        if (!isAdmin(query.from)) return;
        let buttons = subscriptionsList.map(s => [{ text: `🗑 حذف: ${s.name}`, callback_data: `del_sub_${s.id}` }]);
        buttons.push([{ text: "🔙 بازگشت", callback_data: "adm_manage_subs" }]);
        bot.sendMessage(chatId, "اشتراک مورد نظر برای حذف را انتخاب کنید:", { reply_markup: { inline_keyboard: buttons } });
        return;
    }

    if (data.startsWith("del_sub_")) {
        if (!isAdmin(query.from)) return;
        const subId = data.replace("del_sub_", "");
        subscriptionsList = subscriptionsList.filter(s => s.id !== subId);
        bot.sendMessage(chatId, "✅ اشتراک حذف شد.");
        return;
    }

    if (data === "sub_status_menu") {
        if (!isAdmin(query.from)) return;
        let buttons = subscriptionsList.map(s => [{ text: `${s.status ? "🟢 فعال" : "🔴 غیرفعال"} - ${s.name}`, callback_data: `toggle_status_${s.id}` }]);
        buttons.push([{ text: "🔙 بازگشت", callback_data: "adm_manage_subs" }]);
        bot.sendMessage(chatId, "تغییر وضعیت اشتراک:", { reply_markup: { inline_keyboard: buttons } });
        return;
    }

    if (data.startsWith("toggle_status_")) {
        if (!isAdmin(query.from)) return;
        const sub = subscriptionsList.find(s => s.id === data.replace("toggle_status_", ""));
        if (sub) {
            sub.status = !sub.status;
            bot.sendMessage(chatId, `✅ وضعیت به ${sub.status ? "🟢 فعال" : "🔴 غیرفعال"} تغییر یافت.`);
        }
        return;
    }

    // --- فلوچارت پرداخت و تأیید سفارش توسط مالک ---
    if (data.startsWith("pay_card_")) {
        const subId = data.replace("pay_card_", "");
        const sub = subscriptionsList.find(s => s.id === subId);
        if (!sub) return;

        // 📦 ایجاد Order
        const orderId = "ord_" + Date.now();
        orders[orderId] = {
            userId: userId,
            subId: sub.id,
            subName: sub.name,
            price: sub.price,
            volume: sub.volume,
            duration: sub.duration,
            usersCount: sub.usersCount,
            type: sub.type,
            config: sub.config,
            status: "PendingPayment"
        };

        userState[userId].currentOrderId = orderId;
        userState[userId].step = "waiting_for_receipt";

        sendActivityLog(query.from, `سفارش جدید با کد ${orderId} برای اشتراک «${sub.name}» ایجاد کرد.`);

        bot.sendMessage(chatId, 
            `📦 **سفارش شما ایجاد شد (کد: \`${orderId}\`)**\n\n` +
            `💳 لطفاً مبلغ **${sub.price.toLocaleString()} تومان** را به کارت زیر واریز نمایید:\n\n` +
            `شماره کارت: \`${paymentConfig.cardNumber}\`\n` +
            `به نام: ${paymentConfig.cardHolder}\n\n` +
            `📸 **حالا عکس رسید یا کد پیگیری واریز را برای ربات ارسال کنید.**`,
            { parse_mode: "Markdown" }
        );
        return;
    }

    // 👑 تأیید مالک (تایید فیش و تکمیل Order و ارسال کانفیگ)
    if (data.startsWith("approve_order_")) {
        if (!isAdmin(query.from)) return;
        const orderId = data.replace("approve_order_", "");
        const order = orders[orderId];

        if (!order) {
            bot.sendMessage(chatId, "⚠️ سفارش مورد نظر یافت نشد یا منقضی شده است.");
            return;
        }

        order.status = "Completed"; // ✅ تکمیل Order

        // ذخیره در اشتراک‌های کاربر
        if (!userActiveSubs[order.userId]) userActiveSubs[order.userId] = [];
        userActiveSubs[order.userId].push({
            name: order.subName,
            volume: order.volume,
            duration: order.duration,
            usersCount: order.usersCount,
            type: order.type,
            config: order.config,
            date: new Date().toLocaleDateString('fa-IR')
        });

        // 🔗 اختصاص کانفیگ و 📊 استخراج حجم و زمان، سپس 📨 ارسال برای کاربر
        const successMsg = `🎉 **پرداخت و سفارش شما تایید شد! اشتراک شما فعال گردید.**\n\n` +
                           `🏷 نام اشتراک: ${order.subName}\n` +
                           `📦 حجم اختصاص‌یافته: ${order.volume}\n` +
                           `⏳ مدت زمان: ${order.duration}\n` +
                           `👥 تعداد کاربر: ${order.usersCount}\n` +
                           `🎮 نوع سرور: ${order.type}\n\n` +
                           `🔗 **کانفیگ اختصاصی شما:**\n\`${order.config}\`\n\n` +
                           `📖 از بخش «آموزش اتصال» می‌توانید نحوه راه‌اندازی را مطالعه کنید.`;

        bot.sendMessage(order.userId, successMsg, { parse_mode: "Markdown", ...persistentKeyboard }).catch(() => {});
        bot.sendMessage(chatId, `✅ سفارش ${orderId} با موفقیت تایید و کانفیگ به کاربر ارسال شد.`);
        return;
    }

    if (data.startsWith("reject_order_")) {
        if (!isAdmin(query.from)) return;
        const orderId = data.replace("reject_order_", "");
        const order = orders[orderId];
        if (order) {
            order.status = "Rejected";
            bot.sendMessage(order.userId, `❌ فیش واریزی سفارش ${orderId} توسط مدیریت رد شد. لطفا با پشتیبانی در ارتباط باشید.`).catch(() => {});
        }
        bot.sendMessage(chatId, `❌ سفارش رد شد.`);
        return;
    }

    // تنظیمات دیگر پنل ادمین
    if (data === "adm_payment_settings") {
        if (!isAdmin(query.from)) return;
        bot.sendMessage(chatId, `💳 شماره کارت: \`${paymentConfig.cardNumber}\`\nنام صاحب کارت: ${paymentConfig.cardHolder}`, {
            reply_markup: { inline_keyboard: [[{ text: "✏️ تغییر کارت", callback_data: "adm_edit_card" }], [{ text: "🔙 بازگشت", callback_data: "adm_back_main" }]] },
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
        bot.sendMessage(chatId, `📊 **آمار ربات:**\n👥 کل کاربران: **${allUsers.size} نفر**`, { parse_mode: "Markdown" });
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
});

// مدیریت پیام‌ها و ویزاردها
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
        // ویزارد افزودن اشتراک
        if (currentState === "sub_add_name") {
            userState[userId].newSub = { id: "sub_" + Date.now(), name: text, status: true };
            userState[userId].step = "sub_add_price";
            bot.sendMessage(chatId, `💵 قیمت اشتراک را به تومان وارد کنید:`);
            return;
        }
        if (currentState === "sub_add_price") {
            const price = parseInt(text);
            if (isNaN(price)) { bot.sendMessage(chatId, "⚠️ قیمت معتبر وارد کنید:"); return; }
            userState[userId].newSub.price = price;
            userState[userId].step = "sub_add_volume";
            bot.sendMessage(chatId, `📦 حجم اشتراک (مثلا 50 GB):`);
            return;
        }
        if (currentState === "sub_add_volume") {
            userState[userId].newSub.volume = text;
            userState[userId].step = "sub_add_duration";
            bot.sendMessage(chatId, `⏳ مدت زمان (مثلا ۳۰ روز):`);
            return;
        }
        if (currentState === "sub_add_duration") {
            userState[userId].newSub.duration = text;
            userState[userId].step = "sub_add_users";
            bot.sendMessage(chatId, `👥 تعداد کاربر (مثلا ۱ کاربر):`);
            return;
        }
        if (currentState === "sub_add_users") {
            userState[userId].newSub.usersCount = text;
            userState[userId].step = "sub_add_type";
            bot.sendMessage(chatId, `🏷 نوع اشتراک (مثلا Gaming):`);
            return;
        }
        if (currentState === "sub_add_type") {
            userState[userId].newSub.type = text;
            userState[userId].step = "sub_add_config";
            bot.sendMessage(chatId, `🔗 لینک کانفیگ مربوطه:`);
            return;
        }
        if (currentState === "sub_add_config") {
            userState[userId].newSub.config = text;
            subscriptionsList.push(userState[userId].newSub);
            userState[userId].step = null;
            bot.sendMessage(chatId, `✅ اشتراک جدید با موفقیت اضافه شد!`);
            return;
        }

        // ویرایش اشتراک
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
                bot.sendMessage(chatId, `✅ اشتراک ویرایش شد!`);
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
            bot.sendMessage(chatId, `💰 مبلغ شارژ کیف پول (تومان):`);
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

    // 🛒 مرحله 1: 🛒 انتخاب اشتراک توسط کاربر
    if (text === "🛒 خرید اشتراک") {
        sendActivityLog(msg.from, "وارد منوی «خرید اشتراک» شد.");
        const activeSubs = subscriptionsList.filter(s => s.status === true);
        if (activeSubs.length === 0) {
            bot.sendMessage(chatId, "⚠️ در حال حاضر هیچ اشتراک فعالی وجود ندارد.");
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
        sendActivityLog(msg.from, `اشتراک «${selectedSub.name}» را برای خرید انتخاب کرد.`);
        bot.sendMessage(chatId, 
            `✅ مشخصات اشتراک انتخابی:\n\n` +
            `🏷 نام: ${selectedSub.name}\n` +
            `💰 قیمت: ${selectedSub.price.toLocaleString()} تومان\n` +
            `📦 حجم: ${selectedSub.volume}\n` +
            `⏳ مدت: ${selectedSub.duration}\n` +
            `👥 تعداد کاربر: ${selectedSub.usersCount}\n\n` +
            `لطفاً روش پرداخت را انتخاب کنید:`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "💳 پرداخت کارت به کارت", callback_data: `pay_card_${selectedSub.id}` }]
                ]
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
        bot.sendMessage(chatId, `💎 موجودی کیف پول شما: ${balance.toLocaleString()} تومان`);
        return;
    }

    // 📦 اشتراک‌های من
    if (text === "📦 اشتراک‌های من") {
        sendActivityLog(msg.from, "بخش «اشتراک‌های من» را بررسی کرد.");
        const userSubs = userActiveSubs[userId];
        if (!userSubs || userSubs.length === 0) {
            bot.sendMessage(chatId, "📁 شما در حال حاضر هیچ اشتراک فعالی ندارید.");
            return;
        }
        let msgText = "📦 **اشتراک‌های فعال شما:**\n\n";
        userSubs.forEach((sub, idx) => {
            msgText += `${idx + 1}. **${sub.name}**\n` +
                       `   - حجم: ${sub.volume} | مدت: ${sub.duration}\n` +
                       `   - کانفیگ: \`${sub.config}\`\n--------------------------\n`;
        });
        bot.sendMessage(chatId, msgText, { parse_mode: "Markdown" });
        return;
    }

    if (text === "📖 آموزش اتصال") {
        sendActivityLog(msg.from, "بخش «آموزش اتصال» را باز کرد.");
        bot.sendMessage(chatId, "📖 راهنمای اتصال به سرورها در اپلیکیشن‌های مختلف...");
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

    // 📸 مرحله 5 و 6: ارسال رسید و ارسال برای تایید مالک
    if (currentState === "waiting_for_receipt") {
        const orderId = userState[userId].currentOrderId;
        const order = orders[orderId];

        if (order && (photo || text)) {
            sendActivityLog(msg.from, `رسید پرداخت سفارش ${orderId} را ارسال کرد.`);
            order.status = "PendingApproval";

            const userInfo = `👤 کاربر: [${msg.from.first_name || "کاربر"}](tg://user?id=${userId}) (ID: \`${userId}\`)\n` +
                             `📦 سفارش: \`${orderId}\`\n` +
                             `🏷 اشتراک: ${order.subName}\n` +
                             `💰 مبلغ: ${order.price.toLocaleString()} تومان`;

            const adminKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ تأیید و ارسال کانفیگ", callback_data: `approve_order_${orderId}` },
                            { text: "❌ رد سفارش", callback_data: `reject_order_${orderId}` }
                        ]
                    ]
                },
                parse_mode: "Markdown"
            };

            if (photo) {
                bot.sendPhoto(ADMIN_CHAT_ID, photo[photo.length - 1].file_id, {
                    caption: `📥 **فیش واریزی جدید (در انتظار تایید مالک)**\n\n${userInfo}`,
                    ...adminKeyboard
                }).catch(() => {});
            } else if (text) {
                bot.sendMessage(ADMIN_CHAT_ID, `📥 **رسید متنی جدید (در انتظار تایید مالک)**\n\n${userInfo}\n📝 متن: ${text}`, adminKeyboard).catch(() => {});
            }

            bot.sendMessage(chatId, "✅ فیش و رسید شما ثبت و برای مالک ارسال شد. پس از تایید، کانفیگ شما به همراه جزئیات حجم و زمان ارسال خواهد شد.", persistentKeyboard);
            userState[userId].step = null;
        }
    }
});
