import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import * as db from "./database.js";

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = Number(process.env.OWNER_ID);
const STORE_NAME = process.env.STORE_NAME || "ARENA CONFIG";

if (!TOKEN || !OWNER_ID) {
    console.error("خطا: توکن ربات یا آیدی مالک در فایل .env تنظیم نشده است!");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

const userState = {};

function getMainKeyboard(userId) {
    const isOwner = userId === OWNER_ID;
    const keyboard = [
        [{ text: "📦 خرید کانفیگ" }, { text: "🛒 سفارش‌های من" }],
        [{ text: "⚙️ راهنما و پشتیبانی" }]
    ];

    if (isOwner) {
        keyboard.push([{ text: "🔐 پنل مدیریت مالک" }]);
    }

    return {
        reply_markup: {
            keyboard: keyboard,
            resize_keyboard: true
        }
    };
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    db.addUser(user);

    bot.sendMessage(
        chatId,
        `سلام ${user.first_name || "عزیز"}! به فروشگاه ${STORE_NAME} خوش آمدید. 🚀\nاز منوی زیر می‌توانید کانفیگ مورد نظر خود را انتخاب کنید:`,
        getMainKeyboard(user.id)
    );
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!text || text.startsWith("/")) return;

    db.addUser(msg.from);

    const state = userState[userId];
    if (state) {
        if (state.action === "waiting_receipt") {
            const orderId = state.orderId;
            let receiptValue = "";

            if (msg.photo) {
                receiptValue = msg.photo[msg.photo.length - 1].file_id;
            } else if (msg.text) {
                receiptValue = msg.text;
            }

            db.setReceipt(orderId, receiptValue);
            delete userState[userId];

            bot.sendMessage(chatId, "✅ رسید شما با موفقیت ثبت شد و برای مالک ارسال گردید. لطفاً منتظر تأیید بمانید.", getMainKeyboard(userId));

            const orderInfo = db.getOrder(orderId);
            const ownerMsg = `🔔 **سفارش جدید نیازمند بررسی!**\n\n` +
                `👤 کاربر: @${orderInfo.username || "ندارد"} (${orderInfo.first_name})\n` +
                `📦 کانفیگ: ${orderInfo.title}\n` +
                `💰 قیمت: ${orderInfo.price} تومان\n` +
                `🆔 شماره سفارش: ${orderId}`;

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
                await bot.sendMessage(OWNER_ID, `${ownerMsg}\n\n📄 متن/رسید: ${receiptValue}`, { parse_mode: "Markdown", ...ownerKeyboard });
            }
            return;
        }

        if (userId === OWNER_ID) {
            if (state.action === "add_title") {
                state.title = text;
                state.action = "add_category";
                return bot.sendMessage(chatId, "دسته‌بندی کانفیگ را وارد کنید (مثلا: V2Ray, OpenVPN):");
            }
            if (state.action === "add_category") {
                state.category = text;
                state.action = "add_volume";
                return bot.sendMessage(chatId, "حجم کانفیگ را وارد کنید (مثلا: 50GB):");
            }
            if (state.action === "add_volume") {
                state.volume = text;
                state.action = "add_duration";
                return bot.sendMessage(chatId, "مدت زمان اعتبار را وارد کنید (مثلا: 30 روزه):");
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
                return bot.sendMessage(chatId, "لینک یا متن اصلی کانفیگ را ارسال کنید:");
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

                return bot.sendMessage(chatId, "✅ کانفیگ جدید با موفقیت به دیتابیس اضافه شد!", getMainKeyboard(userId));
            }
        }
    }

    if (text === "📦 خرید کانفیگ") {
        const configs = db.getConfigs();
        if (configs.length === 0) {
            return bot.sendMessage(chatId, "📭 در حال حاضر هیچ کانفیگ فعالی موجود نیست.");
        }

        const inlineKeyboard = configs.map(c => [
            { text: `${c.title} - ${c.volume} (${c.price} تومان)`, callback_data: `buy_${c.id}` }
        ]);

        return bot.sendMessage(chatId, "📋 لیست کانفیگ‌های موجود رو از زیر انتخاب کنید:", {
            reply_markup: { inline_keyboard: inlineKeyboard }
        });
    }

    if (text === "⚙️ راهنما و پشتیبانی") {
        return bot.sendMessage(chatId, "💬 برای راهنمایی یا پشتیبانی می‌توانید با مالک فروشگاه در ارتباط باشید.");
    }

    if (text === "🔐 پنل مدیریت مالک" && userId === OWNER_ID) {
        return bot.sendMessage(chatId, "🔐 به پنل مدیریت خوش آمدید:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "➕ افزودن کانفیگ", callback_data: "admin_add" }, { text: "🗑 حذف کانفیگ", callback_data: "admin_delete_list" }],
                    [{ text: "📊 آمار فروش و اطلاعات", callback_data: "admin_stats" }, { text: "📢 پیام همگانی", callback_data: "admin_broadcast" }]
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
        if (data.startsWith("buy_")) {
            const configId = parseInt(data.split("_")[1]);
            const config = db.getConfig(configId);

            if (!config || config.sold === 1) {
                return bot.answerCallbackQuery(query.id, { text: "❌ این کانفیگ قبلاً فروخته شده یا وجود ندارد.", show_alert: true });
            }

            const orderId = db.createOrder(userId, configId);

            const text = `📦 **جزئیات کانفیگ:**\n\n` +
                `🔹 عنوان: ${config.title}\n` +
                `📂 دسته: ${config.category}\n` +
                `⚡️ حجم: ${config.volume}\n` +
                `⏳ مدت: ${config.duration}\n` +
                `💵 قیمت: ${config.price} تومان\n` +
                `📝 توضیحات: ${config.description || "ندارد"}\n\n` +
                `💳 لطفاً مبلغ فوق را به کارت فروشگاه واریز کرده و تصویر رسید یا کد پیگیری را همینجا ارسال کنید.`;

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

        if (data.startsWith("cancel_")) {
            const orderId = parseInt(data.split("_")[1]);
            db.updateOrderStatus(orderId, "cancelled");
            bot.answerCallbackQuery(query.id, { text: "❌ سفارش لغو شد." });
            return bot.editMessageText("❌ این سفارش لغو گردید.", {
                chat_id: chatId,
                message_id: query.message.message_id
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

            await bot.sendMessage(order.user_id, `🎉 **سفارش شما با موفقیت تأیید شد!**\n\nلینک/کانفیگ اختصاصی شما:\n\`${order.config}\``, {
                parse_mode: "Markdown"
            });

            bot.answerCallbackQuery(query.id, { text: "✅ سفارش تأیید و کانفیگ برای کاربر ارسال شد." });
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
                await bot.sendMessage(order.user_id, "❌ متأسفانه رسید پرداخت شما توسط مالک رد شد. در صورت وجود مشکل با پشتیبانی در ارتباط باشید.");
            }

            bot.answerCallbackQuery(query.id, { text: "❌ سفارش رد شد." });
            return bot.editMessageCaption(`❌ **رد شده توسط مالک**\n\n` + query.message.caption, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown"
            });
        }

        if (data === "admin_add" && userId === OWNER_ID) {
            userState[userId] = { action: "add_title" };
            bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, "➕ عنوان کانفیگ را وارد کنید:");
        }

        if (data === "admin_stats" && userId === OWNER_ID) {
            const stats = db.getStats();
            const statsText = `📊 **آمار کلی فروشگاه:**\n\n` +
                `👥 تعداد کل کاربران: ${stats.users}\n` +
                `📦 کانفیگ‌های فعال: ${stats.configs}\n` +
                `🛒 کل سفارش‌ها: ${stats.orders}\n` +
                `✅ سفارش‌های موفق: ${stats.completed}\n` +
                `💰 درآمد کل: ${stats.revenue} تومان`;

            bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, statsText, { parse_mode: "Markdown" });
        }

    } catch (error) {
        console.error("خطا در پردازش دکمه شیشه‌ای:", error);
    }
});

process.on("uncaughtException", (err) => {
    console.error("خطای پیش‌بینی نشده (Uncaught Exception):", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("خطای مدیریت نشده در پرامیس:", reason);
});

console.log("🤖 ربات فروشگاه کانفیگ آرنا با موفقیت فعال شد.");
