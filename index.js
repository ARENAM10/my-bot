import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const OWNER_USERNAME = "ARENAM_10";
const OWNER_ID = Number(process.env.OWNER_ID);
const STORE_NAME = process.env.STORE_NAME || "LEX VIP";

if (!TOKEN || !OWNER_ID) {
    console.error("خطا: توکن ربات یا آیدی مالک در فایل .env تنظیم نشده است!");
    process.exit(1);
}

// ==========================================
// پایگاه داده SQLite
// ==========================================
const db = new Database("bot_database.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        wallet INTEGER DEFAULT 0,
        invited_by INTEGER,
        is_blocked INTEGER DEFAULT 0,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        category TEXT,
        volume TEXT,
        duration TEXT,
        price INTEGER,
        config TEXT,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        sold INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        config_id INTEGER,
        receipt TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS user_states (
        user_id INTEGER PRIMARY KEY,
        action TEXT,
        data TEXT
    );
`);

function addUser(user, invitedBy = null) {
    const existing = db.prepare("SELECT * FROM users WHERE user_id = ?").get(user.id);
    if (!existing) {
        db.prepare(`
            INSERT INTO users (user_id, username, first_name, invited_by) 
            VALUES (?, ?, ?, ?)
        `).run(user.id, user.username || "", user.first_name || "", invitedBy);
    } else {
        db.prepare(`
            UPDATE users SET username = ?, first_name = ? WHERE user_id = ?
        `).run(user.username || "", user.first_name || "", user.id);
    }
}

function getUser(userId) {
    return db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId);
}

function getAllUsers() {
    return db.prepare("SELECT * FROM users").all();
}

function updateWallet(userId, amount) {
    db.prepare("UPDATE users SET wallet = wallet + ? WHERE user_id = ?").run(amount, userId);
}

function setSetting(key, value) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

function getSetting(key) {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? row.value : null;
}

function addConfig(data) {
    const stmt = db.prepare(`
        INSERT INTO configs (title, category, volume, duration, price, config, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(data.title, data.category, data.volume, data.duration, data.price, data.config, data.description);
}

function getConfigs() {
    return db.prepare("SELECT * FROM configs").all();
}

function getActiveConfigs() {
    return db.prepare("SELECT * FROM configs WHERE is_active = 1 AND sold = 0").all();
}

function getConfig(id) {
    return db.prepare("SELECT * FROM configs WHERE id = ?").get(id);
}

function updateConfig(id, data) {
    db.prepare(`
        UPDATE configs SET title = ?, category = ?, volume = ?, duration = ?, price = ?, config = ?, description = ?, is_active = ?
        WHERE id = ?
    `).run(data.title, data.category, data.volume, data.duration, data.price, data.config, data.description, data.is_active, id);
}

function deleteConfig(id) {
    db.prepare("DELETE FROM configs WHERE id = ?").run(id);
}

function markConfigSold(id) {
    db.prepare("UPDATE configs SET sold = 1 WHERE id = ?").run(id);
}

function createOrder(userId, configId) {
    const stmt = db.prepare("INSERT INTO orders (user_id, config_id) VALUES (?, ?)");
    const info = stmt.run(userId, configId);
    return info.lastInsertRowid;
}

function getOrder(orderId) {
    return db.prepare(`
        SELECT orders.*, configs.title, configs.price, configs.config, users.username, users.first_name 
        FROM orders 
        JOIN configs ON orders.config_id = configs.id 
        JOIN users ON orders.user_id = users.user_id 
        WHERE orders.id = ?
    `).get(orderId);
}

function setReceipt(orderId, receipt) {
    db.prepare("UPDATE orders SET receipt = ? WHERE id = ?").run(receipt, orderId);
}

function updateOrderStatus(orderId, status) {
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, orderId);
}

function setUserState(userId, action, data = null) {
    db.prepare(`
        INSERT OR REPLACE INTO user_states (user_id, action, data) VALUES (?, ?, ?)
    `).run(userId, action, JSON.stringify(data));
}

function getUserState(userId) {
    const row = db.prepare("SELECT * FROM user_states WHERE user_id = ?").get(userId);
    if (!row) return null;
    return { action: row.action, data: row.data ? JSON.parse(row.data) : null };
}

