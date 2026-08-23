const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';
const bot = new TelegramBot(TOKEN, { polling: true });

const ADMIN_USERNAME = 'arenam_10';
const ADMIN_CHAT_ID = 8923324852;

// دیتابیس‌های موقت در حافظه ربات
const userStates = {};       // ذخیره وضعیت موقت کاربران (مثل انتظار برای رسید)
const userSubscriptions = {}; // ذخیره اطلاعات اشتراک فعال کاربران { chatId: { planName, expiryDate } }

app.get('/', (req, res) => {
    res.send('Bot is active with Subscriptions Management!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

function isAdmin(msg) {
    const chatId = msg.chat.id;
    const username = msg.from && msg.from.username;
    return chatId === ADMIN_CHAT_ID || (username && username.toLowerCase() === ADMIN_USERNAME.toLowerCase());
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

    // تایید یا رد رسید از طرف ادمین (همراه با فعالسازی واقعی اشتراک)
    if (data.startsWith('approve_') || data.startsWith('reject_')) {
        if (!isAdmin(callbackQuery)) {
            bot.sendMessage(chatId, '❌ دسترسی غیرمجاز!');
            return;
        }

        const parts = data.split('_');
        const action = parts[0];
        const targetUserId = parts[1];
        const planType = parts[2]; // پلن انتخابی کاربر

        if (action === 'approve') {
            // محاسبه تاریخ انقضا بر اساس پلن
            const daysToAdd = planType === 'plan_3m' ? 90 : 30; // ۳ ماهه یا ۱ ماهه
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + daysToAdd);

            // ذخیره اشتراک کاربر
            userSubscriptions[targetUserId] = {
                planName: planType === 'plan_3m' ? 'اشتراک ۳ ماهه' : 'اشتراک ۱ ماهه',
                expiryDate: expiryDate.toLocaleDateString('fa-IR')
            };

            bot.sendMessage(targetUserId, '✅ پرداخت و رسید شما توسط مدیریت تایید شد! اشتراک شما با موفقیت فعال گردید. 🎉\n\nمی‌توانید از بخش "اشتراک‌های من" وضعیت خود را چک کنید.');
            bot.sendMessage(chatId, `✅ رسید کاربر با آیدی ${targetUserId} تایید و اشتراک فعال شد.`);
        } else {
            bot.sendMessage(targetUserId, '❌ متأسفانه رسید پرداخت شما توسط مدیریت رد شد. لطفاً با پشتیبانی در ارتباط باشید.');
            bot.sendMessage(chatId, `❌ رسید کاربر با آیدی ${targetUserId} رد شد.`);
        }
        return;
    }

    if (data.startsWith('admin_')) {
        if (!isAdmin(callbackQuery)) {
            bot.sendMessage(chatId, '❌ دسترسی غیرمجاز!');
            return;
        }
        bot.sendMessage(chatId, `🛠 بخش مدیریتی (${data}) باز شد.`);
        return;
    }

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

    if (data.startsWith('plan_')) {
        userStates[chatId] = { awaiting_receipt: true, selected_plan: data };
        
        const cardInfo = `💳 **اطلاعات کارت به کارت**\n\n` +
            `لطفاً مبلغ را به کارت زیر واریز کنید:\n` +
            `\`6037-9971-xxxx-xxxx\`\n` +
            `به نام: مالک ربات\n\n` +
            `📸 **سپس عکس رسید واریز را همینجا بفرستید تا برای بررسی ارسال شود.**`;
            
        bot.sendMessage(chatId, cardInfo, { parse_mode: 'Markdown' });
        return;
    }

    // بخش اشتراک‌های من
    if (data === 'my_subs') {
        const sub = userSubscriptions[chatId];
        if (sub) {
            bot.sendMessage(chatId, `📱 **اشتراک فعال شما:**\n\n📦 نوع پلن: ${sub.planName}\n⏳ تاریخ انقضا: ${sub.expiryDate}\n\nوضعیت: متصل و فعال ✅`);
        } else {
            bot.sendMessage(chatId, '📱 شما در حال حاضر هیچ اشتراک فعالی ندارید.\n\nمی‌توانید از بخش "خرید اشتراک" اقدام کنید.');
        }
        return;
    }

    if (data === 'wallet') {
        bot.sendMessage(chatId, '💰 کیف پول شما:\nموجودی فعلی: ۰ تومان');
        return;
    }

    if (data === 'back_to_main') {
        bot.sendMessage(chatId, 'به منوی اصلی بازگشتید.');
        return;
    }

    bot.sendMessage(chatId, 'این بخش در حال راه‌اندازی است...');
});

// دریافت عکس رسید و ارسال دکمه حاوی اطلاعات پلن به ادمین
bot.on('photo', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username ? `@${msg.from.username}` : 'ندارد';
    const name = msg.from.first_name || 'کاربر';

    if (userStates[chatId] && userStates[chatId].awaiting_receipt) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const plan = userStates[chatId].selected_plan;
        const planTitle = plan === 'plan_3m' ? 'اشتراک ۳ ماهه' : 'اشتراک ۱ ماهه';

        bot.sendMessage(chatId, '✅ رسید شما دریافت شد و برای بررسی نهایی به مدیریت ارسال گردید.');
        delete userStates[chatId];

        const caption = `🔔 **رسید جدید پرداخت!**\n\n` +
            `👤 نام: ${name}\n` +
            `🆔 یوزرنیم: ${username}\n` +
            `🔢 آیدی عددی: \`${userId}\`\n` +
            `📦 پلن انتخابی: ${planTitle}`;

        const adminActionKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ تایید و فعالسازی', callback_data: `approve_${userId}_${plan}` },
                        { text: '❌ رد رسید', callback_data: `reject_${userId}_${plan}` }
                    ]
                ]
            }
        };

        bot.sendPhoto(ADMIN_CHAT_ID, photoId, {
            caption: caption,
            parse_mode: 'Markdown',
            ...adminActionKeyboard
        });
    }
});

process.on('uncaughtException', (err) => {
    console.log('خطای مدیریت شده:', err.message);
});

console.log('🤖 ربات با سیستم مدیریت اشتراک‌ها فعال شد...');
