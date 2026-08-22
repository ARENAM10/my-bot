import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";
import http from "http";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_USERNAME = "ARENAM_10";
const PORT = process.env.PORT || 8080;

console.log("Initializing Arena Shop Bot...");

const bot = new TelegramBot(TOKEN, { 
    polling: {
        interval: 250,
        autoStart: true,
        params: { timeout: 15 }
    } 
});

const db = new sqlite3.Database("./arena_shop.db", (err) => {
    if (err) {
        console.error("Database connection error: " + err.message);
    } else {
        console.log("Connected to SQLite3 database successfully.");
    }
});

const userState = {};

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        balance INTEGER DEFAULT 0,
        discount_tier INTEGER DEFAULT 0,
        joined_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        category TEXT,
        volume TEXT,
        days INTEGER,
        price INTEGER,
        config_data TEXT,
        sold INTEGER DEFAULT 0,
        created_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        config_id INTEGER,
        receipt_file_id TEXT,
        status TEXT DEFAULT 'pending',
        final_price INTEGER,
        date TEXT
    )`);
});

const isAdmin = (user) => user.username && user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase();

function renderMainDashboard(chatId, firstName) {
    db.get(`SELECT balance FROM users WHERE id = ?`, [chatId], (err, row) => {
        const balance = row?.balance || 0;

        const dashboardText = `
🌟 **سامانه خدمات هوشمند و کانفیگ آرنا** 🌟

درود *${firstName || "کاربر"}* عزیز؛
به پلتفرم مدیریت اشتراک‌های پرسرعت خوش آمدید. ⚡

📊 **اطلاعات حساب کاربری شما:**
• 💰 موجودی کیف پول: \`${balance.toLocaleString()} تومان\`
        `.trim();

        bot.sendMessage(chatId, dashboardText, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🛒 فروشگاه اشتراک و کانفیگ", callback_data: "shop_catalog" },
                        { text: "📦 پیگیری سفارش‌ها", callback_data: "user_orders_list" }
                    ],
                    [
                        { text: "📞 پشتیبانی و ارتباط با مدیر", callback_data: "support_desk" }
                    ]
                ]
            }
        }).catch(() => {});
    });
}

bot.onText(/\/start/, (msg) => {
    const userId = msg.from.id;
    const username = msg.from.username || "none";
    const firstName = msg.from.first_name || "User";
    const now = new Date().toISOString();

    db.run(`INSERT INTO users (id, username, first_name, joined_at) 
            VALUES (?, ?, ?, ?) 
            ON CONFLICT(id) DO UPDATE SET username = ?, first_name = ?`,
        [userId, username, firstName, now, username, firstName], () => {
            renderMainDashboard(userId, firstName);
        });
});

