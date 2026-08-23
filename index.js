const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// توکن مستقیم ربات شما
const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';

const bot = new TelegramBot(TOKEN, { polling: true });

app.get('/', (req, res) => {
    res.send('Bot is active and running with clean inline menu!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// دستور /start برای ارسال منوی شیشه‌ای و پاک کردن کیبورد قبلی پایین صفحه
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // ۱. اول یک پیام خالی با دستور حذف کیبورد پایین می‌فرستیم تا پایین صفحه کاملاً خالی بشه
    bot.sendMessage(chatId, 'در حال بارگذاری منو...', {
        reply_markup: {
            remove_keyboard: true
        }
    }).then(() => {
        // ۲. بلافاصله منوی شیشه‌ای اصلی رو ارسال می‌کنیم
        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🛒 خرید اشتراک', callback_data: 'buy_sub' }],
                    [
                        { text: '🎁 اشتراک رایگان', callback_data: 'free_sub' },
                        { text: '🧪 سرور تست', callback_data: 'test_server' }
                    ],
                    [{ text: '💰 کیف پول', callback_data: 'wallet' }],
                    [
                        { text: '📱 اشتراک‌های من', callback_data: 'my_subs' },
                        { text: '📖 آموزش اتصال', callback_data: 'tutorial' }
                    ],
                    [{ text: '🤝 درخواست نمایندگی', callback_data: 'agency' }],
                    [
                        { text: '👥 دعوت دوستان', callback_data: 'invite' },
                        { text: '📞 پشتیبانی', callback_data: 'support' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, 'سلام! به منوی خدمات خوش آمدید. لطفاً گزینه مورد نظر خود را انتخاب کنید: 👇', inlineKeyboard);
    });
});

// 📌 لیسنر مخصوص (CallbackQuery Listener) برای مدیریت کلیک روی دکمه‌های شیشه‌ای
bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;

    // پاسخ به کلیک کاربر برای متوقف کردن حالت لودینگ دکمه
    bot.answerCallbackQuery(callbackQuery.id);

    // پاسخ به هر دکمه
    switch (data) {
        case 'buy_sub':
            bot.sendMessage(chatId, '🛒 بخش خرید اشتراک: لطفاً پلن مورد نظر خود را انتخاب کنید.');
            break;
        case 'free_sub':
            bot.sendMessage(chatId, '🎁 بخش اشتراک رایگان: شرایط دریافت هدیه...');
            break;
        case 'test_server':
            bot.sendMessage(chatId, '🧪 سرور تست: تست رایگان سرعت اتصال برقرار شد.');
            break;
        case 'wallet':
            bot.sendMessage(chatId, '💰 کیف پول شما: موجودی 0 تومان.');
            break;
        case 'my_subs':
            bot.sendMessage(chatId, '📱 شما در حال حاضر اشتراک فعالی ندارید.');
            break;
        case 'tutorial':
            bot.sendMessage(chatId, '📖 آموزش اتصال به سرورها در اپلیکیشن‌های مختلف...');
            break;
        case 'agency':
            bot.sendMessage(chatId, '🤝 شرایط و درخواست نمایندگی پنل فروش...');
            break;
        case 'invite':
            bot.sendMessage(chatId, '👥 لینک دعوت اختصاصی شما: t.me/YourBot?start=ref123');
            break;
        case 'support':
            bot.sendMessage(chatId, '📞 ارتباط با پشتیبانی: لطفاً پیام خود را ارسال کنید.');
            break;
        default:
            bot.sendMessage(chatId, 'گزینه نامعتبر است.');
    }
});

// مدیریت خطاهای احتمالی
process.on('uncaughtException', (err) => {
    console.log('خطای مدیریت شده:', err.message);
});

console.log('🤖 ربات با منوی شیشه‌ای و پاکسازی کیبورد استارت شد...');
