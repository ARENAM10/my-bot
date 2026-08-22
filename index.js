import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_USERNAME = "ARENAM_10";

// راه‌اندازی ربات با تنظیمات پایدار پولینگ
const bot = new TelegramBot(TOKEN, { 
    polling: {
        interval: 300,
        autoStart: true,
        params: { timeout: 10 }
    } 
});

const db = new sqlite3.Database("./arena_shop.db", (err) => {
    if (err) console.error("Database Error: " + err.message);
});

// حافظه موقت برای وضعیت کاربران (مثل انتظار برای ارسال رسید پرداخت یا افزودن کانفیگ)
const userState = {};

// ================= 🛠️ LOGGING & NOTIFICATIONS =================
function notifyAdmin(text) {
    db.get(`SELECT id FROM users WHERE username = ? COLLATE NOCASE`, [ADMIN_USERNAME], (err, row) => {
        if (row) {
            bot.sendMessage(row.id, `🔔 **گزارش فعالیت زنده:**\n\n${text}`, { parse_mode: "Markdown" }).catch(() => {});
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

    db.run(`CREATE TABLE IF NOT EXISTS configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
const isAdmin = (user) => user.username && user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase();

const saveUser = (msg) => {
    db.run(`INSERT OR IGNORE INTO users (id, username, joined) VALUES (?, ?, ?)`, 
        [msg.from.id, msg.from.username || "none", new Date().toISOString()]);
};

// ================= 🏠 MAIN MENU =================
function showMainMenu(chatId, name) {
    db.get(`SELECT balance FROM users WHERE id = ?`, [chatId], (err, row) => {
        const balance = row?.balance || 0;

        const text = `
🔥 **فروشگاه تخصصی کانفیگ آرنا** 🔥

سلام *${name}* عزیز؛
از طریق دکمه‌های زیر می‌توانید بسته‌های پرسرعت، اختصاصی و بدون قطعی را مشاهده و خریداری کنید. ⚡

💰 *موجودی کیف پول شما:* \`${balance.toLocaleString()} تومان\`
        `.trim();

        bot.sendMessage(chatId, text, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🛒 خرید اشتراک و کانفیگ", callback_data: "buy_menu" }],
                    [
                        { text: "💰 افزایش موجودی", callback_data: "wallet" },
                        { text: "📦 سفارش‌های من", callback_data: "my_orders" }
                    ],
                    [{ text: "⚡ دریافت تست رایگان", callback_data: "free_test" }],
                    [
                        { text: "📞 پشتیبانی", callback_data: "support" },
                        { text: "📖 راهنمای اتصال", callback_data: "guide" }
                    ]
                ]
            }
        }).catch(err => console.log("Menu Error:", err.message));
    });
}

// ================= 🚀 START & COMMANDS =================
bot.onText(/\/start/, (msg) => {
    saveUser(msg);
    showMainMenu(msg.chat.id, msg.from.first_name || "کاربر");
    notifyAdmin(`👤 کاربر [@${msg.from.username || msg.from.id}] ربات را استارت کرد (/start).`);
});

bot.onText(/\/admin/, (msg) => {
    if (!isAdmin(msg.from)) {
        return bot.sendMessage(msg.chat.id, "❌ شما دسترسی به پنل مدیریت ندارید.");
    }
    
    bot.sendMessage(msg.chat.id, "🖥 *پنل مدیریت مرکزی آرنا*", {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "➕ افزودن کانفیگ جدید به انبار", callback_data: "adm_add_prompt" }],
                [{ text: "📦 بررسی رسیدهای پرداخت", callback_data: "adm_pending_orders" }],
                [{ text: "📊 آمار و موجودی انبار", callback_data: "adm_stock" }, { text: "👥 آمار کاربران", callback_data: "adm_users" }]
            ]
        }
    });
});

