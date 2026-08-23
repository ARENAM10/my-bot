const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';
const bot = new TelegramBot(TOKEN, { polling: true });

const ADMIN_USERNAME = 'arenam_10';
const ADMIN_CHAT_ID = 8923324852;

const CHANNEL_USERNAME = '@YourChannelUsername'; 
let isForceJoinEnabled = false; 

// قابلیت‌های قابل کنترل ادمین (سرور تست و سیستم زیرمجموعه‌گیری)
let isTestServerEnabled = true;     
let isInviteSystemEnabled = true;    

const userStates = {};       
const userSubscriptions = {}; 
const userWallets = {};      
const pending_deposits = {}; 
const allUsers = new Set();  
const referals = {};         

let customPlans = [
    { 
        id: 1, 
        name: 'اشتراک اقتصادی 🌟', 
        volume: '10 گیگابایت', 
        duration: '30 روزه', 
        price: '95,000 تومان', 
        links: [
            'https://example.com/sub/1-1', 
            'https://example.com/sub/1-2', 
            'https://example.com/sub/1-3'
        ] 
    },
    { 
        id: 2, 
        name: 'اشتراک نامحدود 🔥', 
        volume: 'نامحدود (VIP)', 
        duration: '30 روزه', 
        price: '180,000 تومان', 
        links: [
            'https://example.com/sub/2-1'
        ] 
    }
]; 

let paymentCardNumber = '6037-9971-xxxx-xxxx'; 
let paymentCardOwner = 'مالک ربات';
const REWARD_AMOUNT = 5000;  

