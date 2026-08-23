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

    if (text === "🎛 پنل مدیریت پیشرفته" && isAdmin(msg.from)) {
        openAdminPanel(chatId);
        return;
    }

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

    // فرآیند ثبت محصول جدید یا افزودن کانفیگ به انبار توسط ادمین
    if (isAdmin(msg.from)) {
        if (currentState === "add_prod_name") {
            userState[userId].newProd = { id: "prod_" + Date.now(), name: text };
            userState[userId].step = "add_prod_price";
            bot.sendMessage(chatId, "💵 قیمت محصول (تومان) را وارد کنید:");
            return;
        }
        if (currentState === "add_prod_price") {
            userState[userId].newProd.price = parseInt(text) || 0;
            userState[userId].step = "add_prod_volume";
            bot.sendMessage(chatId, "📦 حجم محصول (مثلا 50GB یا نامحدود):");
            return;
        }
        if (currentState === "add_prod_volume") {
            userState[userId].newProd.volume = text;
            userState[userId].step = "add_prod_duration";
            bot.sendMessage(chatId, "⏳ مدت زمان اعتبار (مثلا ۳۰ روز):");
            return;
        }
        if (currentState === "add_prod_duration") {
            const p = userState[userId].newProd;
            db.run(`INSERT INTO products (id, name, price, volume, duration, status) VALUES (?, ?, ?, ?, ?, 1)`,
                [p.id, p.name, p.price, p.volume, text]);
            userState[userId].step = null;
            bot.sendMessage(chatId, `✅ محصول "${p.name}" با موفقیت ساخته شد! حالا از پنل مدیریت می‌توانید به انبار آن کانفیگ اضافه کنید.`);
            openAdminPanel(chatId);
            return;
        }

        if (currentState === "add_config_to_pool") {
            const prodId = userState[userId].targetProdId;
            // هر خط یک کانفیگ
            const configs = text.split("\n").map(c => c.trim()).filter(c => c.length > 0);
            
            let addedCount = 0;
            configs.forEach(cfg => {
                db.run(`INSERT INTO config_pool (productId, config, status) VALUES (?, ?, 0)`, [prodId, cfg]);
                addedCount++;
            });

            userState[userId].step = null;
            bot.sendMessage(chatId, `✅ تعداد ${addedCount} کانفیگ جدید با موفقیت به انبار این محصول اضافه شد.`);
            openAdminPanel(chatId);
            return;
        }
    }

    // ارسال فیش کارت‌به‌کارت
    if (currentState === "waiting_for_receipt") {
        const orderId = userState[userId].currentOrderId;
        db.get(`SELECT * FROM orders WHERE orderId = ?`, [orderId], (err, order) => {
            if (order && (photo || text)) {
                db.run(`UPDATE orders SET status = 'PendingApproval' WHERE orderId = ?`, [orderId]);

                const userInfo = `👤 کاربر: \`${userId}\`\n📦 سفارش: \`${orderId}\`\n🏷 محصول: ${order.subName}\n💰 مبلغ: ${order.price.toLocaleString()} تومان`;
                const adminKb = {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "✅ تأیید و ارسال خودکار کانفیگ", callback_data: `approve_order_${orderId}` },
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

                bot.sendMessage(chatId, "✅ فیش شما با موفقیت ثبت شد. پس از تأیید مدیریت، کانفیگ شما به صورت خودکار ارسال خواهد شد.", mainKeyboard);
                userState[userId].step = null;
            }
        });
        return;
    }
});

function openAdminPanel(chatId) {
    db.all(`SELECT p.id, p.name, (SELECT COUNT(*) FROM config_pool cp WHERE cp.productId = p.id AND cp.status = 0) as stock FROM products p`, (err, rows) => {
        let textMsg = "🎛 **پنل مدیریت انبار و محصولات**\n\nلیست محصولات و موجودی کانفیگ انبار:\n\n";
        let inlineKeys = [];

        if (rows && rows.length > 0) {
            rows.forEach((r, idx) => {
                textMsg += `${idx + 1}. **${r.name}** 📦 موجودی انبار: \`${r.stock} عدد\`\n`;
                inlineKeys.push([{ text: `➕ افزودن کانفیگ به ${r.name}`, callback_data: `admin_add_cfg_${r.id}` }]);
            });
        } else {
            textMsg += "هنوز محصولی ثبت نشده است.\n";
        }

        inlineKeys.push([{ text: "➕ تعریف محصول جدید", callback_data: "admin_new_prod" }]);

        bot.sendMessage(chatId, textMsg, {
            reply_markup: { inline_keyboard: inlineKeys },
            parse_mode: "Markdown"
        });
    });
}

