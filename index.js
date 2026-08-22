import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";

const TOKEN = "8850301156:AAEH94AQeKKpf4-eBAgfrwsnvoIRph4--Y4";
const ADMIN_USERNAME = "ARENAM_10";

const bot = new TelegramBot(TOKEN, { polling: true });
const db = new sqlite3.Database("./arena_shop.db");

// حافظه موقت برای دریافت رسید از کاربر
const userState = {};

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

// ================= 🛠️ HELPERS =================
const isAdmin = (user) => user.username && user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase();

const saveUser = (msg) => {
    db.run(`INSERT OR IGNORE INTO users (id, username, joined) VALUES (?, ?, ?)`, 
        [msg.from.id, msg.from.username || "none", new Date().toISOString()]);
};

// ارسال گزارش فعالیت‌ها به مالک
const notifyAdmin = (text) => {
    db.get(`SELECT id FROM users WHERE username = ? COLLATE NOCASE`, [ADMIN_USERNAME], (err, row) => {
        if (row) {
            bot.sendMessage(row.id, `🔔 **گزارش فعالیت:**\n\n${text}`, { parse_mode: "Markdown" }).catch(() => {});
        }
    });
};

// ================= 🏠 MAIN MENU =================
function showMainMenu(chatId, name) {
    const text = `
🔥 **ARENA VIP CONFIGS** 🔥

سلام *${name}* عزیز به ربات رسمی آرنا خوش آمدید. ⚡
با استفاده از این ربات می‌توانید کانفیگ‌های پرسرعت، اختصاصی و بدون قطعی تهیه کنید.

💰 *موجودی کیف پول:* \`0 تومان\`
    `.trim();

    bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 خرید اشتراک پرسرعت", callback_data: "buy_menu" }],
                [
                    { text: "💰 افزایش موجودی", callback_data: "wallet" },
                    { text: "📦 خریدهای من", callback_data: "my_orders" }
                ],
                [{ text: "⚡ دریافت تست رایگان", callback_data: "free_test" }],
                [
                    { text: "📞 پشتیبانی", callback_data: "support" },
                    { text: "📖 راهنمای اتصال", callback_data: "guide" }
                ]
            ]
        }
    });
}

// ================= 🚀 START COMMAND =================
bot.onText(/\/start/, (msg) => {
    saveUser(msg);
    showMainMenu(msg.chat.id, msg.from.first_name || "کاربر");
    notifyAdmin(`👤 کاربر [@${msg.from.username || msg.from.id}] ربات را استارت کرد (/start).`);
});

// ================= 👑 ADMIN PANEL =================
bot.onText(/\/admin/, (msg) => {
    if (!isAdmin(msg.from)) {
        return bot.sendMessage(msg.chat.id, "❌ شما دسترسی به پنل مدیریت ندارید.");
    }

    bot.sendMessage(msg.chat.id, "🖥 *پنل مدیریت پیشرفته آرنا*", {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "➕ افزودن کانفیگ جدید", callback_data: "admin_add" }],
                [{ text: "📦 بررسی رسیدهای منتظر تایید", callback_data: "admin_pending_orders" }],
                [{ text: "📊 آمار کاربران کل", callback_data: "admin_stats" }]
            ]
        }
    });
});

// ================= 📥 MESSAGE & RECEIPT HANDLER =================
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (isAdmin(msg.from)) return; // ادمین پیام متفرقه بفرستد گیر نافتیم

    // اگر کاربر در مرحله ارسال رسید بود
    if (userState[userId] && userState[userId].action === "awaiting_receipt") {
        if (msg.photo || msg.document) {
            const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
            const configId = userState[userId].configId;

            db.run(`INSERT INTO orders (user_id, config_id, receipt_file_id, status, date) VALUES (?, ?, ?, 'pending', ?)`,
                [userId, configId, fileId, new Date().toLocaleString("fa-IR")], function(err) {
                    if (err) {
                        return bot.sendMessage(chatId, "❌ خطایی در ثبت سفارش رخ داد.");
                    }
                    const orderId = this.lastID;
                    bot.sendMessage(chatId, "✅ *رسید شما با موفقیت ثبت شد و برای مدیریت ارسال گردید.*\nبه زودی پس از تایید، کانفیگ اختصاصی برایتان ارسال می‌شود.", { parse_mode: "Markdown" });

                    // ارسال رسید به مالک برای تایید/رد
                    db.get(`SELECT * FROM configs WHERE id = ?`, [configId], (err, cfg) => {
                        db.get(`SELECT username FROM users WHERE id = ?`, [userId], (err, u) => {
                            const adminText = `📦 **سفارش جدید پرداخت شده!**\n\n👤 کاربر: @${u?.username || userId}\n⚡ محصول: ${cfg?.name}\n💰 قیمت: ${cfg?.price} تومان`;

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
                                bot.sendDocument(ADMIN_USERNAME, fileId, { caption: adminText, parse_mode: "Markdown" });
                            });
                        });
                    });
                });

            delete userState[userId];
        } else {
            bot.sendMessage(chatId, "⚠️ لطفاً حتماً **تصویر اسکرین‌شات رسید پرداخت** را ارسال کنید.");
        }
    }
});

