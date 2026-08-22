import TelegramBot from 'node-telegram-bot-api';

const token = "8850301156:AAGB5ewQkolWaLg2kjKL-cL8KXDhrbNciHQ";
const OWNER_USERNAME = "ARENAM_10"; 

const bot = new TelegramBot(token, { polling: true });

// دیتابیس جامع و کامل ربات
const db = {
    configs: [], 
    products: [
        { id: 1, name: "تست سرعت بالا", volume: 5, days: 30, stock: 0 },
        { id: 2, name: "محبوب آرنا", volume: 10, days: 30, stock: 0 }
    ],
    users: new Set(),
    walletRequests: [
        { id: 1, user: "@Emirrm80", card: "5382980412", amount: "۱۰۰,۰۰۰ تومان" }
    ],
    settings: {
        cardNumber: "6219861861735792",
        cardOwner: "مزراعی",
        bankName: "بلو",
        payGuide: "لطفا پس از واریز رسید خود را ارسال کنید",
        joinLockStatus: "فعال ✅",
        channel: "@Config_Arena"
    }
};

function saveDb() {
    // ذخیره تغییرات دیتابیس
}

console.log("🔥 Full Integrated Config Arena Bot is running successfully with new token...");

const isOwner = (msg) => {
    const username = msg.from.username || msg.username;
    return username && username.toLowerCase() === OWNER_USERNAME.toLowerCase();
};

// ===============================
// 📦 مدیریت دستی کانفیگ‌ها
// ===============================
function configAdminKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "➕ افزودن کانفیگ", callback_data: "config_add" }],
      [
        { text: "📋 کانفیگ‌های آزاد", callback_data: "config_available" },
        { text: "🔴 فروخته‌شده‌ها", callback_data: "config_sold" }
      ],
      [
        { text: "📊 موجودی کانفیگ‌ها", callback_data: "config_stock" },
        { text: "🗑 حذف کانفیگ", callback_data: "config_delete" }
      ],
      [{ text: "🔙 بازگشت به مدیریت", callback_data: "open_admin_panel" }]
    ]
  };
}

function sendConfigAdmin(chatId, edit = false, messageId = null) {
  const text =
`📦 مدیریت کانفیگ‌ها

از این بخش می‌توانید کانفیگ‌ها را به‌صورت دستی وارد کنید.

➕ افزودن کانفیگ جدید
📋 مشاهده کانفیگ‌های آزاد
🔴 مشاهده کانفیگ‌های فروخته‌شده
📊 مشاهده موجودی
🗑 حذف کانفیگ`;

  const options = {
    reply_markup: configAdminKeyboard(),
    parse_mode: 'Markdown'
  };

  if (edit && messageId) {
    return bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...options }).catch(() => {});
  }
  return bot.sendMessage(chatId, text, options);
}

function configProductKeyboard() {
  const rows = db.products.map(p => [
    {
      text: `📦 ${p.name} | ${p.volume}GB | ${p.days} روز`,
      callback_data: `config_product:${p.id}`
    }
  ]);

  rows.push([
    { text: "🔙 بازگشت", callback_data: "admin_configs" }
  ]);

  return { inline_keyboard: rows };
}

const adminState = {};

