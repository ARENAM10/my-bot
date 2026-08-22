import TelegramBot from 'node-telegram-bot-api';

const token = "8850301156:AAGB5ewQkolWaLg2kjKL-cL8KXDhrbNciHQ";
const ADMIN_USERNAME = "ARENAM_10";

const bot = new TelegramBot(token, { polling: true });

// 📊 دیتابیس حافظه موقت (برای پایداری دائمی می‌توان دیتابیس متصل کرد)
const db = {
    configs: [], // { id, productId, config, sold: false, soldTo: null }
    products: [
        { id: 1, name: "اشتراک اقتصادی", volume: 10, days: 30, price: 45000 },
        { id: 2, name: "اشتراک پرسرعت", volume: 30, days: 30, price: 95000 }
    ],
    users: new Set(),
    wallets: {}, // chatId: balance
    settings: {
        cardNumber: "6219861861735792",
        cardOwner: "مزراعی",
        bankName: "بلو"
    }
};

const adminState = {}; // ذخیره وضعیت موقت ادمین (مثل افزودن کانفیگ)

console.log("🔥 Full Complete Store Bot is running successfully...");

// بررسی ادمین بودن
const isOwner = (msgOrQuery) => {
    const user = msgOrQuery.from || msgOrQuery.chat;
    const username = user.username;
    return username && username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
};

// ================= ویوهای اصلی (کاربر) =================

const sendMainMenu = (chatId, firstName, isOwnerUser = false, edit = false, messageId = null) => {
    db.users.add(chatId);
    if (!db.wallets[chatId]) db.wallets[chatId] = 0;

    const text = `سلام ${firstName} عزیز! ⚡️\nبه ربات کانفیگ آرنا خوش آمدید.\n\n💰 موجودی کیف پول: ${db.wallets[chatId].toLocaleString()} تومان`;
    
    const replyMarkup = {
        inline_keyboard: [
            [{ text: "🛒 خرید اشتراک", callback_data: "buy_sub" }, { text: "👤 حساب کاربری", callback_data: "my_account" }],
            [{ text: "💰 شارژ کیف پول", callback_data: "wallet_charge" }, { text: "📦 اشتراک‌های من", callback_data: "my_subs" }],
            [{ text: "⚡️ تست رایگان", callback_data: "free_test" }, { text: "📞 پشتیبانی", callback_data: "support" }]
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

// ================= پنل مدیریت =================

const sendAdminPanel = (chatId, edit = false, messageId = null) => {
    const text = "🖥 **پنل مدیریت پیشرفته ربات**\n\nگزینه مورد نظر را انتخاب کنید:";
    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "📦 مدیریت کانفیگ‌ها", callback_data: "admin_configs" },
                { text: "📊 آمار ربات", callback_data: "admin_stats" }
            ],
            [
                { text: "💳 تنظیمات کارت", callback_data: "admin_pay_config" },
                { text: "📢 ارسال همگانی", callback_data: "admin_broadcast" }
            ],
            [
                { text: "🏠 بازگشت به منوی اصلی", callback_data: "main_menu" }
            ]
        ]
    };

    if (edit && messageId) {
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: replyMarkup }).catch(() => {});
    } else {
        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: replyMarkup });
    }
};

// دکمه‌های مدیریت کانفیگ
function configAdminKeyboard() {
    return {
        inline_keyboard: [
            [{ text: "➕ افزودن کانفیگ جدید", callback_data: "config_add" }],
            [{ text: "📋 کانفیگ‌های آزاد", callback_data: "config_available" }, { text: "🔴 فروخته‌شده‌ها", callback_data: "config_sold" }],
            [{ text: "📊 موجودی انبار", callback_data: "config_stock" }],
            [{ text: "🔙 بازگشت به پنل مدیریت", callback_data: "open_admin_panel" }]
        ]
    };
}

// ================= هندلر دستورات متنی =================

bot.onText(/\/start/, (msg) => {
    sendMainMenu(msg.chat.id, msg.from.first_name || "کاربر", isOwner(msg));
});

