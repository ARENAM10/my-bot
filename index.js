import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import * as db from "./database.js";

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = Number(process.env.OWNER_ID);
const STORE_NAME = process.env.STORE_NAME || "LEX VIP";

if (!TOKEN || !OWNER_ID) {
    console.error("خطا: توکن ربات یا آیدی مالک در فایل .env تنظیم نشده است!");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

const userState = {};

// منوی اصلی با استایل و ایموجی‌های جدید
function getMainKeyboard(userId) {
    const isOwner = userId === OWNER_ID;
    const keyboard = [
        [{ text: "🛒 خرید اشتراک" }],
        [{ text: "🎁 هدیه روزانه" }, { text: "🚀 تست سرعت" }],
        [{ text: "💳 حساب کاربری" }],
        [{ text: "📂 اشتراک‌های من" }, { text: "📘 راهنمای اتصال" }],
        [{ text: "🤝 اخذ نمایندگی" }],
        [{ text: "🌐 معرفی به دوستان" }, { text: "☎️ ارتباط با پشتیبانی" }]
    ];

    if (isOwner) {
        keyboard.unshift([{ text: "🔐 مدیریت ربات" }]);
    }

    return {
        reply_markup: {
            keyboard: keyboard,
            resize_keyboard: true
        }
    };
}

// کیبورد بازگشت
function getBackKeyboard() {
    return {
        reply_markup: {
            keyboard: [[{ text: "🔙 بازگشت به منو" }]],
            resize_keyboard: true
        }
    };
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = msg.from;

    delete userState[userId];
    db.addUser(user);

    bot.sendMessage(
        chatId,
        `✨ به پنل اختصاصی ${STORE_NAME} خوش آمدید.\n\nلطفاً از منوی زیر گزینه مورد نظر خود را انتخاب کنید:`,
        getMainKeyboard(userId)
    );
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!text) return;

    if (text === "🔙 بازگشت به منو" || text === "/start") {
        delete userState[userId];
        return bot.sendMessage(chatId, "شما به منوی اصلی بازگشتید:", getMainKeyboard(userId));
    }

    db.addUser(msg.from);

    const state = userState[userId];
    if (state) {
        // ثبت رسید
        if (state.action === "waiting_receipt") {
            const orderId = state.orderId;
            let receiptValue = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.text;

            db.setReceipt(orderId, receiptValue);
            delete userState[userId];

            bot.sendMessage(chatId, "✔️ رسید شما با موفقیت ثبت شد و جهت بررسی به ادمین ارسال گردید.", getMainKeyboard(userId));

            const orderInfo = db.getOrder(orderId);
            const ownerMsg = `🔔 **سفارش جدید ثبت شد!**\n\n` +
                `👤 کاربر: @${orderInfo.username || "ندارد"} (${orderInfo.first_name})\n` +
                `📦 محصول: ${orderInfo.title}\n` +
                `💵 مبلغ: ${orderInfo.price} تومان\n` +
                `📌 شناسه سفارش: ${orderId}`;

            const ownerKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ تأیید و ارسال", callback_data: `approve_${orderId}` },
                            { text: "❌ رد سفارش", callback_data: `reject_${orderId}` }
                        ]
                    ]
                }
            };

            if (msg.photo) {
                await bot.sendPhoto(OWNER_ID, receiptValue, { caption: ownerMsg, parse_mode: "Markdown", ...ownerKeyboard });
            } else {
                await bot.sendMessage(OWNER_ID, `${ownerMsg}\n\n📄 جزئیات: ${receiptValue}`, { parse_mode: "Markdown", ...ownerKeyboard });
            }
            return;
        }

        // درخواست نمایندگی
        if (state.action === "waiting_agency_request") {
            if (text === "انصراف") {
                delete userState[userId];
                return bot.sendMessage(chatId, "❌ درخواست نمایندگی لغو شد.", getMainKeyboard(userId));
            }

            delete userState[userId];
            bot.sendMessage(chatId, "✔️ درخواست و اطلاعات شما برای مدیریت ارسال شد.", getMainKeyboard(userId));

            const agencyMsg = `🤝 **درخواست نمایندگی جدید:**\n\n` +
                `👤 کاربر: @${msg.from.username || "ندارد"} (${msg.from.first_name})\n` +
                `🆔 شناسه: \`${userId}\`\n\n` +
                `📝 **متن ارسالی:**\n${text}`;

            await bot.sendMessage(OWNER_ID, agencyMsg, { parse_mode: "Markdown" });
            return;
        }

        // بخش ادمین برای افزودن اشتراک
        if (userId === OWNER_ID) {
            if (state.action === "add_title") {
                state.title = text;
                state.action = "add_category";
                return bot.sendMessage(chatId, "دسته‌بندی اشتراک را وارد کنید:");
            }
            if (state.action === "add_category") {
                state.category = text;
                state.action = "add_volume";
                return bot.sendMessage(chatId, "حجم یا تعداد کاربر را وارد کنید:");
            }
            if (state.action === "add_volume") {
                state.volume = text;
                state.action = "add_duration";
                return bot.sendMessage(chatId, "مدت زمان اعتبار را وارد کنید:");
            }
            if (state.action === "add_duration") {
                state.duration = text;
                state.action = "add_price";
                return bot.sendMessage(chatId, "مبلغ (به تومان) را وارد کنید:");
            }
            if (state.action === "add_price") {
                const price = parseInt(text);
                if (isNaN(price)) return bot.sendMessage(chatId, "❌ لطفاً فقط یک عدد معتبر وارد کنید.");
                state.price = price;
                state.action = "add_config_string";
                return bot.sendMessage(chatId, "لینک یا کانفیگ اتصال را ارسال کنید:");
            }
            if (state.action === "add_config_string") {
                state.config = text;
                state.action = "add_desc";
                return bot.sendMessage(chatId, "توضیحات تکمیلی را وارد کنید (یا کلمه 'ندارد' را بفرستید):");
            }
            if (state.action === "add_desc") {
                state.description = text === "ندارد" ? "" : text;
                
                db.addConfig(state);
                delete userState[userId];

                return bot.sendMessage(chatId, "✔️ محصول جدید با موفقیت اضافه شد.", getMainKeyboard(userId));
            }
        }
    }

    // پاسخ‌های منو با استایل جدید
    if (text === "🛒 خرید اشتراک") {
        return bot.sendMessage(chatId, "لطفاً بخش مورد نظر را انتخاب کنید:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📂 مشاهده لیست اشتراک‌ها", callback_data: "cat_all" }]
                ]
            }
        });
    }

    if (text === "🎁 هدیه روزانه") {
        return bot.sendMessage(chatId, "🎁 در حال حاضر هدیه‌ای برای دریافت وجود ندارد.");
    }

    if (text === "🚀 تست سرعت") {
        return bot.sendMessage(chatId, "🚀 برای دریافت تست رایگان با پشتیبانی در ارتباط باشید.");
    }

    if (text === "💳 حساب کاربری") {
        const accountText = `👤 شناسه کاربری: \`${userId}\`\n` +
            `💰 موجودی کیف پول: **0 تومان**\n` +
            `📅 وضعیت حساب: عادی`;

        return bot.sendMessage(chatId, accountText, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "➕ افزایش موجودی", callback_data: "wallet_charge" }],
                    [{ text: "🏷 ثبت کد تخفیف", callback_data: "wallet_gift" }]
                ]
            }
        });
    }

    if (text === "📂 اشتراک‌های من") {
        return bot.sendMessage(chatId, "📌 شما در حال حاضر هیچ اشتراک فعالی ندارید.");
    }

    if (text === "📘 راهنمای اتصال") {
        return bot.sendMessage(chatId, "📘 راهنمای استفاده:\n\nاندروید: V2rayNG\nآیفون: FoXray / Streisand\nکامپیوتر: V2rayN");
    }

    if (text === "🤝 اخذ نمایندگی") {
        userState[userId] = { action: "waiting_agency_request" };
        return bot.sendMessage(chatId, "✍️ لطفاً توضیحات، سوابق یا درخواست خود را ارسال کنید.\n\nبرای لغو کلمه «انصراف» را بفرستید.", getBackKeyboard());
    }

    if (text === "🌐 معرفی به دوستان") {
        return bot.sendMessage(chatId, "🌐 سیستم امتیازدهی و معرفی دوستان در حال حاضر غیرفعال است.");
    }

    if (text === "☎️ ارتباط با پشتیبانی") {
        return bot.sendMessage(chatId, "☎️ راه ارتباط با پشتیبانی:\n\nآیدی پشتیبان: `@ARENAM_10`\n\nلطفاً پیش از ارسال پیام، راهنمای اتصال را مطالعه کنید.");
    }

    if (text === "🔐 مدیریت ربات" && userId === OWNER_ID) {
        return bot.sendMessage(chatId, "🔐 بخش مدیریت کل سیستم:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "➕ تعریف اشتراک جدید", callback_data: "admin_add" }],
                    [{ text: "📊 آمار و گزارشات", callback_data: "admin_stats" }]
                ]
            }
        });
    }
});

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    try {
        if (data === "cat_all" || data.startsWith("cat_")) {
            const configs = db.getConfigs();
            if (configs.length === 0) {
                return bot.answerCallbackQuery(query.id, { text: "موردی یافت نشد.", show_alert: true });
            }

            const inlineKeyboard = configs.map(c => [
                { text: `${c.title} | ${c.volume} - ${c.price} تومان`, callback_data: `buy_${c.id}` }
            ]);

            bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, "لیست تعرفه‌های فعال:", {
                reply_markup: { inline_keyboard: inlineKeyboard }
            });
        }

        if (data.startsWith("buy_")) {
            const configId = parseInt(data.split("_")[1]);
            const config = db.getConfig(configId);

            if (!config || config.sold === 1) {
                return bot.answerCallbackQuery(query.id, { text: "این مورد ناموجود یا فروخته شده است.", show_alert: true });
            }

            const orderId = db.createOrder(userId, configId);

            const text = `📦 **جزئیات سفارش:**\n\n` +
                `🔹 عنوان: ${config.title}\n` +
                `📂 دسته: ${config.category}\n` +
                `⚡️ حجم: ${config.volume}\n` +
                `⏳ مدت: ${config.duration}\n` +
                `💳 مبلغ قابل پرداخت: ${config.price} تومان\n\n` +
                `لطفاً هزینه را واریز کرده و تصویر فیش یا متن رسید را ارسال کنید.`;

            bot.answerCallbackQuery(query.id);
            userState[userId] = { action: "waiting_receipt", orderId };
            return bot.sendMessage(chatId, text, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "❌ انصراف از خرید", callback_data: `cancel_${orderId}` }]
                    ]
                }
            });
        }

        if (data.startsWith("approve_") && userId === OWNER_ID) {
            const orderId = parseInt(data.split("_")[1]);
            const order = db.getOrder(orderId);

            if (!order || order.status !== "pending") {
                return bot.answerCallbackQuery(query.id, { text: "قبلاً پردازش شده است.", show_alert: true });
            }

            db.updateOrderStatus(orderId, "approved");
            db.markConfigSold(order.config_id);

            await bot.sendMessage(order.user_id, `🎉 **سفارش شما تأیید شد!**\n\nاطلاعات اتصال شما:\n\`${order.config}\``, {
                parse_mode: "Markdown"
            });

            bot.answerCallbackQuery(query.id, { text: "انجام شد." });
            return bot.editMessageCaption(`✔️ **تأیید شده توسط ادمین**\n\n` + query.message.caption, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown"
            });
        }

        if (data.startsWith("reject_") && userId === OWNER_ID) {
            const orderId = parseInt(data.split("_")[1]);
            db.updateOrderStatus(orderId, "rejected");

            const order = db.getOrder(orderId);
            if (order) {
                await bot.sendMessage(order.user_id, "❌ متأسفانه رسید پرداختی شما رد شد.");
            }

            bot.answerCallbackQuery(query.id, { text: "رد شد." });
            return bot.editMessageCaption(`❌ **رد شده توسط ادمین**\n\n` + query.message.caption, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown"
            });
        }

        if (data === "wallet_charge") {
            bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, "💳 برای شارژ حساب به پشتیبانی پیام بدهید.");
        }

        if (data === "wallet_gift") {
            bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, "🎁 کد هدیه خود را ارسال کنید:");
        }

        if (data === "admin_add" && userId === OWNER_ID) {
            userState[userId] = { action: "add_title" };
            bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, "➕ عنوان محصول را وارد کنید:");
        }

        if (data === "admin_stats" && userId === OWNER_ID) {
            const stats = db.getStats();
            const statsText = `📊 **آمار سیستم:**\n\n` +
                `👥 کاربران: ${stats.users}\n` +
                `📦 کل محصولات: ${stats.configs}\n` +
                `🛒 سفارشات: ${stats.orders}\n` +
                `💰 مجموع درآمد: ${stats.revenue} تومان`;

            bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, statsText, { parse_mode: "Markdown" });
        }

    } catch (error) {
        console.error("خطا:", error);
    }
});

console.log("🤖 ربات با ظاهر و ساختار جدید با موفقیت روشن شد.");