function clearUserState(userId) {
    db.prepare("DELETE FROM user_states WHERE user_id = ?").run(userId);
}

function getStats() {
    const usersCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const ordersCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'approved'").get().count;
    const pendingCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get().count;
    return { users: usersCount, orders: ordersCount, pending: pendingCount };
}

// ==========================================
// منطق ربات تلگرام
// ==========================================
const bot = new TelegramBot(TOKEN, { polling: true });

function getInlineMenu(userId, username) {
    const isOwner = (userId === OWNER_ID) || (username === OWNER_USERNAME);
    const keyboard = [];

    if (isOwner) {
        keyboard.push([{ text: "🔐 مدیریت ربات", callback_data: "menu_admin" }]);
    }

    keyboard.push(
        [{ text: "🛒 خرید اشتراک", callback_data: "menu_buy" }],
        [{ text: "💳 حساب کاربری و افزایش موجودی", callback_data: "menu_account" }],
        [
            { text: "🌐 معرفی به دوستان", callback_data: "menu_invite" },
            { text: "☎️ ارتباط با پشتیبانی", callback_data: "menu_support" }
        ]
    );

    return { reply_markup: { inline_keyboard: keyboard } };
}

function getAdminPanelKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 مدیریت اشتراک‌ها", callback_data: "admin_sub_management" }],
                [
                    { text: "👥 لیست کاربران", callback_data: "admin_users_list" },
                    { text: "📊 آمار ربات", callback_data: "admin_stats" }
                ],
                [
                    { text: "💳 تنظیمات کارت پرداخت", callback_data: "admin_payment_settings" },
                    { text: "💰 شارژ دستی کیف پول", callback_data: "admin_charge_wallet" }
                ],
                [{ text: "📢 ارسال همگانی", callback_data: "admin_broadcast" }],
                [{ text: "🏠 منوی اصلی", callback_data: "menu_home" }]
            ]
        }
    };
}

function getInlineBack() {
    return { reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به منو", callback_data: "menu_home" }]] } };
}

function getAdminBack() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🔙 بازگشت به مدیریت", callback_data: "menu_admin" },
                    { text: "🏠 منوی اصلی", callback_data: "menu_home" }
                ]
            ]
        }
    };
}

