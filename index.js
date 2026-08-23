const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';
const bot = new TelegramBot(TOKEN, { polling: true });

const ADMIN_USERNAME = 'arenam_10';
const ADMIN_CHAT_ID = 8923324852;

const userStates = {};       
const userSubscriptions = {}; 
const userWallets = {};      
const allUsers = new Set();  

let paymentCardNumber = '6037-9971-xxxx-xxxx'; 
let paymentCardOwner = 'مالک ربات';

app.get('/', (req, res) => {
    res.send('Bot is running smoothly with advanced state management!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

function isAdmin(msgOrQuery) {
    const chatId = msgOrQuery.message ? msgOrQuery.message.chat.id : msgOrQuery.chat.id;
    const user = msgOrQuery.from;
    const username = user && user.username;
    return chatId === ADMIN_CHAT_ID || (username && username.toLowerCase() === ADMIN_USERNAME.toLowerCase());
}

function trackUser(msg) {
    if (msg && msg.chat && msg.chat.id) {
        allUsers.add(msg.chat.id);
    }
}

bot.onText(/\/start/, (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;
    delete userStates[chatId];

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

    bot.sendMessage(chatId, 'سلام! به ربات خوش آمدید. لطفاً گزینه مورد نظر خود را انتخاب کنید: 👇', inlineKeyboard);
});

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
                ]
            ]
        }
    };

    bot.sendMessage(chatId, '⚙️ **پنل مدیریت کل ربات**\nگزینه موردنظر را انتخاب کنید:', {
        parse_mode: 'Markdown',
        ...adminKeyboard
    });
}

bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;

    bot.answerCallbackQuery(callbackQuery.id);

    if (data.startsWith('admin_') || data.startsWith('approve_') || data.startsWith('reject_')) {
        if (!isAdmin(callbackQuery)) {
            bot.sendMessage(chatId, '❌ شما دسترسی ندارید.');
            return;
        }
    }

    if (data === 'admin_pay_settings') {
        userStates[chatId] = { step: 'get_new_card_number' };
        bot.sendMessage(chatId, '💳 **تنظیمات کارت به کارت**\n\nشماره کارت فعلی: `' + paymentCardNumber + '`\n\nلطفاً شماره کارت جدید را بفرستید (یا کلمه انصراف را ارسال کنید):', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_receipts') {
        bot.sendMessage(chatId, '📋 **بخش رسیدهای مالی**\n\nرسیدهای واریزی کاربران به همراه دکمه‌های تایید و رد به این‌جا ارسال می‌شوند.');
        return;
    }

    if (data === 'admin_charge_wallet') {
        userStates[chatId] = { step: 'get_charge_user_id' };
        bot.sendMessage(chatId, '💰 **شارژ کیف پول**\n\nلطفاً آیدی عددی کاربر مورد نظر را وارد کنید:');
        return;
    }

    if (data === 'admin_history') {
        const activeSubKeys = Object.keys(userSubscriptions);
        if (activeSubKeys.length === 0) {
            bot.sendMessage(chatId, '📦 هیچ اشتراک فعالی ثبت نشده است.');
            return;
        }
        let historyText = '📦 **لیست اشتراک‌های فعال کاربران:**\n\n';
        activeSubKeys.forEach((uId, index) => {
            const sub = userSubscriptions[uId];
            historyText += (index + 1) + '. نام: ' + sub.name + ' | آیدی: `' + uId + '`\n    پلن: ' + sub.planName + ' | انقضا: ' + sub.expiryDate + '\n\n';
        });
        bot.sendMessage(chatId, historyText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_users') {
        bot.sendMessage(chatId, '👥 تعداد کل کاربران ثبت‌شده: ' + allUsers.size + ' نفر');
        return;
    }

    if (data === 'admin_stats') {
        bot.sendMessage(chatId, '📊 **آمار کلی ربات:**\n\n👥 کل کاربران: `' + allUsers.size + '`\n📦 اشتراک‌های فعال: `' + Object.keys(userSubscriptions).length + '`', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_broadcast') {
        userStates[chatId] = { step: 'get_broadcast_message' };
        bot.sendMessage(chatId, '📢 لطفاً متن پیام همگانی را بفرستید:');
        return;
    }

    if (data === 'admin_user_messages') {
        bot.sendMessage(chatId, '💬 برای پاسخ به پیام مشتریان، روی پیام آن‌ها در پی‌وی Reply کنید.');
        return;
    }

    if (data.startsWith('admin_')) {
        bot.sendMessage(chatId, '🛠 بخش مدیریتی فعال است.');
        return;
    }

    if (data.startsWith('approve_') || data.startsWith('reject_')) {
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
            bot.sendMessage(chatId, '✅ رسید کاربر تایید و اشتراک فعال شد.');
        } else {
            bot.sendMessage(targetUserId, '❌ متأسفانه رسید پرداخت شما توسط مدیریت رد شد.');
            bot.sendMessage(chatId, '❌ رسید کاربر رد شد.');
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
        bot.sendMessage(chatId, '💳 لطفاً مبلغ را به کارت زیر واریز کرده و عکس رسید را بفرستید:\n\n`' + paymentCardNumber + '`\nبه نام: ' + paymentCardOwner, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'free_sub') {
        bot.sendMessage(chatId, '🎁 برای دریافت اشتراک رایگان، از بخش دعوت دوستان اقدام کنید.');
        return;
    }

    if (data === 'test_server') {
        bot.sendMessage(chatId, '🧪 سرور تست ربات فعال است.');
        return;
    }

    if (data === 'wallet') {
        const balance = userWallets[chatId] || 0;
        bot.sendMessage(chatId, '💰 موجودی کیف پول شما: `' + balance.toLocaleString() + ' تومان`', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'my_subs') {
        const sub = userSubscriptions[chatId];
        if (sub) {
            bot.sendMessage(chatId, '📱 اشتراک فعال: ' + sub.planName + '\n⏳ انقضا: ' + sub.expiryDate);
        } else {
            bot.sendMessage(chatId, '📱 اشتراک فعالی ندارید.');
        }
        return;
    }

    if (data === 'tutorial') {
        bot.sendMessage(chatId, '📖 آموزش اتصال به سرورها برقرار است.');
        return;
    }

    if (data === 'agency') {
        bot.sendMessage(chatId, '🤝 برای درخواست نمایندگی با پشتیبانی تماس بگیرید.');
        return;
    }

    if (data === 'invite') {
        bot.sendMessage(chatId, '👥 لینک دعوت شما:\nhttps://t.me/' + bot.options.username + '?start=' + chatId);
        return;
    }

    if (data === 'support') {
        userStates[chatId] = { awaiting_support_message: true };
        bot.sendMessage(chatId, '📞 لطفاً پیام خود را برای پشتیبانی ارسال کنید:');
        return;
    }

    if (data === 'back_to_main') {
        delete userStates[chatId];
        bot.sendMessage(chatId, 'به منوی اصلی بازگشتید.');
        return;
    }
});

bot.on('message', (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text === '💻 پنل مدیریت') return;

    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_new_card_number') {
        if (text.toLowerCase() === 'انصراف') {
            delete userStates[chatId];
            bot.sendMessage(chatId, '❌ عملیات لغو شد.');
            return;
        }
        paymentCardNumber = text.trim();
        delete userStates[chatId];
        bot.sendMessage(chatId, '✅ شماره کارت جدید ذخیره شد:\n`' + paymentCardNumber + '`', { parse_mode: 'Markdown' });
        return;
    }

    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_broadcast_message') {
        delete userStates[chatId];
        bot.sendMessage(chatId, '⏳ در حال ارسال پیام همگانی...');
        let success = 0;
        allUsers.forEach((uId) => {
            bot.sendMessage(uId, '📢 **اطلاعیه:**\n\n' + text, { parse_mode: 'Markdown' })
                .then(() => success++)
                .catch(() => {});
        });
        setTimeout(() => {
            bot.sendMessage(ADMIN_CHAT_ID, '✅ پیام همگانی ارسال شد.');
        }, 2000);
        return;
    }

    if (chatId === ADMIN_CHAT_ID && userStates[chatId]) {
        if (userStates[chatId].step === 'get_charge_user_id') {
            userStates[chatId] = { step: 'get_charge_amount', targetUser: text.trim() };
            bot.sendMessage(chatId, '✅ آیدی ثبت شد. مبلغ شارژ (به تومان) را وارد کنید:');
            return;
        } else if (userStates[chatId].step === 'get_charge_amount') {
            const amount = parseInt(text.trim());
            const targetUser = userStates[chatId].targetUser;

            if (isNaN(amount)) {
                bot.sendMessage(chatId, '❌ مبلغ نامعتبر است.');
                return;
            }

            userWallets[targetUser] = (userWallets[targetUser] || 0) + amount;
            bot.sendMessage(chatId, '🎉 کیف پول کاربر شارژ شد.');
            bot.sendMessage(targetUser, '💰 کیف پول شما به مبلغ **' + amount.toLocaleString() + ' تومان** شارژ شد. 🎉', { parse_mode: 'Markdown' });

            delete userStates[chatId];
            return;
        }
    }

    if (chatId === ADMIN_CHAT_ID && msg.reply_to_message) {
        const repliedText = msg.reply_to_message.caption || msg.reply_to_message.text || '';
        const match = repliedText.match(/آیدی عددی: `(\d+)`/) || repliedText.match(/از طرف کاربر.*?\((\d+)\)/);
        if (match && match[1]) {
            const targetUserId = match[1];
            bot.sendMessage(targetUserId, '💬 **پاسخ پشتیبانی:**\n\n' + text);
            bot.sendMessage(ADMIN_CHAT_ID, '✅ پاسخ ارسال شد.');
            return;
        }
    }

    if (userStates[chatId] && userStates[chatId].awaiting_support_message) {
        const userId = msg.from.id;
        const username = msg.from.username ? '@' + msg.from.username : 'ندارد';
        const name = msg.from.first_name || 'کاربر';

        delete userStates[chatId];
        bot.sendMessage(chatId, '✅ پیام شما به پشتیبانی ارسال شد.');

        const supportText = '💬 **پیام جدید مشتری:**\n\n👤 نام: ' + name + '\n🆔 یوزرنیم: ' + username + '\n🔢 آیدی عددی: `' + userId + '`\n\n📝 متن:\n' + text;
        bot.sendMessage(ADMIN_CHAT_ID, supportText, { parse_mode: 'Markdown' });
        return;
    }
});

bot.on('photo', (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username ? '@' + msg.from.username : 'ندارد';
    const name = msg.from.first_name || 'کاربر';

    if (userStates[chatId] && userStates[chatId].awaiting_receipt) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const plan = userStates[chatId].selected_plan;
        const planTitle = plan === 'plan_3m' ? 'اشتراک ۳ ماهه' : 'اشتراک ۱ ماهه';

        userSubscriptions[userId] = {
            planName: planTitle,
            expiryDate: 'در انتظار تایید',
            name: name
        };

        bot.sendMessage(chatId, '✅ رسید شما دریافت شد.');
        delete userStates[chatId];

        const caption = '🔔 **رسید جدید پرداخت!**\n\n👤 نام: ' + name + '\n🆔 یوزرنیم: ' + username + '\n🔢 آیدی عددی: `' + userId + '`\n📦 پلن: ' + planTitle;

        const adminActionKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ تایید و فعالسازی', callback_data: 'approve_' + userId + '_' + plan },
                        { text: '❌ رد رسید', callback_data: 'reject_' + userId + '_' + plan }
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
    console.error('خطا:', err);
});

console.log('🤖 ربات بدون خطا اجرا شد.');