// ================= 📥 MESSAGE & RECEIPT HANDLER =================
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (msg.text && msg.text.toLowerCase() === "سلام") {
        return bot.sendMessage(chatId, "سلام! ربات آرنا کاملاً آنلاین و آماده به کار است. 🚀");
    }

    if (isAdmin(msg.from)) {
        if (userState[userId] && userState[userId].action === "adding_config_step") {
            const parts = msg.text.split("|").map(p => p.trim());
            if (parts.length >= 5) {
                db.run(`INSERT INTO configs (name, volume, days, price, description, config_data, sold) VALUES (?, ?, ?, ?, ?, ?, 0)`,
                    [parts[0], parts[1], parseInt(parts[2]), parseInt(parts[3]), "ثبت شده توسط ادمین", parts[4]], (err) => {
                        if (err) {
                            bot.sendMessage(chatId, "❌ خطا در ثبت کانفیگ در دیتابیس.");
                        } else {
                            bot.sendMessage(chatId, `✅ کانفیگ [${parts[0]}] با موفقیت به انبار اضافه شد!`);
                            notifyAdmin(`➕ ادمین یک کانفیگ جدید [${parts[0]}] به انبار اضافه کرد.`);
                        }
                        delete userState[userId];
                    });
            } else {
                bot.sendMessage(chatId, "⚠️ فرمت ارسال اشتباه است!\nلطفاً به این شکل بفرستید:\n\n`نام | حجم | روز | قیمت | لینک کانفیگ`", { parse_mode: "Markdown" });
            }
            return;
        }
        return; 
    }

    if (userState[userId] && userState[userId].action === "awaiting_receipt") {
        if (msg.photo || msg.document) {
            const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
            const configId = userState[userId].configId;

            db.run(`INSERT INTO orders (user_id, config_id, receipt_file_id, status, date) VALUES (?, ?, ?, 'pending', ?)`,
                [userId, configId, fileId, new Date().toLocaleString("fa-IR")], function(err) {
                    if (err) {
                        return bot.sendMessage(chatId, "❌ خطایی در ثبت سفارش رخ داد. دوباره تلاش کنید.");
                    }
                    const orderId = this.lastID;
                    bot.sendMessage(chatId, "✅ *رسید شما با موفقیت ثبت شد و برای مالک ارسال گردید.*\nبه زودی پس از بررسی، کانفیگ اختصاصی برایتان ارسال خواهد شد.", { parse_mode: "Markdown" });

                    db.get(`SELECT * FROM configs WHERE id = ?`, [configId], (err, cfg) => {
                        db.get(`SELECT username FROM users WHERE id = ?`, [userId], (err, u) => {
                            const adminText = `📦 **سفارش جدید نیازمند تایید!**\n\n👤 کاربر: @${u?.username || userId}\n🛒 محصول: ${cfg?.name}\n💰 قیمت: ${cfg?.price?.toLocaleString()} تومان`;

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
            bot.sendMessage(chatId, "⚠️ لطفاً حتماً **اسکرین‌شات یا عکس رسید پرداخت** را ارسال کنید.");
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
        if (data === "back_home") {
            return showMainMenu(chatId, user.first_name || "کاربر");
        }

        if (data === "support") {
            notifyAdmin(`📞 کاربر [@${user.username || user.id}] روی دکمه پشتیبانی کلیک کرد.`);
            return bot.sendMessage(chatId, "📞 *پشتیبانی 24 ساعته:*\nبرای ارتباط با مدیریت به آیدی زیر پیام دهید:\n@ARENAM_10", { parse_mode: "Markdown" });
        }

        if (data === "guide") {
            return bot.sendMessage(chatId, "📖 *راهنمای اتصال:*\nنرم‌افزار V2RayNG (برای اندروید) یا Streisand / FoXray (برای آیفون) را دانلود کرده و لینک کانفیگ خریداری‌شده را داخل آن ایمپورت کنید.", { parse_mode: "Markdown" });
        }

        if (data === "wallet") {
            notifyAdmin(`💰 کاربر [@${user.username || user.id}] بخش کیف پول را بررسی کرد.`);
            return bot.sendMessage(chatId, "💳 *شارژ کیف پول*\n\nبرای افزایش موجودی، به پشتیبانی (@ARENAM_10) پیام دهید تا کارت به کارت انجام شود.", { parse_mode: "Markdown" });
        }

        if (data === "my_orders") {
            db.all(`SELECT orders.*, configs.name FROM orders JOIN configs ON orders.config_id = configs.id WHERE orders.user_id = ?`, [chatId], (err, rows) => {
                if (!rows || rows.length === 0) {
                    return bot.sendMessage(chatId, "📦 شما تاکنون هیچ سفارشی ثبت نکرده‌اید.");
                }
                let text = "📦 *سفارش‌های شما:*\n\n";
                rows.forEach((o, index) => {
                    let st = o.status === 'approved' ? '✅ تایید شده' : (o.status === 'rejected' ? '❌ رد شده' : '⏳ در انتظار بررسی ادمین');
                    text += `${index + 1}. محصول: ${o.name}\nوضعیت: ${st}\n📅 تاریخ: ${o.date}\n-------------------\n`;
                });
                bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
            });
        }

        if (data === "free_test") {
            notifyAdmin(`⚡ کاربر [@${user.username || user.id}] درخواست تست رایگان داد.`);
            return bot.sendMessage(chatId, "⚡ هر کاربر یک‌بار می‌تواند تست رایگان دریافت کند. برای دریافت به پشتیبانی پیام دهید: @ARENAM_10");
        }

        if (data === "buy_menu") {
            db.all(`SELECT * FROM configs WHERE sold = 0`, [], (err, rows) => {
                if (!rows || rows.length === 0) {
                    return bot.sendMessage(chatId, "😔 در حال حاضر هیچ کانفیگی در انبار موجود نیست. لطفاً بعداً سر بزنید.", {
                        reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "back_home" }]] }
                    });
                }
                
                const keyboard = rows.map(c => [{ text: `🟢 ${c.name} (${c.volume}) - ${c.price.toLocaleString()} تومان`, callback_data: `buy_${c.id}` }]);
                keyboard.push([{ text: "🔙 بازگشت به منوی اصلی", callback_data: "back_home" }]);

                bot.sendMessage(chatId, "🛒 لطفاً کانفیگ مورد نظر خود را برای خرید انتخاب کنید:", {
                    reply_markup: { inline_keyboard: keyboard }
                });
            });
        }

        if (data.startsWith("buy_")) {
            const configId = data.split("_")[1];
            db.get(`SELECT * FROM configs WHERE id = ? AND sold = 0`, [configId], (err, config) => {
                if (!config) {
                    return bot.sendMessage(chatId, "❌ متأسفانه این کانفیگ قبلاً توسط شخص دیگری خریداری شده و از لیست حذف گردیده است.");
                }

                userState[user.id] = { action: "awaiting_receipt", configId: config.id };

                const text = `
🛒 **جزئیات اشتراک انتخابی:**
نام: ${config.name}
حجم: ${config.volume}
مدت اعتبار: ${config.days} روز
💰 قیمت: ${config.price.toLocaleString()} تومان

💳 **مرحله پرداخت:**
لطفاً مبلغ فوق را به کارت پشتیبانی واریز کرده و **اسکرین‌شات رسید پرداخت** را همینجا در چت بفرستید (عکس ارسال کنید).
                `.trim();

                bot.sendMessage(chatId, text, {
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: [[{ text: "❌ انصراف", callback_data: "buy_menu" }]] }
                });

                notifyAdmin(`🛒 کاربر [@${user.username || user.id}] درخواست خرید کانفیگ [${config.name}] را ثبت کرد و منتظر ارسال رسید است.`);
            });
        }

        if (data === "adm_add_prompt" && isAdmin(user)) {
            userState[user.id] = { action: "adding_config_step" };
            return bot.sendMessage(chatId, "➕ لطفاً مشخصات کانفیگ جدید را با خط عمودی (`|`) به این شکل بفرستید:\n\n`نام | حجم | روز | قیمت | لینک کانفیگ`", { parse_mode: "Markdown" });
        }

        if (data.startsWith("approve_") && isAdmin(user)) {
            const orderId = data.split("_")[1];
            db.get(`SELECT orders.*, configs.config_data, configs.name, users.id as client_id FROM orders JOIN configs ON orders.config_id = configs.id JOIN users ON orders.user_id = users.id WHERE orders.id = ?`, [orderId], (err, order) => {
                if (!order) return bot.sendMessage(chatId, "❌ سفارش پیدا نشد.");

                db.run(`UPDATE orders SET status = 'approved' WHERE id = ?`, [orderId]);
                db.run(`UPDATE configs SET sold = 1 WHERE id = ?`, [order.config_id]);

                bot.sendMessage(order.client_id, `🎉 **پرداخت شما تایید شد!**\n\n📦 اشتراک اختصاصی شما:\n\`${order.config_data}\``, { parse_mode: "Markdown" });
                bot.sendMessage(chatId, `✅ سفارش تایید شد و کانفیگ با موفقیت به کاربر تحویل داده شد و از انبار خارج گردید.`);
                
                bot.editMessageCaption(`✅ **تایید و به کاربر تحویل داده شد**`, {
                    chat_id: chatId,
                    message_id: query.message.message_id
                }).catch(() => {});
            });
        }

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

        if (data === "adm_stock" && isAdmin(user)) {
            db.all(`SELECT * FROM configs`, [], (err, rows) => {
                const free = rows.filter(r => !r.sold).length;
                const sold = rows.filter(r => r.sold).length;
                bot.sendMessage(chatId, `📦 *وضعیت انبار کانفیگ‌ها:*\n\n🟢 موجود برای فروش: ${free}\n🔴 فروخته شده (حذف شده از لیست): ${sold}\n📊 کل کانفیگ‌ها: ${rows.length}`, { parse_mode: "Markdown" });
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
                bot.sendMessage(chatId, "لیست سفارش‌های منتظر تایید رسید:", { reply_markup: { inline_keyboard: keyboard } });
            });
        }

    } catch (e) {
        console.error("Callback Error:", e.message);
    }
});

// ================= ⚠️ ERROR HANDLING =================
bot.on("polling_error", (err) => {
    console.log("Polling error:", err.message);
});

console.log("🔥 ARENA SHOP BOT IS RUNNING WITH CORRECT TOKEN...");
