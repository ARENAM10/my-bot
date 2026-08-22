import TelegramBot from 'node-telegram-bot-api';

const token = "8850301156:AAGB5ewQkolWaLg2kjKL-cL8KXDhrbNciHQ";
const ADMIN_USERNAME = "ARENAM_10"; // یوزرنام ادمین

const bot = new TelegramBot(token, { polling: true });

console.log("🔥 Clean Bot with Admin Panel is running...");

// تابع بررسی ادمین بودن
const isOwner = (msg) => {
    const username = msg.from.username;
    return username && username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
};

// دستور استارت برای همه کاربران
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || "کاربر";

    const keyboard = {
        inline_keyboard: [
            [{ text: "🛒 خرید اشتراک", callback_data: "buy" }, { text: "📞 پشتیبانی", callback_data: "support" }]
        ]
    };

    // اگر ادمین بود، دکمه پنل مدیریت را هم به منو اضافه کن
    if (isOwner(msg)) {
        keyboard.inline_keyboard.push([{ text: "🖥 پنل مدیریت", callback_data: "admin_panel" }]);
    }

    bot.sendMessage(chatId, `سلام ${firstName} عزیز! ⚡️\nبه ربات خوش آمدید.`, { reply_markup: keyboard });
});

// دستور مستقیم /admin برای ادمین
bot.onText(/\/admin/, (msg) => {
    if (!isOwner(msg)) {
        return bot.sendMessage(msg.chat.id, "❌ شما دسترسی به این بخش ندارید.");
    }
    sendAdminPanel(msg.chat.id);
});

// مدیریت کلیک دکمه‌ها
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === 'admin_panel') {
        if (!isOwner(query)) {
            return bot.answerCallbackQuery(query.id, { text: "❌ دسترسی غیرمجاز!", show_alert: true });
        }
        sendAdminPanel(chatId, true, messageId);
    } else if (data === 'main_menu') {
        bot.editMessageText("سلام! به منوی اصلی برگشتید.", {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🛒 خرید اشتراک", callback_data: "buy" }, { text: "📞 پشتیبانی", callback_data: "support" }],
                    ...(isOwner(query) ? [[{ text: "🖥 پنل مدیریت", callback_data: "admin_panel" }]] : [])
                ]
            }
        }).catch(() => {});
    }
});

// تابع ارسال پنل مدیریت
function sendAdminPanel(chatId, edit = false, messageId = null) {
    const text = "🖥 **به پنل مدیریت ربات خوش آمدید**\n\nگزینه مورد نظر را انتخاب کنید:";
    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "📊 آمار ربات", callback_data: "admin_stats" },
                { text: "📢 ارسال همگانی", callback_data: "admin_broadcast" }
            ],
            [
                { text: "🏠 بازگشت به منوی اصلی", callback_data: "main_menu" }
            ]
        ]
    };

    if (edit && messageId) {
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: replyMarkup }).catch(() => {});
    } else {
        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: replyMarkup });
    }
}