// ===============================
// پنل اصلی مدیریت
// ===============================
const sendAdminPanel = (chatId, isEdit = false, messageId = null) => {
    const text = `گزینه موردنظر را انتخاب کنید.`;
    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "🛒 مدیریت اشتراک", callback_data: "admin_subs" },
                { text: "📦 مدیریت کانفیگ‌ها", callback_data: "admin_configs" }
            ],
            [
                { text: "📦 سوابق اشتراک‌ها", callback_data: "admin_history" },
                { text: "💰 شارژ کیف پول", callback_data: "admin_wallet" }
            ],
            [
                { text: "📋 رسیدها", callback_data: "admin_receipts" },
                { text: "📊 آمار", callback_data: "admin_stats" }
            ],
            [
                { text: "👥 کاربران", callback_data: "admin_users" },
                { text: "💬 پیام مشتریان", callback_data: "admin_messages" }
            ],
            [
                { text: "💳 تنظیمات پرداخت", callback_data: "admin_pay_config" },
                { text: "🔒 عضویت اجباری", callback_data: "admin_join_lock" }
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
    const userIsOwner = isOwner(query.from);

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if ((data.startsWith('admin_') || data.startsWith('config_') || data === 'open_admin_panel' || data.startsWith('cli_')) && !userIsOwner) {
        return bot.sendMessage(chatId, "⚠️ دسترسی فقط برای مالک ربات مجاز است.");
    }

    if (data === 'main_menu' || data === 'cli_start') {
        sendMainMenu(chatId, query.from.first_name || "کاربر", userIsOwner, true, messageId);
    }
    else if (data === 'open_admin_panel' || data === 'admin_owner_start') {
        sendAdminPanel(chatId, true, messageId);
    }
    else if (data === 'admin_configs') {
        return sendConfigAdmin(chatId, true, messageId);
    }
    else if (data === 'config_add') {
        adminState[chatId] = { action: "select_config_product" };
        return bot.editMessageText(
            "📦 محصولی که می‌خواهید کانفیگ به آن اضافه شود را انتخاب کنید:",
            {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: configProductKeyboard()
            }
        ).catch(() => {});
    }
    else if (data.startsWith("config_product:")) {
        const productId = Number(data.split(":")[1]);
        const product = db.products.find(p => p.id === productId);
        if (!product) return bot.sendMessage(chatId, "❌ محصول پیدا نشد.");

        adminState[chatId] = { action: "waiting_config", productId };
        return bot.editMessageText(
`🔐 افزودن کانفیگ

📦 محصول: ${product.name}
💾 حجم: ${product.volume}GB
📅 مدت: ${product.days} روز

حالا کانفیگ را در یک پیام ارسال کنید.
برای لغو: کلمه «لغو» را بفرستید.`,
            {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [[{ text: "❌ لغو", callback_data: "admin_configs" }]]
                }
            }
        ).catch(() => {});
    }
    else if (data === 'config_available') {
        const available = db.configs.filter(c => !c.sold);
        if (!available.length) {
            return bot.editMessageText("📋 هیچ کانفیگ آزادی وجود ندارد.", { chat_id: chatId, message_id: messageId, reply_markup: configAdminKeyboard() });
        }
        let text = "📋 کانفیگ‌های آزاد\n\n";
        available.slice(0, 50).forEach((c) => {
            const product = db.products.find(p => p.id === c.productId);
            text += `#${c.id}\n📦 ${product ? product.name : "نامشخص"}\n💾 ${product ? product.volume : "-"}GB\n🟢 آزاد\n\n`;
        });
        return bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: configAdminKeyboard() }).catch(() => {});
    }
    else if (data === 'config_sold') {
        const sold = db.configs.filter(c => c.sold);
        if (!sold.length) {
            return bot.editMessageText("🔴 هنوز کانفیگی فروخته نشده است.", { chat_id: chatId, message_id: messageId, reply_markup: configAdminKeyboard() });
        }
        let text = "🔴 کانفیگ‌های فروخته‌شده\n\n";
        sold.slice(-30).reverse().forEach(c => {
            const product = db.products.find(p => p.id === c.productId);
            text += `#${c.id}\n📦 ${product ? product.name : "نامشخص"}\n👤 خریدار: ${c.soldTo || "-"}\n🧾 سفارش: #${c.orderId || "-"}\n\n`;
        });
        return bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: configAdminKeyboard() }).catch(() => {});
    }
    else if (data === 'config_stock') {
        let text = "📊 موجودی کانفیگ‌ها\n\n";
        db.products.forEach(product => {
            const total = db.configs.filter(c => c.productId === product.id).length;
            const available = db.configs.filter(c => c.productId === product.id && !c.sold).length;
            const sold = total - available;
            text += `📦 ${product.name}\n💾 ${product.volume}GB | 📅 ${product.days} روز\n📥 کل: ${total} | 🟢 آزاد: ${available} | 🔴 فروخته: ${sold}\n──────────────\n`;
        });
        return bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: configAdminKeyboard() }).catch(() => {});
    }
    else if (data === 'config_delete') {
        const available = db.configs.filter(c => !c.sold);
        if (!available.length) {
            return bot.editMessageText("❌ کانفیگ آزادی برای حذف وجود ندارد.", { chat_id: chatId, message_id: messageId, reply_markup: configAdminKeyboard() });
        }
        const rows = available.slice(0, 30).map(c => {
            const product = db.products.find(p => p.id === c.productId);
            return [{ text: `🗑 #${c.id} | ${product?.name || "نامشخص"} | ${product?.volume || "-"}GB`, callback_data: `config_remove:${c.id}` }];
        });
        rows.push([{ text: "🔙 بازگشت", callback_data: "admin_configs" }]);
        return bot.editMessageText("🗑 کانفیگی را که می‌خواهید حذف کنید انتخاب کنید:", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: rows } }).catch(() => {});
    }
    else if (data.startsWith("config_remove:")) {
        const configId = Number(data.split(":")[1]);
        const index = db.configs.findIndex(c => c.id === configId && !c.sold);
        if (index === -1) {
            return bot.answerCallbackQuery(query.id, { text: "❌ کانفیگ پیدا نشد.", show_alert: true });
        }
        db.configs.splice(index, 1);
        saveDb();
        return bot.editMessageText("✅ کانفیگ با موفقیت حذف شد.", { chat_id: chatId, message_id: messageId, reply_markup: configAdminKeyboard() }).catch(() => {});
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
    else if (data === 'admin_join_lock') {
        const s = db.settings;
        const text = `🔒 **عضویت اجباری**\n\n___________________\n\nوضعیت: ${s.joinLockStatus}\nکانال فعال: ${s.channel}`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "➕ تنظیم/تغییر کانال", callback_data: "set_channel" }],
                [{ text: "ℹ️ راهنمای تنظیم", callback_data: "guide_channel" }],
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

