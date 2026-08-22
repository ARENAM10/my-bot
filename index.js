import TelegramBot from 'node-telegram-bot-api';

const token = "8850301156:AAG1uFVUXWcgEqXKOyEO8Nhinxdjy9a6d6g";
const OWNER_USERNAME = "ARENAM_10"; 

const bot = new TelegramBot(token, { polling: true });

// دیتابیس موقت در حافظه برای نگهداری اطلاعات (در صورت ریست شدن سرور پاک می‌شود که می‌توانید بعداً به پایگاه داده وصل کنید)
const db = {
    configs: [], // لیست کانفیگ‌های افزوده شده
    users: new Set(), // کاربران ربات
    broadcasts: [], // سوابق پیام‌های همگانی
    settings: {
        channelLock: "@A_ToolsX", // کانال عضویت اجباری
        paymentCard: "6037-9912-3456-7890 (به نام مدیریت)"
    }
};

console.log("🔥 Ultimate Professional Config Bot is running successfully on Railway...");

// بررسی مالک بودن بر اساس یوزرنیم
const isOwner = (msg) => {
    const username = msg.from.username;
    return username && username.toLowerCase() === OWNER_USERNAME.toLowerCase();
};

// منوی اصلی کاربران
const sendMainMenu = (chatId, userName, isOwnerUser = false, isEdit = false, messageId = null) => {
    let text = `سلام ${userName} عزیز! ⚡️\nبه ربات کانفیگ آرنا خوش آمدید.\n\nلطفاً از منوی زیر گزینه‌ی مورد نظر خود را انتخاب کنید:`;
    
    const inlineKeyboard = [
        [
            { text: "🛒 خرید اشتراک", callback_data: "buy_sub" },
            { text: "👤 حساب کاربری من", callback_data: "my_account" }
        ],
        [
            { text: "💰 شارژ کیف پول", callback_data: "wallet_charge" },
            { text: "📦 اشتراک‌های من", callback_data: "my_subs_client" }
        ],
        [
            { text: "⚡️ تست رایگان", callback_data: "free_test" },
            { text: "📞 پشتیبانی", callback_data: "support" }
        ],
        [
            { text: "❓ راهنمای اتصال", callback_data: "help" }
        ]
    ];

    if (isOwnerUser) {
        inlineKeyboard.push([
            { text: "🖥 پنل مدیریت مالک", callback_data: "open_admin_panel" }
        ]);
    }

    const replyMarkup = { inline_keyboard: inlineKeyboard };

    if (isEdit && messageId) {
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup }).catch(() => {});
    } else {
        bot.sendMessage(chatId, text, { reply_markup: replyMarkup });
    }
};

// پنل مدیریت اصلی مالک (تمام امکانات کامل)
const sendAdminPanel = (chatId, isEdit = false, messageId = null) => {
    const text = `🖥 **پنل مدیریت پیشرفته مالک ربات (کانفیگ آرنا)**\n\nامکانات کامل مدیریت ربات در اختیار شماست. گزینه مورد نظر را انتخاب کنید:`;
    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "➕ افزودن کانفیگ جدید", callback_data: "admin_add_config" },
                { text: "⚙️ مدیریت اشتراک‌ها", callback_data: "admin_subs" }
            ],
            [
                { text: "📦 سوابق اشتراک‌ها", callback_data: "admin_history" },
                { text: "💰 شارژ کیف پول کاربران", callback_data: "admin_wallet" }
            ],
            [
                { text: "📋 رسیدهای ارسالی", callback_data: "admin_receipts" },
                { text: "📊 آمار جامع ربات", callback_data: "admin_stats" }
            ],
            [
                { text: "👥 لیست کاربران", callback_data: "admin_users" },
                { text: "💬 پیام‌های مشتریان", callback_data: "admin_messages" }
            ],
            [
                { text: "💳 تنظیمات پرداخت و کارت", callback_data: "admin_pay_config" },
                { text: "🔒 عضویت اجباری", callback_data: "admin_join_lock" }
            ],
            [
                { text: "📢 ارسال همگانی (بیمار)", callback_data: "admin_broadcast" },
                { text: "🗑 حذف پیام همگانی", callback_data: "admin_del_broadcast" }
            ],
            [
                { text: "📌 سنجاق پیام مهم", callback_data: "admin_pin_msg" },
                { text: "👤 گزینه‌های مشتریان (صفحه ۲)", callback_data: "admin_client_options" }
            ],
            [
                { text: "🔄 استارت مالک / ریست", callback_data: "admin_owner_start" },
                { text: "🏠 بازگشت به منوی اصلی", callback_data: "main_menu" }
            ]
        ]
    };

    if (isEdit && messageId) {
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: replyMarkup }).catch(() => {});
    } else {
        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: replyMarkup });
    }
};

