{            const freeCount = db.configs.fil        const balance = db.wallets[chatId] || 0;
        if (balance < product.price) return bot.answerCallbackQuery(query.id, { text: "❌ موجودی کیف پول کافی نیست!", show_alert: true });

        db.wallets[chatId] -= product.price;
        freeConfig.sold = true;
        freeConfig.soldTo = chatId;

        bot.editMessageText(`✅ **خرید موفقیت‌آمیز بود!**\n\n\`${freeConfig.config}\``, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🏠 منوی اصلی", callback_data: "main_menu" }]] } }).catch(() => {});
    }
    else if (data === 'wallet_charge') {
        adminState[chatId] = { action: "waiting_for_receipt" };
        const s = db.settings;
        bot.editMessageText(`💰 مبلغ را به کارت زیر واریز کرده و رسید آن را ارسال کنید:\n\`${s.cardNumber}\` (${s.cardOwner})`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { import TelegramBot from 'node-telegram-bot-api';

const token = "8850301156:AAGB5ewQkolWaLg2kjKL-cL8KXDhrbNciHQ";
const ADMIN_USERNAME = "ARENAM_10";

const bot = new TelegramBot(token, { polling: true });
require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");

// ===============================
// CONFIG
// ===============================

const TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = Number(process.env.OWNER_ID);

if (!TOKEN) {
    console.error("❌ BOT_TOKEN در فایل .env تنظیم نشده!");
    process.exit(1);
}

if (!OWNER_ID) {
    console.error("❌ OWNER_ID در فایل .env تنظیم نشده!");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, {
    polling: true
});

// ===============================
// DATABASE
// ===============================

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify({
            users: {},
            configs: {},
            orders: {},
            discounts: {},
            settings: {
                cardNumber: "",
                cardName: "",
                support: "@ARENAM10"
            }
        }, null, 2)
    );
}

function loadDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch {
        return {
            users: {},
            configs: {},
            orders: {},
            discounts: {},
            settings: {
                cardNumber: "",
                cardName: "",
                support: "@ARENAM10"
            }
        };
    }
}

function saveDB(db) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(db, null, 2)
    );
}

let db = loadDB();

// ===============================
// TEMP STATES
// ===============================

const states = {};

// ===============================
// HELPERS
// ===============================

function isOwner(userId) {
    return Number(userId) === OWNER_ID;
}

function getUser(user) {
    const id = String(user.id);

    if (!db.users[id]) {
        db.users[id] = {
            id: user.id,
            username: user.username || "",
            firstName: user.first_name || "",
            joinedAt: new Date().toISOString(),
            purchases: []
        };

        saveDB(db);
    }

    return db.users[id];
}

function money(number) {
    return Number(number).toLocaleString("fa-IR");
}

function generateId(prefix = "ID") {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
}

// ===============================
// KEYBOARDS
// ===============================

function mainKeyboard() {
    return {
        keyboard: [
            ["🛒 خرید کانفیگ", "📦 کانفیگ‌های من"],
            ["💳 پرداخت", "🎁 کد تخفیف"],
            ["📞 پشتیبانی", "📋 قوانین"]
        ],
        resize_keyboard: true
    };
}

function adminKeyboard() {
    return {
        keyboard: [
            ["➕ افزودن کانفیگ", "📦 مدیریت کانفیگ‌ها"],
            ["🧾 سفارش‌ها", "👥 کاربران"],
            ["🎟 کد تخفیف", "📊 آمار"],
            ["💳 تنظیم پرداخت", "📢 پیام همگانی"],
            ["⚙️ تنظیمات", "🔙 خروج از پنل"]
        ],
        resize_keyboard: true
    };
}

// ===============================
// START
// ===============================

bot.onText(/^\/start$/, (msg) => {
    const user = getUser(msg.from);

    delete states[msg.from.id];

    bot.sendMessage(
        msg.chat.id,
        `🔥 *ARENA CONFIG*

سلام ${user.firstName || "دوست عزیز"} 👋

به ربات فروش کانفیگ آرنا خوش اومدی.

🛒 خرید سریع
📦 مشاهده خریدها
💳 پرداخت آسان
🎁 تخفیف ویژه
📞 پشتیبانی

یکی از گزینه‌های زیر رو انتخاب کن 👇`,
        {
            parse_mode: "Markdown",
            reply_markup: mainKeyboard()
        }
    );
});

