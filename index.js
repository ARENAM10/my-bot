import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_USERNAME = "amir_85m10";
const ADMIN_CHAT_ID = "8923324852";

// اتصال به دیتابیس SQLite
const db = new sqlite3.Database('./arena_bot.db', (err) => {
    if (err) console.error("خطا در اتصال به پایگاه داده:", err.message);
    else console.log("متصل به دیتابیس SQLite.");
});

// ایجاد جداول مورد نیاز
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        firstName TEXT,
        username TEXT,
        balance INTEGER DEFAULT 0,
        joinedDate TEXT,
        isBlocked INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        price INTEGER,
        volume TEXT,
        duration TEXT,
        usersCount TEXT,
        type TEXT,
        config TEXT,
        status INTEGER DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        orderId TEXT PRIMARY KEY,
        userId TEXT,
        subName TEXT,
        price INTEGER,
        status TEXT,
        date TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        name TEXT,
        volume TEXT,
        duration TEXT,
        config TEXT,
        date TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('cardNumber', '6037-9971-xxxx-xxxx')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('cardHolder', 'نام صاحب کارت')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('welcomeMessage', '✨ به پنل اختصاصی خوش آمدید.\\n\\nلطفاً از گزینه‌های زیر انتخاب کنید:')`);
});

const bot = new TelegramBot(TOKEN, { polling: true });
const userState = {};

function isAdmin(user) {
    if (!user) return false;
    const username = user.username ? user.username.toLowerCase() : "";
    const userId = user.id ? user.id.toString() : "";
    return username === ADMIN_USERNAME.toLowerCase() || userId === ADMIN_CHAT_ID;
}

function sendActivityLog(user, actionDesc) {
    if (!user) return;
    const logText = `🔔 **گزارش فعالیت کاربر**\n\n` +
                    `👤 نام: ${user.first_name || "بدون نام"}\n` +
                    `🔗 یوزرنیم: ${user.username ? `@${user.username}` : "ندارد"}\n` +
                    `🆔 آیدی عددی: \`${user.id}\`\n` +
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
            [{ text: "🤝 درخواست نمایندگی" }, { text: "👥 دعوت دوستان" }],
            [{ text: "🎫 پشتیبانی" }]
        ],
        resize_keyboard: true
    }
};

bot.onText(/\/start(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const firstName = msg.first_name || "کاربر";
    const username = msg.username || "";
    const refId = match[1] ? match[1].trim() : null;

    userState[userId] = { step: null };

    db.get(`SELECT * FROM users WHERE userId = ?`, [userId], (err, row) => {
        if (!row) {
            db.run(`INSERT INTO users (userId, firstName, username, joinedDate) VALUES (?, ?, ?, ?)`,
                [userId, firstName, username, new Date().toLocaleDateString('fa-IR')]);
            
            if (refId && refId !== userId) {
                db.get(`SELECT * FROM users WHERE userId = ?`, [refId], (err, refUser) => {
                    if (refUser) {
                        db.run(`UPDATE users SET balance = balance + 5000 WHERE userId = ?`, [refId]);
                        bot.sendMessage(refId, `🎁 یک کاربر جدید با لینک شما وارد ربات شد و ۵,۰۰۰ تومان پاداش گرفتید!`).catch(() => {});
                    }
                });
            }
        }
    });

    sendActivityLog(msg.from, "ربات را استارت کرد (/start)");

    if (isAdmin(msg.from)) {
        bot.sendMessage(chatId, `✨ به پنل مدیریت کل خوش آمدید مالک عزیز 👑`, {
            reply_markup: {
                keyboard: [
                    [{ text: "🎛 پنل مدیریت پیشرفته" }],
                    ...persistentKeyboard.reply_markup.keyboard
                ],
                resize_keyboard: true
            }
        });
        return;
    }

    db.get(`SELECT value FROM settings WHERE key = 'welcomeMessage'`, (err, row) => {
        const welcomeText = row ? row.value : "✨ خوش آمدید.";
        bot.sendMessage(chatId, welcomeText, persistentKeyboard);
    });
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === "🎛 پنل مدیریت پیشرفته" && isAdmin(msg.from)) {
        openAdminPanel(chatId);
        return;
    }
});