bot.onText(/\/admin/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ دسترسی غیرمجاز.");
    sendAdminPanel(msg.chat.id);
});

// ================= هندلر دکمه‌ها (Callback Queries) =================

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    const userIsOwner = isOwner(query);

    await bot.answerCallbackQuery(query.id).catch(() => {});

    // منوی اصلی
    if (data === 'main_menu') {
        sendMainMenu(chatId, query.from.first_name || "کاربر", userIsOwner, true, messageId);
    }
    // پنل مدیریت
    else if (data === 'open_admin_panel' || data === 'admin_configs') {
        if (!userIsOwner) return bot.sendMessage(chatId, "⚠️ دسترسی غیرمجاز.");
        if (data === 'open_admin_panel') {
            sendAdminPanel(chatId, true, messageId);
        } else {
            bot.editMessageText("📦 **مدیریت کانفیگ‌ها و انبار**\n\nیک گزینه انتخاب کنید:", {
                chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: configAdminKeyboard()
            }).catch(() => {});
        }
    }
    // آمار ربات
    else if (data === 'admin_stats') {
        if (!userIsOwner) return;
        const totalConfigs = db.configs.length;
        const availableConfigs = db.configs.filter(c => !c.sold).length;
        const text = `📊 **آمار کلی ربات**\n\n👥 تعداد کل کاربران: ${db.users.size}\n📦 کل کانفیگ‌ها: ${totalConfigs}\n🟢 کانفیگ‌های آزاد: ${availableConfigs}\n🔴 فروخته شده: ${totalConfigs - availableConfigs}`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "open_admin_panel" }]] }
        }).catch(() => {});
    }
    // افزودن کانفیگ (انتخاب محصول)
    else if (data === 'config_add') {
        if (!userIsOwner) return;
        const rows = db.products.map(p => [{ text: `📦 ${p.name} (${p.volume}GB)`, callback_data: `conf_add_p:${p.id}` }]);
        rows.push([{ text: "🔙 بازگشت", callback_data: "admin_configs" }]);
        bot.editMessageText("محصولی که می‌خواهید برای آن کانفیگ اضافه کنید را انتخاب کنید:", {
            chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: rows }
        }).catch(() => {});
    }
    else if (data.startsWith("conf_add_p:")) {
        if (!userIsOwner) return;
        const productId = Number(data.split(":")[1]);
        adminState[chatId] = { action: "waiting_for_config", productId };
        bot.editMessageText("✍️ لطفاً متن کانفیگ (Link/Config) خود را ارسال کنید:\n\nبرای لغو کلمه «لغو» را بفرستید.", {
            chat_id: chatId, message_id: messageId
        }).catch(() => {});
    }
    // مشاهده موجودی انبار کانفیگ‌ها
    else if (data === 'config_stock') {
        if (!userIsOwner) return;
        let text = "📊 **موجودی انبار کانفیگ‌ها**\n\n";
        db.products.forEach(p => {
            const freeCount = db.configs.filter(c => c.productId === p.id && !c.sold).length;
            text += `📦 ${p.name}: ${freeCount} عدد آزاد\n`;
        });
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: configAdminKeyboard()
        }).catch(() => {});
    }
    // بخش خرید اشتراک برای کاربر
    else if (data === 'buy_sub') {
        const rows = db.products.map(p => {
            const freeCount = db.configs.filter(c => c.productId === p.id && !c.sold).length;
            return [{ text: `📦 ${p.name} - ${p.price.toLocaleString()} تومان (${freeCount} عدد موجود)`, callback_data: `buy_p:${p.id}` }];
        });
        rows.push([{ text: "🔙 بازگشت", callback_data: "main_menu" }]);
        bot.editMessageText("🛒 **لیست محصولات برای خرید:**\n\nمحصول مورد نظر خود را انتخاب کنید:", {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: rows }
        }).catch(() => {});
    }
    else if (data.startsWith("buy_p:")) {
        const productId = Number(data.split(":")[1]);
        const product = db.products.find(p => p.id === productId);
        const freeConfig = db.configs.find(c => c.productId === productId && !c.sold);

        if (!freeConfig) {
            return bot.answerCallbackQuery(query.id, { text: "❌ متاسفانه این محصول در حال حاضر موجودی ندارد!", show_alert: true });
        }

        const userBalance = db.wallets[chatId] || 0;
        if (userBalance < product.price) {
            return bot.answerCallbackQuery(query.id, { text: "❌ موجودی کیف پول شما برای خرید کافی نیست! ابتدا کیف پول خود را شارژ کنید.", show_alert: true });
        }

        // کسر موجودی و تحویل کانفیگ
        db.wallets[chatId] -= product.price;
        freeConfig.sold = true;
        freeConfig.soldTo = chatId;

        const successText = `✅ **خرید با موفقیت انجام شد!**\n\n📦 محصول: ${product.name}\n🔗 کانفیگ اختصاصی شما:\n\n\`${freeConfig.config}\``;
        bot.editMessageText(successText, {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "🏠 بازگشت به منو", callback_data: "main_menu" }]] }
        }).catch(() => {});
    }
    else if (data === 'wallet_charge') {
        const s = db.settings;
        const text = `💰 **شارژ کیف پول**\n\nبرای شارژ حساب، مبلغ مورد نظر را به شماره کارت زیر واریز کرده و رسید آن را به پشتیبانی ارسال کنید:\n\n💳 کارت: \`${s.cardNumber}\`\n👤 صاحب کارت: ${s.cardOwner}\n🏛 بانک: ${s.bankName}`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] }
        }).catch(() => {});
    }
    else if (data === 'my_account') {
        const balance = db.wallets[chatId] || 0;
        const text = `👤 **حساب کاربری شما**\n\n🆔 آی‌دی چت: \`${chatId}\`\n💰 موجودی کیف پول: ${balance.toLocaleString()} تومان`;
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] }
        }).catch(() => {});
    }
    else if (data === 'my_subs') {
        const userConfigs = db.configs.filter(c => c.soldTo === chatId);
        if (!userConfigs.length) {
            return bot.editMessageText("📦 شما تاکنون هیچ اشتراکی خریداری نکرده‌اید.", {
                chat_id: chatId, message_id: messageId,
                reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] }
            }).catch(() => {});
        }
        let text = "📦 **اشتراک‌های خریداری‌شده شما:**\n\n";
        userConfigs.forEach((c, idx) => {
            text += `${idx + 1}. \`${c.config}\`\n\n`;
        });
        bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] }
        }).catch(() => {});
    }
    else if (data === 'support') {
        bot.editMessageText("📞 برای ارتباط با پشتیبانی به ادمین پیام دهید: @ARENAM_10", {
            chat_id: chatId, message_id: messageId,
            reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] }
        }).catch(() => {});
    }
    else if (data === 'free_test') {
        bot.editMessageText("⚡️ در حال حاضر تست رایگان فعال نمی‌باشد.", {
            chat_id: chatId, message_id: messageId,
            reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] }
        }).catch(() => {});
    }
});

// ================= دریافت پیام‌های متنی (ثبت کانفیگ توسط ادمین) =================

bot.on('message', async (msg) => {
    if (!msg.text) return;
    const chatId = msg.chat.id;
    
    if (adminState[chatId] && adminState[chatId].action === "waiting_for_config") {
        if (!isOwner(msg)) {
            delete adminState[chatId];
            return;
        }

        if (msg.text.trim() === "لغو") {
            delete adminState[chatId];
            return bot.sendMessage(chatId, "❌ عملیات لغو شد.", { reply_markup: configAdminKeyboard() });
        }

        const productId = adminState[chatId].productId;
        const configText = msg.text.trim();

        db.configs.push({
            id: db.configs.length + 1,
            productId: productId,
            config: configText,
            sold: false,
            soldTo: null
        });

        delete adminState[chatId];
        return bot.sendMessage(chatId, "✅ کانفیگ با موفقیت در انبار ذخیره شد!", { reply_markup: configAdminKeyboard() });
    }
});
