import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";
import fs from "fs";

const TOKEN = "8850301156:AAEH94AQeKKpf4-eBAgfrwsnvoIRph4--Y4";
const ADMIN_USERNAME = "ARENAM_10";

const bot = new TelegramBot(TOKEN, { polling: true });
const db = new sqlite3.Database("./arena_shop.db", (err) => {
    if (err) logError("Database Connection Error: " + err.message);
});

// حافظه موقت برای نگهداری وضعیت فعلی کاربران (مثل فرستادن رسید)
const userState = {};

// ================= 🛠️ LOGGING & NOTIFICATIONS =================
function logError(message) {
    const logData = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFile("error.log", logData, (err) => {
        if (err) console.error("Failed to write to log:", err);
    });
}

// ارسال گزارش فعالیت‌ها به مالک
function notifyAdmin(text) {
    db.get(`SELECT id FROM users WHERE username = ? COLLATE NOCASE`, [ADMIN_USERNAME], (err, row) => {
        if (row) {
            bot.sendMessage(row.id, `🔔 **گزارش فعالیت ربات:**\n\n${text}`, { parse_mode: "Markdown" }).catch(() => {});
        }
    });
}

// ================= 🗄️ DATABASE SETUP =================
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        balance INTEGER DEFAULT 0,
        joined TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        name TEXT,
        volume TEXT,
        days INTEGER,
        price INTEGER,
        description TEXT,
        config_data TEXT,
        sold INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        config_id INTEGER,
        receipt_file_id TEXT,
        status TEXT DEFAULT 'pending',
        date TEXT
    )`);
});

// ================= 👤 HELPERS =================
const isAdmin = (user) => {
    return user.username && user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
};

const saveUser = (msg) => {
    const user = msg.from;
    db.run(`INSERT OR IGNORE INTO users (id, username, joined) VALUES (?, ?, ?)`, 
        [user.id, user.username || "none", new Date().toISOString()]);
};

// ================= 🏠 MAIN MENU =================
function showMainMenu(chatId, name) {
    const text = `
🔥 **فروشگاه تخصصی کانفیگ آرنا** 🔥

