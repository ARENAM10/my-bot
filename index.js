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

// تابع ساخت منوی شیشه‌ای درون صفحه چت
function getInlineMenu(userId) {
    const isOwner = userId === OWNER_ID;
    const keyboard = [
        [{ text: "🛒 خرید اشتراک", callback_data: "menu_buy" }],
        [{ text: "🎁 هدیه روزانه", callback_data: "menu_gift" }],
        [{ text: "🚀 تست سرعت", callback_data: "menu_speed" }],
        [{ text: "💳 حساب کاربری", callback_data: "menu_account" }],
        [{ text: "📂 اشتراک‌های من", callback_data: "menu_my_subs" }],
        [{ text: "📘 راهنمای اتصال", callback_data: "menu_guide" }],
        [{ text: "🤝 اخذ نمایندگی", callback_data: "menu_agency" }],
        [{ text: "🌐 معرفی به دوستان", callback_data: "menu_invite" }],
        [{ text: "☎️ ارتباط با پشتیبانی", callback_data: "menu_support" }]
    ];

    if (isOwner) {
        keyboard.unshift([{ text: "🔐 مدیریت ربات", callback_data: "menu_admin" }]);
    }

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

// دکمه بازگشت شیشه‌ای
function getInlineBack() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🔙 بازگشت به منو", callback_data: "menu_home" }]
            ]
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
        `✨ به پنل اختصاصی ${STORE_NAME} خوش آمدید.\n\nلطفاً از گزینه‌های زیر انتخاب کنید:`,
        getInlineMenu(userId)
    );
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!text) return;

    db.addUser(msg.from);

    const state = userState[userId];
    if (state) {
        // ثبت رسید
        if (state.action === "waiting_receipt") {
            const orderId = state.orderId;
            let receiptValue = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.text;

            db.setReceipt(orderId, receiptValue);
            delete userState[userId];

            bot.sendMessage(chatId, "✔️ رسید شما با موفقیت ثبت شد و جهت بررسی به ادمین ارسال گردید.", getInlineMenu(userId));

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
                return bot.sendMessage(chatId, "❌ درخواست نمایندگی لغو شد.", getInlineMenu(userId));
            }

            delete userState[userId];
            bot.sendMessage(chatId, "✔️ درخواست و اطلاعات شما برای مدیریت ارسال شد.", getInlineMenu(userId));

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

                return bot.sendMessage(chatId, "✔️ محصول جدید با موفقیت اضافه شد.", getInlineMenu(userId));
            }
        }
    }
});

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    try {
        // مدیریت کلیک روی دکمه‌های شیشه‌ای منو
        if (data === "menu_home") {
            delete userState[userId];
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText(`✨ به پنل اختصاصی ${STORE_NAME} خوش آمدید.\n\nلطفاً از گزینه‌های زیر انتخاب کنید:`, {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineMenu(userId)
            });
        }

        if (data === "menu_buy") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("لطفاً بخش مورد نظر را انتخاب کنید:", {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📂 مشاهده لیست اشتراک‌ها", callback_data: "cat_all" }],
                        [{ text: "🔙 بازگشت به منو", callback_data: "menu_home" }]
                    ]
                }
            });
        }

        if (data === "menu_gift") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("🎁 در حال حاضر هدیه‌ای برای دریافت وجود ندارد.", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "menu_speed") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("🚀 برای دریافت تست رایگان با پشتیبانی در ارتباط باشید.", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "menu_account") {
            const accountText = `👤 شناسه کاربری: \`${userId}\`\n` +
                `💰 موجودی کیف پول: **0 تومان**\n` +
                `📅 وضعیت حساب: عادی`;

            bot.answerCallbackQuery(query.id);
            return bot.editMessageText(accountText, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "➕ افزایش موجودی", callback_data: "wallet_charge" }],
                        [{ text: "🏷 ثبت کد تخفیف", callback_data: "wallet_gift" }],
                        [{ text: "🔙 بازگشت به منو", callback_data: "menu_home" }]
                    ]
                }
            });
        }

        if (data === "menu_my_subs") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("📌 شما در حال حاضر هیچ اشتراک فعالی ندارید.", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "menu_guide") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("📘 راهنمای استفاده:\n\nاندروید: V2rayNG\nآیفون: FoXray / Streisand\nکامپیوتر: V2rayN", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "menu_agency") {
            userState[userId] = { action: "waiting_agency_request" };
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("✍️ لطفاً توضیحات، سوابق یا درخواست خود را ارسال کنید.\n\nبرای لغو کلمه «انصراف» را بفرستید.", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "menu_invite") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("🌐 سیستم امتیازدهی و معرفی دوستان در حال حاضر غیرفعال است.", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "menu_support") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("☎️ راه ارتباط با پشتیبانی:\n\nآیدی پشتیبان: `@ARENAM_10`\n\nلطفاً پیش از ارسال پیام، راهنمای اتصال را مطالعه کنید.", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "menu_admin" && userId === OWNER_ID) {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("🔐 بخش مدیریت کل سیستم:", {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "➕ تعریف اشتراک جدید", callback_data: "admin_add" }],
                        [{ text: "📊 آمار و گزارشات", callback_data: "admin_stats" }],
                        [{ text: "🔙 بازگشت به منو", callback_data: "menu_home" }]
                    ]
                }
            });
        }

        if (data === "cat_all" || data.startsWith("cat_")) {
            const configs = db.getConfigs();
            if (configs.length === 0) {
                return bot.answerCallbackQuery(query.id, { text: "موردی یافت نشد.", show_alert: true });
            }

            const inlineKeyboard = configs.map(c => [
                { text: `${c.title} | ${c.volume} - ${c.price} تومان`, callback_data: `buy_${c.id}` }
            ]);
            inlineKeyboard.push([{ text: "🔙 بازگشت به منو", callback_data: "menu_home" }]);

            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("لیست تعرفه‌های فعال:", {
                chat_id: chatId,
                message_id: query.message.message_id,
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
            return bot.editMessageText(text, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "❌ انصراف از خرید", callback_data: "menu_home" }]
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
            return bot.editMessageText("💳 برای شارژ حساب به پشتیبانی پیام بدهید.", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "wallet_gift") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("🎁 کد هدیه خود را ارسال کنید:", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "admin_add" && userId === OWNER_ID) {
            userState[userId] = { action: "add_title" };
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("➕ عنوان محصول را وارد کنید:", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "admin_stats" && userId === OWNER_ID) {
            const stats = db.getStats();
            const statsText = `📊 **آمار سیستم:**\n\n` +
                `👥 کاربران: ${stats.users}\n` +
                `📦 کل محصولات: ${stats.configs}\n` +
                `🛒 سفارشات: ${stats.orders}\n` +
                `💰 مجموع درآمد: ${stats.revenue} تومان`;

            bot.answerCallbackQuery(query.id);
            return bot.editMessageText(statsText, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown",
                ...getInlineBack()
            });
        }

    } catch (error) {
        console.error("خطا:", error);
    }
});

console.log("🤖 ربات با منوی شیشه‌ای درون‌صفحه‌ای فعال شد.");
