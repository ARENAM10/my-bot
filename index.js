{            const freeCount = db.configs.fil        const balance = db.wallets[chatId] || 0;
        if (balance < product.price) return bot.answerCallbackQuery(query.id, { text: "❌ موجودی کیف پول کافی نیست!", show_alert: true });

        db.wallets[chatId] -= product.price;
        freeConfig.sold = true;
        freeConfig.soldTo = chatId;

        bot.editMessageText(`✅ **خرید موفقیت‌آمیز بود!**\n\n\`${freeConfig.config}\``, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🏠 منوی اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    else if (data === 'wallet_charge') {
        adminState[chatId] = { action: "waiting_for_receipt" };
        const s = db.settings;
        bot.editMessageText(`💰 مبلغ را به کارت زیر واریز کرده و رسید آن را ارسال کنید:\n\`${s.cardNumber}\` (${s.cardOwner})`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { import TelegramBot from 'node-telegram-bot-api';

const token = "8850301156:AAGB5ewQkolWaLg2kjKL-cL8KXDhrbNciHQ";
const ADMIN_USERNAME = "ARENAM_10";

const bot = new TelegramBot(token, { polling: true });

// دیتابیس کامل و پیشرفته ربات
const db = {
    configs: [], 
    products: [
        { id: 1, name: "تست سرعت بالا", volume: 5, days: 30, price: 0, isTest: true, active: true },
        { id: 2, name: "5 گیگ ⚡️", volume: 5, days: 30, price: 50000, active: true }
    ],
    users: new Set(),
    wallets: {}, 
    receiptRequests: [], 
    broadcasts: [], // لیست ارسال‌های همگانی
    settings: {
        cardNumber: "6219861861735792",
        cardOwner: "مزراعی",
        bankName: "بلو",
        payGuide: "لطفا پس از واریز رسید خود را ارسال کنید",
        forceChannel: "", // کانال عضویت اجباری (خالی = خاموش)
        pinMessageId: null
    }
};

const adminState = {};

console.log("🔥 Arena Bot with All Admin Features is running...");

const isOwner = (msgOrQuery) => {
    const user = msgOrQuery.from || msgOrQuery.chat;
    const username = user.username;
    return username && username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
};

// ================= منوی اصلی کاربر =================
const sendMainMenu = (chatId, firstName, isOwnerUser = false, edit = false, messageId = null) => {
    db.users.add(chatId);
    if (!db.wallets[chatId]) db.wallets[chatId] = 0;

    let text = `سلام ${firstName} عزیز! ⚡️\nبه ربات کانفیگ آرنا خوش آمدید.\n\n💰 موجودی کیف پول: ${db.wallets[chatId].toLocaleString()} تومان`;
    
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

    if (edit && messageId) {
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup }).catch(() => {});
    } else {
        bot.sendMessage(chatId, text, { reply_markup: replyMarkup });
    }
};

// ================= پنل مدیریت اصلی =================
const sendAdminPanel = (chatId, edit = false, messageId = null) => {
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
                { text: "🔒 عضویت اجباری", callback_data: "admin_force_join" }
            ],
            [
                { text: "📌 سنجاق پیام", callback_data: "admin_pin_msg" },
                { text: "🗑 حذف پیام", callback_data: "admin_del_broadcast" }
            ],
            [
                { text: "👤 گزینه‌های مشتریان", callback_data: "admin_client_options" }
            ],
            [
                { text: "🔄 استارت مالک", callback_data: "admin_owner_start" },
                { text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }
            ]
        ]
    };

    if (edit && messageId) {
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup }).catch(() => {});
    } else {
        bot.sendMessage(chatId, text, { reply_markup: replyMarkup });
    }
};

// دستورات اولیه
bot.onText(/\/start/, (msg) => {
    sendMainMenu(msg.chat.id, msg.from.first_name || "کاربر", isOwner(msg));
});

bot.onText(/\/admin/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ دسترسی غیرمجاز.");
    sendAdminPanel(msg.chat.id);
});

