const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';
const bot = new TelegramBot(TOKEN, { polling: true });

const ADMIN_USERNAME = 'arenam_10';
const ADMIN_CHAT_ID = 8923324852;

// دیتابیس‌های موقت پیشرفته
const userStates = {};       
const userSubscriptions = {}; 
const userWallets = {};      
const allUsers = new Set();  
let paymentCardNumber = '6037-9971-xxxx-xxxx'; // شماره کارت پیش‌فرض قابل تنظیم توسط ادمین
let paymentCardOwner = 'مالک ربات';

app.get('/', (req, res) => {
    res.send('Bot is active with Professional Modular Panel!');
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
    allUsers.add(chatId);

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
                    { text: '📢 ارسال همگانی', callback_data: 'admin_broadcast' },
                    { text: '📌 سنجاق پیام', callback_data: 'admin_pin_msg' }
                ],
                [
                    { text: '🗑 حذف پیام آخر', callback_data: 'admin_delete_msg' }
                ],
                [
                    { text: '🔄 استارت مالک', callback_data: 'admin_owner_start' },
                    { text: '🎛 گزینه‌های اصلی', callback_data: 'admin_main_options' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, '⚙️ **پنل مدیریت پیشرفته ربات**\nبخش موردنظر را انتخاب کنید:', {
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

    // ۱. مدیریت بخش رسیدها و تنظیمات پرداخت
    if (data === 'admin_receipts') {
        if (!isAdmin(callbackQuery)) return;
        bot.sendMessage(chatId, '📋 **بخش رسیدهای مالی**\n\nرسیدهای ارسالی کاربران به صورت مستقیم همراه با دکمه تایید/رد برای شما در همین پی‌وی ارسال می‌شوند. برای مشاهده سوابق، از طریق پیام‌های قبلی اقدام کنید.');
        return;
    }

    if (data === 'admin_pay_settings') {
        if (!isAdmin(callbackQuery)) return;
        userStates[chatId] = { step: 'get_new_card_number' };
        bot.sendMessage(chatId, `💳 **تنظیمات درگاه / کارت به کارت**\n\nشماره کارت فعلی: \`${paymentCardNumber}\`\nبه نام: ${paymentCardOwner}\n\nلطفاً **شماره کارت جدید** را وارد کنید (یا برای لغو کلمه انصراف را بفرستید):`, { parse_mode: 'Markdown' });
        return;
    }

    // ۲. سایر بخش‌های پنل مدیریت
    if (data === 'admin_stats') {
        if (!isAdmin(callbackQuery)) return;
        const totalUsersCount = allUsers.size;
        const activeSubsCount = Object.keys(userSubscriptions).length;
        
        const statsText = `📊 **آمار کلی ربات:**\n\n` +
            `👥 تعداد کل کاربران: \`${totalUsersCount}\` نفر\n` +
            `📦 تعداد اشتراک‌های فعال: \`${activeSubsCount}\` عدد`;
            
        bot.sendMessage(chatId, statsText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_users') {
        if (!isAdmin(callbackQuery)) return;
        bot.sendMessage(chatId, `👥 **لیست کاربران:**\n\nتعداد کل کاربران ثبت‌شده در حافظه ربات: ${allUsers.size} نفر`);
        return;
    }

    if (data === 'admin_broadcast') {
        if (!isAdmin(callbackQuery)) return;
        userStates[chatId] = { step: 'get_broadcast_message' };
        bot.sendMessage(chatId, '📢 **ارسال پیام همگانی**\n\nلطفاً متن پیامی که می‌خواهید به تمام کاربران ارسال شود را بفرستید:');
        return;
    }

    if (data === 'admin_charge_wallet') {
        if (!isAdmin(callbackQuery)) return;
        userStates[chatId] = { step: 'get_charge_user_id' };
        bot.sendMessage(chatId, '💰 **شارژ دستی کیف پول**\n\nلطفاً آیدی عددی کاربر مورد نظر را ارسال کنید:');
        return;
    }

    if (data === 'admin_user_messages') {
        if (!isAdmin(callbackQuery)) return;
        bot.sendMessage(chatId, '💬 **بخش پیام مشتریان**\n\nبرای پاسخ به هر پیام، کافی است روی پیام ارسالی کاربر در همین پی‌وی **Reply (پاسخ)** دهید.');
        return;
    }

    if (data === 'admin_delete_msg') {
        if (!isAdmin(callbackQuery)) return;
        try {
            bot.deleteMessage(chatId, msg.message_id);
            bot.sendMessage(chatId, '🗑 پیام قبلی حذف شد.');
        } catch (e) {
            bot.sendMessage(chatId, '❌ خطا در حذف پیام.');
        }
        return;
    }

    if (data.startsWith('admin_')) {
        if (!isAdmin(callbackQuery)) return;
        bot.sendMessage(chatId, `🛠 بخش مدیریتی (${data}) فعال است.`);
        return;
    }

    // تایید یا رد رسید از طرف ادمین
    if (data.startsWith('approve_') || data.startsWith('reject_')) {
        if (!isAdmin(callbackQuery)) return;

        const parts = data.split('_');
        const action = parts[0];
        const targetUserId = parts[1];
        const planType = parts[2];

        if (action === 'approve') {
            const daysToAdd = planType === 'plan_3m' ? 90 : 30;
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + daysToAdd);

            userSubscriptions[targetUserId] = {
                planName: planType === 'plan_3m' ? 'اشتراک ۳ ماهه' : 'اشتراک ۱ ماهه',
                expiryDate: expiryDate.toLocaleDateString('fa-IR')
            };

            bot.sendMessage(targetUserId, '✅ پرداخت و رسید شما توسط مدیریت تایید شد! اشتراک شما فعال گردید. 🎉');
            bot.sendMessage(chatId, `✅ رسید کاربر ${targetUserId} تایید و اشتراک فعال شد.`);
        } else {
            bot.sendMessage(targetUserId, '❌ متأسفانه رسید پرداخت شما توسط مدیریت رد شد.');
            bot.sendMessage(chatId, `❌ رسید کاربر ${targetUserId} رد شد.`);
        }
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
            `\`${paymentCardNumber}\`\n` +
            `به نام: ${paymentCardOwner}\n\n` +
            `📸 **سپس عکس رسید واریز را همینجا بفرستید.**`;
            
        bot.sendMessage(chatId, cardInfo, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'support') {
        userStates[chatId] = { awaiting_support_message: true };
        const cancelKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '❌ انصراف', callback_data: 'back_to_main' }]
                ]
            }
        };
        bot.sendMessage(chatId, '📞 **ارتباط با پشتیبانی**\n\nلطفاً پیام خود را ارسال کنید:', cancelKeyboard);
        return;
    }

    if (data === 'wallet') {
        const balance = userWallets[chatId] || 0;
        const walletKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ افزایش موجودی', callback_data: 'buy_sub' }],
                    [{ text: '🔙 بازگشت', callback_data: 'back_to_main' }]
                ]
            }
        };
        bot.sendMessage(chatId, `💰 **کیف پول شما:**\n\nموجودی فعلی: \`${balance.toLocaleString()} تومان\``, {
            parse_mode: 'Markdown',
            ...walletKeyboard
        });
        return;
    }

    if (data === 'my_subs') {
        const sub = userSubscriptions[chatId];
        if (sub) {
            bot.sendMessage(chatId, `📱 **اشتراک فعال شما:**\n\n📦 پلن: ${sub.planName}\n⏳ انقضا: ${sub.expiryDate}`);
        } else {
            bot.sendMessage(chatId, '📱 اشتراک فعالی ندارید.');
        }
        return;
    }

    if (data === 'back_to_main') {
        delete userStates[chatId];
        bot.sendMessage(chatId, 'به منوی اصلی بازگشتید.');
        return;
    }

    bot.sendMessage(chatId, 'این بخش آماده است.');
});

