const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';
const bot = new TelegramBot(TOKEN, { polling: true });

const ADMIN_USERNAME = 'arenam_10';
const ADMIN_CHAT_ID = 8923324852;

// پایگاه داده‌ها
const userStates = {};       
const userSubscriptions = {}; // { chatId: { planName, expiryDate, name } }
const userWallets = {};      
const allUsers = new Set();  

let paymentCardNumber = '6037-9971-xxxx-xxxx'; 
let paymentCardOwner = 'مالک ربات';

app.get('/', (req, res) => {
    res.send('Bot is running with full features!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

function isAdmin(msg) {
    const chatId = msg.chat.id;
    const username = msg.from && msg.from.username;
    return chatId === ADMIN_CHAT_ID || (username && username.toLowerCase() === ADMIN_USERNAME.toLowerCase());
}

function trackUser(msg) {
    if (msg && msg.chat && msg.chat.id) {
        allUsers.add(msg.chat.id);
    }
}

// استارت ربات
bot.onText(/\/start/, (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;

    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🛒 خرید اشتراک', callback_data: 'buy_sub' }],
                [{ text: '💰 کیف پول', callback_data: 'wallet' }, { text: '📱 اشتراک‌های من', callback_data: 'my_subs' }],
                [{ text: '📞 پشتیبانی', callback_data: 'support' }]
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
                ]
            ]
        }
    };

    bot.sendMessage(chatId, '⚙️ **پنل مدیریت پیشرفته ربات**\nبخش موردنظر را انتخاب کنید:', {
        parse_mode: 'Markdown',
        ...adminKeyboard
    });
}

// مدیریت کلیک دکمه‌ها
bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;

    bot.answerCallbackQuery(callbackQuery.id);

    // بررسی دسترسی ادمین برای دکمه‌های مدیریتی
    if (data.startsWith('admin_') || data.startsWith('approve_') || data.startsWith('reject_')) {
        if (!isAdmin(callbackQuery)) {
            bot.sendMessage(chatId, '❌ شما دسترسی ندارید.');
            return;
        }
    }

    // ۱. تنظیمات پرداخت
    if (data === 'admin_pay_settings') {
        userStates[chatId] = { step: 'get_new_card_number' };
        bot.sendMessage(chatId, `💳 **تنظیمات کارت به کارت**\n\nشماره کارت فعلی: \`${paymentCardNumber}\`\n\nلطفاً **شماره کارت جدید** را بفرستید (یا کلمه انصراف را ارسال کنید):`, { parse_mode: 'Markdown' });
        return;
    }

    // ۲. بخش رسیدها
    if (data === 'admin_receipts') {
        bot.sendMessage(chatId, '📋 **بخش رسیدهای مالی**\n\nرسیدهای واریزی کاربران به محض ارسال، همراه با دکمه تایید و رد اینجا نمایش داده می‌شوند.');
        return;
    }

    // ۳. شارژ کیف پول
    if (data === 'admin_charge_wallet') {
        userStates[chatId] = { step: 'get_charge_user_id' };
        bot.sendMessage(chatId, '💰 **شارژ دستی کیف پول**\n\nلطفاً آیدی عددی کاربر مورد نظر را وارد کنید:');
        return;
    }

    // ۴. سوابق اشتراک‌ها
    if (data === 'admin_history') {
        const activeSubKeys = Object.keys(userSubscriptions);
        if (activeSubKeys.length === 0) {
            bot.sendMessage(chatId, '📦 هیچ اشتراک فعالی ثبت نشده است.');
            return;
        }
        let historyText = '📦 **اشتراک‌های فعال:**\n\n';
        activeSubKeys.forEach((uId, index) => {
            const sub = userSubscriptions[uId];
            historyText += `${index + 1}. کاربر: ${sub.name} (\`${uId}\`)\n   پلن: ${sub.planName} | انقضا: ${sub.expiryDate}\n\n`;
        });
        bot.sendMessage(chatId, historyText, { parse_mode: 'Markdown' });
        return;
    }

    // ۵. لیست کاربران
    if (data === 'admin_users') {
        bot.sendMessage(chatId, `👥 تعداد کل کاربران ثبت‌شده: ${allUsers.size} نفر`);
        return;
    }

    // ۶. آمار ربات
    if (data === 'admin_stats') {
        bot.sendMessage(chatId, `📊 **آمار ربات:**\n- کل کاربران: ${allUsers.size}\n- اشتراک‌های فعال: ${Object.keys(userSubscriptions).length}`);
        return;
    }

    // ۷. پیام مشتریان
    if (data === 'admin_user_messages') {
        bot.sendMessage(chatId, '💬 برای پاسخ به پیام کاربران، روی پیام ارسالی آن‌ها در پی‌وی Reply کنید.');
        return;
    }

    // تایید یا رد رسید
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
                name: 'کاربر'
            };

            bot.sendMessage(targetUserId, '✅ رسید شما تایید و اشتراک شما فعال شد! 🎉');
            bot.sendMessage(chatId, `✅ اشتراک برای کاربر ${targetUserId} با موفقیت فعال شد.`);
        } else {
            bot.sendMessage(targetUserId, '❌ متأسفانه رسید پرداخت شما توسط مدیریت رد شد.');
            bot.sendMessage(chatId, `❌ رسید کاربر ${targetUserId} رد شد.`);
        }
        return;
    }

    // بخش خرید اشتراک کاربران
    if (data === 'buy_sub') {
        const plansKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⭐ اشتراک ۱ ماهه - ۵۰ هزار تومان', callback_data: 'plan_1m' }],
                    [{ text: '🌟 اشتراک ۳ ماهه - ۱۲۰ هزار تومان', callback_data: 'plan_3m' }],
                    [{ text: '🔙 بازگشت', callback_data: 'back_to_main' }]
                ]
            }
        };
        bot.sendMessage(chatId, '🛒 لطفاً پلن مورد نظر خود را انتخاب کنید:', plansKeyboard);
        return;
    }

    if (data.startsWith('plan_')) {
        userStates[chatId] = { awaiting_receipt: true, selected_plan: data };
        bot.sendMessage(chatId, `💳 لطفاً مبلغ را به کارت زیر واریز کنید:\n\n\`${paymentCardNumber}\`\nبه نام: ${paymentCardOwner}\n\n📸 **سپس عکس رسید را همین‌جا ارسال کنید.**`, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'wallet') {
        const balance = userWallets[chatId] || 0;
        bot.sendMessage(chatId, `💰 موجودی کیف پول: \`${balance.toLocaleString()} تومان\``, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'my_subs') {
        const sub = userSubscriptions[chatId];
        if (sub) {
            bot.sendMessage(chatId, `📱 پلن: ${sub.planName}\n⏳ انقضا: ${sub.expiryDate}`);
        } else {
            bot.sendMessage(chatId, '📱 اشتراک فعالی ندارید.');
        }
        return;
    }

    if (data === 'support') {
        userStates[chatId] = { awaiting_support: true };
        bot.sendMessage(chatId, '📞 پیام خود را برای پشتیبانی بفرستید:');
        return;
    }

    if (data === 'back_to_main') {
        delete userStates[chatId];
        bot.sendMessage(chatId, 'به منوی اصلی برگشتید.');
        return;
    }
});