// مدیریت کلیک دکمه‌ها
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    const userIsOwner = isOwner(query);

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data.startsWith('admin_') && !userIsOwner) {
        return bot.answerCallbackQuery(query.id, { text: "⚠️ دسترسی فقط برای مالک ربات مجاز است.", show_alert: true });
    }

    if (data === 'main_menu' || data === 'cli_start') {
        sendMainMenu(chatId, query.from.first_name || "کاربر", userIsOwner, true, messageId);
    }
    else if (data === 'open_admin_panel' || data === 'admin_owner_start' || data === 'back_to_admin') {
        sendAdminPanel(chatId, true, messageId);
    }
    // 1. مدیریت اشتراک‌ها / پکیج‌ها
    else if (data === 'admin_subs') {
        let text = `📦 **مدیریت پکیج‌ها**\n\nبرای مشاهده یا ویرایش هر اشتراک، روی آن بزنید.\nوضعیت: ✅ فعال و ⏸ غیرفعال است.`;
        let rows = db.products.map(p => [{ text: `${p.name} ${p.active ? '✅' : '⏸'}`, callback_data: `edit_prod:${p.id}` }]);
        rows.push([{ text: "➕ افزودن اشتراک", callback_data: "config_add" }]);
        rows.push([{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }]);
        
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: rows } }).catch(() => {});
    }
    else if (data.startsWith("edit_prod:")) {
        const prodId = Number(data.split(":")[1]);
        const prod = db.products.find(p => p.id === prodId);
        prod.active = !prod.active; // تغییر وضعیت پکیج
        // بازخانی منوی اشتراک‌ها
        bot.answerCallbackQuery(query.id, { text: `وضعیت پکیج تغییر کرد.` });
        // رفرش صفحه
        let rows = db.products.map(p => [{ text: `${p.name} ${p.active ? '✅' : '⏸'}`, callback_data: `edit_prod:${p.id}` }]);
        rows.push([{ text: "➕ افزودن اشتراک", callback_data: "config_add" }]);
        rows.push([{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }]);
        bot.editMessageText(`📦 **مدیریت پکیج‌ها**\n\nوضعیت پکیج‌ها به‌روز شد:`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: rows } }).catch(() => {});
    }
    else if (data === 'config_add') {
        adminState[chatId] = { action: "waiting_for_config" };
        bot.editMessageText("✍️ متن کانفیگ جدید را ارسال کنید:\n\nبرای لغو کلمه «لغو» را بفرستید.", { chat_id: chatId, message_id: messageId }).catch(() => {});
    }
    // 2. سوابق اشتراک‌ها
    else if (data === 'admin_history') {
        const soldConfigs = db.configs.filter(c => c.sold);
        let text = `📦 **فروش‌های معتبر اشتراک**\n\n`;
        if (!soldConfigs.length) {
            text += "هنوز فروش تأییدشده و دارای اطلاعات کامل وجود ندارد.";
        } else {
            soldConfigs.slice(-5).forEach((c, idx) => {
                text += `${idx + 1}. کانفیگ به کاربر \`${c.soldTo}\` فروخته شد.\n`;
            });
        }
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }, { text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    // 3. رسیدها و شارژ کیف پول
    else if (data === 'admin_wallet' || data === 'admin_receipts') {
        const pending = db.receiptRequests;
        if (!pending.length) {
            return bot.editMessageText("✅ هیچ رسیدی در انتظار تأیید وجود ندارد.", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }, { text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
        }
        const req = pending[0];
        const text = `💰 **درخواست‌های شارژ کیف پول (1 مورد)**\n\n🆔 #${req.id}\n👤 کاربر: \`${req.chatId}\`\n💵 مبلغ: ${req.amount} تومان`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "✅ تأیید", callback_data: `approve_wallet_${req.id}` }, { text: "❌ رد", callback_data: `reject_wallet_${req.id}` }],
                [{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }, { text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data.startsWith("approve_wallet_") || data.startsWith("reject_wallet_")) {
        const parts = data.split("_");
        const reqId = Number(parts[parts.length - 1]);
        const index = db.receiptRequests.findIndex(r => r.id === reqId);
        if (index !== -1) {
            const req = db.receiptRequests.splice(index, 1)[0];
            if (data.startsWith("approve_wallet")) {
                if (!db.wallets[req.chatId]) db.wallets[req.chatId] = 0;
                const numericAmount = parseInt(req.amount.replace(/[^0-9]/g, '')) || 0;
                db.wallets[req.chatId] += numericAmount;
                bot.sendMessage(req.chatId, `✅ کیف پول شما به مبلغ ${req.amount} تومان شارژ شد.`);
            } else {
                bot.sendMessage(req.chatId, `❌ درخواست شارژ کیف پول شما رد شد.`);
            }
        }
        bot.editMessageText("✅ عملیات با موفقیت انجام شد.", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }]] } }).catch(() => {});
    }
    // 4. آمار ربات
    else if (data === 'admin_stats') {
        const text = `📊 **آمار ربات**\n\n👥 تعداد کاربران: ${db.users.size}\n⏳ رسیدهای در انتظار: ${db.receiptRequests.length}`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }, { text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    else if (data === 'admin_users') {
        bot.editMessageText(`👥 تعداد کل کاربران عضو در ربات: ${db.users.size} نفر`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }, { text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    else if (data === 'admin_messages') {
        bot.editMessageText(`💬 هیچ پیام خوانده‌نشده‌ای از مشتریان وجود ندارد.`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }, { text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    // 5. تنظیمات پرداخت
    else if (data === 'admin_pay_config') {
        const s = db.settings;
        const text = `💳 **تنظیمات پرداخت**\n\n🏦 شماره کارت: \`${s.cardNumber}\`\n👤 نام صاحب کارت: ${s.cardOwner}\n🏛 بانک: ${s.bankName}\n📝 راهنمای پرداخت: ${s.payGuide}`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "💳 شماره کارت", callback_data: "set_card_num" }, { text: "👤 نام صاحب کارت", callback_data: "set_card_owner" }],
                [{ text: "🏛 نام بانک", callback_data: "set_bank_name" }, { text: "📝 متن راهنمای پرداخت", callback_data: "set_pay_guide" }],
                [{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'set_card_num') {
        adminState[chatId] = { action: "set_card_num" };
        bot.editMessageText("✍️ شماره کارت جدید را ارسال کنید:", { chat_id: chatId, message_id: messageId }).catch(() => {});
    }
    else if (data === 'set_card_owner') {
        adminState[chatId] = { action: "set_card_owner" };
        bot.editMessageText("✍️ نام صاحب کارت جدید را ارسال کنید:", { chat_id: chatId, message_id: messageId }).catch(() => {});
    }
    else if (data === 'set_bank_name') {
        adminState[chatId] = { action: "set_bank_name" };
        bot.editMessageText("✍️ نام بانک جدید را ارسال کنید:", { chat_id: chatId, message_id: messageId }).catch(() => {});
    }
    else if (data === 'set_pay_guide') {
        adminState[chatId] = { action: "set_pay_guide" };
        bot.editMessageText("✍️ متن راهنمای پرداخت جدید را ارسال کنید:", { chat_id: chatId, message_id: messageId }).catch(() => {});
    }
    // 6. ارسال همگانی
    else if (data === 'admin_broadcast') {
        adminState[chatId] = { action: "waiting_for_broadcast" };
        const text = `📢 **پیام همگانی**\n\nمتن پیام خود را ارسال کنید.\nبرای لغو، «لغو» را بفرستید.`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }, { text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    // 7. عضویت اجباری (غیرفعال‌سازی شده یا تنظیم کانال)
    else if (data === 'admin_force_join') {
        const s = db.settings;
        let text = `🔒 **عضویت اجباری**\n\nوضعیت: ${s.forceChannel ? '✅ فعال (' + s.forceChannel + ')' : 'خاموش'}\nبرای فعال‌سازی، یک کانال عمومی را ثبت کنید.`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "➕ تنظیم/تغییر کانال", callback_data: "set_force_channel" }],
                [{ text: "ℹ️ راهنمای تنظیم", callback_data: "force_guide" }],
                [{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'set_force_channel') {
        adminState[chatId] = { action: "set_force_channel" };
        bot.editMessageText("✍️ یوزرنیم کانال (مثلاً @ChannelID) را بفرستید:", { chat_id: chatId, message_id: messageId }).catch(() => {});
    }
    else if (data === 'force_guide') {
        bot.answerCallbackQuery(query.id, { text: "ربات باید در کانال ادمین باشد.", show_alert: true });
    }
    // 8. سنجاق پیام همگانی
    else if (data === 'admin_pin_msg') {
        let text = `📌 **سنجاق پیام همگانی**\n\nیکی از ارسال‌های زیر را انتخاب کنید تا پیام آن برای همه گیرندگان سنجاق شود.\n\n`;
        if (!db.broadcasts.length) {
            text += "هنوز ارسال همگانی فعالی وجود ندارد.";
        }
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }, { text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    // 9. حذف پیام همگانی
    else if (data === 'admin_del_broadcast') {
        let text = `🗑 **حذف پیام همگانی**\n\nبرای حذف یکی از ارسال‌های ثبت‌شده، دستور زیر را بفرستید:\n`/delete_broadcast_<شماره ارسال>`\n\n`;
        if (!db.broadcasts.length) {
            text += "هنوز ارسال همگانی ثبت‌شده‌ای وجود ندارد.";
        }
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به مدیریت", callback_data: "back_to_admin" }, { text: "🏠 گزینه‌های اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    // 10. گزینه‌های مشتریان (صفحه ۲)
    else if (data === 'admin_client_options') {
        let text = `👤 **گزینه‌های مشتریان – صفحه ۲**\n\nبخش موردنظر را انتخاب کنید.`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "📋 اشتراک‌های من", callback_data: "my_subs_client" }, { text: "🛒 خرید اشتراک", callback_data: "buy_sub" }],
                [{ text: "📞 پشتیبانی", callback_data: "support" }, { text: "💰 کیف پول", callback_data: "my_account" }],
                [{ text: "ℹ️ راهنما", callback_data: "help" }, { text: "🔄 استارت مشتری", callback_data: "cli_start" }],
                [{ text: "🔙 بازگشت به مدیریت مالک", callback_data: "back_to_admin" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    // بخش خرید و مشتریان
    else if (data === 'buy_sub') {
        const rows = db.products.filter(p => p.active).map(p => [{ text: `📦 ${p.name} - ${p.price.toLocaleString()} تومان`, callback_data: `buy_p:${p.id}` }]);
        rows.push([{ text: "🔙 بازگشت", callback_data: "main_menu" }]);
        bot.editMessageText("🛒 محصولات و پکیج‌های فعال:", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: rows } }).catch(() => {});
    }
    else if (data.startsWith("buy_p:")) {
        const productId = Number(data.split(":")[1]);
        const product = db.products.find(p => p.id === productId);
        const freeConfig = db.configs.find(c => c.productId === productId && !c.sold);

        if (!freeConfig) return bot.answerCallbackQuery(query.id, { text: "❌ این پکیج در حال حاضر موجودی ندارد!", show_alert: true });
        
        const balance = db.wallets[chatId] || 0;
        if (balance < product.price) return bot.answerCallbackQuery(query.id, { text: "❌ موجودی کیف پول کافی نیست!", show_alert: true });

        db.wallets[chatId] -= product.price;
        freeConfig.sold = true;
        freeConfig.soldTo = chatId;

        bot.editMessageText(`✅ **خرید موفقیت‌آمیز بود!**\n\n\`${freeConfig.config}\``, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🏠 منوی اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    else if (data === 'wallet_charge') {
        adminState[chatId] = { action: "waiting_for_receipt" };
        const s = db.settings;
        bot.editMessageText(`💰 مبلغ را به کارت زیر واریز کرده و رسید آن را به صورت متن یا تصویر ارسال کنید:\n\`${s.cardNumber}\` (${s.cardOwner})`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    else if (data === 'my_account') {
        bot.editMessageText(`👤 موجودی کیف پول: ${(db.wallets[chatId] || 0).toLocaleString()} تومان`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    else if (data === 'my_subs_client') {
        const subs = db.configs.filter(c => c.soldTo === chatId);
        let text = "📦 اشتراک‌های شما:\n\n";
        subs.forEach(s => text += `\`${s.config}\`\n\n`);
        if (!subs.length) text = "📦 شما اشتراکی ندارید.";
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    else if (data === 'support' || data === 'help') {
        bot.editMessageText(`📞 پشتیبانی: @${ADMIN_USERNAME}`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    else if (data === 'free_test') {
        const testProd = db.products.find(p => p.isTest);
        const freeConf = testProd ? db.configs.find(c => c.productId === testProd.id && !c.sold) : null;
        if (!freeConf) return bot.answerCallbackQuery(query.id, { text: "❌ تست رایگان موجود نیست.", show_alert: true });
        freeConf.sold = true;
        freeConf.soldTo = chatId;
        bot.editMessageText(`⚡️ کانفیگ تست رایگان:\n\n\`${freeConf.config}\``, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🏠 منوی اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
    }
});

// مدیریت ورودی‌های متنی ادمین و کاربران
bot.on('message', async (msg) => {
    if (!msg.text) return;
    const chatId = msg.chat.id;
    const state = adminState[chatId];
    if (!state) return;

    if (state.action === "waiting_for_config") {
        if (!isOwner(msg)) return delete adminState[chatId];
        if (msg.text.trim() === "لغو") {
            delete adminState[chatId];
            return bot.sendMessage(chatId, "❌ لغو شد.");
        }
        db.configs.push({
            id: db.configs.length + 1,
            productId: 2, 
            config: msg.text.trim(),
            sold: false,
            soldTo: null
        });
        delete adminState[chatId];
        return bot.sendMessage(chatId, "✅ کانفیگ جدید با موفقیت اضافه شد.");
    }

    if (state.action === "waiting_for_receipt") {
        db.receiptRequests.push({
            id: db.receiptRequests.length + 1,
            chatId: chatId,
            amount: msg.text.trim()
        });
        delete adminState[chatId];
        return bot.sendMessage(chatId, "✅ رسید شما برای مدیریت ارسال شد.");
    }

    if (state.action === "set_card_num") {
        db.settings.cardNumber = msg.text.trim();
        delete adminState[chatId];
        return bot.sendMessage(chatId, "✅ شماره کارت با موفقیت ویرایش شد.");
    }

    if (state.action === "set_card_owner") {
        db.settings.cardOwner = msg.text.trim();
        delete adminState[chatId];
        return bot.sendMessage(chatId, "✅ نام صاحب کارت با موفقیت ویرایش شد.");
    }

    if (state.action === "set_bank_name") {
        db.settings.bankName = msg.text.trim();
        delete adminState[chatId];
        return bot.sendMessage(chatId, "✅ نام بانک با موفقیت ویرایش شد.");
    }

    if (state.action === "set_pay_guide") {
        db.settings.payGuide = msg.text.trim();
        delete adminState[chatId];
        return bot.sendMessage(chatId, "✅ متن راهنمای پرداخت ویرایش شد.");
    }

    if (state.action === "set_force_channel") {
        db.settings.forceChannel = msg.text.trim();
        delete adminState[chatId];
        return bot.sendMessage(chatId, `✅ کانال عضویت اجباری به ${db.settings.forceChannel} تغییر یافت.`);
    }

    if (state.action === "waiting_for_broadcast") {
        if (msg.text.trim() === "لغو") {
            delete adminState[chatId];
            return bot.sendMessage(chatId, "❌ ارسال همگانی لغو شد.");
        }
        db.broadcasts.push({ id: db.broadcasts.length + 1, text: msg.text.trim() });
        delete adminState[chatId];
        
        // ارسال به کل کاربران
        for (let userChatId of db.users) {
            bot.sendMessage(userChatId, msg.text.trim()).catch(() => {});
        }
        return bot.sendMessage(chatId, "📢 پیام همگانی با موفقیت به تمام کاربران ارسال شد.");
    }
});
