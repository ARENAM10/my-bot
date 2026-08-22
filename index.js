import TelegramBot from 'node-telegram-bot-api';

const token = "8850301156:AAG1uFVUXWcgEqXKOyEO8Nhinxdjy9a6d6g";

// ⚠️ شناسه عددی مالک ربات
const OWNER_ID = 8850301156; 

const bot = new TelegramBot(token, { polling: true });

console.log("🔥 Ultimate Config Bot is running successfully on Railway...");

// منوی اصلی کاربران عادی
const sendMainMenu = (chatId, userName, isEdit = false, messageId = null) => {
    let text = `سلام ${userName} عزیز! ⚡️\nبه ربات کانفیگ آرنا خوش آمدید.\n\nلطفاً از منوی زیر گزینه‌ی مورد نظر خود را انتخاب کنید:`;
    
    const inlineKeyboard = [
        [
            { text: "🛒 خرید اشتراک", callback_data: "buy_sub" },
            { text: "👤 حساب کاربری من", callback_data: "my_account" }
        ],
        [
            { text: "⚡️ تست رایگان", callback_data: "free_test" },
            { text: "📞 پشتیبانی", callback_data: "support" }
        ],
        [
            { text: "❓ راهنمای اتصال", callback_data: "help" }
        ]
    ];

    if (chatId === OWNER_ID) {
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

// پنل مدیریت اصلی مالک
const sendAdminPanel = (chatId, isEdit = false, messageId = null) => {
    const text = `🖥 **پنل مدیریت اختصاصی مالک ربات**\n\nگزینه مورد نظر را انتخاب کنید:`;
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
                { text: "💳 تنظیمات پرداخت", callback_data: "admin_pay_config" },
                { text: "💬 پیام مشتریان", callback_data: "admin_messages" }
            ],
            [
                { text: "🔒 عضویت اجباری", callback_data: "admin_join_lock" },
                { text: "📢 ارسال همگانی", callback_data: "admin_broadcast" }
            ],
            [
                { text: "👤 گزینه‌های مشتریان", callback_data: "admin_client_options" }
            ],
            [
                { text: "🔙 بازگشت به منوی اصلی", callback_data: "main_menu" }
            ]
        ]
    };

    if (isEdit && messageId) {
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: replyMarkup }).catch(() => {});
    } else {
        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: replyMarkup });
    }
};

// پنل گزینه‌های مشتریان (صفحه ۲ - ادمین)
const sendClientOptionsPanel = (chatId, isEdit = false, messageId = null) => {
    const text = `👤 **گزینه‌های مشتریان - صفحه ۲**\n\nبخش موردنظر را انتخاب کنید:`;
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
    console.log(`User Chat ID: ${chatId} | Name: ${userName}`);
    sendMainMenu(chatId, userName);
});

// دستور ادمین
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId !== OWNER_ID) {
        return bot.sendMessage(chatId, "❌ شما دسترسی به این دستور را ندارید.");
    }
    sendAdminPanel(chatId);
});

// مدیریت کلیک دکمه‌ها
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    const userName = query.from.first_name || "کاربر";

    await bot.answerCallbackQuery(query.id).catch(() => {});

    // بررسی دسترسی ادمین
    if ((data.startsWith('admin_') || data === 'open_admin_panel' || data.startsWith('cli_')) && chatId !== OWNER_ID) {
        return bot.sendMessage(chatId, "⚠️ دسترسی غیرمجاز! این بخش فقط مخصوص مالک ربات است.");
    }

    if (data === 'main_menu') {
        sendMainMenu(chatId, userName, true, messageId);
    } 
    else if (data === 'open_admin_panel') {
        sendAdminPanel(chatId, true, messageId);
    }
    else if (data === 'admin_client_options') {
        sendClientOptionsPanel(chatId, true, messageId);
    }
    // مدیریت گزینه‌های صفحه مشتریان
    else if (data.startsWith('cli_')) {
        const optionName = data.replace('cli_', '');
        bot.sendMessage(chatId, `⚙️ بخش مشتریان (**${optionName}**) از طریق پنل ادمین مدیریت شد.`);
    }
    else if (data === 'buy_sub') {
        const text = `🛒 **بخش خرید اشتراک**\n\nپکیج مدنظر خود را انتخاب کنید:`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "📦 پکیج ۵ گیگابایت (۳۰ ت)", callback_data: "plan_5gb" }],
                [{ text: "🔙 بازگشت", callback_data: "main_menu" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'my_account') {
        const text = `👤 **اطلاعات حساب کاربری:**\n\n🆔 شناسه: ${chatId}\n⚡️ وضعیت: بدون اشتراک فعال ❌`;
        const keyboard = { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'support' || data === 'help' || data === 'free_test') {
        bot.sendMessage(chatId, `بخش ${data} فعال شد.`);
    }
    else if (data.startsWith('admin_')) {
        if (data === 'admin_stats') {
            bot.sendMessage(chatId, `📊 **آمار ربات:**\n\n🟢 وضعیت: آنلاین روی Railway`);
        } else {
            bot.sendMessage(chatId, `⚙️ بخش مدیریتی **${data.replace('admin_', '')}** فراخوانی شد.`);
        }
    }
});
