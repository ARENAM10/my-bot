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

// کیبورد اصلی ربات
function getMainKeyboard(userId) {
    const isOwner = userId === OWNER_ID;
    const keyboard = [
        [{ text: "💎 خرید اشتراک" }],
        [{ text: "🎁 اشتراک رایگان" }, { text: "⚡️ سرور تست" }],
        [{ text: "💰 کیف پول" }],
        [{ text: "📦 اشتراک‌های من" }, { text: "📖 آموزش اتصال" }],
        [{ text: "🤝 درخواست نمایندگی" }],
        [{ text: "👥 دعوت دوستان" }, { text: "📞 پشتیبانی" }]
    ];

    if (isOwner) {
        keyboard.unshift([{ text: "🔐 پنل مدیریت مالک" }]);
    }

    return {
        reply_markup: {
            keyboard: keyboard,
            resize_keyboard: true
        }
    };
}

// کیبورد حالت بازگشت
function getBackKeyboard() {
    return {
        reply_markup: {
            keyboard: [[{ text: "🔙 بازگشت" }]],
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
        `💎 به ربات ${STORE_NAME} خوش آمدید 💎\n\n💎 ما اینجاایم تا شما رو به اینترنت آزاد وصل کنیم:\n\n💎 @LexVipBot`,
        getMainKeyboard(userId)
    );
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!text) return;

    if (text === "🔙 بازگشت" || text === "/start") {
        delete userState[userId];
        return bot.sendMessage(chatId, "به منوی اصلی برگشتید:", getMainKeyboard(userId));
    }

    db.addUser(msg.from);

    const state = userState[userId];
    if (state) {
        // ثبت رسید پرداخت
        if (state.action === "waiting_receipt") {
            const orderId = state.orderId;
            let receiptValue = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.text;

            db.setReceipt(orderId, receiptValue);
            delete userState[userId];

            bot.sendMessage(chatId, "✅ رسید شما با موفقیت ثبت شد و برای مدیریت ارسال گردید. لطفاً منتظر تأیید بمانید.", getMainKeyboard(userId));

            const orderInfo = db.getOrder(orderId);
            const ownerMsg = `🔔 **سفارش جدید نیازمند بررسی!**\n\n` +
                `👤 کاربر: @${orderInfo.username || "ندارد"} (${orderInfo.first_name})\n` +
                `📦 اشتراک: ${orderInfo.title}\n` +
                `💰 قیمت: ${orderInfo.price} تومان\n` +
                `🆔 شماره سفارش: ${orderId}`;

            const ownerKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ تأیید و ارسال اشتراک", callback_data: `approve_${orderId}` },
                            { text: "❌ رد سفارش", callback_data: `reject_${orderId}` }
                        ]
                    ]
                }
            };

            if (msg.photo) {
                await bot.sendPhoto(OWNER_ID, receiptValue, { caption: ownerMsg, parse_mode: "Markdown", ...ownerKeyboard });
            } else {
                await bot.sendMessage(OWNER_ID, `${ownerMsg}\n\n📄 متن/رسید: ${receiptValue}`, { parse_mode: "Markdown", ...ownerKeyboard });
            }
            return;
        }

        // دریافت رزومه برای درخواست نمایندگی
        if (state.action === "waiting_agency_request") {
            if (text === "انصراف") {
                delete userState[userId];
                return bot.sendMessage(chatId, "❌ درخواست نمایندگی لغو شد.", getMainKeyboard(userId));
            }

            delete userState[userId];
            bot.sendMessage(chatId, "✅ رزومه و درخواست شما با موفقیت برای مدیریت ارسال شد.", getMainKeyboard(userId));

            const agencyMsg = `🤝 **درخواست نمایندگی جدید!**\n\n` +
                `👤 کاربر: @${msg.from.username || "ندارد"} (${msg.from.first_name})\n` +
                `🆔 آیدی عددی: \`${userId}\`\n\n` +
                `📝 **متن درخواست/رزومه:**\n${text}`;

            await bot.sendMessage(OWNER_ID, agencyMsg, { parse_mode: "Markdown" });
            return;
        }

        // بخش افزودن اشتراک توسط ادمین
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
                return bot.sendMessage(chatId, "قیمت (به تومان) را به صورت عدد وارد کنید:");
            }
            if (state.action === "add_price") {
                const price = parseInt(text);
                if (isNaN(price)) return bot.sendMessage(chatId, "❌ لطفاً فقط یک عدد معتبر برای قیمت وارد کنید.");
                state.price = price;
                state.action = "add_config_string";
                return bot.sendMessage(chatId, "لینک یا متن اشتراک (ساب) را ارسال کنید:");
            }
            if (state.action === "add_config_string") {
                state.config = text;
                state.action = "add_desc";
                return bot.sendMessage(chatId, "توضیحات تکمیلی را وارد کنید (یا ارسال کنید 'ندارد'):");
            }
            if (state.action === "add_desc") {
                state.description = text === "ندارد" ? "" : text;
                
                db.addConfig(state);
                delete userState[userId];

                return bot.sendMessage(chatId, "✅ اشتراک جدید با موفقیت اضافه شد!", getMainKeyboard(userId));
            }
        }
    }

    // مدیریت دکمه‌های منوی اصلی
    if (text === "💎 خرید اشتراک") {
        return bot.sendMessage(chatId, "💎 محصول مورد نظر را انتخاب کنید:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📋 مشاهده همه اشتراک‌های موجود", callback_data: "cat_all" }]
                ]
            }
        });
    }

    if (text === "🎁 اشتراک رایگان") {
        return bot.sendMessage(chatId, "🎁 در حال حاضر اشتراک رایگانی فعال نیست.");
    }

    if (text === "⚡️ سرور تست") {
        return bot.sendMessage(chatId, "⚡️ برای دریافت سرور تست به پشتیبانی پیام دهید.");
    }

    if (text === "💰 کیف پول") {
        const walletText = `💎 شناسه کاربری: \`${userId}\`\n` +
            `💎 موجودی شما: **0 تومان**\n` +
            `💎 تاریخ عضویت: امروز\n\n` +
            `💎 برای افزایش موجودی یا وارد کردن کد هدیه از منوی زیر استفاده کنید:`;

        return bot.sendMessage(chatId, walletText, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "💳 شارژ حساب", callback_data: "wallet_charge" }],
                    [{ text: "🎁 استفاده از کد هدیه", callback_data: "wallet_gift" }]
                ]
            }
        });
    }

    if (text === "📦 اشتراک‌های من") {
        return bot.sendMessage(chatId, "🛒 شما در حال حاضر اشتراک فعالی ندارید.");
    }

    if (text === "📖 آموزش اتصال") {
        return bot.sendMessage(chatId, "📖 برای اتصال از برنامه‌های V2rayNG برای اندروید و FoXray برای آیفون استفاده کنید.");
    }

    if (text === "🤝 درخواست نمایندگی") {
        userState[userId] = { action: "waiting_agency_request" };
        return bot.sendMessage(chatId, "📝 لطفاً توضیحات و رزومه خود را برای ثبت درخواست نمایندگی ارسال نمایید.\n\nدر صورت انصراف، کلمه «انصراف» را ارسال کنید.", getBackKeyboard());
    }

    if (text === "👥 دعوت دوستان") {
        return bot.sendMessage(chatId, "💎 سیستم رفرال در حال حاضر غیرفعال است.");
    }

    if (text === "📞 پشتیبانی") {
        return bot.sendMessage(chatId, "💎 جهت ارتباط با پشتیبانی با آیدی زیر در ارتباط باشید:\n\n💎 @ARENAM_10\n\n💎 لطفاً قبل از ارسال پیام اگر مشکلی در اتصال دارید ابتدا بخش \"آموزش اتصال\" را مطالعه کنید.");
    }

    if (text === "🔐 پنل مدیریت مالک" && userId === OWNER_ID) {
        return bot.sendMessage(chatId, "🔐 به پنل مدیریت خوش آمدید:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "➕ افزودن اشتراک جدید", callback_data: "admin_add" }],
                    [{ text: "📊 آمار فروش و کاربران", callback_data: "admin_stats" }]
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
                return bot.answerCallbackQuery(query.id, { text: "📭 در حال حاضر هیچ اشتراکی موجود نیست.", show_alert: true });
            }

            const inlineKeyboard = configs.map(c => [
                { text: `${c.title} - ${c.volume} (${c.price} تومان)`, callback_data: `buy_${c.id}` }
            ]);

            bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, "📋 لیست اشتراک‌های موجود:", {
                reply_markup: { inline_keyboard: inlineKeyboard }
            });
        }

        if (data.startsWith("buy_")) {
            const configId = parseInt(data.split("_")[1]);
            const config = db.getConfig(configId);

            if (!config || config.sold === 1) {
                return bot.answerCallbackQuery(query.id, { text: "❌ این اشتراک فروخته شده یا وجود ندارد.", show_alert: true });
            }

            const orderId = db.createOrder(userId, configId);

            const text = `📦 **جزئیات اشتراک:**\n\n` +
                `🔹 عنوان: ${config.title}\n` +
                `📂 دسته: ${config.category}\n` +
                `⚡️ مشخصات: ${config.volume}\n` +
                `⏳ مدت: ${config.duration}\n` +
                `💵 قیمت: ${config.price} تومان\n\n` +
                `💳 لطفاً مبلغ فوق را واریز کرده و تصویر رسید را همینجا ارسال کنید.`;

            bot.answerCallbackQuery(query.id);
            userState[userId] = { action: "waiting_receipt", orderId };
            return bot.sendMessage(chatId, text, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "❌ لغو سفارش", callback_data: `cancel_${orderId}` }]
                    ]
                }
            });
        }

        if (data.startsWith("approve_") && userId === OWNER_ID) {
            const orderId = parseInt(data.split("_")[1]);
            const order = db.getOrder(orderId);

            if (!order || order.status !== "pending") {
                return bot.answerCallbackQuery(query.id, { text: "این سفارش قبلاً بررسی شده است.", show_alert: true });
            }

            db.updateOrderStatus(orderId, "approved");
            db.markConfigSold(order.config_id);

            await bot.sendMessage(order.user_id, `🎉 **سفارش شما با موفقیت تأیید شد!**\n\nاشتراک اختصاصی شما:\n\`${order.config}\``, {
                parse_mode: "Markdown"
            });

            bot.answerCallbackQuery(query.id, { text: "✅ سفارش تأیید و ارسال شد." });
            return bot.editMessageCaption(`✅ **تأیید شده توسط مالک**\n\n` + query.message.caption, {
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
                await bot.sendMessage(order.user_id, "❌ متأسفانه رسید پرداخت شما رد شد.");
            }

            bot.answerCallbackQuery(query.id, { text: "❌ سفارش رد شد." });
            return bot.editMessageCaption(`❌ **رد شده توسط مالک**\n\n` + query.message.caption, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown"
            });
        }

        if (data === "wallet_charge") {
            bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, "💳 برای شارژ حساب، مبلغ مورد نظر را به کارت واریز کرده و رسید را برای پشتیبانی بفرستید.");
        }

        if (data === "wallet_gift") {
            bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, "🎁 لطفاً کد هدیه خود را ارسال کنید:");
        }

        if (data === "admin_add" && userId === OWNER_ID) {
            userState[userId] = { action: "add_title" };
            bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, "➕ عنوان اشتراک را وارد کنید:");
        }

        if (data === "admin_stats" && userId === OWNER_ID) {
            const stats = db.getStats();
            const statsText = `📊 **آمار کلی فروشگاه:**\n\n` +
                `👥 کاربران: ${stats.users}\n` +
                `📦 اشتراک‌ها: ${stats.configs}\n` +
                `🛒 سفارش‌ها: ${stats.orders}\n` +
                `💰 درآمد: ${stats.revenue} تومان`;

            bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, statsText, { parse_mode: "Markdown" });
        }

    } catch (error) {
        console.error("خطا در پردازش دکمه شیشه‌ای:", error);
    }
});

console.log("🤖 ربات کاملاً به صورت حرفه‌ای فعال شد.");

            
