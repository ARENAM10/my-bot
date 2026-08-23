const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';
const bot = new TelegramBot(TOKEN, { polling: true });

const ADMIN_USERNAME = 'arenam_10';
const ADMIN_CHAT_ID = 8923324852;

// دیتابیس‌های پیشرفته
const userStates = {};       
const userSubscriptions = {}; // ساختار: { chatId: { planName, expiryDate, username, name } }
const userWallets = {};      
const allUsers = new Set();  
let paymentCardNumber = '6037-9971-xxxx-xxxx'; 
let paymentCardOwner = 'مالک ربات';

app.get('/', (req, res) => {
    res.send('Bot is active with Step 2 (Subs & Users CRM)!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

function isAdmin(msg) {
    const chatId = msg.chat.id;
    const username = msg.from && msg.from.username;
    return chatId === ADMIN_CHAT_ID || (username && username.toLowerCase() === ADMIN_USERNAME.toLowerCase());
}

// ثبت خودکار کاربران در Set
function trackUser(msg) {
    const chatId = msg.chat.id;
    if (chatId) {
        allUsers.add(chatId);
    }
}

// استارت ربات
bot.onText(/\/start/, (msg) => {
    trackUser(msg);
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
    trackUser(msg);
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

    // --- گام دوم: سوابق اشتراک‌ها و لیست کاربران ---
    if (data === 'admin_history') {
        if (!isAdmin(callbackQuery)) return;
        
        const activeSubKeys = Object.keys(userSubscriptions);
        if (activeSubKeys.length === 0) {
            bot.sendMessage(chatId, '📦 **سوابق اشتراک‌ها:**\n\nهیچ اشتراک فعالی در حال حاضر ثبت نشده است.');
            return;
        }

        let historyText = '📦 **لیست اشتراک‌های فعال کاربران:**\n\n';
        activeSubKeys.forEach((uId, index) => {
            const sub = userSubscriptions[uId];
            historyText += `${index + 1}. نام: ${sub.name} | آیدی: \`${uId}\`\n    پلن: ${sub.planName} | انقضا: ${sub.expiryDate}\n\n`;
        });

        bot.sendMessage(chatId, historyText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_users') {
        if (!isAdmin(callbackQuery)) return;

        let usersText = `👥 **لیست کل کاربران ربات:**\n\nتعداد کل: ${allUsers.size} نفر\n\n`;
        let counter = 1;
        allUsers.forEach((uId) => {
            if (counter <= 30) { // نمایش حداکثر ۳۰ نفر برای جلوگیری از محدودیت طول پیام تلگرام
                usersText += `${counter}. آیدی عددی: \`${uId}\`\n`;
                counter++;
            }
        });

        if (allUsers.size > 30) {
            usersText += `\n... و ${allUsers.size - 30} کاربر دیگر.`;
        }

        bot.sendMessage(chatId, usersText, { parse_mode: 'Markdown' });
        return;
    }

    // --- گام اول: رسیدها و تنظیمات پرداخت ---
    if (data === 'admin_receipts') {
        if (!isAdmin(callbackQuery)) return;
        bot.sendMessage(chatId, '📋 **بخش رسیدهای مالی**\n\nرسیدهای ارسالی کاربران به همراه دکمه تایید/رد برای شما ارسال می‌شوند.');
        return;
    }

    if (data === 'admin_pay_settings') {
        if (!isAdmin(callbackQuery)) return;
        userStates[chatId] = { step: 'get_new_card_number' };
        bot.sendMessage(chatId, `💳 **تنظیمات کارت به کارت**\n\nشماره کارت فعلی: \`${paymentCardNumber}\`\nلطفاً **شماره کارت جدید** را وارد کنید:`, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_stats') {
        if (!isAdmin(callbackQuery)) return;
        const statsText = `📊 **آمار کلی ربات:**\n\n👥 کل کاربران: \`${allUsers.size}\`\n📦 اشتراک‌های فعال: \`${Object.keys(userSubscriptions).length}\``;
        bot.sendMessage(chatId, statsText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_broadcast') {
        if (!isAdmin(callbackQuery)) return;
        userStates[chatId] = { step: 'get_broadcast_message' };
        bot.sendMessage(chatId, '📢 لطفاً متن پیام همگانی را بفرستید:');
        return;
    }

    if (data === 'admin_charge_wallet') {
        if (!isAdmin(callbackQuery)) return;
        userStates[chatId] = { step: 'get_charge_user_id' };
        bot.sendMessage(chatId, '💰 آیدی عددی کاربر مورد نظر برای شارژ کیف پول را وارد کنید:');
        return;
    }

    if (data === 'admin_user_messages') {
        if (!isAdmin(callbackQuery)) return;
        bot.sendMessage(chatId, '💬 برای پاسخ به پیام مشتریان، روی پیام آن‌ها در پی‌وی **Reply** کنید.');
        return;
    }

    if (data === 'admin_delete_msg') {
        if (!isAdmin(callbackQuery)) return;
        try {
            bot.deleteMessage(chatId, msg.message_id);
            bot.sendMessage(chatId, '🗑 پیام حذف شد.');
        } catch (e) {}
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
                expiryDate: expiryDate.toLocaleDateString('fa-IR'),
                name: 'کاربر ربات'
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
        bot.sendMessage(chatId, `💳 لطفاً مبلغ را به کارت زیر واریز کرده و عکس رسید را بفرستید:\n\n\`${paymentCardNumber}\``, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'support') {
        userStates[chatId] = { awaiting_support_message: true };
        bot.sendMessage(chatId, '📞 لطفاً پیام خود را برای پشتیبانی ارسال کنید:');
        return;
    }

    if (data === 'wallet') {
        const balance = userWallets[chatId] || 0;
        bot.sendMessage(chatId, `💰 موجودی کیف پول شما: \`${balance.toLocaleString()} تومان\``, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'my_subs') {
        const sub = userSubscriptions[chatId];
        if (sub) {
            bot.sendMessage(chatId, `📱 اشتراک فعال: ${sub.planName}\n⏳ انقضا: ${sub.expiryDate}`);
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
});

// مدیریت پیام‌های متنی
bot.on('message', (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text === '💻 پنل مدیریت') return;

    // ۱. تنظیم شماره کارت توسط ادمین
    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_new_card_number') {
        paymentCardNumber = text.trim();
        delete userStates[chatId];
        bot.sendMessage(chatId, `✅ شماره کارت جدید ذخیره شد: \`${paymentCardNumber}\``, { parse_mode: 'Markdown' });
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
            bot.sendMessage(chatId, `✅ مبلغ شارژ (تومان) را وارد کنید:`);
            return;
        } else if (userStates[chatId].step === 'get_charge_amount') {
            const amount = parseInt(text.trim());
            const targetUser = userStates[chatId].targetUser;

            if (isNaN(amount)) {
                bot.sendMessage(chatId, '❌ مبلغ نامعتبر است.');
                return;
            }

            userWallets[targetUser] = (userWallets[targetUser] || 0) + amount;
            bot.sendMessage(chatId, `🎉 کیف پول کاربر ${targetUser} شارژ شد.`);
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

        const supportText = `💬 **پیام جدید مشتری:**\n\n👤 نام: ${name}\n🆔 یوزرنیم: ${username}\n🔢 آیدی عددی: \`${userId}\`\n\n📝 متن:\n${text}`;
        bot.sendMessage(ADMIN_CHAT_ID, supportText, { parse_mode: 'Markdown' });
        return;
    }
});

// دریافت رسید عکس
bot.on('photo', (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username ? `@${msg.from.username}` : 'ندارد';
    const name = msg.from.first_name || 'کاربر';

    if (userStates[chatId] && userStates[chatId].awaiting_receipt) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const plan = userStates[chatId].selected_plan;
        const planTitle = plan === 'plan_3m' ? 'اشتراک ۳ ماهه' : 'اشتراک ۱ ماهه';

        // ذخیره نام کاربر برای استفاده در سوابق
        if (userSubscriptions[userId]) {
            userSubscriptions[userId].name = name;
        }

        bot.sendMessage(chatId, '✅ رسید دریافت شد.');
        delete userStates[chatId];

        const caption = `🔔 **رسید جدید پرداخت!**\n\n👤 نام: ${name}\n🆔 یوزرنیم: ${username}\n🔢 آیدی عددی: \`${userId}\`\n📦 پلن: ${planTitle}`;

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

process.on('uncaughtException', (err) => {});
console.log('🤖 ربات با قابلیت سوابق اشتراک‌ها و کاربران فعال شد...');
