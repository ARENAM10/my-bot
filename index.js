import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot("8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo", { polling: true });

const usersMemory = {};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || "کاربر";

    usersMemory[userId] = {
        firstName: firstName,
        joinedAt: new Date().toLocaleTimeString("fa-IR")
    };

    // ارسال پیام همراه با کیبورد ثابت در پایین صفحه (مشابه عکس)
    bot.sendMessage(chatId, `سلام ${firstName} عزیز! 🚀\nبه ربات آرنا خوش آمدید. لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`, {
        reply_markup: {
            keyboard: [
                [{ text: "🛒 خرید اشتراک" }, { text: "🎁 اشتراک رایگان" }],
                [{ text: "👛 کیف پول" }, { text: "📦 اشتراک‌های من" }],
                [{ text: "📞 پشتیبانی" }, { text: "👥 دعوت دوستان" }]
            ],
            resize_keyboard: true, // کوچک کردن دکمه‌ها برای زیبایی بیشتر
            is_persistent: true    // همیشه پایین صفحه باز بماند
        }
    });
});

// مدیریت کلیک روی دکمه‌های پایین صفحه (به صورت متنی)
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith("/")) return; // دستورات رو نادیده بگیر

    if (text === "🛒 خرید اشتراک") {
        bot.sendMessage(chatId, "🛒 بخش خرید اشتراک (در قدم‌های بعدی تکمیل می‌شود)");
    } else if (text === "🎁 اشتراک رایگان") {
        bot.sendMessage(chatId, "🎁 بخش سرور تست و اشتراک رایگان");
    } else if (text === "👛 کیف پول") {
        bot.sendMessage(chatId, "👛 موجودی کیف پول شما: 0 تومان");
    } else if (text === "📦 اشتراک‌های من") {
        bot.sendMessage(chatId, "📦 شما در حال حاضر اشتراک فعالی ندارید.");
    } else if (text === "📞 پشتیبانی") {
        bot.sendMessage(chatId, "📞 ارتباط با پشتیبانی: @ARENAM_10");
    } else if (text === "👥 دعوت دوستان") {
        bot.sendMessage(chatId, "👥 لینک دعوت اختصاصی شما (به زودی)");
    }
});
