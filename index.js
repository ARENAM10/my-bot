const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';
const bot = new TelegramBot(TOKEN, { polling: true });

const ADMIN_USERNAME = 'arenam_10';
const ADMIN_CHAT_ID = 8923324852;

const CHANNEL_USERNAME = '@YourChannelUsername'; // <--- یوزرنیم کانال خودتان
let isForceJoinEnabled = false; // <--- وضعیت اولیه جوین اجباری (پیش‌فرض خاموش)

const userStates = {};       
const userSubscriptions = {}; 
const userWallets = {};      
const allUsers = new Set();  
const referals = {};         

let paymentCardNumber = '6037-9971-xxxx-xxxx'; 
let paymentCardOwner = 'مالک ربات';
const REWARD_AMOUNT = 5000;  

app.get('/', (req, res) => {
    res.send('Bot is running with toggleable Force Join!');
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

// تابع بررسی عضویت کانال
async function checkMembership(userId) {
    if (!CHANNEL_USERNAME || CHANNEL_USERNAME === '@YourChannelUsername') return true;
    try {
        const chatMember = await bot.getChatMember(CHANNEL_USERNAME, userId);
        const status = chatMember.status;
        return ['creator', 'administrator', 'member'].includes(status);
    } catch (error) {
        console.error('خطا در بررسی عضویت کانال:', error.message);
        return true; 
    }
}

// تابع ارسال منوی اصلی ربات
async function sendMainMenu(chatId) {
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
                    { text: '👥 دعوت دوستان (زیرمجموعه‌گیری)', callback_data: 'invite' },
                    { text: '📞 پشتیبانی', callback_data: 'support' }
                ]
            ]
        }
    };
    bot.sendMessage(chatId, 'سلام! به ربات خوش آمدید. لطفاً گزینه مورد نظر خود را انتخاب کنید: 👇', inlineKeyboard);
}

// تابع بررسی جوین اجباری (فقط وقتی روشن است فعال می‌شود)
async function handleForceJoin(msg) {
    trackUser(msg);
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (isAdmin(msg)) return true; // ادمین رد می‌شود
    if (!isForceJoinEnabled) return true; // اگر خاموش بود، همه رد می‌شوند

    const isMember = await checkMembership(userId);
    if (!isMember) {
        const joinKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📢 عضویت در کانال ربات', url: `https://t.me/${CHANNEL_USERNAME.replace('@', '')}` }],
                    [{ text: '✅ عضو شدم، بررسی کن', callback_data: 'check_membership' }]
                ]
            }
        };
        bot.sendMessage(chatId, `⚠️ برای استفاده از ربات، ابتدا باید در کانال ما عضو شوید:\n\n${CHANNEL_USERNAME}\n\nپس از عضویت، روی دکمه زیر کلیک کنید 👇`, joinKeyboard);
        return false;
    }
    return true;
}

bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    delete userStates[chatId];

    const canProceed = await handleForceJoin(msg);
    if (!canProceed) return;

    const refId = match ? match[1] : null; 

    if (refId && refId !== chatId.toString()) {
        if (!userWallets[`referred_${chatId}`]) {
            userWallets[`referred_${chatId}`] = true; 
            userWallets[refId] = (userWallets[refId] || 0) + REWARD_AMOUNT;
            referals[refId] = (referals[refId] || 0) + 1;

            bot.sendMessage(refId, `🎉 یک نفر با لینک دعوت شما وارد ربات شد!\n\nمبلغ ${REWARD_AMOUNT.toLocaleString()} تومان به عنوان پاداش به کیف پول شما اضافه شد. 💰`, { parse_mode: 'Markdown' })
                .catch(() => {});
        }
    }

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

    sendMainMenu(chatId);
});

bot.onText(/💻 پنل مدیریت|\/panel/, async (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) {
        bot.sendMessage(chatId, '❌ شما دسترسی به این بخش ندارید.');
        return;
    }
    sendAdminPanel(chatId);
});