// تابع کمکی برای تخصیص خودکار کانفیگ به کاربر
function deliverConfigToUser(chatId, userId, prodId, successCallback) {
    // پیدا کردن یک کانفیگ آزاد (status = 0) از انبار محصول
    db.get(`SELECT * FROM config_pool WHERE productId = ? AND status = 0 LIMIT 1`, [prodId], (err, freeConfig) => {
        if (!freeConfig) {
            bot.sendMessage(chatId, "⚠️ انبار کانفیگ این محصول در حال حاضر خالی است! لطفاً به پشتیبانی اطلاع دهید.");
            if (successCallback) successCallback(false);
            return;
        }

        db.get(`SELECT * FROM products WHERE id = ?`, [prodId], (err, prod) => {
            if (!prod) {
                if (successCallback) successCallback(false);
                return;
            }

            // علامت‌گذاری کانفیگ به عنوان فروخته‌شده (status = 1)
            db.run(`UPDATE config_pool SET status = 1 WHERE id = ?`, [freeConfig.id]);

            const startDate = new Date().toLocaleDateString('fa-IR');
            // محاسبه تاریخ انقضا (فرضا ۳۰ روزه)
            const expireDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fa-IR');

            // ثبت در اشتراک‌های کاربر
            db.run(`INSERT INTO subscriptions (userId, name, volume, duration, startDate, expireDate, config) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, prod.name, prod.volume, prod.duration, startDate, expireDate, freeConfig.config]);

            // ارسال کانفیگ به کاربر
            bot.sendMessage(chatId, 
                `🎉 **خرید و تحویل اشتراک با موفقیت انجام شد!**\n\n` +
                `🏷 نام: ${prod.name}\n` +
                `📦 حجم: ${prod.volume}\n` +
                `⏰ اعتبار تا: ${expireDate}\n\n` +
                `🔗 **کانفیگ اختصاصی شما:**\n\`${freeConfig.config}\``,
                { parse_mode: "Markdown", ...mainKeyboard }
            );

            if (successCallback) successCallback(true);
        });
    });
}

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});
    if (!userState[userId]) userState[userId] = { step: null };

    if (data === "admin_new_prod" && isAdmin(query.from)) {
        userState[userId].step = "add_prod_name";
        bot.sendMessage(chatId, "➕ نام محصول جدید را وارد کنید:");
        return;
    }

    if (data.startsWith("admin_add_cfg_") && isAdmin(query.from)) {
        const prodId = data.replace("admin_add_cfg_", "");
        userState[userId].targetProdId = prodId;
        userState[userId].step = "add_config_to_pool";
        bot.sendMessage(chatId, "🔗 لطفاً لینک‌های کانفیگ را بفرستید.\n*(نکته: اگر چند کانفیگ دارید، هر کدام را در یک خط جدید (Enter) بفرستید تا همه به انبار اضافه شوند)*");
        return;
    }

    // انتخاب محصول برای خرید
    if (data.startsWith("buy_prod_")) {
        const prodId = data.replace("buy_prod_", "");
        db.get(`SELECT * FROM products WHERE id = ?`, [prodId], (err, prod) => {
            if (!prod) return;

            // بررسی موجودی انبار قبل از خرید
            db.get(`SELECT COUNT(*) as stock FROM config_pool WHERE productId = ? AND status = 0`, [prodId], (err, stockRow) => {
                const stock = stockRow ? stockRow.stock : 0;

                bot.editMessageText(
                    `📦 **مشخصات محصول:**\n\n` +
                    `🏷 نام: ${prod.name}\n` +
                    `💰 قیمت: ${prod.price.toLocaleString()} تومان\n` +
                    `📦 حجم: ${prod.volume}\n` +
                    `⏳ مدت اعتبار: ${prod.duration}\n` +
                    `📦 موجودی انبار: ${stock > 0 ? `✅ ${stock} عدد آماده تحویل` : `❌ ناموجود`}\n\n` +
                    `روش پرداخت خود را انتخاب کنید:`,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        reply_markup: {
                            inline_keyboard: stock > 0 ? [
                                [{ text: "💳 پرداخت از موجودی کیف پول", callback_data: `pay_wallet_${prod.id}` }],
                                [{ text: "🧾 پرداخت کارت‌به‌کارت", callback_data: `pay_card_${prod.id}` }],
                                [{ text: "🔙 انصراف", callback_data: "cancel_buy" }]
                            ] : [
                                [{ text: "❌ موقتاً ناموجود (بازگشت)", callback_data: "cancel_buy" }]
                            ]
                        },
                        parse_mode: "Markdown"
                    }
                );
            });
        });
        return;
    }

    // پرداخت آنی با کیف پول + تخصیص خودکار کانفیگ
    if (data.startsWith("pay_wallet_")) {
        const prodId = data.replace("pay_wallet_", "");
        db.get(`SELECT * FROM products WHERE id = ?`, [prodId], (err, prod) => {
            db.get(`SELECT balance FROM users WHERE userId = ?`, [userId], (err, user) => {
                if (!prod || !user) return;

                if (user.balance < prod.price) {
                    bot.sendMessage(chatId, "❌ موجودی کیف پول شما برای خرید این محصول کافی نیست!");
                    return;
                }

                // کسر از موجودی
                const newBalance = user.balance - prod.price;
                db.run(`UPDATE users SET balance = ? WHERE userId = ?`, [newBalance, userId]);
                db.run(`INSERT INTO transactions (userId, amount, type, description, date) VALUES (?, ?, ?, ?, ?)`,
                    [userId, -prod.price, 'withdraw', `خرید اشتراک ${prod.name}`, new Date().toLocaleDateString('fa-IR')]);

                // تحویل خودکار کانفیگ از انبار
                deliverConfigToUser(chatId, userId, prodId, (success) => {
                    if (success) {
                        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
                    }
                });
            });
        });
        return;
    }

    // ثبت سفارش کارت‌به‌کارت
    if (data.startsWith("pay_card_")) {
        const prodId = data.replace("pay_card_", "");
        db.get(`SELECT * FROM products WHERE id = ?`, [prodId], (err, prod) => {
            if (!prod) return;

            const orderId = "ord_" + Date.now();
            db.run(`INSERT INTO orders (orderId, userId, productId, subName, price, status, date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [orderId, userId, prod.id, prod.name, prod.price, "PendingPayment", new Date().toLocaleDateString('fa-IR')]);

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

    // تایید فیش توسط ادمین و ارسال خودکار کانفیگ به کاربر
    if (data.startsWith("approve_order_") && isAdmin(query.from)) {
        const orderId = data.replace("approve_order_", "");
        db.get(`SELECT * FROM orders WHERE orderId = ?`, [orderId], (err, order) => {
            if (!order) return;

            db.run(`UPDATE orders SET status = 'Completed' WHERE orderId = ?`, [orderId]);

            // تحویل خودکار کانفیگ به خریدار
            deliverConfigToUser(order.userId, order.userId, order.productId, (success) => {
                if (success) {
                    bot.sendMessage(chatId, `✅ سفارش ${orderId} تأیید شد و کانفیگ به صورت خودکار از انبار کسر و برای کاربر ارسال گردید.`);
                } else {
                    bot.sendMessage(chatId, `⚠️ سفارش تأیید شد اما انبار کانفیگ این محصول خالی بود! لطفاً دستی به کاربر کانفیگ دهید.`);
                }
            });
        });
        return;
    }

    if (data === "cancel_buy") {
        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
        bot.sendMessage(chatId, "منوی اصلی:", mainKeyboard);
        return;
    }
});

console.log("ربات با سیستم پیشرفته انبار و تحویل خودکار کانفیگ راه‌اندازی شد...");