bot.onText(/\/admin/, (msg) => {
    if (!isAdmin(msg.from)) {
        return bot.sendMessage(msg.chat.id, "❌ خطای دسترسی: شما مدیر نیستید.");
    }
    
    bot.sendMessage(msg.chat.id, "🖥 **پنل مدیریت سیستم**", {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "➕ افزودن کانفیگ جدید", callback_data: "adm_add_config" },
                    { text: "📦 بررسی رسیدها", callback_data: "adm_pending_queue" }
                ]
            ]
        }
    });
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!userState[userId]) return;

    if (isAdmin(msg.from) && userState[userId].action === "adding_config") {
        const parts = text ? text.split("|").map(p => p.trim()) : [];
        if (parts.length >= 6) {
            const [name, category, volume, days, price, configData] = [parts[0], parts[1], parts[2], parseInt(parts[3]), parseInt(parts[4]), parts.slice(5).join("|")];
            
            db.run(`INSERT INTO configs (name, category, volume, days, price, config_data, sold, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
                [name, category, volume, days, price, configData, new Date().toISOString()], (err) => {
                    if (err) {
                        bot.sendMessage(chatId, "❌ خطا در ثبت کانفیگ در دیتابیس.");
                    } else {
                        bot.sendMessage(chatId, `✅ کانفیگ [${name}] با موفقیت ثبت شد!`);
                    }
                    delete userState[userId];
                });
        } else {
            bot.sendMessage(chatId, "⚠️ فرمت نامعتبر است. ارسال کنید:\n`نام | دسته‌بندی | حجم | روز | قیمت | لینک کانفیگ`", { parse_mode: "Markdown" });
        }
        return;
    }

    if (userState[userId].action === "awaiting_receipt") {
        if (msg.photo || msg.document) {
            const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
            const configId = userState[userId].configId;
            const finalPrice = userState[userId].finalPrice;

            db.run(`INSERT INTO orders (user_id, config_id, receipt_file_id, status, final_price, date) 
                    VALUES (?, ?, ?, 'pending', ?, ?)`,
                [userId, configId, fileId, finalPrice, new Date().toLocaleString("fa-IR")], function(err) {
                    if (err) {
                        return bot.sendMessage(chatId, "❌ خطا در ثبت سفارش. لطفاً مجدد تلاش کنید.");
                    }
                    const orderId = this.lastID;
                    bot.sendMessage(chatId, "✅ **رسید شما دریافت و برای حسابداری ارسال شد.**\nپس از تایید، کانفیگ شما تحویل داده خواهد شد.", { parse_mode: "Markdown" });

                    db.get(`SELECT * FROM configs WHERE id = ?`, [configId], (err, cfg) => {
                        db.get(`SELECT username FROM users WHERE id = ?`, [userId], (err, u) => {
                            const adminText = `📦 **سفارش خرید جدید!**\n\n👤 کاربر: @${u?.username || userId}\n🛒 محصول: ${cfg?.name}\n💰 مبلغ: ${finalPrice.toLocaleString()} تومان`;

                            bot.sendPhoto(ADMIN_USERNAME, fileId, {
                                caption: adminText,
                                parse_mode: "Markdown",
                                reply_markup: {
                                    inline_keyboard: [
                                        [
                                            { text: "✅ تایید و ارسال کانفیگ", callback_data: `adm_approve_${orderId}` },
                                            { text: "❌ رد تراکنش", callback_data: `adm_reject_${orderId}` }
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
            bot.sendMessage(chatId, "⚠️ لطفاً تصویر یا اسکرین‌شات رسید پرداخت را ارسال کنید.");
        }
        return;
    }
});

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const user = query.from;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "back_home") {
        return renderMainDashboard(chatId, user.first_name || "کاربر");
    }

    if (data === "support_desk") {
        return bot.sendMessage(chatId, "📞 **پشتیبانی فنی و فروش:**\nبرای ارتباط با مدیر به آیدی زیر پیام دهید:\n@ARENAM_10", { parse_mode: "Markdown" });
    }

    if (data === "user_orders_list") {
        db.all(`SELECT orders.*, configs.name FROM orders JOIN configs ON orders.config_id = configs.id WHERE orders.user_id = ?`, [chatId], (err, rows) => {
            if (!rows || rows.length === 0) {
                return bot.sendMessage(chatId, "📦 شما تاکنون سفارشی ثبت نکرده‌اید.");
            }
            let report = "📦 **تاریخچه سفارش‌های شما:**\n\n";
            rows.forEach((o, index) => {
                let statusText = o.status === 'approved' ? '✅ تایید شده' : (o.status === 'rejected' ? '❌ رد شده' : '⏳ در حال بررسی');
                report += `${index + 1}. محصول: ${o.name}\nوضعیت: ${statusText}\nمبلغ: ${o.final_price?.toLocaleString()} تومان\n--------------------\n`;
            });
            bot.sendMessage(chatId, report, { parse_mode: "Markdown" });
        });
        return;
    }

    if (data === "shop_catalog") {
        db.all(`SELECT * FROM configs WHERE sold = 0`, [], (err, rows) => {
            if (!rows || rows.length === 0) {
                return bot.sendMessage(chatId, "😔 در حال حاضر هیچ کانفیگی در انبار موجود نیست.", {
                    reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "back_home" }]] }
                });
            }
            
            const keyboard = rows.map(c => [{ text: `🟢 ${c.name} (${c.volume}) - ${c.price.toLocaleString()} تومان`, callback_data: `buy_cfg_${c.id}` }]);
            keyboard.push([{ text: "🔙 بازگشت به منوی اصلی", callback_data: "back_home" }]);

            bot.sendMessage(chatId, "🛒 **فروشگاه کانفیگ‌های پرسرعت آرنا**\nلطفاً گزینه مد نظر خود را انتخاب کنید:", {
                parse_mode: "Markdown",
                reply_markup: { inline_keyboard: keyboard }
            });
        });
        return;
    }

    if (data.startsWith("buy_cfg_")) {
        const configId = data.split("_")[2];
        db.get(`SELECT * FROM configs WHERE id = ? AND sold = 0`, [configId], (err, config) => {
            if (!config) {
                return bot.sendMessage(chatId, "❌ متأسفانه این اشتراک توسط کاربر دیگری خریداری شد.");
            }

            userState[user.id] = { action: "awaiting_receipt", configId: config.id, finalPrice: config.price };

            const details = `
🛒 **جزئیات سبد خرید:**
• نام: ${config.name}
• حجم: ${config.volume}
• مدت: ${config.days} روز
💰 **مبلغ قابل پرداخت: ${config.price.toLocaleString()} تومان**

💳 لطفاً مبلغ را کارت به کارت کرده و **اسکرین‌شات رسید** را همینجا بفرستید.
            `.trim();

            bot.sendMessage(chatId, details, {
                parse_mode: "Markdown",
                reply_markup: { inline_keyboard: [[{ text: "❌ انصراف", callback_data: "shop_catalog" }]] }
            });
        });
        return;
    }

    if (isAdmin(user)) {
        if (data === "adm_add_config") {
            userState[user.id] = { action: "adding_config" };
            return bot.sendMessage(chatId, "➕ اطلاعات را با این فرمت بفرستید:\n\n`نام | دسته‌بندی | حجم | روز | قیمت | لینک کانفیگ`", { parse_mode: "Markdown" });
        }

        if (data === "adm_pending_queue") {
            db.all(`SELECT orders.id, users.username, configs.name FROM orders JOIN users ON orders.user_id = users.id JOIN configs ON orders.config_id = configs.id WHERE orders.status = 'pending'`, [], (err, pending) => {
                if (!pending || pending.length === 0) return bot.sendMessage(chatId, "📦 سفارش منتظری وجود ندارد.");
                const kb = pending.map(p => [{ text: `👤 @${p.username} - 📦 ${p.name}`, callback_data: `adm_check_${p.id}` }]);
                bot.sendMessage(chatId, "لیست سفارش‌های معلق:", { reply_markup: { inline_keyboard: kb } });
            });
            return;
        }

        if (data.startsWith("adm_approve_")) {
            const orderId = data.split("_")[2];
            db.get(`SELECT orders.*, configs.config_data, users.id as client_id FROM orders JOIN configs ON orders.config_id = configs.id JOIN users ON orders.user_id = users.id WHERE orders.id = ?`, [orderId], (err, order) => {
                if (!order) return bot.sendMessage(chatId, "❌ سفارش یافت نشد.");

                db.run(`UPDATE orders SET status = 'approved' WHERE id = ?`, [orderId]);
                db.run(`UPDATE configs SET sold = 1 WHERE id = ?`, [order.config_id]);

                bot.sendMessage(order.client_id, `🎉 **پرداخت شما تایید شد!**\n\n📦 لینک اتصال اختصاصی شما:\n\`${order.config_data}\``, { parse_mode: "Markdown" });
                bot.sendMessage(chatId, `✅ سفارش تایید و کانفیگ ارسال شد.`);
                bot.editMessageCaption(`✅ تایید شد`, { chat_id: chatId, message_id: query.message.message_id }).catch(() => {});
            });
        }

        if (data.startsWith("adm_reject_")) {
            const orderId = data.split("_")[2];
            db.get(`SELECT user_id FROM orders WHERE id = ?`, [orderId], (err, order) => {
                if (order) {
                    bot.sendMessage(order.user_id, "❌ رسید پرداخت شما رد شد. لطفاً با پشتیبانی در ارتباط باشید.");
                }
                db.run(`UPDATE orders SET status = 'rejected' WHERE id = ?`, [orderId]);
                bot.sendMessage(chatId, `❌ سفارش رد شد.`);
                bot.editMessageCaption(`❌ رد شد`, { chat_id: chatId, message_id: query.message.message_id }).catch(() => {});
            });
        }
    }
});

const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<html><body><h1>Arena Shop Bot is Running!</h1></body></html>");
});

server.listen(PORT, () => {
    console.log(`Keep-Alive server is listening on port ${PORT}`);
});
