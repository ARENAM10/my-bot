import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import db from "./database.js";

dotenv.config();

const TOKEN = process.env.TOKEN || "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "amir_85m10";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "8923324852";

const bot = new TelegramBot(TOKEN, { polling: true });
const userState = {};

function isAdmin(user) {
    if (!user) return false;
    const username = user.username ? user.username.toLowerCase() : "";
    const userId = user.id ? user.id.toString() : "";
    return username === ADMIN_USERNAME.toLowerCase() || userId === ADMIN_CHAT_ID;
}

const mainKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🛒 خرید اشتراک" }, { text: "📦 اشتراک‌های من" }],
            [{ text: "💳 کیف پول" }, { text: "📞 پشتیبانی" }]
        ],
        resize_keyboard: true
    }
};

bot.onText(/\/start(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const firstName = msg.first_name || "کاربر";
    const username = msg.username || "";
    const refId = match[1] ? match[1].trim() : null;

    userState[userId] = { step: null };

    db.get(`SELECT * FROM users WHERE userId = ?`, [userId], (err, row) => {
        if (!row) {
            db.run(`INSERT INTO users (userId, firstName, username, joinedDate) VALUES (?, ?, ?, ?)`,
                [userId, firstName, username, new Date().toLocaleDateString('fa-IR')]);
            
            if (refId && refId !== userId) {
                db.get(`SELECT * FROM users WHERE userId = ?`, [refId], (err, refUser) => {
                    if (refUser) {
                        db.run(`UPDATE users SET balance = balance + 5000 WHERE userId = ?`, [refId]);
                        db.run(`INSERT INTO transactions (userId, amount, type, description, date) VALUES (?, ?, ?, ?, ?)`,
                            [refId, 5000, 'deposit', 'پاداش دعوت دوستان', new Date().toLocaleDateString('fa-IR')]);
                        bot.sendMessage(refId, `🎁 یک کاربر جدید با لینک شما وارد ربات شد و ۵,۰۰۰ تومان پاداش گرفتید!`).catch(() => {});
                    }
                });
            }
        }
    });

    if (isAdmin(msg.from)) {
        bot.sendMessage(chatId, `✨ خوش آمدید مالک عزیز 👑`, {
            reply_markup: {
                keyboard: [
                    [{ text: "🎛 پنل مدیریت پیشرفته" }],
                    ...mainKeyboard.reply_markup.keyboard
                ],
                resize_keyboard: true
            }
        });
        return;
    }

    db.get(`SELECT value FROM settings WHERE key = 'welcomeMessage'`, (err, row) => {
        const welcomeText = row ? row.value : "✨ خوش آمدید.";
        bot.sendMessage(chatId, welcomeText, mainKeyboard);
    });
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;
    const photo = msg.photo;

    if (!userState[userId]) userState[userId] = { step: null };
    const currentState = userState[userId].step;

    if (text === "🛒 خرید اشتراک") {
        db.all(`SELECT * FROM products WHERE status = 1`, (err, rows) => {
            if (!rows || rows.length === 0) {
                bot.sendMessage(chatId, "⚠️ در حال حاضر هیچ محصول فعالی برای خرید وجود ندارد.");
                return;
            }
            let inlineKeys = rows.map(r => [{ 
                text: `${r.name} 💎 ${r.price.toLocaleString()} تومان`, 
                callback_data: `buy_prod_${r.id}` 
            }]);
            bot.sendMessage(chatId, "🛒 **لیست محصولات و اشتراک‌ها:**\n\nلطفاً محصول مورد نظر خود را انتخاب کنید:", {
                reply_markup: { inline_keyboard: inlineKeys },
                parse_mode: "Markdown"
            });
        });
        return;
    }

    if (text === "📦 اشتراک‌های من") {
        db.all(`SELECT * FROM subscriptions WHERE userId = ?`, [userId], (err, rows) => {
            if (!rows || rows.length === 0) {
                bot.sendMessage(chatId, "📁 شما در حال حاضر هیچ اشتراک فعالی ندارید.");
                return;
            }
            let msgText = "📦 **اشتراک‌های فعال شما:**\n\n";
            rows.forEach((sub, idx) => {
                msgText += `🔹 **اشتراک ${idx + 1}: ${sub.name}**\n` +
                           `   - 📦 حجم: ${sub.volume}\n` +
                           `   - ⏳ مدت: ${sub.duration}\n` +
                           `   - 📅 تاریخ شروع: ${sub.startDate}\n` +
                           `   - ⏰ تاریخ انقضا: ${sub.expireDate}\n` +
                           `   - 🔗 کانفیگ اختصاصی:\n\`${sub.config}\`\n` +
                           `------------------------------------\n`;
            });
            bot.sendMessage(chatId, msgText, { parse_mode: "Markdown" });
        });
        return;
    }

    if (text === "💳 کیف پول") {
        db.get(`SELECT balance FROM users WHERE userId = ?`, [userId], (err, row) => {
            const balance = row ? row.balance : 0;
            bot.sendMessage(chatId, 
                `💳 **مدیریت کیف پول**\n\n` +
                `💎 موجودی فعلی: **${balance.toLocaleString()} تومان**`, 
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "➕ شارژ کیف پول", callback_data: "wallet_charge" }],
                            [{ text: "📜 تاریخچه تراکنش‌ها", callback_data: "wallet_history" }]
                        ]
                    },
                    parse_mode: "Markdown"
                }
            );
        });
        return;
    }

    if (text === "📞 پشتیبانی") {
        bot.sendMessage(chatId, `📞 ارتباط مستقیم با پشتیبانی:\n@${ADMIN_USERNAME}`);
        return;
    }

    if (text === "🔙 بازگشت به منوی اصلی") {
        bot.sendMessage(chatId, "منوی اصلی:", mainKeyboard);
        return;
    }

    // فرآیند ارسال فیش کارت‌به‌کارت
    if (currentState === "waiting_for_receipt") {
        const orderId = userState[userId].currentOrderId;
        db.get(`SELECT * FROM orders WHERE orderId = ?`, [orderId], (err, order) => {
            if (order && (photo || text)) {
                db.run(`UPDATE orders SET status = 'PendingApproval' WHERE orderId = ?`, [orderId]);

                const userInfo = `👤 کاربر: \`${userId}\`\n📦 سفارش: \`${orderId}\`\n🏷 محصول: ${order.subName}\n💰 مبلغ: ${order.price.toLocaleString()} تومان`;
                const adminKb = {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "✅ تأیید و ارسال کانفیگ", callback_data: `approve_order_${orderId}` },
                            { text: "❌ رد سفارش", callback_data: `reject_order_${orderId}` }
                        ]]
                    },
                    parse_mode: "Markdown"
                };

                if (photo) {
                    bot.sendPhoto(ADMIN_CHAT_ID, photo[photo.length - 1].file_id, { caption: `📥 **فیش واریزی جدید**\n\n${userInfo}`, ...adminKb });
                } else {
                    bot.sendMessage(ADMIN_CHAT_ID, `📥 **رسید متنی جدید**\n\n${userInfo}\n📝 متن: ${text}`, adminKb);
                }

                bot.sendMessage(chatId, "✅ فیش شما با موفقیت ثبت شد. پس از تایید توسط مدیریت، اشتراک شما فعال خواهد شد.", mainKeyboard);
                userState[userId].step = null;
            }
        });
        return;
    }
});

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});
    if (!userState[userId]) userState[userId] = { step: null };

    // انتخاب محصول برای خرید
    if (data.startsWith("buy_prod_")) {
        const prodId = data.replace("buy_prod_", "");
        db.get(`SELECT * FROM products WHERE id = ?`, [prodId], (err, prod) => {
            if (!prod) return;

            bot.editMessageText(
                `📦 **مشخصات محصول:**\n\n` +
                `🏷 نام: ${prod.name}\n` +
                `💰 قیمت: ${prod.price.toLocaleString()} تومان\n` +
                `📦 حجم: ${prod.volume}\n` +
                `⏳ مدت اعتبار: ${prod.duration}\n\n` +
                `روش پرداخت خود را انتخاب کنید:`,
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "💳 پرداخت از موجودی کیف پول", callback_data: `pay_wallet_${prod.id}` }],
                            [{ text: "🧾 پرداخت کارت‌به‌کارت", callback_data: `pay_card_${prod.id}` }],
                            [{ text: "🔙 انصراف", callback_data: "cancel_buy" }]
                        ]
                    },
                    parse_mode: "Markdown"
                }
            );
        });
        return;
    }

    // پرداخت آنی با کیف پول
    if (data.startsWith("pay_wallet_")) {
        const prodId = data.replace("pay_wallet_", "");
        db.get(`SELECT * FROM products WHERE id = ?`, [prodId], (err, prod) => {
            db.get(`SELECT balance FROM users WHERE userId = ?`, [userId], (err, user) => {
                if (!prod || !user) return;

                if (user.balance < prod.price) {
                    bot.sendMessage(chatId, "❌ موجودی کیف پول شما برای خرید این محصول کافی نیست! لطفاً کیف پول خود را شارژ کنید.");
                    return;
                }

                // کسر از موجودی و ثبت اشتراک
                const newBalance = user.balance - prod.price;
                db.run(`UPDATE users SET balance = ? WHERE userId = ?`, [newBalance, userId]);
                db.run(`INSERT INTO transactions (userId, amount, type, description, date) VALUES (?, ?, ?, ?, ?)`,
                    [userId, -prod.price, 'withdraw', `خرید اشتراک ${prod.name}`, new Date().toLocaleDateString('fa-IR')]);

                const startDate = new Date().toLocaleDateString('fa-IR');
                const expireDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fa-IR');

                db.run(`INSERT INTO subscriptions (userId, name, volume, duration, startDate, expireDate, config) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [userId, prod.name, prod.volume, prod.duration, startDate, expireDate, prod.config]);

                bot.editMessageText(
                    `🎉 **خرید با موفقیت انجام شد!**\n\n` +
                    `🏷 محصول: ${prod.name}\n` +
                    `🔗 **کانفیگ اختصاصی شما:**\n\`${prod.config}\``,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        parse_mode: "Markdown"
                    }
                );
            });
        });
        return;
    }

    // انتخاب روش کارت‌به‌کارت
    if (data.startsWith("pay_card_")) {
        const prodId = data.replace("pay_card_", "");
        db.get(`SELECT * FROM products WHERE id = ?`, [prodId], (err, prod) => {
            if (!prod) return;

            const orderId = "ord_" + Date.now();
            db.run(`INSERT INTO orders (orderId, userId, subName, price, status, date) VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, userId, prod.name, prod.price, "PendingPayment", new Date().toLocaleDateString('fa-IR')]);

            userState[userId].currentOrderId = orderId;
            userState[userId].step = "waiting_for_receipt";

            db.all(`SELECT value FROM settings WHERE key IN ('cardNumber', 'cardHolder')`, (err, rows) => {
                const cardNum = rows.find(r => r.key === 'cardNumber')?.value || "";
                const cardHold = rows.find(r => r.key === 'cardHolder')?.value || "";

                bot.editMessageText(
                    `📦 **سفارش ایجاد شد (کد: \`${orderId}\`)**\n\n` +
                    `💳 لطفاً مبلغ **${prod.price.toLocaleString()} تومان** را به کارت زیر واریز کنید:\n\n` +
                    `شماره کارت: \`${cardNum}\`\n` +
                    `به نام: ${cardHold}\n\n` +
                    `📸 **حالا عکس فیش واریزی یا متن کد پیگیری را ارسال کنید.**`,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        parse_mode: "Markdown"
                    }
                );
            });
        });
        return;
    }

    if (data === "wallet_history") {
        db.all(`SELECT * FROM transactions WHERE userId = ? ORDER BY id DESC LIMIT 5`, [userId], (err, rows) => {
            if (!rows || rows.length === 0) {
                bot.sendMessage(chatId, "📜 هیچ تراکنشی در تاریخچه شما ثبت نشده است.");
                return;
            }
            let histText = "📜 **آخرین تراکنش‌های کیف پول:**\n\n";
            rows.forEach((t) => {
                const sign = t.amount > 0 ? "+" : "";
                histText += `▫️ ${t.description}\n   مبلغ: ${sign}${t.amount.toLocaleString()} تومان | تاریخ: ${t.date}\n------------------\n`;
            });
            bot.sendMessage(chatId, histText, { parse_mode: "Markdown" });
        });
        return;
    }

    if (data === "wallet_charge") {
        bot.sendMessage(chatId, `💳 برای شارژ کیف پول، لطفاً مبلغ مورد نظر را به پشتیبانی (@${ADMIN_USERNAME}) اعلام کنید تا به صورت آنی اعتبار شما شارژ شود.`);
        return;
    }

    if (data.startsWith("approve_order_") && isAdmin(query.from)) {
        const orderId = data.replace("approve_order_", "");
        db.get(`SELECT * FROM orders WHERE orderId = ?`, [orderId], (err, order) => {
            if (!order) return;

            db.run(`UPDATE orders SET status = 'Completed' WHERE orderId = ?`, [orderId]);
            db.get(`SELECT * FROM products WHERE name = ?`, [order.subName], (err, prod) => {
                const configCode = prod ? prod.config : "vless://default-config...";
                const startDate = new Date().toLocaleDateString('fa-IR');
                const expireDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fa-IR');

                db.run(`INSERT INTO subscriptions (userId, name, volume, duration, startDate, expireDate, config) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [order.userId, order.subName, "نامحدود", "۳۰ روز", startDate, expireDate, configCode]);

                bot.sendMessage(order.userId, 
                    `🎉 **پرداخت و فیش شما تأیید شد!**\n\n` +
                    `🏷 نام: ${order.subName}\n` +
                    `🔗 **کانفیگ اختصاصی شما:**\n\`${configCode}\``, 
                    { parse_mode: "Markdown", ...mainKeyboard }
                ).catch(() => {});

                bot.sendMessage(chatId, `✅ سفارش ${orderId} تأیید شد و کانفیگ برای کاربر ارسال گردید.`);
            });
        });
        return;
    }
});

console.log("ربات با منوی کامل و پیشرفته راه‌اندازی شد...");
