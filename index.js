const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios'); // برای خوندن محتوای لینک‌ها

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

// لیست پلن‌ها (فیلد price به ساختار پلن اضافه شد)
let customPlans = [
    { id: 1, name: 'اشتراک اقتصادی 🌟', volume: '30 گیگابایت', duration: '30 روزه', price: '95,000 تومان', link: 'https://example.com/sub/1' },
    { id: 2, name: 'اشتراک نامحدود 🔥', volume: 'نامحدود (VIP)', duration: '30 روزه', price: '180,000 تومان', link: 'https://example.com/sub/2' }
]; 

let paymentCardNumber = '6037-9971-xxxx-xxxx'; 
let paymentCardOwner = 'مالک ربات';
const REWARD_AMOUNT = 5000;  

app.get('/', (req, res) => {
    res.send('Bot is running with Link Parser & Config Details!');
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

// تابع هوشمند برای خواندن و استخراج جزئیات از لینک یا سابسکریپشن
async function fetchAndParseConfig(url) {
    try {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            const response = await axios.get(url, { timeout: 10000 });
            const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            
            let decodedContent = data;
            try {
                const buff = Buffer.from(data.trim(), 'base64');
                const str = buff.toString('utf8');
                if (str.includes('vless://') || str.includes('vmess://') || str.includes('trojan://') || str.includes('ss://')) {
                    decodedContent = str;
                }
            } catch (e) {}

            const lines = decodedContent.split('\n').filter(l => l.trim().length > 0);
            const foundConfigs = lines.filter(l => l.startsWith('vless://') || l.startsWith('vmess://') || l.startsWith('trojan://') || l.startsWith('ss://'));

            return {
                isSubLink: true,
                rawContent: data,
                extractedConfigs: foundConfigs.length > 0 ? foundConfigs : [data]
            };
        } else {
            return {
                isSubLink: false,
                rawContent: url,
                extractedConfigs: [url]
            };
        }
    } catch (error) {
        console.error('خطا در خواندن لینک کانفیگ:', error.message);
        return {
            isSubLink: false,
            rawContent: url,
            extractedConfigs: [url]
        };
    }
}

async function sendMainMenu(chatId) {
    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🛒 خرید اشتراک پرسرعت', callback_data: 'buy_sub' }],
                [
                    { text: '🎁 اشتراک رایگان', callback_data: 'free_sub' },
                    { text: '🧪 سرور تست', callback_data: 'test_server' }
                ],
                [{ text: '💰 کیف پول من', callback_data: 'wallet' }],
                [
                    { text: '📱 اشتراک‌های من', callback_data: 'my_subs' },
                    { text: '📖 آموزش اتصال', callback_data: 'tutorial' }
                ],
                [{ text: '🤝 درخواست نمایندگی', callback_data: 'agency' }],
                [
                    { text: '👥 دعوت دوستان (زیرمجموعه‌گیری)', callback_data: 'invite' },
                    { text: '📞 پشتیبانی آنلاین', callback_data: 'support' }
                ]
            ]
        }
    };
    bot.sendMessage(chatId, '✨ **به ربات انحصاری ما خوش آمدید**\n\nلطفاً از منوی زیر گزینه موردنظر خود را انتخاب کنید: 👇', { parse_mode: 'Markdown', ...inlineKeyboard });
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

            bot.sendMessage(refId, `🎉 **تبریک!**\nیک نفر با لینک دعوت شما وارد ربات شد.\n\n💰 مبلغ ${REWARD_AMOUNT.toLocaleString()} تومان پاداش به کیف پول شما اضافه شد.`, { parse_mode: 'Markdown' })
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
        bot.sendMessage(chatId, '👑 مدیر گرامی، دسترسی‌های پنل برای شما فعال شد.', adminReplyKeyboard);
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
                    { text: '⚙️ مدیریت پلن‌ها و قیمت‌ها', callback_data: 'admin_manage_plans' },
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
        bot.sendMessage(chatId, '⚙️ **مدیریت پلن‌ها و اشتراک‌ها**', { parse_mode: 'Markdown', ...plansMenuKeyboard });
        return;
    }

    if (data === 'plan_mgmt_add') {
        userStates[chatId] = { step: 'get_new_plan_name' };
        bot.sendMessage(chatId, '➕ **ساخت پلن جدید**\n\nلطفاً **نام پلن** را وارد کنید:', { parse_mode: 'Markdown' });
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
            textList += `${index + 1}. **${p.name}**\n   🌐 حجم: ${p.volume} | ⏳ زمان: ${p.duration} | 💵 قیمت: ${p.price}\n   🔗 لینک: \`${p.link}\`\n\n`;
            inlineBtns.push([
                { text: `✏️ ویرایش: ${p.name}`, callback_data: `edit_plan_${p.id}` },
                { text: `🗑 حذف`, callback_data: `del_plan_${p.id}` }
            ]);
        });

        inlineBtns.push([{ text: '🔙 بازگشت', callback_data: 'admin_manage_plans' }]);
        bot.sendMessage(chatId, textList, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineBtns } });
        return;
    }

    if (data.startsWith('del_plan_')) {
        const planId = parseInt(data.split('_')[2]);
        customPlans = customPlans.filter(p => p.id !== planId);
        bot.sendMessage(chatId, '🗑 پلن با موفقیت حذف شد.');
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
        bot.sendMessage(chatId, '💳 **تنظیمات کارت به کارت**\n\nشماره کارت فعلی: `' + paymentCardNumber + '`\n\nشماره کارت جدید را بفرستید:', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_receipts') {
        bot.sendMessage(chatId, '📋 رسیدهای واریزی کاربران به همراه دکمه‌های تایید به اینجا می‌آیند.');
        return;
    }

    if (data === 'admin_charge_wallet') {
        userStates[chatId] = { step: 'get_charge_user_id' };
        bot.sendMessage(chatId, '💰 آیدی عددی کاربر را وارد کنید:');
        return;
    }

    if (data === 'admin_history') {
        const activeSubKeys = Object.keys(userSubscriptions);
        if (activeSubKeys.length === 0) {
            bot.sendMessage(chatId, '📦 هیچ اشتراک فعالی ثبت نشده است.');
            return;
        }
        let historyText = '📦 **اشتراک‌های فعال:**\n\n';
        activeSubKeys.forEach((uId, index) => {
            const sub = userSubscriptions[uId];
            historyText += (index + 1) + '. آیدی: `' + uId + '` | پلن: ' + sub.planName + '\n';
        });
        bot.sendMessage(chatId, historyText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_users') {
        bot.sendMessage(chatId, '👥 تعداد کل کاربران: ' + allUsers.size + ' نفر');
        return;
    }

    if (data === 'admin_stats') {
        bot.sendMessage(chatId, '📊 کل کاربران: `' + allUsers.size + '`\n📦 اشتراک‌ها: `' + Object.keys(userSubscriptions).length + '`', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_broadcast') {
        userStates[chatId] = { step: 'get_broadcast_content' };
        bot.sendMessage(chatId, '📢 متن یا عکس پیام همگانی را بفرستید:');
        return;
    }

    if (data === 'admin_user_messages') {
        bot.sendMessage(chatId, '💬 برای پاسخ به پیام مشتریان روی پیامشان Reply کنید.');
        return;
    }

    // ⭐ بخش خرید اشتراک با ظاهر شیک، مرتب و تفکیک قیمت‌ها
    if (data === 'buy_sub') {
        if (customPlans.length === 0) {
            bot.sendMessage(chatId, '🛒 در حال حاضر هیچ پلنی تعریف نشده است.');
            return;
        }

        let planText = '🛒 **لیست پلن‌های اشتراک پرسرعت:**\n\nلطفاً پلن مد نظر خود را از دکمه‌های زیر انتخاب کنید 👇';
        const planButtons = customPlans.map(p => [
            { text: `🔹 ${p.name} | 💰 ${p.price}`, callback_data: `buy_custom_${p.id}` }
        ]);
        planButtons.push([{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]);

        bot.sendMessage(chatId, planText, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: planButtons } });
        return;
    }

    if (data.startsWith('buy_custom_')) {
        const planId = parseInt(data.split('_')[2]);
        const selectedPlan = customPlans.find(p => p.id === planId);

        if (!selectedPlan) {
            bot.sendMessage(chatId, '❌ این پلن وجود ندارد.');
            return;
        }

        userStates[chatId] = { 
            awaiting_receipt: true, 
            selectedPlanName: selectedPlan.name, 
            selectedPlanLink: selectedPlan.link, 
            selectedPlanVolume: selectedPlan.volume, 
            selectedPlanDuration: selectedPlan.duration,
            selectedPlanPrice: selectedPlan.price
        };

        const checkoutText = `📋 **فاکتور نهایی خرید اشتراک**\n\n` +
                             `━━━━━━━━━━━━━━━━━━━\n` +
                             `🏷 نام پلن: \`${selectedPlan.name}\`\n` +
                             `🌐 حجم ترافیک: \`${selectedPlan.volume}\`\n` +
                             `⏳ مدت زمان: \`${selectedPlan.duration}\`\n` +
                             `💵 **مبلغ قابل پرداخت: ${selectedPlan.price}**\n` +
                             `━━━━━━━━━━━━━━━━━━━\n\n` +
                             `💳 لطفاً مبلغ فوق را به شماره کارت زیر واریز نموده و تصویر رسید آن را همینجا ارسال کنید:\n\n` +
                             `📌 شماره کارت:\n\`${paymentCardNumber}\`\n` +
                             `👤 به نام: *${paymentCardOwner}*`;

        bot.sendMessage(chatId, checkoutText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'free_sub') {
        bot.sendMessage(chatId, '🎁 برای دریافت اشتراک رایگان از بخش دعوت دوستان اقدام کنید.');
        return;
    }

    if (data === 'test_server') {
        bot.sendMessage(chatId, '🧪 سرور تست ربات فعال است.');
        return;
    }

    if (data === 'wallet') {
        const balance = userWallets[chatId] || 0;
        bot.sendMessage(chatId, '💰 موجودی کیف پول: `' + balance.toLocaleString() + ' تومان`', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'my_subs') {
        const sub = userSubscriptions[chatId];
        if (sub) {
            let subText = `📱 **اشتراک فعال شما:**\n\n📦 پلن: ${sub.planName}\n⏳ انقضا: ${sub.expiryDate}\n🌐 حجم: ${sub.volume || 'نامحدود'}\n\n🔗 **لینک اشتراک:**\n\`${sub.configLink}\``;
            if (sub.extractedConfigs && sub.extractedConfigs.length > 0) {
                subText += `\n\n⚙️ **کدهای کانفیگ استخراج شده:**\n\`\`\`\n${sub.extractedConfigs.slice(0, 3).join('\n')}\n\`\`\``;
            }
            bot.sendMessage(chatId, subText, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '📱 اشتراک فعالی ندارید.');
        }
        return;
    }

    if (data === 'tutorial') {
        bot.sendMessage(chatId, '📖 آموزش اتصال برقرار است.');
        return;
    }

    if (data === 'agency') {
        bot.sendMessage(chatId, '🤝 برای نمایندگی با پشتیبانی ارتباط بگیرید.');
        return;
    }

    if (data === 'invite') {
        const userRefCount = referals[chatId] || 0;
        const inviteLink = `https://t.me/${bot.options.username}?start=${chatId}`;
        bot.sendMessage(chatId, `👥 لینک دعوت شما:\n\`${inviteLink}\`\nتعداد زیرمجموعه: ${userRefCount}`, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'support') {
        userStates[chatId] = { awaiting_support_message: true };
        bot.sendMessage(chatId, '📞 پیام خود را بفرستید:');
        return;
    }

    if (data === 'back_to_main') {
        delete userStates[chatId];
        bot.sendMessage(chatId, '🏠 به منوی اصلی بازگشتید.');
        sendMainMenu(chatId);
        return;
    }
});

bot.on('message', async (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;
    const text = msg.text;

    if (chatId === ADMIN_CHAT_ID && text === '💻 پنل مدیریت') return;

    // ثبت پلن جدید مرحله به مرحله (شامل فیلد قیمت)
    if (chatId === ADMIN_CHAT_ID && userStates[chatId]) {
        const state = userStates[chatId];

        if (state.step === 'get_new_plan_name') {
            state.planName = text.trim();
            state.step = 'get_new_plan_volume';
            bot.sendMessage(chatId, '🌐 حجم اشتراک (مثلا 50 گیگ) را وارد کنید:');
            return;
        } else if (state.step === 'get_new_plan_volume') {
            state.planVolume = text.trim();
            state.step = 'get_new_plan_duration';
            bot.sendMessage(chatId, '⏳ زمان اعتبار (مثلا 1 ماهه) را وارد کنید:');
            return;
        } else if (state.step === 'get_new_plan_duration') {
            state.planDuration = text.trim();
            state.step = 'get_new_plan_price';
            bot.sendMessage(chatId, '💵 قیمت پلن (مثلا 120,000 تومان) را وارد کنید:');
            return;
        } else if (state.step === 'get_new_plan_price') {
            state.planPrice = text.trim();
            state.step = 'get_new_plan_link';
            bot.sendMessage(chatId, '🔗 لینک سابسکریپشن یا کانفیگ مربوط به این پلن را وارد کنید:');
            return;
        } else if (state.step === 'get_new_plan_link') {
            const newPlan = {
                id: Date.now(),
                name: state.planName,
                volume: state.planVolume,
                duration: state.planDuration,
                price: state.planPrice,
                link: text.trim()
            };
            customPlans.push(newPlan);
            delete userStates[chatId];
            bot.sendMessage(chatId, `🎉 پلن **${newPlan.name}** با موفقیت و با قیمت **${newPlan.price}** ساخته شد!`, { parse_mode: 'Markdown' });
            return;
        }

        if (state.step === 'edit_plan_name') {
            state.editName = text.trim();
            state.step = 'edit_plan_volume';
            bot.sendMessage(chatId, '🌐 حجم جدید را وارد کنید:');
            return;
        } else if (state.step === 'edit_plan_volume') {
            state.editVolume = text.trim();
            state.step = 'edit_plan_duration';
            bot.sendMessage(chatId, '⏳ زمان جدید را وارد کنید:');
            return;
        } else if (state.step === 'edit_plan_duration') {
            state.editDuration = text.trim();
            state.step = 'edit_plan_price';
            bot.sendMessage(chatId, '💵 قیمت جدید را وارد کنید:');
            return;
        } else if (state.step === 'edit_plan_price') {
            state.editPrice = text.trim();
            state.step = 'edit_plan_link';
            bot.sendMessage(chatId, '🔗 لینک جدید را وارد کنید:');
            return;
        } else if (state.step === 'edit_plan_link') {
            const planIndex = customPlans.findIndex(p => p.id === state.editPlanId);
            if (planIndex !== -1) {
                customPlans[planIndex] = {
                    id: state.editPlanId,
                    name: state.editName,
                    volume: state.editVolume,
                    duration: state.editDuration,
                    price: state.editPrice,
                    link: text.trim()
                };
            }
            delete userStates[chatId];
            bot.sendMessage(chatId, '✅ پلن با موفقیت ویرایش شد.');
            return;
        }
    }

    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_new_card_number') {
        paymentCardNumber = text.trim();
        delete userStates[chatId];
        bot.sendMessage(chatId, '✅ شماره کارت آپدیت شد.');
        return;
    }

    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_broadcast_content') {
        delete userStates[chatId];
        bot.sendMessage(chatId, '⏳ در حال ارسال همگانی...');
        Array.from(allUsers).forEach(uId => {
            bot.sendMessage(uId, text).catch(() => {});
        });
        bot.sendMessage(ADMIN_CHAT_ID, '✅ ارسال همگانی تمام شد.');
        return;
    }

    if (chatId === ADMIN_CHAT_ID && msg.reply_to_message) {
        const repliedText = msg.reply_to_message.caption || '';
        const match = repliedText.match(/آیدی عددی: `(\d+)`/);
        if (match && match[1]) {
            bot.sendMessage(match[1], '💬 **پاسخ پشتیبانی:**\n\n' + text);
            bot.sendMessage(ADMIN_CHAT_ID, '✅ پاسخ ارسال شد.');
            return;
        }
    }

    if (userStates[chatId] && userStates[chatId].awaiting_support_message) {
        delete userStates[chatId];
        bot.sendMessage(chatId, '✅ پیام به پشتیبانی ارسال شد.');
        bot.sendMessage(ADMIN_CHAT_ID, `💬 **پیام جدید از کاربر (${chatId}):**\n\n${text}`);
        return;
    }
});

bot.on('photo', async (msg) => {
    trackUser(msg);
    const chatId = msg.chat.id;
    
    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_broadcast_content') return;

    const userId = msg.from.id;
    const username = msg.from.username ? '@' + msg.from.username : 'ندارد';
    const name = msg.from.first_name || 'کاربر';

    if (userStates[chatId] && userStates[chatId].awaiting_receipt) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const planName = userStates[chatId].selectedPlanName;
        const planLink = userStates[chatId].selectedPlanLink;
        const planVolume = userStates[chatId].selectedPlanVolume;
        const planDuration = userStates[chatId].selectedPlanDuration;
        const planPrice = userStates[chatId].selectedPlanPrice;

        bot.sendMessage(chatId, '✅ رسید دریافت شد. پس از بررسی ادمین، اشتراک و کدهای شما ارسال می‌شود.');
        delete userStates[chatId];

        const parsedData = await fetchAndParseConfig(planLink);

        const savedStateInfo = { 
            planName, 
            configLink: planLink, 
            planVolume, 
            planDuration,
            planPrice,
            extractedConfigs: parsedData.extractedConfigs 
        };

        userSubscriptions[`pending_${userId}`] = savedStateInfo;

        const caption = `🔔 **رسید جدید خرید اشتراک!**\n\n` +
                        `👤 نام: ${name}\n` +
                        `🆔 یوزرنیم: ${username}\n` +
                        `🔢 آیدی عددی: \`${userId}\`\n` +
                        `📦 پلن: ${planName}\n` +
                        `💵 قیمت: ${planPrice}\n` +
                        `🌐 حجم: ${planVolume}\n` +
                        `⏳ زمان: ${planDuration}`;

        const adminActionKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ تایید و ارسال اشتراک', callback_data: `approve_custom_${userId}` },
                        { text: '❌ رد رسید', callback_data: `reject_custom_${userId}` }
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
                expiryDate.setDate(expiryDate.getDate() + 30);
                const formattedExpiry = expiryDate.toLocaleDateString('fa-IR');

                userSubscriptions[targetUserId] = {
                    planName: subInfo.planName,
                    expiryDate: formattedExpiry,
                    volume: subInfo.planVolume,
                    configLink: subInfo.configLink,
                    extractedConfigs: subInfo.extractedConfigs
                };
                delete userSubscriptions[pendingKey];

                let userMsg = `🎉 **اشتراک شما تایید و فعال شد!**\n\n` +
                              `📦 پلن: ${subInfo.planName}\n` +
                              `🌐 حجم: ${subInfo.planVolume}\n` +
                              `⏳ مدت: ${subInfo.planDuration}\n` +
                              `💵 قیمت: ${subInfo.planPrice}\n\n` +
                              `🔗 **لینک اشتراک (Subscription):**\n\`${subInfo.configLink}\``;

                if (subInfo.extractedConfigs && subInfo.extractedConfigs.length > 0) {
                    userMsg += `\n\n⚙️ **کدهای کانفیگ خوانده‌شده:**\n\`\`\`\n${subInfo.extractedConfigs.join('\n\n')}\n\`\`\``;
                }

                bot.sendMessage(targetUserId, userMsg, { parse_mode: 'Markdown' }).catch(() => {
                    bot.sendMessage(targetUserId, `🎉 اشتراک شما تایید شد!\n\nلینک سابسکریپشن:\n${subInfo.configLink}`);
                });

                bot.sendMessage(chatId, '✅ تایید شد و جزئیات + کدهای کانفیگ به کاربر ارسال گردید.');
            } else {
                bot.sendMessage(chatId, '❌ اطلاعات این خرید یافت نشد.');
            }
        } else {
            delete userSubscriptions[pendingKey];
            bot.sendMessage(targetUserId, '❌ متأسفانه رسید پرداخت شما رد شد.');
            bot.sendMessage(chatId, '❌ رسید رد شد.');
        }
    }
});

process.on('uncaughtException', (err) => {
    console.error('خطا:', err);
});

console.log('🤖 ربات کامل با قابلیت خواندن لینک، استخراج کانفیگ، پنل مدیریت پیشرفته و بخش خرید قیمت‌دار اجرا شد.');