// مدیریت پیام‌های متنی
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text === '💻 پنل مدیریت') return;

    // ۱. تنظیم شماره کارت توسط ادمین
    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_new_card_number') {
        if (text.toLowerCase() === 'انصراف') {
            delete userStates[chatId];
            bot.sendMessage(chatId, '❌ عملیات لغو شد.');
            return;
        }
        paymentCardNumber = text.trim();
        delete userStates[chatId];
        bot.sendMessage(chatId, `✅ شماره کارت جدید با موفقیت به \`${paymentCardNumber}\` تغییر یافت.`, { parse_mode: 'Markdown' });
        return;
    }

    // ۲. ارسال پیام همگانی
    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_broadcast_message') {
        delete userStates[chatId];
        bot.sendMessage(chatId, '⏳ در حال ارسال پیام همگانی...');

        let success = 0;
        allUsers.forEach((uId) => {
            bot.sendMessage(uId, `📢 **اطلاعیه:**\n\n${text}`, { parse_mode: 'Markdown' })
                .then(() => success++)
                .catch(() => {});
        });

        setTimeout(() => {
            bot.sendMessage(ADMIN_CHAT_ID, `✅ پیام همگانی به ${success} کاربر ارسال شد.`);
        }, 2000);
        return;
    }

    // ۳. پاسخ ادمین به کاربر (Reply)
    if (chatId === ADMIN_CHAT_ID && msg.reply_to_message) {
        const repliedText = msg.reply_to_message.caption || msg.reply_to_message.text || '';
        const match = repliedText.match(/آیدی عددی: `(\d+)`/) || repliedText.match(/از طرف کاربر.*?\((\d+)\)/);
        
        if (match && match[1]) {
            const targetUserId = match[1];
            bot.sendMessage(targetUserId, `💬 **پاسخ پشتیبانی:**\n\n${text}`);
            bot.sendMessage(ADMIN_CHAT_ID, `✅ پاسخ ارسال شد.`);
            return;
        }
    }

    // ۴. شارژ کیف پول دستی
    if (chatId === ADMIN_CHAT_ID && userStates[chatId]) {
        if (userStates[chatId].step === 'get_charge_user_id') {
            const targetUser = text.trim();
            userStates[chatId] = { step: 'get_charge_amount', targetUser: targetUser };
            bot.sendMessage(chatId, `✅ آیدی ثبت شد. مبلغ شارژ (تومان) را وارد کنید:`);
            return;
        } else if (userStates[chatId].step === 'get_charge_amount') {
            const amount = parseInt(text.trim());
            const targetUser = userStates[chatId].targetUser;

            if (isNaN(amount)) {
                bot.sendMessage(chatId, '❌ مبلغ نامعتبر است.');
                return;
            }

            userWallets[targetUser] = (userWallets[targetUser] || 0) + amount;
            bot.sendMessage(chatId, `🎉 کیف پول کاربر ${targetUser} به مبلغ ${amount.toLocaleString()} تومان شارژ شد.`);
            bot.sendMessage(targetUser, `💰 کیف پول شما به مبلغ **${amount.toLocaleString()} تومان** شارژ شد. 🎉`, { parse_mode: 'Markdown' });

            delete userStates[chatId];
            return;
        }
    }

    // ۵. ارسال پیام پشتیبانی کاربر
    if (userStates[chatId] && userStates[chatId].awaiting_support_message) {
        const userId = msg.from.id;
        const username = msg.from.username ? `@${msg.from.username}` : 'ندارد';
        const name = msg.from.first_name || 'کاربر';

        delete userStates[chatId];
        bot.sendMessage(chatId, '✅ پیام شما به پشتیبانی ارسال شد.');

        const supportText = `💬 **پیام جدید مشتری:**\n\n` +
            `👤 نام: ${name}\n` +
            `🆔 یوزرنیم: ${username}\n` +
            `🔢 آیدی عددی: \`${userId}\`\n\n` +
            `📝 متن:\n${text}\n\n` +
            `*(برای پاسخ روی همین پیام Reply کنید)*`;

        bot.sendMessage(ADMIN_CHAT_ID, supportText, { parse_mode: 'Markdown' });
        return;
    }
});

// دریافت رسید عکس
bot.on('photo', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username ? `@${msg.from.username}` : 'ندارد';
    const name = msg.from.first_name || 'کاربر';

    if (userStates[chatId] && userStates[chatId].awaiting_receipt) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const plan = userStates[chatId].selected_plan;
        const planTitle = plan === 'plan_3m' ? 'اشتراک ۳ ماهه' : 'اشتراک ۱ ماهه';

        bot.sendMessage(chatId, '✅ رسید دریافت شد و برای بررسی ارسال گردید.');
        delete userStates[chatId];

        const caption = `🔔 **رسید جدید پرداخت!**\n\n` +
            `👤 نام: ${name}\n` +
            `🆔 یوزرنیم: ${username}\n` +
            `🔢 آیدی عددی: \`${userId}\`\n` +
            `📦 پلن: ${planTitle}`;

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
    console.log('خطا:', err.message);
});

console.log('🤖 ربات با پنل مدیریت ماژولار فعال شد...');