bot.onText(/\/start(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;
    const inviterId = match ? parseInt(match[1]) : null;

    clearUserState(userId);
    addUser(msg.from, inviterId && inviterId !== userId ? inviterId : null);

    const user = getUser(userId);
    if (user && user.is_blocked === 1) {
        return bot.sendMessage(chatId, "❌ حساب شما مسدود شده است.");
    }

    bot.sendMessage(
        chatId,
        `✨ به پنل اختصاصی ${STORE_NAME} خوش آمدید.\n\nلطفاً از گزینه‌های زیر انتخاب کنید:`,
        getInlineMenu(userId, username)
    );
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;
    const text = msg.text;

    if (!text && !msg.photo) return;
    addUser(msg.from);

    const user = getUser(userId);
    if (user && user.is_blocked === 1) return;

    const isOwner = (userId === OWNER_ID) || (username === OWNER_USERNAME);
    const state = getUserState(userId);

    if (state) {
        if (isOwner) {
            if (state.action === "set_card_number") {
                setSetting("card_number", text);
                clearUserState(userId);
                return bot.sendMessage(chatId, `✔️ شماره کارت ثبت شد:\n\`${text}\``, { parse_mode: "Markdown", ...getAdminPanelKeyboard() });
            }
            if (state.action === "set_card_holder") {
                setSetting("card_holder", text);
                clearUserState(userId);
                return bot.sendMessage(chatId, "✔️ نام صاحب کارت به‌روزرسانی شد.", getAdminPanelKeyboard());
            }
            if (state.action === "admin_charge_user_id") {
                const targetId = parseInt(text);
                const targetUser = getUser(targetId);
                if (!targetUser) return bot.sendMessage(chatId, "❌ کاربری با این آیدی یافت نشد. دوباره وارد کنید:");
                setUserState(userId, "admin_charge_amount", { targetId });
                return bot.sendMessage(chatId, `👤 کاربر: ${targetUser.first_name}\n\nمبلغ شارژ (به تومان) را وارد کنید:`);
            }
            if (state.action === "admin_charge_amount") {
                const amount = parseInt(text);
                if (isNaN(amount)) return bot.sendMessage(chatId, "❌ مبلغ نامعتبر. عدد وارد کنید:");
                const targetId = state.data.targetId;
                updateWallet(targetId, amount);
                clearUserState(userId);
                bot.sendMessage(targetId, `💰 حساب شما توسط مدیریت به مبلغ **${amount} تومان** شارژ شد.`, { parse_mode: "Markdown" });
                return bot.sendMessage(chatId, `✔️ کیف پول کاربر با موفقیت ${amount} تومان شارژ شد.`, getAdminPanelKeyboard());
            }
            if (state.action === "broadcast_text") {
                clearUserState(userId);
                bot.sendMessage(chatId, "📢 ارسال همگانی آغاز شد...", getAdminPanelKeyboard());
                const allUsers = getAllUsers();
                let count = 0;
                for (const u of allUsers) {
                    try {
                        await bot.sendMessage(u.user_id, text);
                        count++;
                    } catch (e) {}
                }
                return bot.sendMessage(chatId, `✔️ پیام همگانی به ${count} کاربر ارسال شد.`);
            }

            if (["add_title", "edit_title"].includes(state.action)) {
                const configData = state.data || {};
                configData.title = text;
                setUserState(userId, state.action === "add_title" ? "add_category" : "edit_category", configData);
                return bot.sendMessage(chatId, "دسته‌بندی پکیج را وارد کنید:");
            }
            if (["add_category", "edit_category"].includes(state.action)) {
                const configData = state.data;
                configData.category = text;
                setUserState(userId, state.action.startsWith("add") ? "add_volume" : "edit_volume", configData);
                return bot.sendMessage(chatId, "حجم یا تعداد کاربر را وارد کنید:");
            }
            if (["add_volume", "edit_volume"].includes(state.action)) {
                const configData = state.data;
                configData.volume = text;
                setUserState(userId, state.action.startsWith("add") ? "add_duration" : "edit_duration", configData);
                return bot.sendMessage(chatId, "مدت زمان اعتبار را وارد کنید:");
            }
            if (["add_duration", "edit_duration"].includes(state.action)) {
                const configData = state.data;
                configData.duration = text;
                setUserState(userId, state.action.startsWith("add") ? "add_price" : "edit_price", configData);
                return bot.sendMessage(chatId, "مبلغ (به تومان) را وارد کنید:");
            }
            if (["add_price", "edit_price"].includes(state.action)) {
                const price = parseInt(text);
                if (isNaN(price)) return bot.sendMessage(chatId, "❌ مبلغ نامعتبر. عدد وارد کنید:");
                const configData = state.data;
                configData.price = price;
                setUserState(userId, state.action.startsWith("add") ? "add_config_string" : "edit_config_string", configData);
                return bot.sendMessage(chatId, "لینک کانفیگ اتصال را ارسال کنید:");
            }
            if (["add_config_string", "edit_config_string"].includes(state.action)) {
                const configData = state.data;
                configData.config = text;
                setUserState(userId, state.action.startsWith("add") ? "add_desc" : "edit_desc", configData);
                return bot.sendMessage(chatId, "توضیحات تکمیلی را وارد کنید (یا 'ندارد' بفرستید):");
            }
            if (["add_desc", "edit_desc"].includes(state.action)) {
                const configData = state.data;
                configData.description = text === "ندارد" ? "" : text;
                configData.is_active = 1;

                if (state.action === "add_desc") {
                    addConfig(configData);
                } else {
                    updateConfig(configData.id, configData);
                }
                clearUserState(userId);
                return bot.sendMessage(chatId, "✔️ پکیج با موفقیت ذخیره شد.", getAdminPanelKeyboard());
            }
        }

        // بخش افزایش موجودی کیف پول کاربر
        if (state.action === "waiting_wallet_amount") {
            if (text === "انصراف") {
                clearUserState(userId);
                return bot.sendMessage(chatId, "❌ لغو شد.", getInlineMenu(userId, username));
            }
            const amount = parseInt(text);
            if (isNaN(amount) || amount <= 0) return bot.sendMessage(chatId, "❌ مبلغ نامعتبر. لطفاً عدد وارد کنید:");

            const cardNum = getSetting("card_number") || "ثبت نشده";
            const cardHold = getSetting("card_holder") || "ثبت نشده";
            setUserState(userId, "waiting_wallet_receipt", { amount });

            return bot.sendMessage(chatId, `💳 کارت جهت واریز:\n\`${cardNum}\` (${cardHold})\n\nمبلغ: **${amount} تومان**\n\nلطفاً تصویر یا متن رسید واریز را ارسال کنید:`, { parse_mode: "Markdown" });
        }

        if (state.action === "waiting_wallet_receipt") {
            if (text === "انصراف") {
                clearUserState(userId);
                return bot.sendMessage(chatId, "❌ لغو شد.", getInlineMenu(userId, username));
            }
            const amount = state.data.amount;
            let receiptValue = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.text;
            clearUserState(userId);

            bot.sendMessage(chatId, "✔️ رسید افزایش موجودی شما ارسال شد و پس از تأیید مدیریت به کیف پولتان اضافه می‌گردد.", getInlineMenu(userId, username));
            
            const ownerMsg = `🔔 **درخواست شارژ کیف پول جدید!**\nکاربر: @${username || "ندارد"} (${msg.from.first_name})\nآیدی: \`${userId}\`\nمبلغ: ${amount} تومان`;
            const ownerKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ تأیید و شارژ کیف پول", callback_data: `wallet_approve_${userId}_${amount}` },
                            { text: "❌ رد درخواست", callback_data: `wallet_reject_${userId}` }
                        ]
                    ]
                }
            };

            if (msg.photo) {
                await bot.sendPhoto(OWNER_ID, receiptValue, { caption: ownerMsg, parse_mode: "Markdown", ...ownerKeyboard });
            } else {
                await bot.sendMessage(OWNER_ID, `${ownerMsg}\nمتن رسید: ${receiptValue}`, { parse_mode: "Markdown", ...ownerKeyboard });
            }
            return;
        }

        // بخش ثبت رسید خرید اشتراک
        if (state.action === "waiting_receipt") {
            if (text === "انصراف") {
                clearUserState(userId);
                return bot.sendMessage(chatId, "❌ لغو شد.", getInlineMenu(userId, username));
            }
            const orderId = state.data.orderId;
            let receiptValue = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.text;
            setReceipt(orderId, receiptValue);
            clearUserState(userId);

            bot.sendMessage(chatId, "✔️ رسید ثبت شد و برای تأیید نهایی به مدیریت ارسال گردید.", getInlineMenu(userId, username));
            
            const orderInfo = getOrder(orderId);
            const ownerMsg = `🔔 **رسید خرید پکیج جدید!**\nکاربر: @${username || "ندارد"} (\`${userId}\`)\nپکیج: ${orderInfo.title}\nمبلغ: ${orderInfo.price} تومان`;
            const ownerKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ تأیید و ارسال کانفیگ", callback_data: `approve_${orderId}` },
                            { text: "❌ رد سفارش", callback_data: `reject_${orderId}` }
                        ]
                    ]
                }
            };

            if (msg.photo) {
                await bot.sendPhoto(OWNER_ID, receiptValue, { caption: ownerMsg, parse_mode: "Markdown", ...ownerKeyboard });
            } else {
                await bot.sendMessage(OWNER_ID, `${ownerMsg}\nمتن رسید: ${receiptValue}`, { parse_mode: "Markdown", ...ownerKeyboard });
            }
            return;
        }
    }
});

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const username = query.from.username;
    const data = query.data;
    const isOwner = (userId === OWNER_ID) || (username === OWNER_USERNAME);

    try {
        if (data === "menu_home") {
            clearUserState(userId);
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText(`✨ به پنل اختصاصی ${STORE_NAME} خوش آمدید:`, {
                chat_id: chatId, message_id: query.message.message_id, ...getInlineMenu(userId, username)
            });
        }

        if (data === "menu_buy") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("بخش مورد نظر را انتخاب کنید:", {
                chat_id: chatId, message_id: query.message.message_id,
                reply_markup: { inline_keyboard: [[{ text: "📂 مشاهده لیست اشتراک‌ها", callback_data: "cat_all" }], [{ text: "🔙 بازگشت", callback_data: "menu_home" }]] }
            });
        }

        if (data === "menu_account") {
            const uData = getUser(userId);
            const accountText = `👤 شناسه کاربری: \`${userId}\`\n💰 موجودی کیف پول: **${uData.wallet || 0} تومان**`;
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText(accountText, {
                chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "➕ افزایش موجودی (شارژ حساب)", callback_data: "wallet_charge" }],
                        [{ text: "🔙 بازگشت", callback_data: "menu_home" }]
                    ]
                }
            });
        }

        if (data === "wallet_charge") {
            setUserState(userId, "waiting_wallet_amount");
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("💳 مبلغ مورد نظر جهت افزایش موجودی (به تومان) را وارد کنید:\n\n(یا کلمه 'انصراف' را بفرستید)", {
                chat_id: chatId, message_id: query.message.message_id
            });
        }

        if (data === "menu_invite") {
            bot.answerCallbackQuery(query.id);
            const botInfo = await bot.getMe();
            const inviteLink = `https://t.me/${botInfo.username}?start=${userId}`;
            return bot.editMessageText(`🌐 لینک معرفی اختصاصی شما:\n\`${inviteLink}\`\n\nبا ارسال این لینک به دوستان خود از ربات حمایت کنید.`, {
                chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown", ...getInlineBack()
            });
        }

        if (data === "menu_support") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText(`☎️ آیدی پشتیبانی:\n\`@${OWNER_USERNAME}\``, {
                chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown", ...getInlineBack()
            });
        }

        if (data === "menu_admin" && isOwner) {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("🛠 **پنل مدیریت پیشرفته ربات**", {
                chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown", ...getAdminPanelKeyboard()
            });
        }

        if (isOwner) {
            if (data === "admin_sub_management") {
                bot.answerCallbackQuery(query.id);
                const configs = getConfigs();
                const kb = [[{ text: "➕ افزودن اشتراک جدید", callback_data: "admin_add" }]];
                configs.forEach(c => {
                    kb.push([{ text: `${c.title} | ${c.volume} (${c.price} ت)`, callback_data: `edit_config_${c.id}` }]);
                });
                kb.push([{ text: "🔙 مدیریت", callback_data: "menu_admin" }]);
                return bot.editMessageText("📦 **مدیریت پکیج‌ها** (برای ویرایش کلیک کنید):", {
                    chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown", reply_markup: { inline_keyboard: kb }
                });
            }

            if (data === "admin_add") {
                setUserState(userId, "add_title");
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("➕ عنوان پکیج را وارد کنید:", { chat_id: chatId, message_id: query.message.message_id, ...getAdminBack() });
            }

            if (data.startsWith("edit_config_")) {
                const configId = parseInt(data.split("_")[2]);
                const config = getConfig(configId);
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText(`📦 پکیج: ${config.title}\nمبلغ: ${config.price} تومان`, {
                    chat_id: chatId, message_id: query.message.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "✏️ ویرایش", callback_data: `cfg_edit_${configId}` }, { text: "🗑 حذف", callback_data: `cfg_del_${configId}` }],
                            [{ text: "🔙 بازگشت", callback_data: "admin_sub_management" }]
                        ]
                    }
                });
            }

            if (data.startsWith("cfg_del_")) {
                const configId = parseInt(data.split("_")[2]);
                deleteConfig(configId);
                bot.answerCallbackQuery(query.id, { text: "حذف شد." });
                return bot.editMessageText("✔️ پکیج با موفقیت حذف شد.", { chat_id: chatId, message_id: query.message.message_id, ...getAdminBack() });
            }

            if (data.startsWith("cfg_edit_")) {
                const configId = parseInt(data.split("_")[2]);
                const config = getConfig(configId);
                setUserState(userId, "edit_title", config);
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText(`✏️ ویرایش عنوان پکیج (فعلی: ${config.title}):`, { chat_id: chatId, message_id: query.message.message_id });
            }

            if (data === "admin_charge_wallet") {
                setUserState(userId, "admin_charge_user_id");
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("🆔 آیدی عددی کاربر مورد نظر جهت شارژ کیف پول را وارد کنید:", { chat_id: chatId, message_id: query.message.message_id, ...getAdminBack() });
            }

            if (data === "admin_users_list") {
                const users = getAllUsers();
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText(`👥 کل کاربران ثبت‌نام شده در ربات: **${users.length} نفر**`, {
                    chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown", ...getAdminBack()
                });
            }

            if (data === "admin_stats") {
                const stats = getStats();
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText(`📊 آمار:\nکل کاربران: ${stats.users}\nفروش موفق: ${stats.orders}\nدر انتظار بررسی: ${stats.pending}`, {
                    chat_id: chatId, message_id: query.message.message_id, ...getAdminBack()
                });
            }

            if (data === "admin_broadcast") {
                setUserState(userId, "broadcast_text");
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("📢 متن پیام همگانی را بفرستید:", { chat_id: chatId, message_id: query.message.message_id, ...getAdminBack() });
            }

            if (data === "admin_payment_settings") {
                const card = getSetting("card_number") || "ثبت نشده";
                const holder = getSetting("card_holder") || "ثبت نشده";
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText(`💳 تنظیمات کارت فعلی:\nشماره کارت: \`${card}\`\nصاحب کارت: ${holder}`, {
                    chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "💳 ثبت شماره کارت", callback_data: "set_card" }, { text: "👤 صاحب کارت", callback_data: "set_holder" }],
                            [{ text: "🔙 مدیریت", callback_data: "menu_admin" }]
                        ]
                    }
                });
            }

            if (data === "set_card") {
                setUserState(userId, "set_card_number");
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("💳 شماره کارت جدید را ارسال کنید:", { chat_id: chatId, message_id: query.message.message_id });
            }
            if (data === "set_holder") {
                setUserState(userId, "set_card_holder");
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("👤 نام صاحب کارت جدید را ارسال کنید:", { chat_id: chatId, message_id: query.message.message_id });
            }

            // تأیید شارژ کیف پول توسط ادمین
            if (data.startsWith("wallet_approve_")) {
                const parts = data.split("_");
                const targetUserId = parseInt(parts[2]);
                const amount = parseInt(parts[3]);

                updateWallet(targetUserId, amount);
                await bot.sendMessage(targetUserId, `🎉 افزایش موجودی شما به مبلغ **${amount} تومان** تأیید شد و به کیف پولتان واریز گردید.`, { parse_mode: "Markdown" });
                bot.answerCallbackQuery(query.id, { text: "تأیید و شارژ شد." });
                return bot.editMessageCaption("✔️ شارژ کیف پول تأیید و اعمال شد.\n" + query.message.caption, { chat_id: chatId, message_id: query.message.message_id });
            }

            if (data.startsWith("wallet_reject_")) {
                const targetUserId = parseInt(data.split("_")[2]);
                await bot.sendMessage(targetUserId, "❌ متأسفانه درخواست افزایش موجودی شما رد شد.");
                bot.answerCallbackQuery(query.id, { text: "رد شد." });
                return bot.editMessageCaption("❌ درخواست شارژ کیف پول رد شد.\n" + query.message.caption, { chat_id: chatId, message_id: query.message.message_id });
            }
        }

        // بخش خرید اشتراک توسط کاربر
        if (data === "cat_all") {
            const configs = getActiveConfigs();
            if (!configs.length) {
                return bot.answerCallbackQuery(query.id, { text: "پکیج فعلی موجود نیست.", show_alert: true });
            }
            const kb = configs.map(c => [{ text: `${c.title} | ${c.volume} - ${c.price} ت`, callback_data: `buy_${c.id}` }]);
            kb.push([{ text: "🔙 منو", callback_data: "menu_home" }]);
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("پکیج مورد نظر خود را انتخاب کنید:", { chat_id: chatId, message_id: query.message.message_id, reply_markup: { inline_keyboard: kb } });
        }

        if (data.startsWith("buy_")) {
            const configId = parseInt(data.split("_")[1]);
            const config = getConfig(configId);
            const user = getUser(userId);
            const cardNum = getSetting("card_number") || "ثبت نشده";
            const cardHold = getSetting("card_holder") || "ثبت نشده";

            bot.answerCallbackQuery(query.id);
            return bot.editMessageText(`📦 پکیج: ${config.title}\nمبلغ: **${config.price} تومان**\nموجودی کیف پول شما: **${user.wallet || 0} تومان**\n\nنحوه پرداخت را انتخاب کنید:`, {
                chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "💳 پرداخت از طریق کارت به کارت (ارسال رسید)", callback_data: `pay_card_${configId}` }],
                        [{ text: "💰 پرداخت از طریق موجودی کیف پول", callback_data: `pay_wallet_${configId}` }],
                        [{ text: "❌ انصراف", callback_data: "menu_home" }]
                    ]
                }
            });
        }

        // پرداخت از طریق کیف پول مستقیم
        if (data.startsWith("pay_wallet_")) {
            const configId = parseInt(data.split("_")[2]);
            const config = getConfig(configId);
            const user = getUser(userId);

            if ((user.wallet || 0) < config.price) {
                return bot.answerCallbackQuery(query.id, { text: "موجودی کیف پول شما کافی نیست! لطفاً حساب خود را شارژ کنید.", show_alert: true });
            }

            // کسر از کیف پول و ثبت سفارش موفق
            updateWallet(userId, -config.price);
            const orderId = createOrder(userId, configId);
            updateOrderStatus(orderId, "approved");
            markConfigSold(configId);

            bot.answerCallbackQuery(query.id, { text: "پرداخت با موفقیت انجام شد!" });
            return bot.editMessageText(`🎉 خرید شما با موفقیت از طریق موجودی کیف پول انجام شد!\n\nلینک اتصال اشتراک شما:\n\`${config.config}\``, {
                chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown", ...getInlineBack()
            });
        }

        // پرداخت کارت به کارت
        if (data.startsWith("pay_card_")) {
            const configId = parseInt(data.split("_")[2]);
            const config = getConfig(configId);
            const orderId = createOrder(userId, configId);
            const cardNum = getSetting("card_number") || "ثبت نشده";
            const cardHold = getSetting("card_holder") || "ثبت نشده";

            setUserState(userId, "waiting_receipt", { orderId });
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText(`💳 کارت جهت واریز:\n\`${cardNum}\` (${cardHold})\n\nمبلغ قابل پرداخت: **${config.price} تومان**\n\nلطفاً تصویر یا متن رسید پرداخت خود را ارسال کنید:`, {
                chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown"
            });
        }

        // تأیید سفارش توسط ادمین و ارسال کانفیگ
        if (data.startsWith("approve_") && isOwner) {
            const orderId = parseInt(data.split("_")[1]);
            const order = getOrder(orderId);
            updateOrderStatus(orderId, "approved");
            markConfigSold(order.config_id);

            await bot.sendMessage(order.user_id, `🎉 خرید شما توسط مدیریت تأیید شد!\n\nلینک اتصال اشتراک:\n\`${order.config}\``, { parse_mode: "Markdown" });
            bot.answerCallbackQuery(query.id, { text: "تأیید و ارسال شد." });
            return bot.editMessageCaption("✔️ سفارش تأیید و کانفیگ برای کاربر ارسال شد.\n" + query.message.caption, { chat_id: chatId, message_id: query.message.message_id });
        }

        if (data.startsWith("reject_") && isOwner) {
            const orderId = parseInt(data.split("_")[1]);
            updateOrderStatus(orderId, "rejected");
            const order = getOrder(orderId);
            await bot.sendMessage(order.user_id, "❌ متأسفانه رسید پرداخت شما توسط مدیریت رد شد.");
            bot.answerCallbackQuery(query.id, { text: "رد شد." });
            return bot.editMessageCaption("❌ سفارش رد شد.\n" + query.message.caption, { chat_id: chatId, message_id: query.message.message_id });
        }

    } catch (e) {
        console.error(e);
    }
});

console.log("🤖 ربات با موفقیت و بدون ایراد در بخش خرید و کیف پول اجرا شد.");
