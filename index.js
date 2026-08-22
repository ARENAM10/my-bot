/**
 * ==============================================================================
 * 🚀 ARENA SHOP BOT - SINGLE CLEAN CODE (COMPLETE EDITION)
 * ==============================================================================
 */

import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";
import http from "http";

// تنظیمات اصلی
const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_ID = 123456789; // آیدی عددی ادمین خود را اینجا وارد کنید
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });
const db = new sqlite3.Database("./arena_shop.db");

// ایجاد جدول‌های دیتابیس
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, first_name TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS configs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, volume TEXT, days INTEGER, price INTEGER, config_data TEXT, sold INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, config_id INTEGER, receipt TEXT, status TEXT DEFAULT 'pending')`);
});

const isAdmin = (id) => id === ADMIN_ID;
const userStates = {}; // ذخیره وضعیت موقت کاربران

// منوی اصلی
function sendMainMenu(chatId, name) {
    bot.sendMessage(chatId, `سلام ${name || "کاربر"} عزیز؛\nبه ربات خرید اشتراک آرنا خوش آمدید. 🚀`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 خرید اشتراک", callback_data: "shop_catalog" }],
                [{ text: "📦 سفارش‌های من", callback_data: "my_orders" }, { text: "📞 پشتیبانی", callback_data: "support" }]
            ]
        }
    });
}

// دستور /start
bot.onText(/\/start/, (msg) => {
    const { id, username, first_name } = msg.from;
    db.run(`INSERT OR IGNORE INTO users (id, username, first_name) VALUES (?, ?, ?)`, [id, username, first_name]);
    sendMainMenu(id, first_name);
});

// دستور ادمین برای افزودن کانفیگ تستی: /addconfig نام | حجم | روز | قیمت | لینک
bot.onText(/\/addconfig (.+)/, (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const parts = match[1].split("|").map(p => p.trim());
    if (parts.length >= 5) {
        db.run(`INSERT INTO configs (name, volume, days, price, config_data) VALUES (?, ?, ?, ?, ?)`,
            [parts[0], parts[1], parseInt(parts[2]), parseInt(parts[3]), parts[4]], () => {
                bot.sendMessage(msg.chat.id, "✅ کانفیگ با موفقیت اضافه شد.");
            });
    } else {
        bot.sendMessage(msg.chat.id, "⚠️ فرمت: `/addconfig نام | حجم | روز | قیمت | لینک`", { parse_mode: "Markdown" });
    }
});

// مدیریت کلیک دکمه‌ها
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "back_home") return sendMainMenu(chatId, query.from.first_name);
    if (data === "support") return bot.sendMessage(chatId, "📞 پشتیبانی: @ARENAM_10");

    // بخش سفارش‌های من
    if (data === "my_orders") {
        db.all(`SELECT orders.*, configs.name FROM orders JOIN configs ON orders.config_id = configs.id WHERE orders.user_id = ?`, [userId], (err, rows) => {
            if (!rows || rows.length === 0) return bot.sendMessage(chatId, "📦 شما سفارشی ثبت نکرده‌اید.");
            let text = "📦 *سفارش‌های شما:*\n\n";
            rows.forEach((o, i) => {
                let status = o.status === 'approved' ? '✅ تایید شده' : '⏳ در حال بررسی';
                text += `${i + 1}. ${o.name} - وضعیت: ${status}\n`;
            });
            bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
        });
        return;
    }

    // 🛒 بخش فروشگاه و خرید اشتراک
    if (data === "shop_catalog") {
        db.all(`SELECT * FROM configs WHERE sold = 0`, [], (err, rows) => {
            if (!rows || rows.length === 0) {
                return bot.sendMessage(chatId, "😔 در حال حاضر هیچ کانفیگی موجود نیست.", {
                    reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "back_home" }]] }
                });
            }
            
            const keyboard = rows.map(c => [{ 
                text: `🟢 ${c.name} (${c.volume}) - ${c.price.toLocaleString()} تومان`, 
                callback_data: `buy_${c.id}` 
            }]);
            
            keyboard.push([{ text: "🔙 بازگشت به منوی اصلی", callback_data: "back_home" }]);

            bot.sendMessage(chatId, "🛒 **فروشگاه کانفیگ‌های پرسرعت**\nلطفاً اشتراک مد نظر خود را انتخاب کنید:", {
                parse_mode: "Markdown",
                reply_markup: { inline_keyboard: keyboard }
            });
        });
        return;
    }

    // انتخاب کانفیگ برای خرید
    if (data.startsWith("buy_")) {
        const configId = parseInt(data.split("_")[1]);
        
        db.get(`SELECT * FROM configs WHERE id = ? AND sold = 0`, [configId], (err, config) => {
            if (!config) {
                return bot.sendMessage(chatId, "❌ متأسفانه این اشتراک قبلاً توسط کاربر دیگری خریداری شد.");
            }

            // ثبت وضعیت انتظار برای ارسال رسید
            userStates[userId] = { action: "waiting_receipt", configId: config.id };

            const text = `
🛒 **جزئیات اشتراک انتخابی:**
• نام: ${config.name}
• حجم: ${config.volume}
• مدت اعتبار: ${config.days} روز
• قیمت: ${config.price.toLocaleString()} تومان

💳 لطفاً مبلغ فوق را کارت به کارت کرده و **اسکرین‌شات رسید پرداخت** را همینجا ارسال کنید.
            `.trim();

            bot.sendMessage(chatId, text, {
                parse_mode: "Markdown",
                reply_markup: { inline_keyboard: [[{ text: "❌ انصراف", callback_data: "shop_catalog" }]] }
            });
        });
        return;
    }
});

// دریافت رسید پرداختی از کاربر
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (userStates[userId] && userStates[userId].action === "waiting_receipt") {
        if (msg.photo || msg.document) {
            const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
            const configId = userStates[userId].configId;

            db.run(`INSERT INTO orders (user_id, config_id, receipt, status) VALUES (?, ?, ?, 'pending')`, [userId, configId, fileId], () => {
                delete userStates[userId];
                bot.sendMessage(chatId, "✅ رسید شما دریافت شد و پس از بررسی حسابداری، لینک کانفیگ برایتان ارسال خواهد شد.");
                
                // اطلاع به ادمین
                bot.sendMessage(ADMIN_ID, `📦 رسید خرید جدید از کاربر \`${userId}\` دریافت شد.`);
            });
        } else {
            bot.sendMessage(chatId, "⚠️ لطفاً تصویر رسید پرداخت را بفرستید.");
        }
    }
});

// سرور ساده برای روشن ماندن روی هاست
http.createServer((req, res) => res.end("Bot is running!")).listen(PORT);
console.log("Bot started successfully.");
