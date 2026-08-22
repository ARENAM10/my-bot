import TelegramBot from 'node-telegram-bot-api';

const token = "8850301156:AAGB5ewQkolWaLg2kjKL-cL8KXDhrbNciHQ";
const ADMIN_USERNAME = "ARENAM_10";

const bot = new TelegramBot(token, { polling: true });

// دیتابیس کامل و جامع ربات
const db = {
    configs: [], 
    products: [
        { id: 1, name: "تست سرعت بالا", volume: 5, days: 30, price: 0, isTest: true },
        { id: 2, name: "محبوب آرنا", volume: 10, days: 30, price: 50000 }
    ],
    users: new Set(),
    wallets: {}, 
    receiptRequests: [], 
    settings: {
        cardNumber: "6219861861735792",
        cardOwner: "مزراعی",
        bankName: "بلو",
        payGuide: "لطفا پس از واریز رسید خود را ارسال کنید"
    }
};

const adminState = {};

console.log("🔥 Arena Bot with Complete Admin Panel is running...");

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

// ================= پنل مدیریت (دقیقاً مشابه عکس) =================
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

    // محافظت از پنل ادمین
    if (data.startsWith('admin_') && !userIsOwner) {
        return bot.answerCallbackQuery(query.id, { text: "⚠️ دسترسی فقط برای مالک ربات مجاز است.", show_alert: true });
    }

    if (data === 'main_menu' || data === 'cli_start') {
        sendMainMenu(chatId, query.from.first_name || "کاربر", userIsOwner, true, messageId);
    }
    else if (data === 'open_admin_panel' || data === 'admin_owner_start') {
        sendAdminPanel(chatId, true, messageId);
    }
    else if (data === 'admin_subs') {
        const text = `📦 **مدیریت اشتراک‌ها**\n\nمحصولات فعال در ربات:`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "➕ افزودن کانفیگ جدید", callback_data: "config_add" }],
                [{ text: "📊 موجودی انبار کانفیگ‌ها", callback_data: "config_stock" }],
                [{ text: "🔙 بازگشت به مدیریت", callback_data: "open_admin_panel" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data === 'config_add') {
        adminState[chatId] = { action: "waiting_for_config" };
        bot.editMessageText("✍️ متن کانفیگ جدید را ارسال کنید:\n\nبرای لغو کلمه «لغو» را بفرستید.", { chat_id: chatId, message_id: messageId }).catch(() => {});
    }
    else if (data === 'config_stock') {
        let text = "📊 **موجودی انبار کانفیگ‌ها**\n\n";
        db.products.forEach(p => {
            const freeCount = db.configs.filter(c => c.productId === p.id && !c.sold).length;
            text += `📦 ${p.name}: ${freeCount} عدد آزاد\n`;
        });
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "admin_subs" }]] } }).catch(() => {});
    }
    else if (data === 'admin_history') {
        const soldConfigs = db.configs.filter(c => c.sold);
        let text = `📦 **سوابق اشتراک‌های فروخته‌شده (${soldConfigs.length} مورد)**\n\n`;
        soldConfigs.slice(-10).forEach((c, idx) => {
            text += `${idx + 1}. کانفیگ برای کاربر \`${c.soldTo}\`\n`;
        });
        if (!soldConfigs.length) text = "📦 هنوز فروشی ثبت نشده است.";
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] } }).catch(() => {});
    }
    else if (data === 'admin_wallet' || data === 'admin_receipts') {
        const pending = db.receiptRequests;
        if (!pending.length) {
            return bot.editMessageText("💰 هیچ درخواست واریز یا رسیدی در انتظار نیست.", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] } }).catch(() => {});
        }
        const req = pending[0];
        const text = `📋 **بررسی رسید شارژ کیف پول**\n\n👤 کاربر: \`${req.chatId}\`\n💵 مبلغ: ${req.amount}`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "✅ تأیید موجودی", callback_data: `acc_req:${req.id}` }, { text: "❌ رد", callback_data: `rej_req:${req.id}` }],
                [{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]
            ]
        };
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }
    else if (data.startsWith("acc_req:") || data.startsWith("rej_req:")) {
        const reqId = Number(data.split(":")[1]);
        const index = db.receiptRequests.findIndex(r => r.id === reqId);
        if (index === -1) return;
        const req = db.receiptRequests.splice(index, 1)[0];

        if (data.startsWith("acc_req")) {
            if (!db.wallets[req.chatId]) db.wallets[req.chatId] = 0;
            const numericAmount = parseInt(req.amount.replace(/[^0-9]/g, '')) || 0;
            db.wallets[req.chatId] += numericAmount;
            bot.sendMessage(req.chatId, `✅ کیف پول شما به مبلغ ${req.amount} شارژ شد.`);
            bot.editMessageText("✅ رسید تأیید و موجودی کاربر اضافه شد.", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] } }).catch(() => {});
        } else {
            bot.sendMessage(req.chatId, `❌ رسید شما توسط مدیریت رد شد.`);
            bot.editMessageText("❌ رسید رد شد.", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] } }).catch(() => {});
        }
    }
    else if (data === 'admin_stats') {
        const text = `📊 **آمار ربات**\n\n👥 تعداد کل کاربران: ${db.users.size}\n📦 کل کانفیگ‌ها: ${db.configs.length}\n🟢 کانفیگ‌های آزاد: ${db.configs.filter(c => !c.sold).length}`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] } }).catch(() => {});
    }
    else if (data === 'admin_users') {
        bot.editMessageText(`👥 تعداد کل کاربران عضو در ربات: ${db.users.size} نفر`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] } }).catch(() => {});
    }
    else if (data === 'admin_messages') {
        bot.editMessageText(`💬 هیچ پیام خوانده‌نشده‌ای از مشتریان وجود ندارد.`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] } }).catch(() => {});
    }
    else if (data === 'admin_pay_config') {
        const s = db.settings;
        const text = `💳 **تنظیمات پرداخت**\n\n🏦 شماره کارت: \`${s.cardNumber}\`\n👤 صاحب کارت: ${s.cardOwner}\n🏛 بانک: ${s.bankName}`;
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] } }).catch(() => {});
    }
    else if (data === 'admin_broadcast') {
        bot.editMessageText(`📢 برای ارسال همگانی، متن پیام خود را ارسال کنید (فعلاً غیرفعال).`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] } }).catch(() => {});
    }
    else if (data === 'admin_del_broadcast') {
        bot.editMessageText(`🗑 هیچ ارسال همگانی برای حذف وجود ندارد.`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] } }).catch(() => {});
    }
    else if (data === 'admin_pin_msg') {
        bot.editMessageText(`📌 پیامی برای سنجاق کردن انتخاب نشده است.`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] } }).catch(() => {});
    }
    else if (data === 'admin_client_options') {
        bot.editMessageText(`👤 **گزینه‌های مشتریان**\n\nمی‌توانید نمای منوی کاربران را بررسی کنید.`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🏠 رفتن به منوی اصلی", callback_data: "main_menu" }, { text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] } }).catch(() => {});
    }
    // دکمه‌های کاربران (خرید و شارژ)
    else if (data === 'buy_sub') {
        const rows = db.products.map(p => [{ text: `📦 ${p.name} - ${p.price.toLocaleString()} تومان`, callback_data: `buy_p:${p.id}` }]);
        rows.push([{ text: "🔙 بازگشت", callback_data: "main_menu" }]);
        bot.editMessageText("🛒 محصولات موجود:", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: rows } }).catch(() => {});
    }
    else if (data.startsWith("buy_p:")) {
        const productId = Number(data.split(":")[1]);
        const product = db.products.find(p => p.id === productId);
        const freeConfig = db.configs.find(c => c.productId === productId && !c.sold);

        if (!freeConfig) return bot.answerCallbackQuery(query.id, { text: "❌ این محصول در حال حاضر موجودی ندارد!", show_alert: true });
        
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
        bot.editMessageText(`💰 مبلغ را به کارت زیر واریز کرده و رسید آن را ارسال کنید:\n\`${s.cardNumber}\` (${s.cardOwner})`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] } }).catch(() => {});
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
        const freeConf = db.configs.find(c => c.productId === testProd.id && !c.sold);
        if (!freeConf) return bot.answerCallbackQuery(query.id, { text: "❌ تست رایگان موجود نیست.", show_alert: true });
        freeConf.sold = true;
        freeConf.soldTo = chatId;
        bot.editMessageText(`⚡️ کانفیگ تست رایگان:\n\n\`${freeConf.config}\``, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🏠 منوی اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
    }
});

// مدیریت پیام‌های متنی (ثبت کانفیگ و ارسال رسید)
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
            productId: 2, // پیش‌فرض روی محصول دوم
            config: msg.text.trim(),
            sold: false,
            soldTo: null
        });
        delete adminState[chatId];
        return bot.sendMessage(chatId, "✅ کانفیگ با موفقیت در انبار ذخیره شد.");
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
});
    
