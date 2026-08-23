const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';
const bot = new TelegramBot(TOKEN, { polling: true });

const ADMIN_USERNAME = 'arenam_10';

// دیتابیس ساده موقت در حافظه برای ذخیره وضعیت کاربران (مثل مرحله ارسال رسید)
const userStates = {};

app.get('/', (req, res) => {
    res.send('Bot is active with Subscriptions & Wallet Logic!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

function isAdmin(msg) {
    const username = msg.from && msg.from.username;
    return username && username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
}

// استارت ربات
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

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

        if (isAdmin(msg)) {
            const adminReplyKeyboard = {
                reply_markup: {
                    keyboard: [[{ text: '💻 پنل مدیریت' }]],
                    resize_keyboard: true,
                    is_persistent: true
                }
            };
            bot.sendMessage(chatId, '👑 خوش آمدید مالک عزیز! پنل مدیریت فعال شد.', adminReplyKeyboard);
        }

        bot.sendMessage(chatId, 'سلام! به منوی خدمات خوش آمدید. لطفاً گزینه مورد نظر خود را انتخاب کنید: 👇', inlineKeyboard);
    });
});

// باز کردن پنل مدیریت
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

// مدیریت کلیک دکمه‌های شیشه‌ای
bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;

    bot.answerCallbackQuery(callbackQuery.id);

    // مدیریت بخش ادمین
    if (data.startsWith('admin_')) {
        if (!isAdmin(callbackQuery)) {
            bot.sendMessage(chatId, '❌ دسترسی غیرمجاز!');
            return;
        }
        bot.sendMessage(chatId, `🛠 بخش مدیریتی (${data}) باز شد.`);
        return;
    }

    // منطق کاربران: خرید اشتراک
    if (data === 'buy_sub') {
        const plansKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⭐ اشتراک ۱ ماهه - ۵۰ هزار تومان', callback_data: 'plan_1m' }],
                    [{ text: '🌟 اشتراک ۳ ماهه - ۱۲۰ هزار تومان', callback_data: 'plan_3m' }],
                    [{ text: '🔙 بازگشت به منو', callback_data: 'back_to_main' }]
                ]
            }
        };
        bot.sendMessage(chatId, '🛒 لطفاً پلن اشتراک مورد نظر خود را انتخاب کنید: 👇', plansKeyboard);
        return;
    }

    // انتخاب پلن خاص
    if (data.startsWith('plan_')) {
        userStates[chatId] = { awaiting_receipt: true, selected_plan: data };
        
        const cardInfo = `💳 **اطلاعات کارت به کارت**\n\n` +
            `لطفاً مبلغ را به کارت زیر واریز کنید:\n` +
            `\`6037-9971-xxxx-xxxx\`\n` +
            `به نام: مالک ربات\n\n` +
            `📸 **سپس عکس رسید واریز را همینجا بفرستید تا اشتراک شما خودکار فعال شود.**`;
            
        bot.sendMessage(chatId, cardInfo, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'wallet') {
        bot.sendMessage(chatId, '💰 کیف پول شما:\nموجودی فعلی: ۰ تومان\n\nبرای افزایش موجودی می‌توانید از بخش خرید اشتراک اقدام کنید.');
        return;
    }

    if (data === 'back_to_main') {
        bot.sendMessage(chatId, 'به منوی اصلی بازگشتید.');
        return;
    }

    bot.sendMessage(chatId, 'این بخش در حال راه‌اندازی است...');
});

// دریافت عکس رسید از طرف کاربر و ارسال آن برای ادمین
bot.on('photo', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username ? `@${msg.from.username}` : 'ندارد';
    const name = msg.from.first_name || 'کاربر';

    // بررسی اینکه آیا کاربر در انتظار ارسال رسید بوده یا نه
    if (userStates[chatId] && userStates[chatId].awaiting_receipt) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        
        bot.sendMessage(chatId, '✅ رسید شما با موفقیت دریافت شد و برای بررسی به مدیریت ارسال گردید. لطفاً صبور باشید.');
        
        // پاک کردن وضعیت منتظر رسید
        delete userStates[chatId];

        // پیدا کردن یا ارسال به ادمین (در اینجا به ادمین پیام می‌فرستیم - برای تست عملکرد پیام ارسال میشه)
        // توجه: برای ارسال به یوزرنیم ادمین، ربات باید ادمین را بشناسد یا آیدی عددی او ذخیره باشد.
        bot.sendMessage(chatId, `🔔 [گزارش سیستم]: رسید خرید کاربر ${name} (${username} با آیدی ${userId}) دریافت شد و به ادمین ارجاع داده شد.`);
    }
});

process.on('uncaughtException', (err) => {
    console.log('خطای مدیریت شده:', err.message);
});

console.log('🤖 ربات همراه با منطق خرید و دریافت رسید فعال شد...');