function sendAdminPanel(chatId) {
    const forceJoinStatusText = isForceJoinEnabled ? '🟢 جوین اجباری: روشن' : '🔴 جوین اجباری: خاموش';
    
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
                    { text: forceJoinStatusText, callback_data: 'toggle_force_join' },
                    { text: '📢 ارسال همگانی', callback_data: 'admin_broadcast' }
                ],
                [
                    { text: '📌 سنجاق پیام', callback_data: 'admin_pin_msg' },
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

bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;

    try {
        bot.answerCallbackQuery(callbackQuery.id).catch(() => {});
    } catch (e) {}

    // دکمه تغییر وضعیت جوین اجباری توسط ادمین
    if (data === 'toggle_force_join') {
        if (!isAdmin(callbackQuery)) return;
        isForceJoinEnabled = !isForceJoinEnabled; // تغییر وضعیت
        const statusMsg = isForceJoinEnabled ? '🟢 جوین اجباری با موفقیت **روشن** شد.' : '🔴 جوین اجباری با موفقیت **خاموش** شد.';
        bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
        
        // به‌روزرسانی پنل مدیریت
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'check_membership') {
        const isMember = await checkMembership(userId);
        if (isMember) {
            bot.sendMessage(chatId, '✅ عضویت شما تایید شد! حالا می‌توانید از ربات استفاده کنید.');
            sendMainMenu(chatId);
        } else {
            bot.sendMessage(chatId, '❌ شما هنوز در کانال عضو نشده‌اید. لطفاً ابتدا در کانال جوین شوید و دوباره روی دکمه بررسی کلیک کنید.');
        }
        return;
    }

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
        userStates[chatId] = { step: 'get_broadcast_content' };
        bot.sendMessage(chatId, '📢 **ارسال پیام همگانی پیشرفته**\n\nلطفاً متن، عکس یا پیام خود را بفرستید (برای لغو کلمه `انصراف` را بفرستید):', { parse_mode: 'Markdown' });
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
        const userRefCount = referals[chatId] || 0;
        const inviteLink = `https://t.me/${bot.options.username}?start=${chatId}`;
        const inviteText = `👥 **سیستم دعوت دوستان (زیرمجموعه‌گیری)**\n\nبا ارسال لینک زیر به دوستانتان، به ازای هر نفری که وارد ربات شود، **${REWARD_AMOUNT.toLocaleString()} تومان** پاداش به کیف پول خود دریافت کنید! 🎁\n\n📊 تعداد زیرمجموعه‌های شما: **${userRefCount} نفر**\n\n🔗 لینک دعوت اختصاصی شما:\n\`${inviteLink}\``;
        bot.sendMessage(chatId, inviteText, { parse_mode: 'Markdown' });
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

bot.on('message', async (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;
    const text = msg.text;

    if (chatId === ADMIN_CHAT_ID && text === '💻 پنل مدیریت') return;

    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_new_card_number') {
        if (text && text.toLowerCase() === 'انصراف') {
            delete userStates[chatId];
            bot.sendMessage(chatId, '❌ عملیات لغو شد.');
            return;
        }
        paymentCardNumber = text.trim();
        delete userStates[chatId];
        bot.sendMessage(chatId, '✅ شماره کارت جدید ذخیره شد:\n`' + paymentCardNumber + '`', { parse_mode: 'Markdown' });
        return;
    }

    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_broadcast_content') {
        if (text && text.toLowerCase() === 'انصراف') {
            delete userStates[chatId];
            bot.sendMessage(chatId, '❌ ارسال همگانی لغو شد.');
            return;
        }

        delete userStates[chatId];
        bot.sendMessage(chatId, '⏳ در حال ارسال همگانی به تمام کاربران...');

        let successCount = 0;
        let failCount = 0;
        const totalUsers = allUsers.size;

        const promises = Array.from(allUsers).map((uId) => {
            if (msg.photo) {
                const photoId = msg.photo[msg.photo.length - 1].file_id;
                const caption = msg.caption || '';
                return bot.sendPhoto(uId, photoId, { caption: caption })
                    .then(() => successCount++)
                    .catch(() => failCount++);
            } else if (text) {
                return bot.sendMessage(uId, text)
                    .then(() => successCount++)
                    .catch(() => failCount++);
            }
        });

        Promise.all(promises).then(() => {
            bot.sendMessage(ADMIN_CHAT_ID, `📊 **گزارش ارسال همگانی:**\n\n👥 کل کاربران: ${totalUsers}\n✅ ارسال موفق: ${successCount}\n❌ ارسال ناموفق: ${failCount}`, { parse_mode: 'Markdown' });
        });
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

bot.on('photo', async (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;
    
    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_broadcast_content') {
        return; 
    }

    constuserId = msg.from.id;
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

console.log('🤖 ربات با قابلیت مدیریت جوین اجباری اجرا شد.');
