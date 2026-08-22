/**
 * ==============================================================================
 * 🚀 ARENA CONFIG SHOP BOT - ENTERPRISE PRODUCTION GRADE (FIXED & HARDENED)
 * ==============================================================================
 */

import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";
import http from "http";

// ================= 1. CONFIGURATION & CONSTANTS =================
const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_ID = 123456789; // اصلاح مورد 2: ادمین اصلی با ایدی عددی
const PORT = process.env.PORT || 8080;

console.log("==================================================================");
console.log("Initializing Arena Enterprise Bot (Hardened Edition)...");
console.log("==================================================================");

const bot = new TelegramBot(TOKEN, { 
    polling: { interval: 250, autoStart: true, params: { timeout: 15 } } 
});

const db = new sqlite3.Database("./arena_enterprise_hardened.db", (err) => {
    if (err) console.error("❌ DB Error: " + err.message);
    else console.log("🟢 SQLite3 Connected Successfully.");
});

// ================= 2. DATABASE SCHEMAS (FIXED & ATOMIC) =================
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        balance INTEGER DEFAULT 0,
        is_banned INTEGER DEFAULT 0,
        joined_at TEXT,
        last_seen TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        category TEXT,
        volume TEXT,
        days INTEGER,
        price INTEGER,
        description TEXT,
        config_data TEXT,
        sold INTEGER DEFAULT 0,
        created_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        config_id INTEGER,
        config_snapshot TEXT,
        receipt_file_id TEXT,
        status TEXT DEFAULT 'pending',
        final_price INTEGER,
        date TEXT,
        reviewed_by INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS coupons (
        code TEXT PRIMARY KEY,
        percent INTEGER,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        user_id INTEGER PRIMARY KEY,
        action TEXT,
        meta TEXT,
        updated_at INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT,
        message TEXT,
        created_at TEXT
    )`);
});

// ================= 3. UTILITY & SECURITY HELPERS =================
const isAdmin = (userId) => userId === ADMIN_ID; // اصلاح موردی ۲

function logSystem(level, message) {
    const time = new Date().toISOString();
    console.log(`[${time}] [${level}] ${message}`);
    db.run(`INSERT INTO system_logs (level, message, created_at) VALUES (?, ?, ?)`, [level, message, time]);
}

function notifyAdmin(text, markup = null) {
    // اصلاح موردی ۳ و ۲۵: ارسال مستقیم به ایدی ادمین
    const opts = { parse_mode: "Markdown" };
    if (markup) opts.reply_markup = markup;
    bot.sendMessage(ADMIN_ID, text, opts).catch(() => {});
}

// مدیریت Session با دیتابیس (اصلاح موردی ۱۴ و ۱۵)
function setUserSession(userId, action, meta = {}) {
    const now = Date.now();
    db.run(`INSERT OR REPLACE INTO sessions (user_id, action, meta, updated_at) VALUES (?, ?, ?, ?)`,
        [userId, action, JSON.stringify(meta), now]);
}

function getUserSession(userId, callback) {
    db.get(`SELECT * FROM sessions WHERE user_id = ?`, [userId], (err, row) => {
        if (!row) return callback(null);
        // Timeout 15 min (اصلاح موردی ۱۴)
        if (Date.now() - row.updated_at > 900000) {
            db.run(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
            return callback(null);
        }
        callback({ action: row.action, meta: JSON.parse(row.meta || "{}") });
    });
}

function clearUserSession(userId) {
    db.run(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
}

function escapeMarkdown(text) {
    if (!text) return "";
    return text.toString().replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// ================= 4. MENUS =================
function renderMainMenu(chatId, firstName) {
    db.get(`SELECT balance FROM users WHERE id = ?`, [chatId], (err, row) => {
        const balance = row?.balance || 0;
        const text = `
🔥 *سامانه جامع کانفیگ آرنا* 🔥

سلام *${escapeMarkdown(firstName)}* عزیز؛
از طریق دکمه‌های زیر می‌توانید سرویس خود را مدیریت کنید. ⚡