سلام *${name}* عزیز؛
از طریق دکمه‌های زیر می‌توانید بسته‌های پرسرعت و اختصاصی را مشاهده و خریداری کنید. ⚡
    `.trim();

    bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 خرید اشتراک و کانفیگ", callback_data: "shop_categories" }],
                [
                    { text: "💰 کیف پول من", callback_data: "my_wallet" },
                    { text: "📦 سفارش‌های من", callback_data: "my_orders" }
                ],
                [
                    { text: "📞 پشتیبانی", callback_data: "support" },
                    { text: "📖 راهنمای اتصال", callback_data: "guide" }
                ]
            ]
        }
    }).catch(err => logError(err.message));
}

// ================= 🚀 START & COMMANDS =================
bot.onText(/\/start/, (msg) => {
    saveUser(msg);
    showMainMenu(msg.chat.id, msg.from.first_name || "کاربر");
    notifyAdmin(`👤 کاربر [@${msg.from.username || msg.from.id}] ربات را استارت کرد.`);
});

bot.onText(/\/admin/, (msg) => {
    if (!isAdmin(msg.from)) return bot.sendMessage(msg.chat.id, "❌ شما دسترسی ندارید.");
    
    bot.sendMessage(msg.chat.id, "🖥 *پنل مدیریت مرکزی آرنا*", {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "➕ افزودن کانفیگ", callback_data: "adm_add_cfg" }, { text: "🗑 مدیریت کانفیگ‌ها", callback_data: "adm_list_cfg" }],
                [{ text: "👥 آمار کاربران", callback_data: "adm_users" }, { text: "📢 ارسال پیام همگانی", callback_data: "adm_broadcast" }],
                [{ text: "📦 بررسی رسیدهای پرداخت", callback_data: "adm_pending_orders" }]
            ]
        }
    });
});

// ================= 📥 MESSAGE & RECEEPT HANDLER =================
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // اگر کاربر در وضعیت ارسال رسید پرداخت بود
    if (userState[userId] && userState[userId].action === "awaiting_receipt") {
        if (msg.photo || msg.document) {
            const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
            const cfgId = userState[userId].configId;

            db.run(`INSERT INTO orders (user_id, config_id, receipt_file_id, status, date) VALUES (?, ?, ?, 'pending', ?)`,
                [userId, cfgId, fileId, new Date().toLocaleString("fa-IR")], function(err) {
                    if (err) {
                        return bot.sendMessage(chatId, "❌ خطایی در ثبت سفارش رخ داد.");
                    }
                    const orderId = this.lastID;
                    bot.sendMessage(chatId, "✅ *رسید شما با موفقیت ثبت شد و برای مالک ارسال گردید.*\nبه زودی پس از بررسی، کانفیگ برای شما ارسال خواهد شد.", { parse_mode: "Markdown" });
                    
                    // ارسال رسید و اطلاعات به مالک جهت تایید یا رد
                    db.get(`SELECT configs.name, configs.price FROM configs WHERE id = ?`, [cfgId], (err, cfg) => {
                        db.get(`SELECT username FROM users WHERE id = ?`, [userId], (err, u) => {
                            const adminText = `📦 **سفارش جدید نیازمند تایید!**\n\n👤 کاربر: @${u?.username || userId}\n🛒 محصول: ${cfg?.name}\n💰 قیمت: ${cfg?.price} تومان`;
                            
                            bot.sendPhoto(ADMIN_USERNAME, fileId, {
                                caption: adminText,
                                parse_mode: "Markdown",
                                reply_markup: {
                                    inline_keyboard: [
                                        [
                                            { text: "✅ تایید و ارسال کانفیگ", callback_data: `approve_${orderId}` },
                                            { text: "❌ رد سفارش", callback_data: `reject_${orderId}` }
                                        ]
                                    ]
                                }
                            }).catch(() => {
                                // اگر ارسال عکس به مشکل خورد با sendDocument بفرست
                                bot.sendDocument(ADMIN_USERNAME, fileId, { caption: adminText, parse_mode: "Markdown" });
                            });
                        });
                    });
                });

            delete userState[userId];
        } else {
            bot.sendMessage(chatId, "⚠️ لطفاً حتماً **اسکرین‌شات یا تصویر رسید** پرداخت را ارسال کنید.");
        }
    }
});

// ================= 🔄 CALLBACK QUERY HANDLER =================
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const user = query.from;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    try {
        if (data === "main_menu") {
            return showMainMenu(chatId, user.first_name || "کاربر");
        }

        if (data === "support") {
            return bot.sendMessage(chatId, "📞 پشتیبانی 24 ساعته:\n@ARENAM_10", { parse_mode: "Markdown" });
        }

        if (data === "guide") {
            return bot.sendMessage(chatId, "📖 برای اتصال از برنامه‌های V2RayNG (اندروید) یا Streisand (آیفون) استفاده کنید.");
        }

        if (data === "my_wallet") {
            db.get(`SELECT balance FROM users WHERE id = ?`, [chatId], (err, row) => {
                bot.sendMessage(chatId, `💰 موجودی کیف پول شما: \`${row?.balance || 0} تومان\``, {
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] }
                });
            });
        }

        // دسته‌بندی فروشگاه
        if (data === "shop_categories") {
            db.all(`SELECT * FROM categories`, [], (err, cats) => {
                if (!cats || cats.length === 0) {
                    return bot.sendMessage(chatId, "😔 هنوز دسته‌بندی‌ای تعریف نشده است.", {
                        reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "main_menu" }]] }
                    });
                }
                const keyboard = cats.map(c => [{ text: `📁 ${c.name}`, callback_data: `cat_${c.id}` }]);
                keyboard.push([{ text: "🔙 بازگشت", callback_data: "main_menu" }]);
                bot.sendMessage(chatId, "📂 لطفاً دسته‌بندی مورد نظر را انتخاب کنید:", { reply_markup: { inline_keyboard: keyboard } });
            });
        }

        // نمایش کانفیگ‌های یک دسته (فقط آن‌هایی که فروخته نشده‌اند)
        if (data.startsWith("cat_")) {
            const catId = data.split("_")[1];
            db.all(`SELECT * FROM configs WHERE category_id = ? AND sold = 0`, [catId], (err, configs) => {
                if (!configs || configs.length === 0) {
                    return bot.sendMessage(chatId, "😔 کانفیگ فعالی در این دسته موجود نیست.", {
                        reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "shop_categories" }]] }
                    });
                }
                const keyboard = configs.map(cfg => [{ text: `⚡ ${cfg.name} - ${cfg.price} تومان`, callback_data: `cfg_${cfg.id}` }]);
                keyboard.push([{ text: "🔙 بازگشت", callback_data: "shop_categories" }]);
                bot.sendMessage(chatId, "🛒 کانفیگ‌های موجود:", { reply_markup: { inline_keyboard: keyboard } });
            });
        }

        // جزئیات کانفیگ
        if (data.startsWith("cfg_")) {
            const cfgId = data.split("_")[1];
            db.get(`SELECT * FROM configs WHERE id = ? AND sold = 0`, [cfgId], (err, cfg) => {
                if (!cfg) return bot.sendMessage(chatId, "❌ متأسفانه این کانفیگ قبلاً فروخته شده یا دیگر موجود نیست.");

                const text = `
📦 **نام:** ${cfg.name}
📊 **حجم:** ${cfg.volume}
⏳ **مدت اعتبار:** ${cfg.days} روز
💰 **قیمت:** ${cfg.price.toLocaleString()} تومان
📝 **توضیحات:** ${cfg.description || "ندارد"}
                `.trim();

                bot.sendMessage(chatId, text, {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "💳 خرید و ارسال رسید پرداخت", callback_data: `buy_${cfg.id}` }],
                            [{ text: "🔙 بازگشت", callback_data: "shop_categories" }]
                        ]
                    }
                });
            });
        }

        // خرید و درخواست رسید
        if (data.startsWith("buy_")) {
            const cfgId = data.split("_")[1];
            userState[user.id] = { action: "awaiting_receipt", configId: cfgId };
            
            bot.sendMessage(chatId, `💳 مبلغ را به کارت پشتیبانی واریز کرده و **اسکرین‌شات رسید پرداخت** را همینجا ارسال کنید (عکس بفرستید):`, {
                reply_markup: { inline_keyboard: [[{ text: "❌ انصراف", callback_data: "main_menu" }]] }
            });
            notifyAdmin(`🛒 کاربر [@${user.username || user.id}] درخواست خرید کانفیگ شماره ${cfgId} را ثبت کرد و منتظر ارسال رسید است.`);
        }

        // ================= 👑 مدیریت تایید/رد سفارش توسط مالک =================
        if (data.startsWith("approve_") && isAdmin(user)) {
            const orderId = data.split("_")[1];
            db.get(`SELECT orders.*, configs.config_data, configs.name, users.id as client_id FROM orders JOIN configs ON orders.config_id = configs.id JOIN users ON orders.user_id = users.id WHERE orders.id = ?`, [orderId], (err, order) => {
                if (!order) return bot.sendMessage(chatId, "❌ سفارش پیدا نشد.");

                // تغییر وضعیت سفارش و علامت‌زدن کانفیگ به عنوان فروخته‌شده (حذف از لیست خرید دیگران)
                db.run(`UPDATE orders SET status = 'approved' WHERE id = ?`, [orderId]);
                db.run(`UPDATE configs SET sold = 1 WHERE id = ?`, [order.config_id]);

                // ارسال کانفیگ اختصاصی به کاربر
                bot.sendMessage(order.client_id, `✅ **پرداخت شما تایید شد!**\n\n📦 اشتراک اختصاصی شما:\n\`${order.config_data}\``, { parse_mode: "Markdown" });
                bot.sendMessage(chatId, `✅ سفارش شماره ${orderId} تایید و کانفیگ با موفقیت برای کاربر ارسال شد.`);
                
                // ویرایش پیام پنل ادمین
                bot.editMessageCaption(`✅ **تایید شد**\nسفارش به کاربر تحویل داده شد.`, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "Markdown"
                }).catch(() => {});
            });
        }

        if (data.startsWith("reject_") && isAdmin(user)) {
            const orderId = data.split("_")[1];
            db.get(`SELECT user_id FROM orders WHERE id = ?`, [orderId], (err, order) => {
                if (order) {
                    bot.sendMessage(order.user_id, "❌ متأسفانه رسید پرداخت شما توسط مدیریت رد شد. در صورت وجود مشکل به پشتیبانی پیام دهید.");
                }
                db.run(`UPDATE orders SET status = 'rejected' WHERE id = ?`, [orderId]);
                bot.sendMessage(chatId, `❌ سفارش شماره ${orderId} رد شد.`);
                
                bot.editMessageCaption(`❌ **رد شد**`, {
                    chat_id: chatId,
                    message_id: query.message.message_id
                }).catch(() => {});
            });
        }

        if (data === "adm_users" && isAdmin(user)) {
            db.get(`SELECT COUNT(*) as count FROM users`, [], (err, row) => {
                bot.sendMessage(chatId, `👥 تعداد کل کاربران ربات: ${row.count} نفر`);
            });
        }

        if (data === "adm_pending_orders" && isAdmin(user)) {
            db.all(`SELECT orders.id, users.username, configs.name FROM orders JOIN users ON orders.user_id = users.id JOIN configs ON orders.config_id = configs.id WHERE orders.status = 'pending'`, [], (err, orders) => {
                if (!orders || orders.length === 0) return bot.sendMessage(chatId, "📦 هیچ سفارش در انتظاری وجود ندارد.");
                
                const keyboard = orders.map(o => [{ text: `👤 @${o.username} - 📦 ${o.name}`, callback_data: `adm_check_${o.id}` }]);
                bot.sendMessage(chatId, "لیست سفارش‌های منتظر تایید:", { reply_markup: { inline_keyboard: keyboard } });
            });
        }

    } catch (e) {
        logError(e.message);
    }
});

// ================= ⚠️ POLLING & ERROR HANDLING =================
bot.on("polling_error", (err) => logError("Polling error: " + err.message));

console.log("🔥 PROFESSIONAL ARENA SHOP BOT RUNNING SUCCESSFULLY...");
