import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot("8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo", { polling: true });

// حافظه موقت برای ذخیره کاربران در حال اجرا
const usersMemory = {};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || "کاربر";
    const username = msg.from.username || "ندارد";

    // ذخیره اطلاعات کاربر در حافظه موقت
    usersMemory[userId] = {
        firstName: firstName,
        username: username,
        joinedAt: new Date().toLocaleTimeString("fa-IR")
    };

    console.log("کاربر جدید ثبت شد:", usersMemory[userId]);

    bot.sendMessage(chatId, `سلام ${firstName} عزیز! 🚀\nاطلاعات شما با موفقیت ثبت شد.\nبه ربات آرنا خوش آمدید، لطفاً گزینه مد نظر را انتخاب کنید:`, {
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
        bot.sendMessage(chatId, "🛒 بخش فروشگاه اشتراک‌ها (در قدم‌های بعدی تکمیل می‌شود)");
    } else if (data === "my_orders") {
        bot.sendMessage(chatId, "📦 شما هنوز سفارشی ثبت نکرده‌اید.");
    } else if (data === "support") {
        bot.sendMessage(chatId, "📞 پشتیبانی: @ARENAM_10");
    }
});
