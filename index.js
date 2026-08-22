import TelegramBot from 'node-telegram-bot-api';

const token = "8850301156:AAG1uFVUXWcgEqXKOyEO8Nhinxdjy9a6d6g";
const OWNER_USERNAME = "ARENAM_10"; 

const bot = new TelegramBot(token, { polling: true });

// دیتابیس موقت ربات
const db = {
    configs: [], 
    users: new Set(),
    walletRequests: [
        { id: 1, user: "@Emirrm80", card: "5382980412", amount: "۱۰۰,۰۰۰ تومان" }
    ],
    settings: {
        cardNumber: "6219861861735792",
        cardOwner: "مزراعی",
        bankName: "بلو",
        payGuide: "لطفا پس از واریز رسید خود را ارسال کنید"
    }
};

console.log("🔥 Clean Bot without Join Lock is running successfully...");

const isOwner = (msg) => {
    const username = msg.from.username;
    return username && username.toLowerCase() === OWNER_USERNAME.toLowerCase();
};

// منوی مدیریت بدون دکمه عضویت اجباری
const sendAdminPanel = (chatId, isEdit = false, messageId = null) => {
    const text = `گزینه موردنظر را انتخاب کنید.`;
    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "🛒 مدیریت اشتراک", callback_data: "admin_subs" },
                { text: "📦 سوابق اشتراک‌ها", callback_data: "admin_history" }
            ],
            [
                { text: "💰 شارژ کیف پول", callback_data: "admin_wallet" },
                { text: "📋 رسیدها", callback_data: "admin_receipts" }
            ],
            [
                { text: "📊 آمار", callback_data: "admin_stats" },
                { text: "👥 کاربران", callback_data: "admin_users" }
            ],
            [
                { text: "💬 پیام مشتریان", callback_data: "admin_messages" },
                { text: "💳 تنظیمات پرداخت", callback_data: "admin_pay_config" }
            ],
            [
                { text: "📢 ارسال همگانی", callback_data: "admin_broadcast" },
                { text: "🗑 حذف پیام", callback_data: "admin_del_broadcast" }
            ],
            [
                { text: "📌 سنجاق پیام", callback_data: "admin_pin_msg" },
                { text: "👤 گزینه‌های مشتریان", callback_data: "admin_client_options" }
            ],
            [
                { text: "🔄 استارت مالک", callback_data: "admin_owner_start" },
                { text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }
            ]
        ]
    };

    if (isEdit && messageId) {
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup }).catch(() => {});
    } else {
        bot.sendMessage(chatId, text, { reply_markup: replyMarkup });
    }
};

// منوی اصلی کاربران
const sendMainMenu = (chatId, userName, isOwnerUser = false, isEdit = false, messageId = null) => {
    let text = `سلام ${userName} عزیز! ⚡️\nبه ربات کانفیگ آرنا خوش آمدید.`;
    const replyMarkup = {
        inline_keyboard: [
            [{ text: "🛒 خرید اشتراک", callback_data: "buy_sub" }, { text: "👤 حساب کاربری من", callback_data: "my_account" }],
            [{ text: "💰 شارژ کیف پول", callback_data: "wallet_charge" }, { text: "📦 اشتراک‌های من", callback_data: "my_subs_client" }],
            [{ text: "⚡️ تست رایگان", callback_data: "free_test" }, { text: "📞 پشتیبانی", callback_data: "support" }],
            [{ text: "❓ راهنمای اتصال", callback_data: "help" }]
        ]
    };
    if (isOwnerUser) {
        replyMarkup.inline_keyboard.push([{ text: "🖥 پنل مدیریت", callback_data: "open_admin_panel" }]);
    }

    if (isEdit && messageId) {
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup }).catch(() => {});
    } else {
        bot.sendMessage(chatId, text, { reply_markup: replyMarkup });
    }
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    db.users.add(chatId);
    sendMainMenu(chatId, msg.from.first_name || "کاربر", isOwner(msg));
});

