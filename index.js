import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAEH94AQeKKpf4-eBAgfrwsnvoIRph4--Y4";
const ADMIN_USERNAME = "ARENAM_10";

const bot = new TelegramBot(TOKEN, { polling: true });

console.log("🔥 ARENA VIP BOT IS RUNNING PERFECTLY...");

// تابع نمایش منوی اصلی
function showMainMenu(chatId, name) {
    const text = `
🔥 **ARENA VIP CONFIGS** 🔥

سلام *${name}* عزیز به ربات رسمی آرنا خوش آمدید. ⚡
با استفاده از این ربات می‌توانید کانفیگ‌های پرسرعت، اختصاصی و بدون قطعی تهیه کنید.

💰 *موجودی کیف پول:* \`0 تومان\`
    `.trim();

    bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 خرید اشتراک پرسرعت", callback_data: "buy_menu" }],
                [
                    { text: "💰 افزایش موجودی", callback_data: "wallet" },
                    { text: "📦 خریدهای من", callback_data: "my_orders" }
                ],
                [{ text: "⚡ دریافت تست رایگان", callback_data: "free_test" }],
                [
                    { text: "📞 پشتیبانی", callback_data: "support" },
                    { text: "📖 راهنمای اتصال", callback_data: "guide" }
                ]
            ]
        }
    });
}

// دستور /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || "کاربر";
    showMainMenu(chatId, name);
});

// دستور /admin
bot.onText(/\/admin/, (msg) => {
    if (msg.from.username && msg.from.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
        bot.sendMessage(msg.chat.id, "🖥 *پنل مدیریت آرنا*\n\nبه پنل ادمین خوش آمدید.", { parse_mode: "Markdown" });
    } else {
        bot.sendMessage(msg.chat.id, "❌ شما دسترسی به پنل مدیریت ندارید.");
    }
});

// مدیریت دکمه‌های شیشه‌ای (Inline Keyboards)
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === "support") {
        return bot.sendMessage(chatId, "📞 *پشتیبانی 24 ساعته:*\nبرای هرگونه سوال یا خرید به ادمین پیام دهید:\n@ARENAM_10", { parse_mode: "Markdown" });
    }
    if (data === "guide") {
        return bot.sendMessage(chatId, "📖 *راهنمای اتصال:*\nنرم‌افزار V2RayNG یا Streisand را دانلود کرده و لینک کانفیگ خریداری‌شده را داخل آن ایمپورت کنید.", { parse_mode: "Markdown" });
    }
    if (data === "wallet") {
        return bot.sendMessage(chatId, "💳 *شارژ کیف پول*\n\nبرای افزایش موجودی، به پشتیبانی (@ARENAM_10) پیام دهید تا کارت به کارت انجام شود.", { parse_mode: "Markdown" });
    }
    if (data === "my_orders") {
        return bot.sendMessage(chatId, "📦 شما تاکنون هیچ سفارشی ثبت نکرده‌اید.");
    }
    if (data === "free_test") {
        return bot.sendMessage(chatId, "⚡ هر کاربر یکبار می‌تواند تست رایگان دریافت کند. برای دریافت به پشتیبانی پیام دهید.");
    }
    if (data === "buy_menu") {
        return bot.sendMessage(chatId, "🛒 در حال حاضر کانفیگی در انبار موجود نیست. به زودی اضافه می‌شود.");
    }
});
