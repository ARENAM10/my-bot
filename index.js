import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot("8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo", { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || "کاربر";

    bot.sendMessage(chatId, `سلام ${firstName} عزیز!\nبه ربات آرنا خوش آمدید. 🚀`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 خرید اشتراک", callback_data: "shop_catalog" }],
                [{ text: "📦 سفارش‌های من", callback_data: "my_orders" }, { text: "📞 پشتیبانی", callback_data: "support" }]
            ]
        }
    });
});

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "shop_catalog") {
        bot.sendMessage(chatId, "🛒 بخش فروشگاه اشتراک‌ها");
    } else if (data === "my_orders") {
        bot.sendMessage(chatId, "📦 سفارش‌های شما");
    } else if (data === "support") {
        bot.sendMessage(chatId, "📞 پشتیبانی: @ARENAM_10");
    }
});