// ===============================
// ADMIN PANEL
// ===============================

bot.onText(/^\/admin$/, (msg) => {

    if (!isOwner(msg.from.id)) {
        return bot.sendMessage(
            msg.chat.id,
            "⛔ دسترسی غیرمجاز."
        );
    }

    delete states[msg.from.id];

    bot.sendMessage(
        msg.chat.id,
        `👑 *پنل مدیریت ARENA*

به پنل مالک خوش آمدید.

از منوی زیر مدیریت کامل ربات را انجام دهید:`,
        {
            parse_mode: "Markdown",
            reply_markup: adminKeyboard()
        }
    );
});

// ===============================
// ADMIN CALLBACK
// ===============================

bot.on("callback_query", async (query) => {

    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (!isOwner(userId)) {
        return bot.answerCallbackQuery(
            query.id,
            {
                text: "⛔ دسترسی ندارید",
                show_alert: true
            }
        );
    }

    // ---------------------------
    // DELETE CONFIG
    // ---------------------------

    if (data.startsWith("delete_config:")) {

        const id = data.split(":")[1];

        if (!db.configs[id]) {
            return bot.answerCallbackQuery(
                query.id,
                {
                    text: "کانفیگ پیدا نشد!",
                    show_alert: true
                }
            );
        }

        delete db.configs[id];
        saveDB(db);

        await bot.answerCallbackQuery(
            query.id,
            {
                text: "✅ کانفیگ حذف شد"
            }
        );

        return bot.sendMessage(
            chatId,
            "✅ کانفیگ با موفقیت حذف شد."
        );
    }

    // ---------------------------
    // APPROVE ORDER
    // ---------------------------

    if (data.startsWith("approve:")) {

        const orderId = data.split(":")[1];
        const order = db.orders[orderId];

        if (!order) {
            return bot.answerCallbackQuery(
                query.id,
                {
                    text: "سفارش پیدا نشد!",
                    show_alert: true
                }
            );
        }

        order.status = "paid";
        order.paidAt = new Date().toISOString();

        saveDB(db);

        await bot.answerCallbackQuery(
            query.id,
            {
                text: "✅ پرداخت تأیید شد"
            }
        );

        await bot.sendMessage(
            order.userId,
            `✅ *پرداخت شما تأیید شد.*

📦 سفارش: \`${order.id}\`

🔐 کانفیگ شما:

\`${order.configValue}\`

لطفاً این اطلاعات را در اختیار دیگران قرار ندهید.`,
            {
                parse_mode: "Markdown"
            }
        );

        return;
    }

    // ---------------------------
    // REJECT ORDER
    // ---------------------------

    if (data.startsWith("reject:")) {

        const orderId = data.split(":")[1];
        const order = db.orders[orderId];

        if (!order) {
            return bot.answerCallbackQuery(
                query.id,
                {
                    text: "سفارش پیدا نشد!",
                    show_alert: true
                }
            );
        }

        order.status = "rejected";

        saveDB(db);

        await bot.answerCallbackQuery(
            query.id,
            {
                text: "❌ سفارش رد شد"
            }
        );

        await bot.sendMessage(
            order.userId,
            "❌ پرداخت شما تأیید نشد.\n\nبرای پیگیری با پشتیبانی تماس بگیرید."
        );
    }
});

// ===============================
// TEXT HANDLER
// ===============================

