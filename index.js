import TelegramBot from "node-telegram-bot-api";

const TOKEN = "8850301156:AAHfNQeFI2tWfBQg_PZTzuvoW-R5TGPe4mo";
const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `🔥 سلام ${msg.from.first_name}\nبه ربات آرنا خوش آمدید.`);
});

console.log("🚀 Bot is running...");


// ================= ADMIN CONFIG MANAGEMENT & STATES =================

const adminState = {};

bot.on("callback_query", async query => {
    const chatId = query.message.chat.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    // افزودن کانفیگ
    if (data === "add_config") {
        if (!isAdmin(query.from)) return;

        adminState[chatId] = { step: "name" };

        return bot.sendMessage(
            chatId,
            `
➕ افزودن کانفیگ جدید

نام محصول را ارسال کن:

مثال:
کانفیگ پرسرعت 30 روزه
`
        );
    }

    // موجودی انبار
    if (data === "stock") {
        if (!isAdmin(query.from)) return;

        db.all(
            `SELECT * FROM configs`,
            [],
            (err, rows) => {
                let free = 0;
                let sold = 0;

                rows.forEach(c => {
                    if (c.sold) sold++;
                    else free++;
                });

                bot.sendMessage(
                    chatId,
                    `
📦 انبار ARENA

🟢 آزاد:
${free}

🔴 فروخته شده:
${sold}

📦 کل:
${rows.length}
`
                );
            }
        );
    }

    // پشتیبانی
    if (data === "support") {
        bot.sendMessage(chatId, "📞 برای ارتباط با پشتیبانی به ادمین پیام دهید:\n@ARENAM_10");
    }
});

// ================= ERROR HANDLER =================

bot.on(
    "polling_error",
    err => {
        console.log("BOT ERROR:", err.message);
    }
);

console.log("🚀 ARENA CONFIG V2 READY");