bot.onText(/\/admin/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ دسترسی غیرمجاز.");
    sendAdminPanel(msg.chat.id);
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    const userIsOwner = isOwner(query);

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if ((data.startsWith('admin_') || data === 'open_admin_panel' || data.startsWith('cli_')) && !userIsOwner) {
        return bot.sendMessage(chatId, "⚠️ دسترسی فقط برای مالک ربات مجاز است.");
    }

    if (data === 'main_menu' || data === 'cli_start') {
        sendMainMenu(chatId, query.from.first_name || "کاربر", userIsOwner, true, messageId);
    }
    else if (data === 'open_admin_panel' || data === 'admin_owner_start') {
        sendAdminPanel(chatId, true, messageId);
    }
    else if (data === 'admin_subs') {
        const text = `📦 **مدیریت پکیج‌ها**\n\nبرای مشاهده یا ویرایش هر اشتراک، روی آن بزنید.\nوضعیت ✅ فعال و ⏸ غیرفعال است.`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "➕ افزودن اشتراک", callback_data: "admin_add_config" }],
                [{ text: "⚡️ ۵ گیگ ✅", callback_data: "edit_pkg_5gb" }],
                [{ text: "🔙 بازگشت به مدیریت", callback_data: "open_admin_panel" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'admin_history') {
        const text = `📦 **فروش‌های معتبر اشتراک**\n\n___________________\n\nهنوز فروش تأییدشده و دارای اطلاعات کامل وجود ندارد.`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "🔙 بازگشت به مدیریت", callback_data: "open_admin_panel" }],
                [{ text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'admin_wallet') {
        let text = `✅ هیچ رسیدی در انتظار تأیید وجود ندارد.`;
        if (db.walletRequests.length > 0) {
            const req = db.walletRequests[0];
            text = `💰 **درخواست‌های شارژ کیف پول (۱ مورد)**\n\n🆔 #${req.id}\n👤 ${req.user}\n📞 ${req.card}\n\n💵 ${req.amount}\n✅ تأیید: /approve_wallet_${req.id}\n❌ رد: /reject_wallet_${req.id}`;
        }
        const keyboard = {
            inline_keyboard: [
                [{ text: "🔙 بازگشت به مدیریت", callback_data: "open_admin_panel" }],
                [{ text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'admin_receipts') {
        bot.editMessageText(`✅ هیچ رسیدی در انتظار تأیید وجود ندارد.`, {
            chat_id: chatId, message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 بازگشت به مدیریت", callback_data: "open_admin_panel" }],
                    [{ text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]
                ]
            }
        }).catch(() => {});
    }
    else if (data === 'admin_stats') {
        const text = `📊 **آمار ربات**\n\n👥 تعداد کاربران: ${db.users.size}\n⏳ رسیدهای در انتظار: 0`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "🔙 بازگشت به مدیریت", callback_data: "open_admin_panel" }],
                [{ text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'admin_pay_config') {
        const s = db.settings;
        const text = `💳 **تنظیمات پرداخت**\n\n🏦 شماره کارت: ${s.cardNumber}\n👤 نام صاحب کارت: ${s.cardOwner}\n🏛 بانک: ${s.bankName}\n📝 متن راهنمای پرداخت: ${s.payGuide}`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "💳 شماره کارت", callback_data: "set_card" }, { text: "👤 نام صاحب کارت", callback_data: "set_owner" }],
                [{ text: "🏛 نام بانک", callback_data: "set_bank" }, { text: "📝 متن راهنمای پرداخت", callback_data: "set_guide" }],
                [{ text: "🔙 بازگشت به مدیریت", callback_data: "open_admin_panel" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'admin_broadcast') {
        const text = `📢 **پیام همگانی**\n\nمتن پیام خود را ارسال کنید.\nبرای لغو، «لغو» را بفرستید.`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "🔙 بازگشت به مدیریت", callback_data: "open_admin_panel" }],
                [{ text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'admin_del_broadcast') {
        const text = `🗑 **حذف پیام همگانی**\n\nبرای حذف یکی از ارسال‌های ثبت‌شده، دستور زیر را بفرستید:\n<شماره ارسال>/delete_broadcast_\n\nهنوز ارسال همگانی ثبت‌شده‌ای وجود ندارد.`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "🔙 بازگشت به مدیریت", callback_data: "open_admin_panel" }],
                [{ text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'admin_client_options') {
        const text = `👤 **گزینه‌های مشتریان - صفحه ۲**\n\n___________________\n\nبخش موردنظر را انتخاب کنید.`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "📋 اشتراک‌های من", callback_data: "cli_my_subs" }, { text: "🛒 خرید اشتراک", callback_data: "cli_buy" }],
                [{ text: "📞 پشتیبانی", callback_data: "cli_support" }, { text: "💰 کیف پول", callback_data: "cli_wallet" }],
                [{ text: "ℹ️ راهنما", callback_data: "cli_help" }, { text: "🔄 استارت مشتری", callback_data: "cli_start" }],
                [{ text: "⬅️ بازگشت به مدیریت مالک", callback_data: "open_admin_panel" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
});
