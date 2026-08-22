import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";
import fs from "fs";

const TOKEN = "8850301156:AAEH94AQeKKpf4-eBAgfrwsnvoIRph4--Y4";
const ADMIN_ID = 0; // اگر آیدی عددی ادمین را دارید اینجا وارد کنید، در غیر این صورت با یوزرنیم چک می‌شود
const ADMIN_USERNAME = "ARENAM_10";

const bot = new TelegramBot(TOKEN, { polling: true });
const db = new sqlite3.Database("./arena_shop.db", (err) => {
    if (err) logError("Database Connection Error: " + err.message);
});

// ================= 🛠️ LOGGING SYSTEM =================
function logError(message) {
    const logData = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFile("error.log", logData, (err) => {
        if (err) console.error("Failed to write to log:", err);
    });
    console.error(logData);
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
    return (ADMIN_ID && user.id === ADMIN_ID) || (user.username && user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase());
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
});

bot.onText(/\/admin/, (msg) => {
    if (!isAdmin(msg.from)) return bot.sendMessage(msg.chat.id, "❌ شما دسترسی ندارید.");
    
    bot.sendMessage(msg.chat.id, "🖥 *پنل مدیریت مرکزی آرنا*", {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "➕ افزودن کانفیگ", callback_data: "adm_add_cfg" }, { text: "🗑 حذف/مدیریت کانفیگ‌ها", callback_data: "adm_list_cfg" }],
                [{ text: "👥 آمار و مدیریت کاربران", callback_data: "adm_users" }, { text: "📢 ارسال پیام همگانی", callback_data: "adm_broadcast" }],
                [{ text: "📦 سفارش‌های در انتظار تایید", callback_data: "adm_pending_orders" }]
            ]
        }
    });
});

// ================= 🔄 CALLBACK QUERY HANDLER =================
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
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

        // نمایش کانفیگ‌های یک دسته
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
            db.get(`SELECT * FROM configs WHERE id = ?`, [cfgId], (err, cfg) => {
                if (!cfg) return bot.sendMessage(chatId, "❌ این کانفیگ دیگر موجود نیست.");

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
            bot.sendMessage(chatId, `💳 برای خرید این اشتراک، مبلغ را به کارت پشتیبانی واریز کرده و **اسکرین‌شات رسید** را همینجا بفرستید. (عکس را ارسال کنید)`, {
                reply_markup: {
                    force_reply: true
                }
            });
            // ذخیره موقت وضعیت خرید کاربر (می‌توانید با مموری یا دیتابیس هندل کنید)
        }

        // ================= 👑 پنل ادمین =================
        if (data === "adm_users" && isAdmin(user)) {
            db.get(`SELECT COUNT(*) as count FROM users`, [], (err, row) => {
                bot.sendMessage(chatId, `👥 تعداد کل کاربران ربات: ${row.count} نفر`);
            });
        }

        if (data === "adm_pending_orders" && isAdmin(user)) {
            db.all(`SELECT orders.id, users.username, configs.name FROM orders JOIN users ON orders.user_id = users.id JOIN configs ON orders.config_id = configs.id WHERE orders.status = 'pending'`, [], (err, orders) => {
                if (!orders || orders.length === 0) return bot.sendMessage(chatId, "📦 هیچ سفارش در انتظاری وجود ندارد.");
                
                const keyboard = orders.map(o => [{ text: `👤 @${o.username} - 📦 ${o.name}`, callback_data: `check_order_${o.id}` }]);
                bot.sendMessage(chatId, "لیست سفارش‌های منتظر تایید:", { reply_markup: { inline_keyboard: keyboard } });
            });
        }

    } catch (e) {
        logError(e.message);
    }
});

// ================= ⚠️ ERROR & POLLING HANDLING =================
bot.on("polling_error", (err) => logError("Polling error: " + err.message));

console.log("🔥 PROFESSIONAL ARENA SHOP BOT RUNNING SUCCESSFULLY...");
