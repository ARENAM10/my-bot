import TelegramBot from "node-telegram-bot-api";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// وب‌سرور ساده برای زنده نگه داشتن پورت در Railway
app.get("/", (req, res) => {
    res.send("Bot is running successfully!");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// توکن جدید ربات
const TOKEN = "8600945836:AAGNvMvy_gRJcBf6SXg_PEr1xAXzGXsjoSs";

// پاک کردن وب‌هوک‌های احتمالی قبلی و شروع کار با polling تمیز
const bot = new TelegramBot(TOKEN, { polling: true });

// منوی اصلی ربات
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🛒 خرید اشتراک" }],
            [{ text: "🎁 اشتراک رایگان" }, { text: "⚡️ سرور تست" }],
            [{ text: "💳 کیف پول" }],
            [{ text: "📦 اشتراک‌های من" }, { text: "📖 آموزش اتصال" }],
            [{ text: "🤝 درخواست نمایندگی" }],
            [{ text: "👥 دعوت دوستان" }, { text: "📞 پشتیبانی" }]
        ],
        resize_keyboard: true
    }
};

// دستور استارت
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || "کاربر";

    bot.sendMessage(
        chatId,
        `سلام ${firstName} عزیز! 🌹\nربات جدید با موفقیت روشن شد. لطفاً از منوی زیر گزینه مورد نظر را انتخاب کنید:`,
        mainKeyboard
    );
    console.log(`دستور استارت از طرف ${firstName} دریافت شد.`);
});

// مدیریت کلیک دکمه‌ها
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === "🛒 خرید اشتراک") {
        bot.sendMessage(chatId, "🛒 بخش خرید اشتراک به زودی فعال خواهد شد.");
    } else if (text === "📞 پشتیبانی") {
        bot.sendMessage(chatId, "📞 برای ارتباط با پشتیبانی به آیدی مدیر پیام دهید.");
    }
    // بقیه دکمه‌ها رو هم بعداً اضافه می‌کنیم
});

console.log("🤖 ربات جدید با موفقیت استارت شد...");
