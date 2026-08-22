import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";
import dotenv from "dotenv";

dotenv.config();

// تنظیمات توکن و ادمین
const TOKEN = "8850301156:AAGB5ewQkolWaLg2kjKL-cL8KXDhrbNciHQ";
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
        user.username && user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()
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

// ================= ADMIN CONFIG MANAGEMENT & STATES =================

const adminState = {};

bot.on("callback_query", async query => {
    const chatId = query.message.chat.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "add_config") {
        if (!isAdmin(query.from)) return;

        adminState[chatId] = { step: "name" };

        return bot.sendMessage(
            chatId,
            `➕ افزودن کانفیگ جدید\n\nنام محصول را ارسال کن:\n\nمثال:\nکانفیگ پرسرعت 30 روزه`
        );
    }

    if (data === "stock") {
        if (!isAdmin(query.from)) return;

        db.all(`SELECT * FROM configs`, [], (err, rows) => {
            let free = 0;
            let sold = 0;

            rows.forEach(c => {
                if (c.sold) sold++;
                else free++;
            });

            bot.sendMessage(
                chatId,
                `📦 انبار ARENA\n\n🟢 آزاد:\n${free}\n\n🔴 فروخته شده:\n${sold}\n\n📦 کل:\n${rows.length}`
            );
        });
    }

    if (data === "receipts") {
        if (!isAdmin(query.from)) return;

        db.all(`SELECT * FROM receipts WHERE status='pending'`, [], (err, rows) => {
            if (!rows || !rows.length) {
                return bot.sendMessage(chatId, "✅ رسیدی وجود ندارد");
            }

            let text = "💳 رسیدهای در انتظار تأیید:\n\n";
            rows.forEach(r => {
                text += `👤 کاربر: ${r.user} (@${r.username})\n💰 مبلغ: ${r.amount}\n---\n`;
            });

            bot.sendMessage(chatId, text);
        });
    }

    if (data === "buy") {
        db.all(`SELECT * FROM configs WHERE sold=0`, [], (err, rows) => {
            if (!rows || !rows.length) {
                return bot.sendMessage(chatId, "❌ موجودی خالی است");
            }

            let buttons = [];
            rows.forEach(c => {
                buttons.push([
                    {
                        text: `📦 ${c.name} | ${c.price.toLocaleString()} تومان`,
                        callback_data: `buy_${c.id}`
                    }
                ]);
            });

            bot.sendMessage(chatId, "🛒 کانفیگ مورد نظر خود را انتخاب کنید:", {
                reply_markup: { inline_keyboard: buttons }
            });
        });
    }

    if (data.startsWith("buy_")) {
        const configId = Number(data.split("_")[1]);

        db.get(`SELECT * FROM configs WHERE id=?`, [configId], (err, item) => {
            if (!item) {
                return bot.sendMessage(chatId, "❌ محصول پیدا نشد");
            }

            if (item.sold) {
                return bot.sendMessage(chatId, "❌ این کانفیگ فروخته شده");
            }

            db.get(`SELECT balance FROM users WHERE id=?`, [chatId], (err, user) => {
                let balance = user?.balance || 0;

                if (balance < item.price) {
                    return bot.sendMessage(
                        chatId,
                        `❌ موجودی کافی نیست\n\n💰 موجودی:\n${balance}\n\n💳 قیمت:\n${item.price}`
                    );
                }

                db.run(`UPDATE users SET balance=balance-? WHERE id=?`, [item.price, chatId]);
                db.run(`UPDATE configs SET sold=1, buyer=? WHERE id=?`, [chatId, configId]);
                db.run(
                    `INSERT INTO orders (user, config, price, date) VALUES (?, ?, ?, ?)`,
                    [chatId, item.name, item.price, new Date().toLocaleString()]
                );

                bot.sendMessage(
                    chatId,
                    `✅ خرید موفق\n\n📦 محصول:\n${item.name}\n\n🔗 کانفیگ:\n\n${item.config}\n\n⏳ اعتبار:\n${item.days} روز`
                );
            });
        });
    }
});

// ================= TEXT & STATE HANDLER =================

bot.on("message", msg => {
    if (!msg.text || msg.text.startsWith("/")) return;

    const chatId = msg.chat.id;
    const text = msg.text;

    if (isAdmin(msg.from) && adminState[chatId]) {
        const state = adminState[chatId];

        if (state.step === "name") {
            state.name = text;
            state.step = "config";
            return bot.sendMessage(chatId, "🔗 متن یا لینک کانفیگ را ارسال کنید:");
        }

        if (state.step === "config") {
            state.config = text;
            state.step = "price";
            return bot.sendMessage(chatId, "💰 قیمت کانفیگ (تومان) را وارد کنید:");
        }

        if (state.step === "price") {
            state.price = Number(text);
            state.step = "days";
            return bot.sendMessage(chatId, "⏳ تعداد روزهای اعتبار را وارد کنید:");
        }

        if (state.step === "days") {
            state.days = Number(text);

            db.run(
                `INSERT INTO configs (name, config, price, days) VALUES (?, ?, ?, ?)`,
                [state.name, state.config, state.price, state.days],
                () => {
                    bot.sendMessage(chatId, "✅ کانفیگ با موفقیت در انبار ثبت شد.");
                    delete adminState[chatId];
                }
            );
        }
    }
});