bot.on("message", async (msg) => {

    if (!msg.text) return;

    const text = msg.text;
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    getUser(msg.from);

    // Don't process commands
    if (text.startsWith("/")) return;

    // ===========================
    // ADMIN
    // ===========================

    if (isOwner(userId)) {

        // ADD CONFIG
        if (text === "➕ افزودن کانفیگ") {

            states[userId] = {
                action: "add_config",
                step: 1
            };

            return bot.sendMessage(
                chatId,
                `➕ *افزودن کانفیگ*

لطفاً نام کانفیگ را وارد کنید.

مثال:
\`ARENA Premium\``,
                {
                    parse_mode: "Markdown"
                }
            );
        }

        // MANAGE CONFIGS
        if (text === "📦 مدیریت کانفیگ‌ها") {

            const configs = Object.values(db.configs);

            if (!configs.length) {
                return bot.sendMessage(
                    chatId,
                    "📭 هنوز هیچ کانفیگی اضافه نشده."
                );
            }

            for (const config of configs) {

                await bot.sendMessage(
                    chatId,
                    `📦 *${config.name}*

💰 قیمت: ${money(config.price)} تومان
📊 موجودی: ${config.stock}

🔐 نوع: ${config.type}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "🗑 حذف",
                                        callback_data: `delete_config:${config.id}`
                                    }
                                ]
                            ]
                        }
                    }
                );
            }

            return;
        }

        // ORDERS
        if (text === "🧾 سفارش‌ها") {

            const orders = Object.values(db.orders);

            if (!orders.length) {
                return bot.sendMessage(
                    chatId,
                    "📭 سفارشی وجود ندارد."
                );
            }

            for (const order of orders.slice(-20).reverse()) {

                const buttons = [];

                if (order.status === "pending") {
                    buttons.push([
                        {
                            text: "✅ تأیید",
                            callback_data: `approve:${order.id}`
                        },
                        {
                            text: "❌ رد",
                            callback_data: `reject:${order.id}`
                        }
                    ]);
                }

                await bot.sendMessage(
                    chatId,
                    `🧾 *${order.id}*

👤 کاربر: ${order.userId}
📦 محصول: ${order.configName}
💰 مبلغ: ${money(order.amount)} تومان

📌 وضعیت: ${order.status}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: buttons.length
                            ? { inline_keyboard: buttons }
                            : undefined
                    }
                );
            }

            return;
        }

        // USERS
        if (text === "👥 کاربران") {

            const users = Object.values(db.users);

            return bot.sendMessage(
                chatId,
                `👥 *آمار کاربران*

تعداد کاربران:
${money(users.length)} نفر`,
                {
                    parse_mode: "Markdown"
                }
            );
        }

        // STATS
        if (text === "📊 آمار") {

            const users = Object.values(db.users);
            const orders = Object.values(db.orders);

            const paid = orders.filter(
                o => o.status === "paid"
            );

            const revenue = paid.reduce(
                (sum, o) => sum + Number(o.amount || 0),
                0
            );

            return bot.sendMessage(
                chatId,
                `📊 *آمار ربات*

👥 کاربران: ${money(users.length)}

🧾 کل سفارش‌ها: ${money(orders.length)}

✅ فروش موفق: ${money(paid.length)}

💰 درآمد:
${money(revenue)} تومان`,
                {
                    parse_mode: "Markdown"
                }
            );
        }

        // PAYMENT SETTINGS
        if (text === "💳 تنظیم پرداخت") {

            states[userId] = {
                action: "payment_settings",
                step: 1
            };

            return bot.sendMessage(
                chatId,
                `💳 *تنظیم اطلاعات پرداخت*

شماره کارت را ارسال کنید:`,
                {
                    parse_mode: "Markdown"
                }
            );
        }

        // BROADCAST
        if (text === "📢 پیام همگانی") {

            states[userId] = {
                action: "broadcast",
                step: 1
            };

            return bot.sendMessage(
                chatId,
                "📢 متن پیام همگانی را ارسال کنید."
            );
        }

        // EXIT ADMIN
        if (text === "🔙 خروج از پنل") {

            delete states[userId];

            return bot.sendMessage(
                chatId,
                "✅ از پنل مدیریت خارج شدید.",
                {
                    reply_markup: mainKeyboard()
                }
            );
        }
    }

    // ===========================
    // USER
    // ===========================

    if (text === "🛒 خرید کانفیگ") {

        const configs = Object.values(db.configs)
            .filter(c => Number(c.stock) > 0);

        if (!configs.length) {
            return bot.sendMessage(
                chatId,
                "😔 در حال حاضر کانفیگ موجود نیست."
            );
        }

        const buttons = configs.map(config => [
            {
                text: `${config.name} | ${money(config.price)} تومان`,
                callback_data: `buy:${config.id}`
            }
        ]);

        return bot.sendMessage(
            chatId,
            "🛒 *انتخاب کانفیگ*\n\nکانفیگ موردنظر خود را انتخاب کنید:",
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: buttons
                }
            }
        );
    }

    if (text === "📦 کانفیگ‌های من") {

        const user = db.users[String(userId)];

        if (!user || !user.purchases.length) {
            return bot.sendMessage(
                chatId,
                "📭 هنوز خریدی انجام نداده‌اید."
            );
        }

        let result = "📦 *کانفیگ‌های شما*\n\n";

        user.purchases.forEach((item, index) => {
            result +=
                `${index + 1}. ${item.name}\n` +
                `🔐 \`${item.configValue}\`\n\n`;
        });

        return bot.sendMessage(
            chatId,
            result,
            {
                parse_mode: "Markdown"
            }
        );
    }

    if (text === "💳 پرداخت") {

        const settings = db.settings;

        return bot.sendMessage(
            chatId,
            `💳 *اطلاعات پرداخت*

شماره کارت:

\`${settings.cardNumber || "تنظیم نشده"}\`

به نام:
${settings.cardName || "تنظیم نشده"}

بعد از پرداخت، رسید خود را برای پشتیبانی ارسال کنید.

📞 ${settings.support}`,
            {
                parse_mode: "Markdown"
            }
        );
    }

    if (text === "📞 پشتیبانی") {

        return bot.sendMessage(
            chatId,
            `📞 *پشتیبانی*

برای ارتباط با پشتیبانی:

${db.settings.support}`,
            {
                parse_mode: "Markdown"
            }
        );
    }

    if (text === "📋 قوانین") {

        return bot.sendMessage(
            chatId,
            `📋 *قوانین خرید*

1️⃣ قبل از خرید مشخصات محصول را بررسی کنید.

2️⃣ اطلاعات کانفیگ خود را در اختیار دیگران قرار ندهید.

3️⃣ پس از تأیید پرداخت، کانفیگ برای شما ارسال می‌شود.

4️⃣ در صورت بروز مشکل با پشتیبانی تماس بگیرید.`,
            {
                parse_mode: "Markdown"
            }
        );
    }

    // ===========================
    // STATE MACHINE
    // ===========================

    const state = states[userId];

    if (!state) return;

    // ADD CONFIG
    if (
        isOwner(userId) &&
        state.action === "add_config"
    ) {

        if (state.step === 1) {

            state.name = text;
            state.step = 2;

            return bot.sendMessage(
                chatId,
                "💰 قیمت کانفیگ را به تومان وارد کنید:"
            );
        }

        if (state.step === 2) {

            const price = Number(
                text.replace(/,/g, "")
            );

            if (!Number.isFinite(price)) {
                return bot.sendMessage(
                    chatId,
                    "❌ قیمت نامعتبر است."
                );
            }

            state.price = price;
            state.step = 3;

            return bot.sendMessage(
                chatId,
                "📊 موجودی اولیه را وارد کنید:"
            );
        }

        if (state.step === 3) {

            const stock = Number(text);

            if (!Number.isInteger(stock) || stock < 0) {
                return bot.sendMessage(
                    chatId,
                    "❌ موجودی نامعتبر است."
                );
            }

            state.stock = stock;
            state.step = 4;

            return bot.sendMessage(
                chatId,
                "🏷 نوع کانفیگ را وارد کنید:\n\nمثال:\nتک لوکیشن\nمولتی لوکیشن"
            );
        }

        if (state.step === 4) {

            state.type = text;
            state.step = 5;

            return bot.sendMessage(
                chatId,
                `🔐 حالا خود *کانفیگ* را ارسال کنید:

اگر موجودی چند کانفیگ متفاوت است، فعلاً هر کانفیگ را جداگانه اضافه کنید.`,
                {
                    parse_mode: "Markdown"
                }
            );
        }

        if (state.step === 5) {

            const id = generateId("CFG");

            db.configs[id] = {
                id,
                name: state.name,
                price: state.price,
                stock: state.stock,
                type: state.type,
                configValue: text,
                createdAt: new Date().toISOString()
            };

            saveDB(db);

            delete states[userId];

            return bot.sendMessage(
                chatId,
                `✅ *کانفیگ با موفقیت اضافه شد.*

📦 نام: ${state.name}
💰 قیمت: ${money(state.price)} تومان
📊 موجودی: ${state.stock}
🏷 نوع: ${state.type}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: adminKeyboard()
                }
            );
        }
    }

    // PAYMENT SETTINGS
    if (
        isOwner(userId) &&
        state.action === "payment_settings"
    ) {

        if (state.step === 1) {

            db.settings.cardNumber = text;
            state.step = 2;

            return bot.sendMessage(
                chatId,
                "👤 نام صاحب کارت را وارد کنید:"
            );
        }

        if (state.step === 2) {

            db.settings.cardName = text;
            saveDB(db);

            delete states[userId];

            return bot.sendMessage(
                chatId,
                "✅ اطلاعات پرداخت ذخیره شد.",
                {
                    reply_markup: adminKeyboard()
                }
            );
        }
    }

    // BROADCAST
    if (
        isOwner(userId) &&
        state.action === "broadcast"
    ) {

        const users = Object.values(db.users);

        let success = 0;

        for (const user of users) {

            try {
                await bot.sendMessage(
                    user.id,
                    text
                );

                success++;

            } catch (error) {
                console.log(
                    `Broadcast failed: ${user.id}`
                );
            }
        }

        delete states[userId];

        return bot.sendMessage(
            chatId,
            `📢 پیام همگانی ارسال شد.

✅ ارسال موفق: ${success}
👥 کل کاربران: ${users.length}`,
            {
                reply_markup: adminKeyboard()
            }
        );
    }
});

// ===============================
// BUY CALLBACK
// ===============================

bot.on("callback_query", async (query) => {

    const userId = query.from.id;
    const chatId = query.message.chat.id;
    const data = query.data;

    if (!data.startsWith("buy:")) return;

    const configId = data.split(":")[1];
    const config = db.configs[configId];

    if (!config) {
        return bot.answerCallbackQuery(
            query.id,
            {
                text: "❌ این محصول وجود ندارد.",
                show_alert: true
            }
        );
    }

    if (config.stock <= 0) {
        return bot.answerCallbackQuery(
            query.id,
            {
                text: "❌ موجودی تمام شده.",
                show_alert: true
            }
        );
    }

    const orderId = generateId("ORD");

    db.orders[orderId] = {
        id: orderId,
        userId,
        configId,
        configName: config.name,
        configValue: config.configValue,
        amount: config.price,
        status: "pending",
        createdAt: new Date().toISOString()
    };

    saveDB(db);

    await bot.answerCallbackQuery(
        query.id,
        {
            text: "✅ سفارش ایجاد شد"
        }
    );

    await bot.sendMessage(
        chatId,
        `🧾 *سفارش شما ایجاد شد*

📦 ${config.name}

💰 مبلغ:
${money(config.price)} تومان

🆔 شماره سفارش:
\`${orderId}\`

💳 مبلغ را به شماره کارت زیر واریز کنید:

\`${db.settings.cardNumber || "تنظیم نشده"}\`

سپس رسید پرداخت را برای پشتیبانی ارسال کنید.

📞 ${db.settings.support}`,
        {
            parse_mode: "Markdown"
        }
    );

    // اطلاع مالک
    await bot.sendMessage(
        OWNER_ID,
        `🔔 *سفارش جدید*

🧾 ${orderId}

👤 کاربر:
${query.from.username ? "@" + query.from.username : query.from.id}

📦 محصول:
${config.name}

💰 مبلغ:
${money(config.price)} تومان

برای مدیریت سفارش وارد پنل شوید:
\/admin`,
        {
            parse_mode: "Markdown"
        }
    );
});

// ===============================
// ERROR HANDLER
// ===============================

bot.on("polling_error", (error) => {
    console.error("Polling Error:", error.message);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (error) => {
    console.error("Unhandled Rejection:", error);
});

// ===============================
// START
// ===============================

console.log("🔥 ARENA CONFIG BOT IS RUNNING");
console.log(`👑 Owner ID: ${OWNER_ID}`);
// دیت
