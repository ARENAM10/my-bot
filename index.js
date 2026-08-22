import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";

const TOKEN = "8850301156:AAEH94AQeKKpf4-eBAgfrwsnvoIRph4--Y4";
const ADMIN_USERNAME = "ARENAM_10";

const bot = new TelegramBot(TOKEN, { polling: true });
const db = new sqlite3.Database("./arena.db");

// ================= 🗄️ DATABASE INITIALIZATION =================
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        balance INTEGER DEFAULT 0,
        joined_date TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        config TEXT,
        price INTEGER,
        days INTEGER,
        sold INTEGER DEFAULT 0,
        buyer INTEGER DEFAULT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        config_name TEXT,
        price INTEGER,
        date TEXT
    )`);
});

// ================= 🛠️ HELPER FUNCTIONS =================
const isAdmin = (user) => user.username && user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase();

const saveUser = (msg) => {
    const now = new Date().toISOString();
    db.run(`INSERT OR IGNORE INTO users (id, username, joined_date) VALUES (?, ?, ?)`, 
        [msg.from.id, msg.from.username || "none", now]);
};

// ================= 🏠 MAIN MENU =================
function showMainMenu(chatId, name) {
    db.get(`SELECT balance FROM users WHERE id = ?`, [chatId], (err, row) => {
        const balance = row?.balance || 0;

        const text = `
🔥 **ARENA VIP CONFIGS** 🔥

سلام *${name}* عزیز به ربات رسمی آرنا خوش آمدید. ⚡
با استفاده از این ربات می‌توانید کانفیگ‌های پرسرعت، اختصاصی و بدون قطعی تهیه کنید.

💰 *موجودی کیف پول:* \`${balance.toLocaleString()} تومان\`
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
    });
}

// ================= 🚀 START COMMAND =================
bot.onText(/\/start/, (msg) => {
    saveUser(msg);
    showMainMenu(msg.chat.id, msg.from.first_name || "کاربر");
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
                [{ text: "➕ افزودن کانفیگ جدید به انبار", callback_data: "admin_add" }],
                [{ text: "📦 آمار و موجودی انبار", callback_data: "admin_stock" }],
                [{ text: "📊 آمار کاربران کل", callback_data: "admin_stats" }]
            ]
        }
    });
});

// ================= 🔄 CALLBACK HANDLER =================
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const user = query.from;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "support") {
        return bot.sendMessage(chatId, "📞 *پشتیبانی 24 ساعته:*\nبرای هرگونه سوال یا مشکل به ادمین پیام دهید:\n@ARENAM_10", { parse_mode: "Markdown" });
    }

    if (data === "guide") {
        return bot.sendMessage(chatId, "📖 *راهنمای اتصال:*\nنرم‌افزارهای مورد نیاز برای اندروید، آیفون و ویندوز (مثل V2RayNG یا Streisand) را دانلود کرده و لینک کانفیگ خریداری‌شده را داخل آن‌ها ایمپورت کنید.", { parse_mode: "Markdown" });
    }

    if (data === "wallet") {
        return bot.sendMessage(chatId, "💳 *شارژ کیف پول*\n\nبرای افزایش موجودی، به پشتیبانی (@ARENAM_10) پیام دهید تا کارت به کارت انجام شود و موجودیتان شارژ گردد.", { parse_mode: "Markdown" });
    }

    if (data === "my_orders") {
        db.all(`SELECT * FROM orders WHERE user_id = ?`, [chatId], (err, rows) => {
            if (!rows || rows.length === 0) {
                return bot.sendMessage(chatId, "📦 شما تاکنون هیچ سفارشی ثبت نکرده‌اید.");
            }
            let text = "📦 *خریدهای قبلی شما:*\n\n";
            rows.forEach((o, index) => {
                text += `${index + 1}. محصول: ${o.config_name}\n💰 قیمت: ${o.price} تومان\n📅 تاریخ: ${o.date}\n-------------------\n`;
            });
            bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
        });
    }

    if (data === "free_test") {
        return bot.sendMessage(chatId, "⚡ هر کاربر یکبار می‌تواند تست رایگان دریافت کند. (به زودی فعال می‌شود یا از پشتیبانی بگیرید).");
    }

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

    if (data.startsWith("buy_")) {
        const configId = data.split("_")[1];
        db.get(`SELECT * FROM configs WHERE id = ? AND sold = 0`, [configId], (err, config) => {
            if (!config) {
                return bot.sendMessage(chatId, "❌ متأسفانه این کانفیگ قبلاً فروخته شده یا موجود نیست.");
            }

            db.get(`SELECT balance FROM users WHERE id = ?`, [chatId], (err, uRow) => {
                const balance = uRow?.balance || 0;

                if (balance < config.price) {
                    return bot.sendMessage(chatId, `❌ موجودی کیف پول شما کافی نیست!\n💰 موجودی: ${balance}\n🏷 قیمت: ${config.price}\n\nلطفاً ابتدا کیف پول خود را شارژ کنید.`);
                }

                db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [config.price, chatId]);
                db.run(`UPDATE configs SET sold = 1, buyer = ? WHERE id = ?`, [chatId, configId]);
                
                const now = new Date().toLocaleDateString("fa-IR");
                db.run(`INSERT INTO orders (user_id, config_name, price, date) VALUES (?, ?, ?, ?)`, 
                    [chatId, config.name, config.price, now]);

                bot.sendMessage(chatId, `✅ *خرید با موفقیت انجام شد!*\n\n📦 کانفیگ شما:\n\`${config.config}\``, { parse_mode: "Markdown" });
            });
        });
    }

    if (data === "admin_stock" && isAdmin(user)) {
        db.all(`SELECT * FROM configs`, [], (err, rows) => {
            const free = rows.filter(r => !r.sold).length;
            const sold = rows.filter(r => r.sold).length;
            bot.sendMessage(chatId, `📦 *وضعیت انبار آرنا:*\n\n🟢 آزاد: ${free}\n🔴 فروخته شده: ${sold}\n📊 کل: ${rows.length}`, { parse_mode: "Markdown" });
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

console.log("🔥 PROFESSIONAL ARENA BOT RUNNING SUCCESSFULLY...");