// ================= 🔄 CALLBACK HANDLER =================
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const user = query.from;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "support") {
        notifyAdmin(`📞 کاربر [@${user.username || user.id}] روی دکمه پشتیبانی کلیک کرد.`);
        return bot.sendMessage(chatId, "📞 *پشتیبانی 24 ساعته:*\nبرای هرگونه سوال یا خرید به ادمین پیام دهید:\n@ARENAM_10", { parse_mode: "Markdown" });
    }

    if (data === "guide") {
        return bot.sendMessage(chatId, "📖 *راهنمای اتصال:*\nنرم‌افزار V2RayNG (اندروید) یا Streisand (آیفون) را دانلود کرده و لینک کانفیگ خریداری‌شده را داخل آن ایمپورت کنید.", { parse_mode: "Markdown" });
    }

    if (data === "wallet") {
        return bot.sendMessage(chatId, "💳 *شارژ کیف پول*\n\nبرای افزایش موجودی، به پشتیبانی (@ARENAM_10) پیام دهید تا کارت به کارت انجام شود.", { parse_mode: "Markdown" });
    }

    if (data === "my_orders") {
        db.all(`SELECT orders.*, configs.name FROM orders JOIN configs ON orders.config_id = configs.id WHERE orders.user_id = ?`, [chatId], (err, rows) => {
            if (!rows || rows.length === 0) {
                return bot.sendMessage(chatId, "📦 شما تاکنون هیچ سفارشی ثبت نکرده‌اید.");
            }
            let text = "📦 *خریدهای شما:*\n\n";
            rows.forEach((o, index) => {
                let statusText = o.status === 'approved' ? '✅ تایید شده' : (o.status === 'rejected' ? '❌ رد شده' : '⏳ در انتظار بررسی');
                text += `${index + 1}. محصول: ${o.name}\nوضعیت: ${statusText}\n📅 تاریخ: ${o.date}\n-------------------\n`;
            });
            bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
        });
    }

    if (data === "free_test") {
        notifyAdmin(`⚡ کاربر [@${user.username || user.id}] درخواست تست رایگان داد.`);
        return bot.sendMessage(chatId, "⚡ هر کاربر یکبار می‌تواند تست رایگان دریافت کند. برای دریافت به پشتیبانی پیام دهید: @ARENAM_10");
    }

    // نمایش لیست کانفیگ‌های فروخته‌نشده (فقط آن‌هایی که موجودند)
    if (data === "buy_menu") {
        db.all(`SELECT * FROM configs WHERE sold = 0`, [], (err, rows) => {
            if (!rows || rows.length === 0) {
                return bot.sendMessage(chatId, "😔 در حال حاضر هیچ کانفیگی در انبار موجود نیست. لطفاً بعداً سر بزنید.");
            }
            
            const keyboard = rows.map(c => [{ text: `🟢 ${c.name} - ${c.price.toLocaleString()} تومان`, callback_data: `buy_${c.id}` }]);
            keyboard.push([{ text: "🔙 بازگشت به منوی اصلی", callback_data: "back_home" }]);

            bot.sendMessage(chatId, "🛒 لطفاً کانفیگ مورد نظر خود را انتخاب کنید:", {
                reply_markup: { inline_keyboard: keyboard }
            });
        });
    }

    if (data === "back_home") {
        showMainMenu(chatId, user.first_name || "کاربر");
    }

    // انتخاب کانفیگ برای خرید
    if (data.startsWith("buy_")) {
        const configId = data.split("_")[1];
        db.get(`SELECT * FROM configs WHERE id = ? AND sold = 0`, [configId], (err, config) => {
            if (!config) {
                return bot.sendMessage(chatId, "❌ متأسفانه این کانفیگ قبلاً توسط شخص دیگری خریداری شده و دیگر موجود نیست.");
            }

            // ذخیره وضعیت که کاربر منتظر ارسال رسید برای این کانفیگ است
            userState[user.id] = { action: "awaiting_receipt", configId: config.id };

            const text = `
🛒 **جزئیات اشتراک انتخاب شده:**
نام: ${config.name}
حجم: ${config.volume || "نامشخص"}
مدت: ${config.days || 30} روز
💰 قیمت: ${config.price.toLocaleString()} تومان

💳 **مرحله پرداخت:**
لطفاً مبلغ فوق را به کارت پشتیبانی واریز کرده و **اسکرین‌شات رسید پرداخت** را همینجا در چت بفرستید (عکس ارسال کنید).
            `.trim();

            bot.sendMessage(chatId, text, {
                parse_mode: "Markdown",
                reply_markup: { inline_keyboard: [[{ text: "❌ انصراف", callback_data: "back_home" }]] }
            });

            notifyAdmin(`🛒 کاربر [@${user.username || user.id}] قصد خرید کانفیگ [${config.name}] را دارد و منتظر ارسال رسید است.`);
        });
    }

    // ================= 👑 تایید سفارش توسط مالک =================
    if (data.startsWith("approve_") && isAdmin(user)) {
        const orderId = data.split("_")[1];
        db.get(`SELECT orders.*, configs.config_data, configs.name, users.id as client_id FROM orders JOIN configs ON orders.config_id = configs.id JOIN users ON orders.user_id = users.id WHERE orders.id = ?`, [orderId], (err, order) => {
            if (!order) return bot.sendMessage(chatId, "❌ سفارش پیدا نشد.");

            // ۱. تغییر وضعیت سفارش به تایید شده
            db.run(`UPDATE orders SET status = 'approved' WHERE id = ?`, [orderId]);
            
            // ۲. علامت‌زدن کانفیگ به عنوان فروخته‌شده (تا خودکار از لیست خرید بقیه حذف شود)
            db.run(`UPDATE configs SET sold = 1 WHERE id = ?`, [order.config_id]);

            // ۳. ارسال کانفیگ اختصاصی به کاربر خریدار
            bot.sendMessage(order.client_id, `🎉 **پرداخت شما تایید شد!**\n\n📦 اشتراک اختصاصی شما:\n\`${order.config_data}\``, { parse_mode: "Markdown" });
            
            bot.sendMessage(chatId, `✅ سفارش تایید شد و کانفیگ با موفقیت به کاربر تحویل داده شد.`);
            
            bot.editMessageCaption(`✅ **تایید و ارسال شد**`, {
                chat_id: chatId,
                message_id: query.message.message_id
            }).catch(() => {});
        });
    }

    // ================= ❌ رد سفارش توسط مالک =================
    if (data.startsWith("reject_") && isAdmin(user)) {
        const orderId = data.split("_")[1];
        db.get(`SELECT user_id FROM orders WHERE id = ?`, [orderId], (err, order) => {
            if (order) {
                bot.sendMessage(order.user_id, "❌ متأسفانه رسید پرداخت شما توسط مدیریت رد شد. در صورت وجود مشکل به پشتیبانی پیام دهید: @ARENAM_10");
            }
            db.run(`UPDATE orders SET status = 'rejected' WHERE id = ?`, [orderId]);
            bot.sendMessage(chatId, `❌ سفارش رد شد.`);
            
            bot.editMessageCaption(`❌ **سفارش رد شد**`, {
                chat_id: chatId,
                message_id: query.message.message_id
            }).catch(() => {});
        });
    }

    if (data === "admin_pending_orders" && isAdmin(user)) {
        db.all(`SELECT orders.id, users.username, configs.name FROM orders JOIN users ON orders.user_id = users.id JOIN configs ON orders.config_id = configs.id WHERE orders.status = 'pending'`, [], (err, orders) => {
            if (!orders || orders.length === 0) return bot.sendMessage(chatId, "📦 هیچ سفارش در انتظاری وجود ندارد.");
            
            const keyboard = orders.map(o => [{ text: `👤 @${o.username} - 📦 ${o.name}`, callback_data: `adm_check_${o.id}` }]);
            bot.sendMessage(chatId, "لیست سفارش‌های منتظر تایید:", { reply_markup: { inline_keyboard: keyboard } });
        });
    }

    if (data === "admin_stats" && isAdmin(user)) {
        db.get(`SELECT COUNT(*) as count FROM users`, [], (err, row) => {
            bot.sendMessage(chatId, `👥 تعداد کل کاربران ربات: ${row.count} نفر`);
        });
    }
});

// ================= ⚠️ ERROR HANDLING =================
bot.on("polling_error", (err) => {
    console.log("Polling error:", err.message);
});

console.log("🔥 ARENA SHOP BOT RUNNING SUCCESSFULLY...");