bot.on("message", async msg => {
    if (!msg.text) return;
    if (!isOwner(msg)) return;

    const chatId = msg.chat.id;
    const state = adminState[chatId];
    if (!state) return;

    if (msg.text.trim() === "لغو") {
        delete adminState[chatId];
        return sendConfigAdmin(chatId);
    }

    if (state.action !== "waiting_config") return;

    const configText = msg.text.trim();
    if (configText.length < 10) {
        return bot.sendMessage(chatId, "❌ کانفیگ معتبر به نظر نمی‌رسد.\nلطفاً کانفیگ کامل را ارسال کنید.");
    }

    const product = db.products.find(p => p.id === state.productId);
    if (!product) {
        delete adminState[chatId];
        return bot.sendMessage(chatId, "❌ محصول پیدا نشد.");
    }

    const newConfig = {
        id: db.configs.length ? Math.max(...db.configs.map(c => c.id)) + 1 : 1,
        productId: product.id,
        config: configText,
        sold: false,
        soldTo: null,
        orderId: null,
        createdAt: Date.now(),
        soldAt: null
    };

    db.configs.push(newConfig);
    product.stock = db.configs.filter(c => c.productId === product.id && !c.sold).length;
    saveDb();

    delete adminState[chatId];

    return bot.sendMessage(
        chatId,
`✅ کانفیگ با موفقیت اضافه شد.

🆔 شناسه: #${newConfig.id}
📦 محصول: ${product.name}
💾 حجم: ${product.volume}GB
📅 مدت: ${product.days} روز
🟢 وضعیت: آماده فروش
📊 موجودی فعلی: ${product.stock}`,
        { reply_markup: configAdminKeyboard() }
    );
});

async function createConfigForProduct(product, user, orderId) {
    const index = db.configs.findIndex(c => c.productId === product.id && !c.sold);
    if (index === -1) {
        throw new Error("NO_CONFIG_AVAILABLE");
    }

    const config = db.configs[index];
    config.sold = true;
    config.soldTo = user.id;
    config.orderId = orderId;
    config.soldAt = Date.now();

    product.stock = db.configs.filter(c => c.productId === product.id && !c.sold).length;
    saveDb();

    return config.config;
}
