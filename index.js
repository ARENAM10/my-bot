import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";

const TOKEN = "8850301156:AAHfNQeFI2tWfBQg_PZTzuvoW-R5TGPe4mo";
const ADMIN_ID = 123456789;
const ADMIN_USERNAME = "ARENAM_10";

const bot = new TelegramBot(TOKEN, {
    polling: true
});

console.log("🔥 ARENA V2 STARTED");

// ================= DATABASE =================

const db = new sqlite3.Database("./arena.db");

db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY,
    username TEXT,
    balance INTEGER DEFAULT 0,
    blocked INTEGER DEFAULT 0
    )
    `);

    db.run(`
    CREATE TABLE IF NOT EXISTS configs(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    config TEXT,
    price INTEGER,
    days INTEGER,
    sold INTEGER DEFAULT 0,
    buyer INTEGER DEFAULT NULL
    )
    `);

    db.run(`
    CREATE TABLE IF NOT EXISTS receipts(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user INTEGER,
    username TEXT,
    amount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending'
    )
    `);

    db.run(`
    CREATE TABLE IF NOT EXISTS orders(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user INTEGER,
    config TEXT,
    price INTEGER,
    date TEXT
    )
    `);
});

// ================= FUNCTIONS =================

function isAdmin(user) {
    return (
        user.id === ADMIN_ID ||
        (user.username && user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase())
    );
}

function saveUser(msg) {
    db.run(
        `
        INSERT OR IGNORE INTO users
        (id, username)
        VALUES (?, ?)
        `,
        [
            msg.from.id,
            msg.from.username || "none"
        ]
    );
}

function menu(chatId, name) {
    db.get(
        "SELECT balance FROM users WHERE id=?",
        [chatId],
        (err, user) => {
            let balance = user?.balance || 0;

            bot.sendMessage(
                chatId,
                `🔥 ARENA CONFIG V2\n\nسلام ${name}\n\n💰 موجودی:\n${balance.toLocaleString()} تومان`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "🛒 خرید اشتراک",
                                    callback_data: "buy"
                                }
                            ],
                            [
                                {
                                    text: "💰 کیف پول",
                                    callback_data: "wallet"
                                },
                                {
                                    text: "📦 خریدهای من",
                                    callback_data: "orders"
                                }
                            ],
                            [
                                {
                                    text: "⚡ تست رایگان",
                                    callback_data: "test"
                                }
                            ],
                            [
                                {
                                    text: "📞 پشتیبانی",
                                    callback_data: "support"
                                }
                            ]
                        ]
                    }
                }
            );
        }
    );
}

// ================= START =================

bot.onText(/\/start/, msg => {
    saveUser(msg);
    menu(msg.chat.id, msg.from.first_name || "کاربر");
});

// ================= ADMIN =================

bot.onText(/\/admin/, msg => {
    if (!isAdmin(msg.from)) {
        return bot.sendMessage(msg.chat.id, "❌ دسترسی ندارید");
    }

    bot.sendMessage(
        msg.chat.id,
        `🖥 پنل مدیریت ARENA`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "➕ افزودن کانفیگ",
                            callback_data: "add_config"
                        }
                    ],
                    [
                        {
                            text: "📦 موجودی انبار",
                            callback_data: "stock"
                        }
                    ],
                    [
                        {
                            text: "💳 رسیدها",
                            callback_data: "receipts"
                        }
                    ],
                    [
                        {
                            text: "📊 آمار",
                            callback_data: "stats"
                        }
                    ]
                ]
            }
        }
    );
});

// ================= CALLBACK QUERIES =================

bot.on("callback_query", async query => {
    const chatId = query.message.chat.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "support") {
        return bot.sendMessage(chatId, "📞 برای ارتباط با پشتیبانی به ادمین پیام دهید:\n@ARENAM_10");
    }

    if (data === "wallet") {
        return bot.sendMessage(chatId, "💰 بخش کیف پول و افزایش موجودی");
    }

    if (data === "orders") {
        return bot.sendMessage(chatId, "📦 شما هنوز خریدی ثبت نکرده‌اید.");
    }
});

// ================= ERROR HANDLER =================

bot.on("polling_error", err => {
    console.log("BOT ERROR:", err.message);
});

console.log("🚀 ARENA CONFIG V2 READY");