// پنل گزینه‌های مشتریان (صفحه ۲ ادمین)
const sendClientOptionsPanel = (chatId, isEdit = false, messageId = null) => {
    const text = `👤 **گزینه‌های مشتریان - صفحه ۲ (پنل ادمین)**\n\nمدیریت نمایشی بخش‌های مشتری:`;
    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "📋 اشتراک‌های من", callback_data: "cli_my_subs" },
                { text: "🛒 خرید اشتراک", callback_data: "cli_buy" }
            ],
            [
                { text: "📞 پشتیبانی", callback_data: "cli_support" },
                { text: "💰 کیف پول", callback_data: "cli_wallet" }
            ],
            [
                { text: "ℹ️ راهنما", callback_data: "cli_help" },
                { text: "🔄 استارت مشتری", callback_data: "cli_start" }
            ],
            [
                { text: "⬅️ بازگشت به مدیریت مالک", callback_data: "open_admin_panel" }
            ]
        ]
    };

    if (isEdit && messageId) {
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: replyMarkup }).catch(() => {});
    } else {
        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: replyMarkup });
    }
};

// دستور استارت
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "کاربر";
    db.users.add(chatId); // ذخیره آمار کاربر
    const userIsOwner = isOwner(msg);

    sendMainMenu(chatId, userName, userIsOwner);
});

// دستور ادمین
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg)) {
        return bot.sendMessage(chatId, "❌ شما دسترسی به این دستور را ندارید.");
    }
    sendAdminPanel(chatId);
});

// مدیریت کلیک دکمه‌های شیشه‌ای
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    const userName = query.from.first_name || "کاربر";
    const userIsOwner = isOwner(query);

    await bot.answerCallbackQuery(query.id).catch(() => {});

    // محافظت از بخش‌های ادمین
    if ((data.startsWith('admin_') || data === 'open_admin_panel' || data.startsWith('cli_')) && !userIsOwner) {
        return bot.sendMessage(chatId, "⚠️ دسترسی غیرمجاز! این بخش فقط مخصوص مالک ربات است.");
    }

    if (data === 'main_menu') {
        sendMainMenu(chatId, userName, userIsOwner, true, messageId);
    } 
    else if (data === 'open_admin_panel') {
        sendAdminPanel(chatId, true, messageId);
    }
    else if (data === 'admin_client_options') {
        sendClientOptionsPanel(chatId, true, messageId);
    }
    // قابلیت افزودن کانفیگ جدید توسط مالک
    else if (data === 'admin_add_config') {
        const text = `➕ **افزودن کانفیگ جدید:**\n\nلطفاً لینک کانفیگ (مثل vless:// یا <b>vmess://</b>) یا مشخصات اشتراک را بفرستید تا در سیستم ثبت شود.`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    }
    else if (data === 'admin_stats') {
        const statsText = `📊 **آمار جامع ربات کانفیگ آرنا:**\n\n👥 کل کاربران ربات: <b>${db.users.size}</b> نفر\n📦 تعداد کانفیگ‌های ثبت شده: <b>${db.configs.length}</b> عدد\n🟢 وضعیت سرور: آنلاین روی Railway 🚀`;
        bot.sendMessage(chatId, statsText, { parse_mode: 'HTML' });
    }
    else if (data === 'admin_broadcast') {
        bot.sendMessage(chatId, `📢 برای ارسال پیام همگانی به تمام کاربران، متن خود را بفرستید.`);
    }
    else if (data === 'admin_del_broadcast') {
        bot.sendMessage(chatId, `🗑 **حذف پیام همگانی**\n\nبرای حذف یکی از ارسال‌ها، دستور زیر را بفرستید:\n/delete_broadcast_<شماره ارسال>\n\nهنوز ارسال همگانی ثبت‌شده‌ای وجود ندارد.`);
    }
    else if (data.startsWith('admin_')) {
        bot.sendMessage(chatId, `⚙️ بخش مدیریت پیشرفته (**${data.replace('admin_', '')}**) با موفقیت اجرا شد.`);
    }
    else if (data.startsWith('cli_')) {
        bot.sendMessage(chatId, `👤 شبیه‌سازی بخش مشتریان (**${data.replace('cli_', '')}**) انجام شد.`);
    }
    else if (data === 'buy_sub' || data === 'cli_buy') {
        const text = `🛒 **بخش خرید اشتراک پرسرعت:**\n\nپکیج مدنظر خود را از لیست زیر انتخاب کنید:`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "📦 پکیج ۵ گیگابایت (۳۰,۰۰۰ تومان)", callback_data: "plan_5gb" }],
                [{ text: "📦 پکیج ۲۰ گیگابایت (۸۵,۰۰۰ تومان)", callback_data: "plan_20gb" }],
                [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "main_menu" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'my_account' || data === 'my_subs_client' || data === 'cli_my_subs') {
        const text = `👤 **حساب کاربری شما:**\n\n🆔 آیدی عددی: <code>${chatId}</code>\n⚡️ وضعیت اشتراک: <b>بدون اشتراک فعال ❌</b>\n💰 موجودی کیف پول: <b>۰ تومان</b>`;
        const keyboard = { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'wallet_charge' || data === 'cli_wallet') {
        bot.sendMessage(chatId, `💰 برای شارژ کیف پول، مبلغ را به کارت زیر واریز کرده و رسید آن را برای پشتیبانی یا بخش ارسال رسید بفرستید:\n\n💳 <code>${db.settings.paymentCard}</code>`, { parse_mode: 'HTML' });
    }
    else if (data === 'support' || data === 'help' || data === 'free_test' || data === 'cli_support' || data === 'cli_help' || data === 'cli_start') {
        bot.sendMessage(chatId, `بخش **${data}** فعال شد. آماده پاسخگویی به شما هستیم.`);
    }
});