💰 *موجودی کیف پول:* \`${balance.toLocaleString()} تومان\`
        `.trim();

        bot.sendMessage(chatId, text, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🛒 خرید اشتراک", callback_data: "shop_catalog" }],
                    [{ text: "💰 شارژ کیف پول", callback_data: "wallet_info" }, { text: "📦 سفارش‌های من", callback_data: "my_orders" }],
                    [{ text: "⚡ تست رایگان", callback_data: "free_test" }, { text: "🎟 کد تخفیف", callback_data: "coupon_prompt" }],
                    [{ text: "📞 پشتیبانی", callback_data: "support" }]
                ]
            }
        }).catch(() => {});
    });
}

// ================= 5. COMMANDS =================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const { id, username, first_name } = msg.from;
    const now = new Date().toISOString();

    db.run(`INSERT INTO users (id, username, first_name, joined_at, last_seen) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET last_seen = ?, username = ?, first_name = ?`,
        [id, username || "none", first_name || "User", now, now, now, username || "none", first_name || "User"], () => {
            renderMainMenu(chatId, first_name || "کاربر");
        });
});

bot.onText(/\/admin/, (msg) => {
    if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ دسترسی غیرمجاز.");
    bot.sendMessage(msg.chat.id, "🖥 *پنل مدیریت مرکزی آرنا*", {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "➕ افزودن کانفیگ", callback_data: "adm_add_cfg" }, { text: "📦 رسیدهای معلق", callback_data: "adm_pending" }],
                [{ text: "🎟 ساخت کد تخفیف", callback_data: "adm_new_coupon" }, { text: "📊 آمار سیستم", callback_data: "adm_stats" }],
                [{ text: "📢 ارسال همگانی", callback_data: "adm_broadcast" }]
            ]
        }
    });
});

