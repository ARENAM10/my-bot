import TelegramBot from "node-telegram-bot-api";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// وب‌سرور ساده برای زنده نگه داشتن پورت روی رایلوای
app.get("/", (req, res) => {
    res.send("Bot is running successfully!");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// خواندن توکن از متغیرهای محیطی رایلوای
const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
    console.error("خطا: متغیر BOT_TOKEN یافت نشد!");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// منوی اصلی ربات
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🛒 خرید اشتراک" }],
            [{ text: "📞 پشتیبانی" }]
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
        `سلام ${firstName} عزیز! 🌹\nربات جدید با موفقیت روشن شد و متصل گردید. ✅`,
        mainKeyboard
    );
});

console.log("🤖 ربات استارت شد و در حال دریافت پیام است...");