// مدیریت پیام‌های متنی
bot.on('message', (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text === '💻 پنل مدیریت') return;

    // ۱. دریافت شماره کارت جدید
    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_new_card_number') {
        if (text.toLowerCase() === 'انصراف') {
            delete userStates[chatId];
            bot.sendMessage(chatId, '❌ لغو شد.');
            return;
        }
        paymentCardNumber = text.trim();
        delete userStates[chatId];
        bot.sendMessage(chatId, `✅ شماره کارت جدید ذخیره شد:\n\`${paymentCardNumber}\``, { parse_mode: 'Markdown' });
        return;
    }

    // ۲. شارژ کیف پول دستی
    if (chatId === ADMIN_CHAT_ID && userStates[chatId]) {
        if (userStates[chatId].step === 'get_charge_user_id') {
            userStates[chatId] = { step: 'get_charge_amount', targetUser: text.trim() };
            bot.sendMessage(chatId, '✅ مبلغ شارژ (به تومان) را وارد کنید:');
            return;
        } else if (userStates[chatId].step === 'get_charge_amount') {
            const amount = parseInt(text.trim());
            const targetUser = userStates[chatId].targetUser;

            if (isNaN(amount)) {
                bot.sendMessage(chatId, '❌ مبلغ نامعتبر است.');
                return;
            }

            userWallets[targetUser] = (userWallets[targetUser] || 0) + amount;
            delete userStates[chatId];

            bot.sendMessage(chatId, `🎉 کیف پول کاربر ${targetUser} به مبلغ ${amount.toLocaleString()} تومان شارژ شد.`);
            bot.sendMessage(targetUser, `💰 کیف پول شما به مبلغ **${amount.toLocaleString()} تومان** شارژ شد.`, { parse_mode: 'Markdown' });
            return;
        }
    }

    // ۳. ارسال پیام پشتیبانی کاربر
    if (userStates[chatId] && userStates[chatId].awaiting_support) {
        delete userStates[chatId];
        bot.sendMessage(chatId, '✅ پیام شما ارسال شد.');
        bot.sendMessage(ADMIN_CHAT_ID, `💬 **پیام جدید از کاربر (${chatId}):**\n\n${text}`);
        return;
    }
});

// دریافت عکس رسید
bot.on('photo', (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'کاربر';

    if (userStates[chatId] && userStates[chatId].awaiting_receipt) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const plan = userStates[chatId].selected_plan;
        const planTitle = plan === 'plan_3m' ? 'اشتراک ۳ ماهه' : 'اشتراک ۱ ماهه';

        delete userStates[chatId];
        bot.sendMessage(chatId, '✅ رسید دریافت شد و برای بررسی ارسال گردید.');

        const caption = `🔔 **رسید جدید پرداخت!**\n\n👤 نام: ${name}\n🔢 آیدی عددی: \`${chatId}\`\n📦 پلن: ${planTitle}`;

        const adminActionKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ تایید و فعالسازی', callback_data: `approve_${chatId}_${plan}` },
                        { text: '❌ رد رسید', callback_data: `reject_${chatId}_${plan}` }
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
console.log('🤖 ربات با موفقیت اجرا شد.');