function openAdminPanel(chatId) {
    bot.sendMessage(chatId, `🎛 **پنل مدیریت پیشرفته آرنا**\n\nبخش مورد نظر را انتخاب کنید:`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 مدیریت محصولات و اشتراک‌ها", callback_data: "adm_manage_subs" }],
                [{ text: "💳 تنظیمات پرداخت کارت‌به‌کارت", callback_data: "adm_payment_settings" }],
                [{ text: "📊 آمار و گزارشات جامع", callback_data: "adm_stats" }, { text: "📢 ارسال همگانی (Broadcast)", callback_data: "adm_broadcast" }],
                [{ text: "💰 شارژ دستی کیف پول", callback_data: "adm_charge_manual" }]
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

    if (data === "adm_manage_subs" && isAdmin(query.from)) {
        bot.sendMessage(chatId, `🛒 **مدیریت محصولات و کانفیگ‌ها**`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📋 لیست محصولات", callback_data: "sub_list" }, { text: "➕ افزودن محصول", callback_data: "sub_add" }],
                    [{ text: "🔙 بازگشت به پنل اصلی", callback_data: "adm_back_main" }]
                ]
            }
        });
        return;
    }

    if (data === "sub_list" && isAdmin(query.from)) {
        db.all(`SELECT * FROM products`, (err, rows) => {
            if (!rows || rows.length === 0) {
                bot.sendMessage(chatId, "⚠️ هیچ محصولی ثبت نشده است.");
                return;
            }
            let textMsg = "📋 **لیست محصولات و اشتراک‌ها:**\n\n";
            rows.forEach((s, idx) => {
                textMsg += `${idx + 1}. **${s.name}**\n` +
                           `   - قیمت: ${s.price.toLocaleString()} تومان\n` +
                           `   - حجم: ${s.volume} | مدت: ${s.duration}\n` +
                           `   - وضعیت: ${s.status ? "🟢 فعال" : "🔴 غیرفعال"}\n` +
                           `   - کانفیگ: \`${s.config}\`\n----------------------------------\n`;
            });
            bot.sendMessage(chatId, textMsg, { parse_mode: "Markdown" });
        });
        return;
    }

    if (data === "sub_add" && isAdmin(query.from)) {
        userState[userId].step = "sub_add_name";
        bot.sendMessage(chatId, `➕ نام محصول جدید را وارد کنید:`);
        return;
    }

    if (data.startsWith("pay_card_")) {
        const subId = data.replace("pay_card_", "");
        db.get(`SELECT * FROM products WHERE id = ?`, [subId], (err, sub) => {
            if (!sub) return;

            const orderId = "ord_" + Date.now();
            db.run(`INSERT INTO orders (orderId, userId, subName, price, status, date) VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, userId, sub.name, sub.price, "PendingPayment", new Date().toLocaleDateString('fa-IR')]);

            userState[userId].currentOrderId = orderId;
            userState[userId].step = "waiting_for_receipt";

            db.all(`SELECT value FROM settings WHERE key IN ('cardNumber', 'cardHolder')`, (err, rows) => {
                const cardNum = rows.find(r => r.key === 'cardNumber')?.value || "";
                const cardHold = rows.find(r => r.key === 'cardHolder')?.value || "";

                bot.sendMessage(chatId, 
                    `📦 **سفارش شما ایجاد شد (کد: \`${orderId}\`)**\n\n` +
                    `💳 لطفاً مبلغ **${sub.price.toLocaleString()} تومان** را به کارت زیر واریز نمایید:\n\n` +
                    `شماره کارت: \`${cardNum}\`\n` +
                    `به نام: ${cardHold}\n\n` +
                    `📸 **حالا عکس رسید یا کد پیگیری واریز را ارسال کنید.**`,
                    { parse_mode: "Markdown" }
                );
            });
        });
        return;
    }

    if (data.startsWith("approve_order_") && isAdmin(query.from)) {
        const orderId = data.replace("approve_order_", "");
        db.get(`SELECT * FROM orders WHERE orderId = ?`, [orderId], (err, order) => {
            if (!order) return;

            db.run(`UPDATE orders SET status = 'Completed' WHERE orderId = ?`, [orderId]);
            db.get(`SELECT * FROM products WHERE name = ?`, [order.subName], (err, prod) => {
                const configCode = prod ? prod.config : "vless://default-config...";

                db.run(`INSERT INTO subscriptions (userId, name, volume, duration, config, date) VALUES (?, ?, ?, ?, ?, ?)`,
                    [order.userId, order.subName, "نامحدود", "۳۰ روز", configCode, new Date().toLocaleDateString('fa-IR')]);

                bot.sendMessage(order.userId, 
                    `🎉 **پرداخت و سفارش شما تایید شد! اشتراک شما فعال گردید.**\n\n` +
                    `🏷 نام: ${order.subName}\n` +
                    `🔗 **کانفیگ اختصاصی شما:**\n\`${configCode}\``, 
                    { parse_mode: "Markdown", ...persistentKeyboard }
                ).catch(() => {});

                bot.sendMessage(chatId, `✅ سفارش ${orderId} با موفقیت تایید شد.`);
            });
        });
        return;
    }

    if (data === "adm_stats" && isAdmin(query.from)) {
        db.get(`SELECT COUNT(*) as count FROM users`, (err, userRow) => {
            db.get(`SELECT SUM(price) as total FROM orders WHERE status = 'Completed'`, (err, ordRow) => {
                bot.sendMessage(chatId, `📊 **آمار سیستم آرنا:**\n\n👥 کل کاربران: ${userRow.count} نفر\n💰 کل درآمد تایید شده: ${(ordRow.total || 0).toLocaleString()} تومان`, { parse_mode: "Markdown" });
            });
        });
        return;
    }

    if (data === "adm_back_main") {
        openAdminPanel(chatId);
        return;
    }
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;
    const photo = msg.photo;

    if (!userState[userId]) userState[userId] = { step: null };
    const currentState = userState[userId].step;

    if (isAdmin(msg.from)) {
        if (currentState === "sub_add_name") {
            userState[userId].newSub = { id: "sub_" + Date.now(), name: text };
            userState[userId].step = "sub_add_price";
            bot.sendMessage(chatId, `💵 قیمت محصول (تومان):`);
            return;
        }
        if (currentState === "sub_add_price") {
            userState[userId].newSub.price = parseInt(text) || 0;
            userState[userId].step = "sub_add_volume";
            bot.sendMessage(chatId, `📦 حجم محصول (مثلا 50GB):`);
            return;
        }
        if (currentState === "sub_add_volume") {
            userState[userId].newSub.volume = text;
            userState[userId].step = "sub_add_config";
            bot.sendMessage(chatId, `🔗 لینک کانفیگ اشتراک:`);
            return;
        }
        if (currentState === "sub_add_config") {
            const s = userState[userId].newSub;
            db.run(`INSERT INTO products (id, name, price, volume, duration, usersCount, type, config, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [s.id, s.name, s.price, s.volume, "۳۰ روز", "۱ کاربر", "General", text]);
            userState[userId].step = null;
            bot.sendMessage(chatId, `✅ محصول جدید با موفقیت در دیتابیس ثبت شد.`);
            return;
        }
    }

    if (text === "🛒 خرید اشتراک") {
        db.all(`SELECT * FROM products WHERE status = 1`, (err, rows) => {
            if (!rows || rows.length === 0) {
                bot.sendMessage(chatId, "⚠️ هیچ محصول فعالی وجود ندارد.");
                return;
            }
            let keys = rows.map(r => [{ text: `${r.name} - ${r.price.toLocaleString()} تومان` }]);
            bot.sendMessage(chatId, "محصول مورد نظر را انتخاب کنید: 💎", {
                reply_markup: { keyboard: [...keys, [{ text: "🔙 بازگشت" }]], resize_keyboard: true }
            });
        });
        return;
    }

    db.get(`SELECT * FROM products WHERE name || ' - ' || price || ' تومان' = ?`, [text], (err, sub) => {
        if (sub) {
            bot.sendMessage(chatId, `📦 **مشخصات محصول:**\n\n🏷 نام: ${sub.name}\n💰 قیمت: ${sub.price.toLocaleString()} تومان\n📦 حجم: ${sub.volume}`, {
                reply_markup: {
                    inline_keyboard: [[{ text: "💳 پرداخت کارت به کارت", callback_data: `pay_card_${sub.id}` }]]
                },
                parse_mode: "Markdown"
            });
            return;
        }
    });

    if (text === "💳 کیف پول") {
        db.get(`SELECT balance FROM users WHERE userId = ?`, [userId], (err, row) => {
            const balance = row ? row.balance : 0;
            bot.sendMessage(chatId, `💎 موجودی کیف پول شما: ${balance.toLocaleString()} تومان`);
        });
        return;
    }

    if (text === "📦 اشتراک‌های من") {
        db.all(`SELECT * FROM subscriptions WHERE userId = ?`, [userId], (err, rows) => {
            if (!rows || rows.length === 0) {
                bot.sendMessage(chatId, "📁 شما هیچ اشتراک فعالی ندارید.");
                return;
            }
            let msgText = "📦 **اشتراک‌های فعال شما:**\n\n";
            rows.forEach((sub, idx) => {
                msgText += `${idx + 1}. **${sub.name}**\n   - حجم: ${sub.volume}\n   - کانفیگ: \`${sub.config}\`\n--------------------------\n`;
            });
            bot.sendMessage(chatId, msgText, { parse_mode: "Markdown" });
        });
        return;
    }

    if (text === "👥 دعوت دوستان") {
        bot.sendMessage(chatId, `🌐 لینک دعوت اختصاصی شما:\nhttps://t.me/${bot.options.username}?start=${userId}\n\nبا دعوت هر دوست ۵,۰۰۰ تومان پاداش بگیرید.`);
        return;
    }

    if (text === "🎫 پشتیبانی") {
        bot.sendMessage(chatId, `📞 ارتباط مستقیم با پشتیبانی: @${ADMIN_USERNAME}`);
        return;
    }

    if (text === "🔙 بازگشت") {
        bot.sendMessage(chatId, "منوی اصلی:", persistentKeyboard);
        return;
    }

    if (currentState === "waiting_for_receipt") {
        const orderId = userState[userId].currentOrderId;
        db.get(`SELECT * FROM orders WHERE orderId = ?`, [orderId], (err, order) => {
            if (order && (photo || text)) {
                db.run(`UPDATE orders SET status = 'PendingApproval' WHERE orderId = ?`, [orderId]);

                const userInfo = `👤 کاربر: \`${userId}\`\n📦 سفارش: \`${orderId}\`\n🏷 محصول: ${order.subName}\n💰 مبلغ: ${order.price.toLocaleString()} تومان`;
                const adminKb = {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "✅ تأیید و ارسال کانفیگ", callback_data: `approve_order_${orderId}` },
                            { text: "❌ رد سفارش", callback_data: `reject_order_${orderId}` }
                        ]]
                    },
                    parse_mode: "Markdown"
                };

                if (photo) {
                    bot.sendPhoto(ADMIN_CHAT_ID, photo[photo.length - 1].file_id, { caption: `📥 **فیش واریزی جدید**\n\n${userInfo}`, ...adminKb });
                } else {
                    bot.sendMessage(ADMIN_CHAT_ID, `📥 **رسید متنی جدید**\n\n${userInfo}\n📝 متن: ${text}`, adminKb);
                }

                bot.sendMessage(chatId, "✅ فیش شما ثبت و برای مالک ارسال شد. پس از تایید، کانفیگ شما ارسال خواهد شد.", persistentKeyboard);
                userState[userId].step = null;
            }
        });
    }
});