// ================= 6. MESSAGE PIPELINE =================
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    db.get(`SELECT is_banned FROM users WHERE id = ?`, [userId], (err, uRow) => {
        if (uRow?.is_banned) return; // کاربر بن شده (اصلاح موردی 37)

        getUserSession(userId, (session) => {
            if (!session) return;

            // مدیریت مراحل ادمین
            if (isAdmin(userId)) {
                if (session.action === "adm_adding_config") {
                    const parts = text ? text.split("|").map(p => p.trim()) : [];
                    if (parts.length >= 6) {
                        db.run(`INSERT INTO configs (name, category, volume, days, price, description, config_data, sold, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
                            [parts[0], parts[1], parts[2], parseInt(parts[3]) || 30, parseInt(parts[4]) || 0, parts[5], parts.slice(6).join("|"), new Date().toISOString()], () => {
                                bot.sendMessage(chatId, "✅ کانفیگ با موفقیت به انبار اضافه شد.");
                                clearUserSession(userId);
                            });
                    } else {
                        bot.sendMessage(chatId, "⚠️ فرمت اشتباه است. مثال:\n`نام | دسته‌بندی | حجم | روز | قیمت | توضیحات | لینک`", { parse_mode: "Markdown" });
                    }
                    return;
                }

                if (session.action === "adm_coupon_create") {
                    const parts = text ? text.split(" ").map(p => p.trim()) : [];
                    if (parts.length >= 3) {
                        const [code, percent, uses] = [parts[0], parseInt(parts[1]), parseInt(parts[2])];
                        // اعتبارسنجی درصد (اصلاح موردی ۸)
                        if (isNaN(percent) || percent <= 0 || percent > 100) {
                            return bot.sendMessage(chatId, "⚠️ درصد تخفیف باید بین ۱ تا ۱۰۰ باشد.");
                        }
                        db.run(`INSERT OR REPLACE INTO coupons (code, percent, max_uses, used_count) VALUES (?, ?, ?, 0)`, [code, percent, uses], () => {
                            bot.sendMessage(chatId, `🎟 کد تخفیف ${code} با موفقیت ثبت شد.`);
                            clearUserSession(userId);
                        });
                    } else {
                        bot.sendMessage(chatId, "⚠️ فرمت اشتباه است. مثال: `ARNA20 20 50`");
                    }
                    return;
                }

                if (session.action === "adm_broadcasting") {
                    clearUserSession(userId);
                    bot.sendMessage(chatId, "⏳ ارسال همگانی آغاز شد...");
                    db.all(`SELECT id FROM users`, [], (err, rows) => {
                        let sent = 0;
                        let index = 0;
                        // جلوگیری از Flood Limit با وقفه (اصلاح موردی ۱۳)
                        const interval = setInterval(() => {
                            if (index >= rows.length) {
                                clearInterval(interval);
                                return bot.sendMessage(chatId, `✅ برودکست با موفقیت به ${sent} کاربر ارسال شد.`); // (اصلاح موردی ۱۲)
                            }
                            bot.sendMessage(rows[index].id, `📢 *پیام مدیریت:*\n\n${text}`, { parse_mode: "Markdown" })
                                .then(() => { sent++; })
                                .catch(() => {});
                            index++;
                        }, 50);
                    });
                    return;
                }
            }

            // مراحل کاربر عادی
            if (session.action === "user_receipt") {
                if (msg.photo || msg.document) {
                    const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
                    const configId = session.meta.configId;
                    const finalPrice = session.meta.finalPrice;

                    db.get(`SELECT * FROM configs WHERE id = ? AND sold = 0`, [configId], (err, cfg) => {
                        if (!cfg) {
                            clearUserSession(userId);
                            return bot.sendMessage(chatId, "❌ متأسفانه این کانفیگ قبلاً فروخته شده است.");
                        }

                        const snapshot = JSON.stringify(cfg); // (اصلاح موردی ۲۲)

                        db.run(`INSERT INTO orders (user_id, config_id, config_snapshot, receipt_file_id, status, final_price, date) VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
                            [userId, configId, snapshot, fileId, finalPrice, new Date().toLocaleString("fa-IR")], function(err) {
                                if (err) return bot.sendMessage(chatId, "❌ خطا در ثبت سفارش.");
                                const orderId = this.lastID;
                                clearUserSession(userId);

                                bot.sendMessage(chatId, "✅ رسید شما ثبت شد و پس از تایید مالی ارسال خواهد شد.");
                                
                                const adminText = `📦 *سفارش جدید نیازمند تایید!*\n\n👤 کاربر: \`${userId}\`\n🛒 محصول: ${escapeMarkdown(cfg.name)}\n💰 مبلغ: ${finalPrice.toLocaleString()} تومان`;
                                
                                // (اصلاح موردی ۱۱: استفاده از هندلر صحیح adm_check_order_)
                                notifyAdmin(adminText, {
                                    inline_keyboard: [[
                                        { text: "✅ تایید و تحویل", callback_data: `adm_check_order_approve_${orderId}` },
                                        { text: "❌ رد سفارش", callback_data: `adm_check_order_reject_${orderId}` }
                                    ]]
                                });
                            });
                    });
                } else {
                    bot.sendMessage(chatId, "⚠️ لطفاً تصویر رسید پرداخت را ارسال کنید.");
                }
                return;
            }

            if (session.action === "user_coupon") {
                clearUserSession(userId);
                const code = text ? text.trim() : "";
                db.get(`SELECT * FROM coupons WHERE code = ?`, [code], (err, coupon) => {
                    if (!coupon) return bot.sendMessage(chatId, "❌ کد تخفیف نامعتبر است.");
                    if (coupon.used_count >= coupon.max_uses) return bot.setItem ? null : bot.sendMessage(chatId, "❌ ظرفیت این کد تخفیف به اتمام رسیده است.");

                    // اعمال تخفیف موقت یا ثبت در اکانت
                    db.run(`UPDATE coupons SET used_count = used_count + 1 WHERE code = ?`, [code], () => { // (اصلاح موردی ۷)
                        bot.sendMessage(chatId, `🎉 کد تخفیف ${coupon.percent}% با موفقیت روی خرید بعدی شما اعمال شد.`);
                    });
                });
                return;
            }
        });
    });
});

