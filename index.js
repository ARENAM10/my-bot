const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';
const bot = new TelegramBot(TOKEN, { polling: true });

const ADMIN_USERNAME = 'arenam_10';
const ADMIN_CHAT_ID = 8923324852;

const CHANNEL_USERNAME = '@YourChannelUsername'; 
let isForceJoinEnabled = false; 

const userStates = {};       
const userSubscriptions = {}; 
const userWallets = {};      
const allUsers = new Set();  
const referals = {};         

// لیست پلن‌های آماده‌ای که ادمین توی ربات می‌سازه (ساختار: [{ id, name, volume, duration, link }, ...])
let customPlans = []; 

let paymentCardNumber = '6037-9971-xxxx-xxxx'; 
let paymentCardOwner = 'مالک ربات';
const REWARD_AMOUNT = 5000;  

app.get('/', (req, res) => {
    res.send('Bot is running with Dynamic Plan Manager!');
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

async function handleForceJoin(msg) {
    trackUser(msg);
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (isAdmin(msg)) return true; 
    if (!isForceJoinEnabled) return true; 

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
                    { text: '⚙️ مدیریت پلن‌ها و اشتراک‌ها', callback_data: 'admin_manage_plans' },
                    { text: '📦 سوابق اشتراک‌ها', callback_data: 'admin_history' }
                ],
                [
                    { text: '💰 شارژ کیف پول', callback_data: 'admin_charge_wallet' },
                    { text: '📋 رسیدهای مالی', callback_data: 'admin_receipts' }
                ],
                [
                    { text: '📊 آمار کلی', callback_data: 'admin_stats' },
                    { text: '👥 کاربران', callback_data: 'admin_users' }
                ],
                [
                    { text: '💳 تنظیمات پرداخت', callback_data: 'admin_pay_settings' },
                    { text: '💬 پیام مشتریان', callback_data: 'admin_user_messages' }
                ],
                [
                    { text: forceJoinStatusText, callback_data: 'toggle_force_join' },
                    { text: '📢 ارسال همگانی', callback_data: 'admin_broadcast' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, '⚙️ **پنل مدیریت پیشرفته ربات**\nگزینه موردنظر را انتخاب کنید:', {
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

    if (data === 'toggle_force_join') {
        if (!isAdmin(callbackQuery)) return;
        isForceJoinEnabled = !isForceJoinEnabled; 
        const statusMsg = isForceJoinEnabled ? '🟢 جوین اجباری با موفقیت **روشن** شد.' : '🔴 جوین اجباری با موفقیت **خاموش** شد.';
        bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
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

    if (data.startsWith('admin_') || data.startsWith('approve_') || data.startsWith('reject_') || data.startsWith('plan_mgmt_') || data.startsWith('edit_plan_') || data.startsWith('del_plan_')) {
        if (!isAdmin(callbackQuery)) {
            bot.sendMessage(chatId, '❌ شما دسترسی ندارید.');
            return;
        }
    }

    // بخش مدیریت پلن‌ها و اشتراک‌ها توسط ادمین
    if (data === 'admin_manage_plans') {
        const plansMenuKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ افزودن اشتراک/پلن جدید', callback_data: 'plan_mgmt_add' }],
                    [{ text: '📋 لیست و ویرایش پلن‌های موجود', callback_data: 'plan_mgmt_list' }],
                    [{ text: '🔙 بازگشت به پنل', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '⚙️ **مدیریت پلن‌ها و اشتراک‌ها**\n\nاز طریق این بخش می‌توانید پلن‌های ربات را اضافه، ویرایش یا حذف کنید:', {
            parse_mode: 'Markdown',
            ...plansMenuKeyboard
        });
        return;
    }

    if (data === 'plan_mgmt_add') {
        userStates[chatId] = { step: 'get_new_plan_name' };
        bot.sendMessage(chatId, '➕ **ساخت پلن جدید**\n\nلطفاً **نام پلن** را وارد کنید (مثلاً: `اشتراک VIP یک ماهه`):', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'plan_mgmt_list') {
        if (customPlans.length === 0) {
            bot.sendMessage(chatId, '📦 هیچ پلنی ثبت نشده است.');
            return;
        }

        let textList = '📋 **لیست پلن‌های ثبت شده:**\n\n';
        const inlineBtns = [];

        customPlans.forEach((p, index) => {
            textList += `${index + 1}. **${p.name}**\n   🌐 حجم: ${p.volume} | ⏳ زمان: ${p.duration}\n   🔗 لینک: \`${p.link}\`\n\n`;
            inlineBtns.push([
                { text: `✏️ ویرایش: ${p.name}`, callback_data: `edit_plan_${p.id}` },
                { text: `🗑 حذف`, callback_data: `del_plan_${p.id}` }
            ]);
        });

        inlineBtns.push([{ text: '🔙 بازگشت', callback_data: 'admin_manage_plans' }]);

        bot.sendMessage(chatId, textList, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineBtns }
        });
        return;
    }

    if (data.startsWith('del_plan_')) {
        const planId = parseInt(data.split('_')[2]);
        customPlans = customPlans.filter(p => p.id !== planId);
        bot.sendMessage(chatId, '🗑 پلن مورد نظر با موفقیت حذف شد.');
        return;
    }

    if (data.startsWith('edit_plan_')) {
        const planId = parseInt(data.split('_')[2]);
        userStates[chatId] = { step: 'edit_plan_name', editPlanId: planId };
        bot.sendMessage(chatId, '✏️ **ویرایش پلن**\n\nلطفاً **نام جدید پلن** را وارد کنید:', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_back_to_panel') {
        sendAdminPanel(chatId);
        return;
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

    if (data === 'buy_sub') {
        if (customPlans.length === 0) {
            bot.sendMessage(chatId, '🛒 در حال حاضر هیچ پلن اشتراکی توسط مدیریت تعریف نشده است.');
            return;
        }

        const planButtons = customPlans.map(p => [{ text: `${p.name} | حجم: ${p.volume} | زمان: ${p.duration}`, callback_data: `buy_custom_${p.id}` }]);
        planButtons.push([{ text: '🔙 بازگشت به منو', callback_data: 'back_to_main' }]);

        bot.sendMessage(chatId, '🛒 لطفاً پلن اشتراک مورد نظر خود را انتخاب کنید: 👇', {
            reply_markup: { inline_keyboard: planButtons }
        });
        return;
    }

    if (data.startsWith('buy_custom_')) {
        const planId = parseInt(data.split('_')[2]);
        const selectedPlan = customPlans.find(p => p.id === planId);

        if (!selectedPlan) {
            bot.sendMessage(chatId, '❌ این پلن دیگر وجود ندارد.');
            return;
        }

        userStates[chatId] = { awaiting_receipt: true, selectedPlanName: selectedPlan.name, selectedPlanLink: selectedPlan.link, selectedPlanVolume: selectedPlan.volume, selectedPlanDuration: selectedPlan.duration };
        bot.sendMessage(chatId, `💳 برای خرید **${selectedPlan.name}** (حجم: ${selectedPlan.volume} - زمان: ${selectedPlan.duration})، مبلغ را به کارت زیر واریز کرده و عکس رسید را بفرستید:\n\n\`${paymentCardNumber}\`\nبه نام: ${paymentCardOwner}`, { parse_mode: 'Markdown' });
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
            let subText = `📱 **اشتراک فعال شما:**\n\n📦 پلن: ${sub.planName}\n⏳ انقضا: ${sub.expiryDate}\n🌐 حجم: ${sub.volume || 'نامحدود'}`;
            if (sub.configLink) {
                subText += `\n\n🔗 لینک کانفیگ شما:\n\`${sub.configLink}\``;
            }
            bot.sendMessage(chatId, subText, { parse_mode: 'Markdown' });
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

    // مراحل ساخت یا ویرایش پلن توسط ادمین
    if (chatId === ADMIN_CHAT_ID && userStates[chatId]) {
        const state = userStates[chatId];

        // ساخت پلن - مرحله ۱: نام
        if (state.step === 'get_new_plan_name') {
            state.planName = text.trim();
            state.step = 'get_new_plan_volume';
            bot.sendMessage(chatId, '✅ نام ثبت شد.\n\nحالا **حجم اشتراک** را وارد کنید (مثلاً: `30 گیگ`):');
            return;
        }
        // ساخت پلن - مرحله ۲: حجم
        else if (state.step === 'get_new_plan_volume') {
            state.planVolume = text.trim();
            state.step = 'get_new_plan_duration';
            bot.sendMessage(chatId, '✅ حجم ثبت شد.\n\nحالا **زمان اعتبار** را وارد کنید (مثلاً: `30 روزه`):');
            return;
        }
        // ساخت پلن - مرحله ۳: زمان
        else if (state.step === 'get_new_plan_duration') {
            state.planDuration = text.trim();
            state.step = 'get_new_plan_link';
            bot.sendMessage(chatId, '✅ زمان ثبت شد.\n\nدر نهایت **لینک کانفیگ پیش‌فرض یا ساب‌لینک** مربوط به این پلن را وارد کنید:');
            return;
        }
        // ساخت پلن - مرحله ۴: لینک و ذخیره نهایی
        else if (state.step === 'get_new_plan_link') {
            const newPlan = {
                id: Date.now(),
                name: state.planName,
                volume: state.planVolume,
                duration: state.planDuration,
                link: text.trim()
            };
            customPlans.push(newPlan);
            delete userStates[chatId];

            bot.sendMessage(chatId, `🎉 پلن جدید **${newPlan.name}** با موفقیت ساخته شد و به لیست خرید کاربران اضافه گردید!`, { parse_mode: 'Markdown' });
            return;
        }

        // ویرایش پلن - مرحله ۱: نام جدید
        if (state.step === 'edit_plan_name') {
            state.editName = text.trim();
            state.step = 'edit_plan_volume';
            bot.sendMessage(chatId, '✅ نام ثبت شد.\n\nحالا **حجم جدید** را وارد کنید:');
            return;
        }
        // ویرایش پلن - مرحله ۲: حجم جدید
        else if (state.step === 'edit_plan_volume') {
            state.editVolume = text.trim();
            state.step = 'edit_plan_duration';
            bot.sendMessage(chatId, '✅ حجم ثبت شد.\n\nحالا **زمان اعتبار جدید** را وارد کنید:');
            return;
        }
        // ویرایش پلن - مرحله ۳: زمان جدید
        else if (state.step === 'edit_plan_duration') {
            state.editDuration = text.trim();
            state.step = 'edit_plan_link';
            bot.sendMessage(chatId, '✅ زمان ثبت شد.\n\nدر نهایت **لینک جدید** را وارد کنید:');
            return;
        }
        // ویرایش پلن - مرحله ۴: لینک جدید و آپدیت
        else if (state.step === 'edit_plan_link') {
            const planIndex = customPlans.findIndex(p => p.id === state.editPlanId);
            if (planIndex !== -1) {
                customPlans[planIndex] = {
                    id: state.editPlanId,
                    name: state.editName,
                    volume: state.editVolume,
                    duration: state.editDuration,
                    link: text.trim()
                };
            }
            delete userStates[chatId];
            bot.sendMessage(chatId, '✅ پلن مورد نظر با موفقیت ویرایش و به‌روزرسانی شد.');
            return;
        }
    }

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

    const userId = msg.from.id;
    const username = msg.from.username ? '@' + msg.from.username : 'ندارد';
    const name = msg.from.first_name || 'کاربر';

    if (userStates[chatId] && userStates[chatId].awaiting_receipt) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const planName = userStates[chatId].selectedPlanName;
        const planLink = userStates[chatId].selectedPlanLink;
        const planVolume = userStates[chatId].selectedPlanVolume;
        const planDuration = userStates[chatId].selectedPlanDuration;

        bot.sendMessage(chatId, '✅ رسید شما دریافت شد. به زودی پس از بررسی، اشتراک شما فعال خواهد شد.');
        const savedStateInfo = { planName, planLink, planVolume, planDuration };
        delete userStates[chatId];

        const caption = `🔔 **رسید جدید خرید اشتراک!**\n\n👤 نام: ${name}\n🆔 یوزرنیم: ${username}\n🔢 آیدی عددی: \`${userId}\`\n📦 پلن انتخابی: ${planName}\n🌐 حجم: ${planVolume}\n⏳ زمان: ${planDuration}`;

        const adminActionKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ تایید و ارسال خودکار لینک', callback_data: `approve_custom_${userId}` },
                        { text: '❌ رد رسید', callback_data: `reject_custom_${userId}` }
                    ]
                ]
            }
        };

        // ذخیره موقت اطلاعات برای تایید ادمین
        userSubscriptions[`pending_${userId}`] = savedStateInfo;

        bot.sendPhoto(ADMIN_CHAT_ID, photoId, {
            caption: caption,
            parse_mode: 'Markdown',
            ...adminActionKeyboard
        });
    }
});

// هندل کردن دکمه تایید رسید خرید پلن سفارشی توسط ادمین
bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;

    if (data.startsWith('approve_custom_') || data.startsWith('reject_custom_')) {
        if (!isAdmin(callbackQuery)) return;
        const parts = data.split('_');
        const action = parts[0];
        const targetUserId = parts[2];
        const pendingKey = `pending_${targetUserId}`;

        if (action === 'approve') {
            const subInfo = userSubscriptions[pendingKey];
            if (subInfo) {
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 30); // فرض پیش‌فرض
                const formattedExpiry = expiryDate.toLocaleDateString('fa-IR');

                userSubscriptions[targetUserId] = {
                    planName: subInfo.planName,
                    expiryDate: formattedExpiry,
                    volume: subInfo.planVolume,
                    configLink: subInfo.planLink,
                    name: 'مشتری'
                };
                delete userSubscriptions[pendingKey];

                bot.sendMessage(targetUserId, `🎉 **پرداخت و اشتراک شما تایید و فعال شد!**\n\n📦 پلن: ${subInfo.planName}\n🌐 حجم: ${subInfo.planVolume}\n⏳ مدت: ${subInfo.planDuration}\n\n🔗 **لینک اتصال اختصاصی شما:**\n\`${subInfo.planLink}\``, { parse_mode: 'Markdown' });
                bot.sendMessage(chatId, '✅ تایید شد و لینک اشتراک به کاربر ارسال گردید.');
            } else {
                bot.sendMessage(chatId, '❌ اطلاعات این خرید یافت نشد.');
            }
        } else {
            delete userSubscriptions[pendingKey];
            bot.sendMessage(targetUserId, '❌ متأسفانه رسید پرداخت شما توسط مدیریت رد شد.');
            bot.sendMessage(chatId, '❌ رسید رد شد.');
        }
    }
});

process.on('uncaughtException', (err) => {
    console.error('خطا:', err);
});

console.log('🤖 ربات با سیستم مدیریت پویا و پیشرفته پلن‌ها اجرا شد.');