app.get('/', (req, res) => {
    res.send('Bot is running with full features!');
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

function parsePrice(priceStr) {
    if (!priceStr) return 0;
    const digits = priceStr.replace(/[^0-9]/g, '');
    return parseInt(digits, 10) || 0;
}

function trackUser(msg) {
    if (msg && msg.chat && msg.chat.id) {
        const chatId = msg.chat.id;
        if (!allUsers.has(chatId)) {
            allUsers.add(chatId);
            if (chatId !== ADMIN_CHAT_ID) {
                const user = msg.from;
                const name = user.first_name || 'بدون نام';
                const username = user.username ? `@${user.username}` : 'ندارد';
                const memberReport = `👤 **کاربر جدید وارد ربات شد!**\n\n` +
                                     `📛 نام: ${name}\n` +
                                     `🆔 یوزرنیم: ${username}\n` +
                                     `🔢 آیدی عددی: \`${chatId}\`\n` +
                                     `📊 کل کاربران تاکنون: ${allUsers.size} نفر`;
                bot.sendMessage(ADMIN_CHAT_ID, memberReport, { parse_mode: 'Markdown' }).catch(() => {});
            }
        }
    }
}

async function checkMembership(userId) {
    if (!CHANNEL_USERNAME || CHANNEL_USERNAME === '@YourChannelUsername') return true;
    try {
        const chatMember = await bot.getChatMember(CHANNEL_USERNAME, userId);
        const status = chatMember.status;
        return ['creator', 'administrator', 'member'].includes(status);
    } catch (error) {
        return true; 
    }
}

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
                    ...(isTestServerEnabled ? [{ text: '🧪 سرور تست', callback_data: 'test_server' }] : [])
                ],
                [{ text: '💰 کیف پول من', callback_data: 'wallet' }],
                [
                    { text: '📱 اشتراک‌های من', callback_data: 'my_subs' },
                    { text: '📖 آموزش اتصال', callback_data: 'tutorial' }
                ],
                [{ text: '🤝 درخواست نمایندگی', callback_data: 'agency' }],
                [
                    ...(isInviteSystemEnabled ? [{ text: '👥 دعوت دوستان (زیرمجموعه‌گیری)', callback_data: 'invite' }] : []),
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

    if (isInviteSystemEnabled && refId && refId !== chatId.toString()) {
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
    const forceJoinStatus = isForceJoinEnabled ? '🟢 جوین اجباری: روشن' : '🔴 جوین اجباری: خاموش';
    const testServerStatus = isTestServerEnabled ? '🟢 سرور تست: روشن' : '🔴 سرور تست: خاموش';
    const inviteStatus = isInviteSystemEnabled ? '🟢 زیرمجموعه‌گیری: روشن' : '🔴 زیرمجموعه‌گیری: خاموش';
    
    const adminKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '⚙️ مدیریت پلن‌ها و لینک‌ها', callback_data: 'admin_manage_plans' },
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
                    { text: testServerStatus, callback_data: 'toggle_test_server' },
                    { text: inviteStatus, callback_data: 'toggle_invite_system' }
                ],
                [
                    { text: forceJoinStatus, callback_data: 'toggle_force_join' },
                    { text: '📢 ارسال همگانی', callback_data: 'admin_broadcast' }
                ],
                [
                    { text: '💳 تنظیمات پرداخت', callback_data: 'admin_pay_settings' }
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

    // دکمه‌های کنترل ادمین برای سرور تست و زیرمجموعه‌گیری
    if (data === 'toggle_force_join') {
        if (!isAdmin(callbackQuery)) return;
        isForceJoinEnabled = !isForceJoinEnabled;
        bot.sendMessage(chatId, `جوین اجباری ${isForceJoinEnabled ? 'روشن' : 'خاموش'} شد.`);
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'toggle_test_server') {
        if (!isAdmin(callbackQuery)) return;
        isTestServerEnabled = !isTestServerEnabled;
        bot.sendMessage(chatId, `🧪 بخش سرور تست با موفقیت ${isTestServerEnabled ? 'روشن' : 'خاموش'} شد.`);
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'toggle_invite_system') {
        if (!isAdmin(callbackQuery)) return;
        isInviteSystemEnabled = !isInviteSystemEnabled;
        bot.sendMessage(chatId, `👥 بخش زیرمجموعه‌گیری با موفقیت ${isInviteSystemEnabled ? 'روشن' : 'خاموش'} شد.`);
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'check_membership') {
        const isMember = await checkMembership(userId);
        if (isMember) {
            bot.sendMessage(chatId, '✅ عضویت شما تایید شد! حالا می‌توانید از ربات استفاده کنید.');
            sendMainMenu(chatId);
        } else {
            bot.sendMessage(chatId, '❌ شما هنوز در کانال عضو نشده‌اید. لطفاً ابتدا جوین شوید.');
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
                    [{ text: '➕ افزودن پلن جدید', callback_data: 'plan_mgmt_add' }],
                    [{ text: '📋 لیست پلن‌ها و افزودن لینک', callback_data: 'plan_mgmt_list' }],
                    [{ text: '🔙 بازگشت به پنل', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '⚙️ **مدیریت پلن‌ها و چند کانفیگ**', { parse_mode: 'Markdown', ...plansMenuKeyboard });
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

        let textList = '📋 **لیست پلن‌ها و تعداد کانفیگ‌های موجود:**\n\n';
        const inlineBtns = [];

        customPlans.forEach((p) => {
            textList += `▪️ **${p.name}**\n   🌐 حجم: ${p.volume} | ⏳ زمان: ${p.duration} | 💵 قیمت: ${p.price}\n   📦 تعداد کانفیگ در انبار: **${p.links.length} عدد**\n\n`;
            inlineBtns.push([
                { text: `➕ افزودن لینک به: ${p.name}`, callback_data: `add_link_${p.id}` },
                { text: `🗑 حذف کل پلن`, callback_data: `del_plan_${p.id}` }
            ]);
        });

        inlineBtns.push([{ text: '🔙 بازگشت', callback_data: 'admin_manage_plans' }]);
        bot.sendMessage(chatId, textList, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineBtns } });
        return;
    }

    if (data.startsWith('add_link_')) {
        const planId = parseInt(data.split('_')[2]);
        userStates[chatId] = { step: 'get_extra_link_for_plan', targetPlanId: planId };
        bot.sendMessage(chatId, '🔗 لطفاً لینک سابسکریپشن یا کانفیگ جدید را بفرستید تا به این پلن اضافه شود:', { parse_mode: 'Markdown' });
        return;
    }

    if (data.startsWith('del_plan_')) {
        const planId = parseInt(data.split('_')[2]);
        customPlans = customPlans.filter(p => p.id !== planId);
        bot.sendMessage(chatId, '🗑 پلن با موفقیت حذف شد.');
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
        bot.sendMessage(chatId, '💰 برای شارژ کیف پول کاربر، از طریق پیام به او اقدام کنید.');
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

    if (data === 'wallet') {
        const balance = userWallets[chatId] || 0;
        const walletKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ شارژ کیف پول (مبلغ دلخواه)', callback_data: 'wallet_deposit' }],
                    [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]
                ]
            }
        };
        bot.sendMessage(chatId, `💰 **کیف پول اختصاصی شما**\n\nموجودی فعلی: \`${balance.toLocaleString()} تومان\`\n\nبرای افزایش موجودی، روی دکمه زیر کلیک کنید:`, { parse_mode: 'Markdown', ...walletKeyboard });
        return;
    }

    if (data === 'wallet_deposit') {
        userStates[chatId] = { step: 'get_wallet_deposit_amount' };
        bot.sendMessage(chatId, '💳 **شارژ کیف پول**\n\nلطفاً مبلغ مورد نظر خود برای شارژ را (به تومان، مثلاً `50000`) وارد کنید:', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'buy_sub') {
        const availablePlans = customPlans.filter(p => p.links && p.links.length > 0);
        if (availablePlans.length === 0) {
            bot.sendMessage(chatId, '🛒 در حال حاضر هیچ پلن یا کانفیگی برای فروش موجود نیست.');
            return;
        }

        let planText = '🛒 **لیست پلن‌های اشتراک پرسرعت:**\n\nلطفاً پلن مد نظر خود را انتخاب کنید 👇';
        const planButtons = availablePlans.map(p => [
            { text: `🌐 ${p.volume} | 💰 ${p.price}`, callback_data: `buy_custom_${p.id}` }
        ]);
        planButtons.push([{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]);

        bot.sendMessage(chatId, planText, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: planButtons } });
        return;
    }

    if (data.startsWith('buy_custom_')) {
        const planId = parseInt(data.split('_')[2]);
        const selectedPlan = customPlans.find(p => p.id === planId);

        if (!selectedPlan || selectedPlan.links.length === 0) {
            bot.sendMessage(chatId, '❌ متأسفانه این پلن تمام شده است.');
            return;
        }

        const priceNumber = parsePrice(selectedPlan.price);
        const userBalance = userWallets[chatId] || 0;

        const inlineBtns = [];
        let paymentDesc = `📋 **فاکتور نهایی خرید اشتراک**\n\n` +
                          `🏷 نام پلن: \`${selectedPlan.name}\`\n` +
                          `🌐 حجم ترافیک: \`${selectedPlan.volume}\`\n` +
                          `⏳ مدت زمان: \`${selectedPlan.duration}\`\n` +
                          `💵 **مبلغ قابل پرداخت: ${selectedPlan.price}**\n` +
                          `💰 موجودی کیف پول شما: \`${userBalance.toLocaleString()} تومان\`\n\n`;

        if (userBalance >= priceNumber) {
            paymentDesc += `✅ موجودی کیف پول شما برای پرداخت این پلن **کافی** است.`;
            inlineBtns.push([{ text: `💳 پرداخت آنی از کیف پول (${selectedPlan.price})`, callback_data: `pay_wallet_${selectedPlan.id}` }]);
        } else {
            paymentDesc += `⚠️ موجودی کیف پول شما **کافی نیست**.`;
            inlineBtns.push([{ text: `➕ شارژ کیف پول`, callback_data: 'wallet_deposit' }]);
        }
        inlineBtns.push([{ text: `💳 پرداخت از طریق کارت به کارت`, callback_data: `pay_card_${selectedPlan.id}` }]);
        inlineBtns.push([{ text: `🔙 بازگشت`, callback_data: 'buy_sub' }]);

        bot.sendMessage(chatId, paymentDesc, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineBtns } });
        return;
    }

    if (data.startsWith('pay_wallet_')) {
        const planId = parseInt(data.split('_')[2]);
        const plan = customPlans.find(p => p.id === planId);

        if (!plan || plan.links.length === 0) {
            bot.sendMessage(chatId, '❌ پلن نامعتبر یا تمام شده است.');
            return;
        }

        const priceNumber = parsePrice(plan.price);
        const userBalance = userWallets[chatId] || 0;

        if (userBalance < priceNumber) {
            bot.sendMessage(chatId, '❌ موجودی کیف پول شما کافی نیست.');
            return;
        }

        userWallets[chatId] -= priceNumber;
        const assignedLink = plan.links.shift();
        delete userStates[chatId];

        const parsedData = await fetchAndParseConfig(assignedLink);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        const formattedExpiry = expiryDate.toLocaleDateString('fa-IR');

        userSubscriptions[chatId] = {
            planName: plan.name,
            expiryDate: formattedExpiry,
            volume: plan.volume,
            configLink: assignedLink,
            extractedConfigs: parsedData.extractedConfigs
        };

        let userMsg = `🎉 **خرید موفقیت‌آمیز و از کیف پول کسر شد!**\n\n` +
                      `📦 پلن: ${plan.name}\n` +
                      `🌐 حجم: ${plan.volume}\n` +
                      `💵 مبلغ کسر شده: ${plan.price}\n` +
                      `💰 موجودی جدید کیف پول: \`${userWallets[chatId].toLocaleString()} تومان\`\n\n` +
                      `🔗 **لینک اشتراک شما:**\n\`${assignedLink}\``;

        if (parsedData.extractedConfigs && parsedData.extractedConfigs.length > 0) {
            userMsg += `\n\n⚙️ **کانفیگ‌ها:**\n\`\`\`\n${parsedData.extractedConfigs.join('\n\n')}\n\`\`\``;
        }

        bot.sendMessage(chatId, userMsg, { parse_mode: 'Markdown' });
        return;
    }

    if (data.startsWith('pay_card_')) {
        const planId = parseInt(data.split('_')[2]);
        const plan = customPlans.find(p => p.id === planId);
        if (!plan || plan.links.length === 0) return;

        const assignedLink = plan.links[0];
        userStates[chatId] = { 
            awaiting_receipt: true, 
            planId: plan.id,
            selectedPlanName: plan.name, 
            selectedPlanLink: assignedLink, 
            selectedPlanVolume: plan.volume, 
            selectedPlanDuration: plan.duration,
            selectedPlanPrice: plan.price
        };

        const checkoutText = `📋 **فاکتور نهایی خرید (کارت به کارت)**\n\n` +
                             `🏷 پلن: \`${plan.name}\` | 💵 مبلغ: \`${plan.price}\`\n\n` +
                             `💳 به شماره کارت زیر واریز کرده و رسید بفرستید:\n\`${paymentCardNumber}\`\n👤 به نام: *${paymentCardOwner}*`;

        bot.sendMessage(chatId, checkoutText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'free_sub') {
        bot.sendMessage(chatId, '🎁 برای دریافت اشتراک رایگان از بخش دعوت دوستان اقدام کنید.');
        return;
    }

    if (data === 'test_server') {
        if (!isTestServerEnabled) {
            bot.sendMessage(chatId, '❌ سرور تست در حال حاضر غیرفعال است.');
            return;
        }
        bot.sendMessage(chatId, '🧪 سرور تست ربات فعال و آماده تست است.');
        return;
    }

    if (data === 'my_subs') {
        const sub = userSubscriptions[chatId];
        if (sub) {
            let subText = `📱 **اشتراک فعال شما:**\n\n📦 پلن: ${sub.planName}\n⏳ انقضا: ${sub.expiryDate}\n🌐 حجم: ${sub.volume || 'نامحدود'}\n\n🔗 **لینک اشتراک:**\n\`${sub.configLink}\``;
            bot.sendMessage(chatId, subText, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '📱 اشتراک فعالی ندارید.');
        }
        return;
    }

    if (data === 'tutorial') {
        // آموزش اتصال خلاصه شده در ۴ خط
        const tutorialText = `📖 **آموزش اتصال:**\n` +
                             `1️⃣ اپلیکیشن V2Ray (مثل v2rayNG یا FoXray) را نصب کنید.\n` +
                             `2️⃣ لینک اشتراک اختصاصی خود را از بخش «اشتراک‌های من» کپی کنید.\n` +
                             `3️⃣ برنامه را باز کرده، روی علامت + یا Import کلیک و لینک را اضافه کنید.\n` +
                             `4️⃣ روی دکمه اتصال (Connect) ضربه بزنید تا متصل شوید.`;
        bot.sendMessage(chatId, tutorialText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'agency') {
        bot.sendMessage(chatId, '🤝 برای نمایندگی با پشتیبانی ارتباط بگیرید.');
        return;
    }

    if (data === 'invite') {
        if (!isInviteSystemEnabled) {
            bot.sendMessage(chatId, '❌ سیستم زیرمجموعه‌گیری در حال حاضر غیرفعال است.');
            return;
        }
        const userRefCount = referals[chatId] || 0;
        const inviteLink = `https://t.me/${bot.options.username}?start=${chatId}`;
        bot.sendMessage(chatId, `👥 **سیستم دعوت از دوستان**\n\nبا ارسال لینک زیر به دوستان خود، به ازای هر ورود پاداش بگیرید:\n\`${inviteLink}\`\n\nتعداد زیرمجموعه‌های شما: ${userRefCount} نفر`, { parse_mode: 'Markdown' });
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

    if (userStates[chatId] && userStates[chatId].step === 'get_wallet_deposit_amount') {
        const amount = parseInt(text.replace(/[^0-9]/g, ''), 10);
        if (!amount || amount <= 0) {
            bot.sendMessage(chatId, '❌ لطفاً یک مبلغ معتبر به صورت عدد وارد کنید.');
            return;
        }
        userStates[chatId] = { step: 'get_wallet_deposit_receipt', depositAmount: amount };
        
        const depositMsg = `💳 **فاکتور شارژ کیف پول**\n\n` +
                           `💵 مبلغ شارژ: \`${amount.toLocaleString()} تومان\`\n\n` +
                           `به شماره کارت زیر واریز کرده و رسید بفرستید:\n\`${paymentCardNumber}\`\n👤 به نام: *${paymentCardOwner}*`;
        bot.sendMessage(chatId, depositMsg, { parse_mode: 'Markdown' });
        return;
    }

    if (chatId === ADMIN_CHAT_ID && userStates[chatId]) {
        const state = userStates[chatId];
        if (state.step === 'get_extra_link_for_plan') {
            const planId = state.targetPlanId;
            const plan = customPlans.find(p => p.id === planId);
            if (plan) {
                plan.links.push(text.trim());
                delete userStates[chatId];
                bot.sendMessage(chatId, `✅ لینک جدید به پلن **${plan.name}** اضافه شد.`);
                return;
            }
        }
        if (state.step === 'get_new_plan_name') {
            state.planName = text.trim();
            state.step = 'get_new_plan_volume';
            bot.sendMessage(chatId, '🌐 حجم اشتراک (مثلا 10 گیگ) را وارد کنید:');
            return;
        } else if (state.step === 'get_new_plan_volume') {
            state.planVolume = text.trim();
            state.step = 'get_new_plan_duration';
            bot.sendMessage(chatId, '⏳ زمان اعتبار را وارد کنید:');
            return;
        } else if (state.step === 'get_new_plan_duration') {
            state.planDuration = text.trim();
            state.step = 'get_new_plan_price';
            bot.sendMessage(chatId, '💵 قیمت پلن را وارد کنید:');
            return;
        } else if (state.step === 'get_new_plan_price') {
            state.planPrice = text.trim();
            state.step = 'get_new_plan_link';
            bot.sendMessage(chatId, '🔗 لینک کانفیگ را وارد کنید:');
            return;
        } else if (state.step === 'get_new_plan_link') {
            customPlans.push({
                id: Date.now(),
                name: state.planName,
                volume: state.planVolume,
                duration: state.planDuration,
                price: state.planPrice,
                links: [text.trim()]
            });
            delete userStates[chatId];
            bot.sendMessage(chatId, `🎉 پلن ساخته شد!`);
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
    const userId = msg.from.id;
    const username = msg.from.username ? '@' + msg.from.username : 'ندارد';
    const name = msg.from.first_name || 'کاربر';

    if (userStates[chatId] && userStates[chatId].step === 'get_wallet_deposit_receipt') {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const amount = userStates[chatId].depositAmount;
        delete userStates[chatId];

        pending_deposits[`deposit_${userId}`] = { amount };
        bot.sendMessage(chatId, '✅ رسید دریافت شد. پس از تایید ادمین مبلغ افزوده می‌شود.');

        const adminDepositKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ تایید شارژ', callback_data: `approve_deposit_${userId}` },
                        { text: '❌ رد رسید', callback_data: `reject_deposit_${userId}` }
                    ]
                ]
            }
        };

        bot.sendPhoto(ADMIN_CHAT_ID, photoId, {
            caption: `🔔 **رسید شارژ کیف پول**\nکاربر: ${name} (\`${userId}\`)\nمبلغ: \`${amount.toLocaleString()} تومان\``,
            parse_mode: 'Markdown',
            ...adminDepositKeyboard
        });
        return;
    }
});

bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;

    if (data.startsWith('approve_deposit_') || data.startsWith('reject_deposit_')) {
        if (!isAdmin(callbackQuery)) return;
        const parts = data.split('_');
        const action = parts[0];
        const targetUserId = parts[2];
        const depositKey = `deposit_${targetUserId}`;

        if (action === 'approve') {
            const depositInfo = pending_deposits[depositKey];
            if (depositInfo) {
                userWallets[targetUserId] = (userWallets[targetUserId] || 0) + depositInfo.amount;
                delete pending_deposits[depositKey];
                bot.sendMessage(targetUserId, `🎉 شارژ کیف پول شما تایید شد!\nمبلغ \`${depositInfo.amount.toLocaleString()} تومان\` اضافه شد.`, { parse_mode: 'Markdown' }).catch(() => {});
                bot.sendMessage(chatId, '✅ شارژ تایید شد.');
            }
        } else {
            delete pending_deposits[depositKey];
            bot.sendMessage(targetUserId, '❌ رسید شارژ شما رد شد.');
            bot.sendMessage(chatId, '❌ رسید رد شد.');
        }
    }
});

process.on('uncaughtException', (err) => {});
console.log('🤖 ربات با موفقیت و تمام قابلیت‌های یکپارچه اجرا شد.');