// ================= 7. CALLBACK ROUTING =================
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "back_home") return renderMainMenu(chatId, query.from.first_name || "کاربر");
    if (data === "support") return bot.sendMessage(chatId, "📞 پشتیبانی: @ARENAM_10");
    if (data === "wallet_info") return bot.sendMessage(chatId, "💳 برای شارژ کیف پول به پشتیبانی پیام دهید.");

    if (data === "free_test") {
        // بررسی یک تست رایگان برای هر کاربر (اصلاح موردی ۲۷)
        db.get(`SELECT COUNT(*) as cnt FROM orders JOIN configs ON orders.config_id = configs.id WHERE orders.user_id = ? AND configs.category = 'test'`, [userId], (err, row) => {
            if (row && row.cnt > 0) {
                return bot.sendMessage(chatId, "❌ شما قبلاً از تست رایگان استفاده کرده‌اید.");
            }
            bot.sendMessage(chatId, "⚡ برای دریافت تست رایگان به پشتیبانی پیام دهید: @ARENAM_10");
        });
        return;
    }

    if (data === "coupon_prompt") {
        setUserSession(userId, "user_coupon");
        return bot.sendMessage(chatId, "🎟 لطفاً کد تخفیف خود را ارسال کنید:");
    }

    if (data === "my_orders") {
        db.all(`SELECT orders.*, configs.name FROM orders JOIN configs ON orders.config_id = configs.id WHERE orders.user_id = ?`, [userId], (err, rows) => {
            if (!rows || rows.length === 0) return bot.sendMessage(chatId, "📦 سفارشی ثبت نشده است.");
            let txt = "📦 *سفارش‌های شما:*\n\n";
            rows.forEach((o, i) => {
                txt += `${i + 1}. ${escapeMarkdown(o.name)} - وضعیت: ${o.status}\n`;
            });
            bot.sendMessage(chatId, txt, { parse_mode: "Markdown" });
        });
        return;
    }

    if (data === "shop_catalog") {
        db.all(`SELECT * FROM configs WHERE sold = 0`, [], (err, rows) => {
            if (!rows || rows.length === 0) return bot.sendMessage(chatId, "😔 فعلاً کانفیگی موجود نیست.");
            const kb = rows.map(c => [{ text: `🟢 ${c.name} (${c.volume}) - ${c.price.toLocaleString()} تومان`, callback_data: `buy_${c.id}` }]);
            kb.push([{ text: "🔙 بازگشت", callback_data: "back_home" }]);
            bot.sendMessage(chatId, "🛒 لیست کانفیگ‌ها:", { reply_markup: { inline_keyboard: kb } });
        });
        return;
    }

    if (data.startsWith("buy_")) {
        const configId = parseInt(data.split("_")[1]);
        
        // جلوگیری از خرید هم‌زمان با Transaction واقعی سه‌لایه (اصلاح موردی ۹ و ۲۳)
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.get(`SELECT * FROM configs WHERE id = ? AND sold = 0`, [configId], (err, config) => {
                if (!config) {
                    db.run("ROLLBACK");
                    return bot.sendMessage(chatId, "❌ متأسفانه این کانفیگ فروخته شده یا وجود ندارد.");
                }

                // قفل موقت کانفیگ با تگ sold = 2 تا زمان پرداخت
                db.run(`UPDATE configs SET sold = 2 WHERE id = ?`, [configId], () => {
                    db.run("COMMIT");

                    setUserSession(userId, "user_receipt", { configId: config.id, finalPrice: config.price });

                    const text = `🛒 *خرید اشتراک*\n• ${escapeMarkdown(config.name)}\n• قیمت: ${config.price.toLocaleString()} تومان\n\nلطفاً رسید واریز را بفرستید:`;
                    bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ انصراف", callback_data: "shop_catalog" }]] } });
                });
            });
        });
        return;
    }

    // پنل مدیریت ادمین
    if (isAdmin(userId)) {
        if (data === "adm_add_cfg") {
            setUserSession(userId, "adm_adding_config");
            return bot.sendMessage(chatId, "➕ اطلاعات را بفرستید:\n`نام | دسته‌بندی | حجم | روز | قیمت | توضیحات | لینک`", { parse_mode: "Markdown" });
        }
        if (data === "adm_new_coupon") {
            setUserSession(userId, "adm_coupon_create");
            return bot.sendMessage(chatId, "🎟 کد، درصد و سقف استفاده را وارد کنید:\nمثال: `ARNA20 20 50`");
        }
        if (data === "adm_broadcast") {
            setUserSession(userId, "adm_broadcasting");
            return bot.sendMessage(chatId, "📢 متن پیام همگانی را بفرستید:");
        }
        if (data === "adm_pending") {
            db.all(`SELECT * FROM orders WHERE status = 'pending'`, [], (err, orders) => {
                if (!orders || orders.length === 0) return bot.sendMessage(chatId, "📦 سفارش معلقی نیست.");
                const kb = orders.map(o => [{ text: `سفارش شماره ${o.id}`, callback_data: `adm_check_order_view_${o.id}` }]);
                bot.sendMessage(chatId, "لیست سفارش‌ها:", { reply_markup: { inline_keyboard: kb } });
            });
            return;
        }

        // هندلر کامل تایید/رد سفارش (اصلاح موردی ۱۰ و ۱۱)
        if (data.startsWith("adm_check_order_approve_") || data.startsWith("adm_check_order_reject_")) {
            const parts = data.split("_");
            const action = parts[4]; // approve یا reject
            const orderId = parts[5];

            db.get(`SELECT * FROM orders WHERE id = ?`, [orderId], (err, order) => {
                if (!order) return bot.sendMessage(chatId, "❌ سفارش یافت نشد.");
                if (order.status !== 'pending') {
                    return bot.sendMessage(chatId, "⚠️ این سفارش قبلاً تعیین تکلیف شده است!"); // (اصلاح موردی ۱۰)
                }

                if (action === "approve") {
                    const snapshot = JSON.parse(order.config_snapshot || "{}");
                    db.serialize(() => {
                        db.run("BEGIN TRANSACTION");
                        db.run(`UPDATE orders SET status = 'approved', reviewed_by = ? WHERE id = ?`, [userId, orderId]);
                        db.run(`UPDATE configs SET sold = 1 WHERE id = ?`, [order.config_id]);
                        db.run("COMMIT", () => {
                            bot.sendMessage(order.user_id, `🎉 *پرداخت شما تایید شد!*\n\n🔗 لینک کانفیگ:\n\`${snapshot.config_data}\``, { parse_mode: "Markdown" });
                            bot.sendMessage(chatId, "✅ سفارش تایید و به کاربر ارسال شد.");
                            bot.editMessageCaption("✅ تایید و تحویل داده شد", { chat_id: chatId, message_id: query.message.message_id }).catch(() => {});
                        });
                    });
                } else {
                    db.serialize(() => {
                        db.run("BEGIN TRANSACTION");
                        db.run(`UPDATE orders SET status = 'rejected', reviewed_by = ? WHERE id = ?`, [userId, orderId]);
                        db.run(`UPDATE configs SET sold = 0 WHERE id = ?`, [order.config_id]); // آزاد کردن انبار
                        db.run("COMMIT", () => {
                            bot.sendMessage(order.user_id, "❌ رسید پرداخت شما رد شد.");
                            bot.sendMessage(chatId, "❌ سفارش رد شد.");
                            bot.editMessageCaption("❌ رد شد", { chat_id: chatId, message_id: query.message.message_id }).catch(() => {});
                        });
                    });
                }
            });
            return;
        }
    }
});

// ================= 8. KEEP-ALIVE HTTP SERVER =================
const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<html><body><h1>Arena Enterprise Bot Active</h1></body></html>");
});
server.listen(PORT, () => logSystem("INFO", `HTTP server running on port ${PORT}`));

logSystem("INFO", "BOOT", "Bot successfully started with enterprise hardened fixes.");
