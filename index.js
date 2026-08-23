const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// توکن مستقیم ربات شما
const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';
const bot = new TelegramBot(TOKEN, { polling: true });

// یوزرنیم مالک ربات (بدون @ یا با @)
const ADMIN_USERNAME = 'arenam_10';

app.get('/', (req, res) => {
    res.send('Bot is active and running with Full Admin Panel!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// تابع کمکی برای بررسی اینکه آیا کاربر ادمین است یا خیر
function isAdmin(msg) {
    const username = msg.from && msg.from.username;
    return username && username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
}

// منوی اصلی کاربران (شیشه‌ای) همراه با دکمه پنل مدیریت برای مالک
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // پاک کردن کیبورد قبلی و ارسال منوی اصلی
    bot.sendMessage(chatId, 'در حال بارگذاری منو...', {
        reply_markup: { remove_keyboard: true }
    }).then(() => {
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

        // اگر کاربر مالک بود، کیبورد پایین صفحه (دکمه پنل مدیریت) را هم برایش فعال می‌کنیم
        if (isAdmin(msg)) {
            const adminReplyKeyboard = {
                reply_markup: {
                    keyboard: [
                        [{ text: '💻 پنل مدیریت' }]
                    ],
                    resize_keyboard: true,
                    is_persistent: true
                }
            };
            bot.sendMessage(chatId, '👑 خوش آمدید مالک عزیز! دکمه پنل مدیریت در پایین صفحه فعال شد.', adminReplyKeyboard);
        }

        bot.sendMessage(chatId, 'سلام! به منوی خدمات خوش آمدید. لطفاً گزینه مورد نظر خود را انتخاب کنید: 👇', inlineKeyboard);
    });
});

// باز کردن پنل مدیریت با زدن دکمه شیشه‌ای یا کیبورد پایین یا دستور /panel
bot.onText(/💻 پنل مدیریت|\/panel/, (msg) => {
    const chatId = msg.chat.id;

    if (!isAdmin(msg)) {
        bot.sendMessage(chatId, '❌ شما دسترسی به این بخش ندارید.');
        return;
    }

    sendAdminPanel(chatId);
});

function sendAdminPanel(chatId) {
    const adminKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🛒 مدیریت اشتراک', callback_data: 'admin_manage_sub' },
                    { text: '📦 سوابق اشتراک‌ها', callback_data: 'admin_history' }
                ],
                [
                    { text: '💰 شارژ کیف پول', callback_data: 'admin_charge_wallet' },
                    { text: '📋 رسیدها', callback_data: 'admin_receipts' }
                ],
                [
                    { text: '📊 آمار', callback_data: 'admin_stats' },
                    { text: '👥 کاربران', callback_data: 'admin_users' }
                ],
                [
                    { text: '💳 تنظیمات پرداخت', callback_data: 'admin_pay_settings' },
                    { text: '💬 پیام مشتریان', callback_data: 'admin_user_messages' }
                ],
                [
                    { text: '🔒 عضویت اجباری', callback_data: 'admin_force_join' },
                    { text: '📢 ارسال همگانی', callback_data: 'admin_broadcast' }
                ],
                [
                    { text: '🗑 حذف پیام', callback_data: 'admin_delete_msg' },
                    { text: '📌 سنجاق پیام', callback_data: 'admin_pin_msg' }
                ],
                [{ text: '👤 گزینه‌های مشتریان', callback_data: 'admin_customer_options' }],
                [
                    { text: '🔄 استارت مالک', callback_data: 'admin_owner_start' },
                    { text: '🎛 گزینه‌های اصلی', callback_data: 'admin_main_options' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, '⚙️ **پنل مدیریت کل ربات**\nگزینه موردنظر را انتخاب کنید:', {
        parse_mode: 'Markdown',
        ...adminKeyboard
    });
}

// لیسنر کلیک روی دکمه‌های شیشه‌ای
bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;

    bot.answerCallbackQuery(callbackQuery.id);

    // مدیریت کلیک‌های بخش ادمین
    if (data.startsWith('admin_')) {
        if (!isAdmin(callbackQuery)) {
            bot.sendMessage(chatId, '❌ خطا: دسترسی غیرمجاز!');
            return;
        }

        switch (data) {
            case 'admin_manage_sub':
                bot.sendMessage(chatId, '🛒 بخش مدیریت اشتراک‌ها باز شد.');
                break;
            case 'admin_history':
                bot.sendMessage(chatId, '📦 سوابق کل اشتراک‌های ثبت شده...');
                break;
            case 'admin_charge_wallet':
                bot.sendMessage(chatId, '💰 شارژ دستی کیف پول کاربران...');
                break;
            case 'admin_receipts':
                bot.sendMessage(chatId, '📋 لیست رسیدهای ارسالی کاربران...');
                break;
            case 'admin_stats':
                bot.sendMessage(chatId, '📊 آمار ربات:\n- تعداد کل کاربران: 1 نفر\n- وضعیت سرور: فعال و پایدار ✅');
                break;
            case 'admin_users':
                bot.sendMessage(chatId, '👥 مدیریت لیست کاربران...');
                break;
            case 'admin_pay_settings':
                bot.sendMessage(chatId, '💳 تنظیمات درگاه و شماره کارت...');
                break;
            case 'admin_user_messages':
                bot.sendMessage(chatId, '💬 پیام‌های دریافتی از مشتریان...');
                break;
            case 'admin_force_join':
                bot.sendMessage(chatId, '🔒 تنظیمات کانال‌های عضویت اجباری...');
                break;
            case 'admin_broadcast':
                bot.sendMessage(chatId, '📢 برای ارسال پیام همگانی، متن خود را بفرستید.');
                break;
            case 'admin_delete_msg':
                bot.sendMessage(chatId, '🗑 ابزار حذف پیام...');
                break;
            case 'admin_pin_msg':
                bot.sendMessage(chatId, '📌 ابزار سنجاق کردن پیام...');
                break;
            case 'admin_customer_options':
                bot.sendMessage(chatId, '👤 تنظیمات بخش مشتریان...');
                break;
            case 'admin_owner_start':
                bot.sendMessage(chatId, '🔄 ریستارت و به‌روزرسانی پنل مالک...');
                break;
            case 'admin_main_options':
                bot.sendMessage(chatId, '🎛 گزینه‌های اصلی ربات...');
                break;
            default:
                bot.sendMessage(chatId, 'گزینه مدیریتی انتخاب شد.');
        }
        return;
    }

    // دکمه‌های کاربران عادی
    switch (data) {
        case 'buy_sub':
            bot.sendMessage(chatId, '🛒 بخش خرید اشتراک: لطفاً پلن مورد نظر خود را انتخاب کنید.');
            break;
        case 'free_sub':
            bot.sendMessage(chatId, '🎁 بخش اشتراک رایگان...');
            break;
        case 'test_server':
            bot.sendMessage(chatId, '🧪 سرور تست رایگان برقرار شد.');
            break;
        case 'wallet':
            bot.sendMessage(chatId, '💰 کیف پول شما: موجودی 0 تومان.');
            break;
        case 'my_subs':
            bot.sendMessage(chatId, '📱 اشتراک‌های فعال شما: هیچ اشتراکی ندارید.');
            break;
        case 'tutorial':
            bot.sendMessage(chatId, '📖 آموزش اتصال به کانفیگ‌ها...');
            break;
        case 'agency':
            bot.sendMessage(chatId, '🤝 شرایط درخواست نمایندگی...');
            break;
        case 'invite':
            bot.sendMessage(chatId, '👥 لینک دعوت شما...');
            break;
        case 'support':
            bot.sendMessage(chatId, '📞 ارتباط با پشتیبانی...');
            break;
        default:
            bot.sendMessage(chatId, 'گزینه نامعتبر است.');
    }
});

process.on('uncaughtException', (err) => {
    console.log('خطای مدیریت شده:', err.message);
});

console.log('🤖 ربات با پنل کامل ادمین و تشخیص خودکار مالک استارت شد...');