// ================= PAYMENT ACCEPT / REJECT =================

bot.onText(/\/accept (.+)/, msg => {
    if (!isAdmin(msg.from)) return;

    let args = msg.text.split(" ");
    let user = Number(args[1]);
    let amount = Number(args[2]);

    if (!user || !amount) {
        return bot.sendMessage(msg.chat.id, "فرمت اشتباه:\n/accept ID مبلغ");
    }

    db.run(`UPDATE users SET balance=balance+? WHERE id=?`, [amount, user]);
    db.run(`UPDATE receipts SET amount=?, status='accepted' WHERE user=?`, [amount, user]);

    bot.sendMessage(
        user,
        `✅ شارژ کیف پول تایید شد\n\n💰 مبلغ:\n${amount.toLocaleString()} تومان`
    ).catch(() => {});

    bot.sendMessage(msg.chat.id, "✅ انجام شد");
});

bot.onText(/\/reject (.+)/, msg => {
    if (!isAdmin(msg.from)) return;

    let user = Number(msg.text.split(" ")[1]);

    db.run(`UPDATE receipts SET status='rejected' WHERE user=?`, [user]);

    bot.sendMessage(
        user,
        `❌ رسید شما رد شد\n\nبا پشتیبانی تماس بگیرید.`
    ).catch(() => {});

    bot.sendMessage(msg.chat.id, "❌ رسید رد شد.");
});

// ================= FREE TEST =================

const testUsers = new Set();

bot.onText(/\/test/, msg => {
    if (testUsers.has(msg.chat.id)) {
        return bot.sendMessage(msg.chat.id, "⚠️ قبلا تست دریافت کرده‌اید");
    }

    db.get(`SELECT * FROM configs WHERE sold=0 LIMIT 1`, [], (err, c) => {
        if (!c) {
            return bot.sendMessage(msg.chat.id, "❌ تست موجود نیست");
        }

        testUsers.add(msg.chat.id);

        db.run(`UPDATE configs SET sold=1, buyer=? WHERE id=?`, [msg.chat.id, c.id]);

        bot.sendMessage(
            msg.chat.id,
            `⚡ تست رایگان فعال شد\n\n🔗 کانفیگ:\n\n${c.config}\n\n⏳ مدت:\n${c.days} روز`
        );
    });
});

// ================= BROADCAST =================

bot.onText(/\/broadcast (.+)/, msg => {
    if (!isAdmin(msg.from)) return;

    let text = msg.text.replace("/broadcast ", "");

    db.all(`SELECT id FROM users`, [], (err, users) => {
        if (users) {
            users.forEach(u => {
                bot.sendMessage(u.id, `📢 پیام مدیریت:\n\n${text}`).catch(() => {});
            });
        }
    });

    bot.sendMessage(msg.chat.id, "✅ ارسال همگانی انجام شد");
});

// ================= BLOCK SYSTEM =================

bot.onText(/\/block (.+)/, msg => {
    if (!isAdmin(msg.from)) return;
    let id = Number(msg.text.split(" ")[1]);

    db.run(`UPDATE users SET blocked=1 WHERE id=?`, [id]);
    bot.sendMessage(msg.chat.id, "🚫 کاربر بلاک شد");
});

bot.onText(/\/unblock (.+)/, msg => {
    if (!isAdmin(msg.from)) return;
    let id = Number(msg.text.split(" ")[1]);

    db.run(`UPDATE users SET blocked=0 WHERE id=?`, [id]);
    bot.sendMessage(msg.chat.id, "✅ کاربر آزاد شد");
});

// ================= BACKUP & TOOLS =================

bot.onText(/\/backup/, msg => {
    if (!isAdmin(msg.from)) return;
    bot.sendDocument(msg.chat.id, "./arena.db", {
        caption: "💾 بکاپ دیتابیس ARENA"
    });
});

bot.onText(/\/id/, msg => {
    bot.sendMessage(msg.chat.id, `🆔 ID:\n\n${msg.chat.id}`);
});

// ================= ERROR HANDLERS =================

bot.on("polling_error", err => {
    console.log("BOT ERROR:", err.message);
});

process.on("uncaughtException", err => {
    console.log("ERROR:", err);
});

process.on("unhandledRejection", err => {
    console.log("ERROR:", err);
});

console.log("🚀 ARENA CONFIG V2 READY");
