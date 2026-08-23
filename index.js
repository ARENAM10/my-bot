const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';
const bot = new TelegramBot(TOKEN, { polling: true });

const ADMIN_USERNAME = 'arenam_10';
const ADMIN_CHAT_ID = 8923324852;
const ADMIN_WEB_PASSWORD = 'admin_secure_password';

// --- مسیر ذخیره‌سازی داده‌ها ---
const DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : __dirname;
const DB_FILE = path.join(DATA_DIR, 'database.json');

let db = {
    CHANNEL_USERNAME: '@YourChannelUsername',
    isForceJoinEnabled: false,
    isTestServerEnabled: true,
    testServerConfig: 'vless://example-test-server-link',
    isFreeSubEnabled: true,
    freeSubConfig: 'vless://example-free-sub-link',
    isInviteSystemEnabled: true,
    userWallets: {},
    pending_deposits: {},
    pending_card_purchases: {},
    allUsers: [],
    usersDetailMap: {},
    receiptsHistory: [],
    referals: {},
    userSubscriptions: {}, 
    allSubscriptionsHistory: [],
    customPlans: [
        { 
            id: 1, 
            name: 'اشتراک اقتصادی 🌟', 
            volume: '10 گیگابایت', 
            duration: '30 روزه', 
            price: '95,000 تومان', 
            links: [
                'https://example.com/sub/1-1', 
                'https://example.com/sub/1-2'
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
    ],
    paymentCardNumber: '6037-9971-xxxx-xxxx'
};

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            const parsed = JSON.parse(data);
            db = { ...db, ...parsed };
        } else {
            saveDatabase();
        }
    } catch (e) {
        console.log('❌ خطا در خواندن دیتابیس:', e);
    }
}

function saveDatabase() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        console.log('❌ خطا در ذخیره‌سازی دیتابیس:', e);
    }
}

loadDatabase();

const userStates = {};       
const REWARD_AMOUNT = 5000;  

// --- بخش وب‌سایت و پنل مدیریت ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
        <html dir="rtl"><head><title>ربات فعال است</title></head>
        <body style="font-family:Tahoma;text-align:center;padding-top:50px;background:#f4f7f6;">
            <h2>🤖 ربات تلگرام و پنل مدیریت با موفقیت آنلاین است</h2>
            <p>برای ورود به پنل مدیریت وب کلیک کنید: <a href="/admin">ورود به پنل مدیریت</a></p>
        </body></html>
    `);
});

app.get('/admin', (req, res) => {
    res.send(`
        <html dir="rtl"><head><title>ورود به پنل مدیریت</title>
        <style>body{font-family:Tahoma;background:#f4f7f6;text-align:center;padding-top:50px;} .box{background:white;padding:30px;width:350px;margin:auto;border-radius:10px;box-shadow:0 0 10px rgba(0,0,0,0.1);} input{width:100%;padding:10px;margin:10px 0;border:1px solid #ccc;border-radius:5px;} button{background:#28a745;color:white;border:none;padding:10px;width:100%;border-radius:5px;cursor:pointer;}</style>
        </head><body>
            <div class="box">
                <h3>🔐 ورود به پنل ادمین</h3>
                <form action="/admin/login" method="POST">
                    <input type="password" name="password" placeholder="رمز عبور ادمین" required>
                    <button type="submit">ورود</button>
                </form>
            </div>
        </body></html>
    `);
});

app.post('/admin/login', (req, res) => {
    if (req.body.password === ADMIN_WEB_PASSWORD) {
        res.redirect('/admin/dashboard');
    } else {
        res.send('<script>alert("رمز عبور اشتباه است!"); window.location="/admin";</script>');
    }
});

app.get('/admin/dashboard', (req, res) => {
    let usersListHtml = '';
    db.allUsers.forEach(uId => {
        const info = db.usersDetailMap[uId] || { name: 'نامشخص', username: 'ندارد', joinedAt: 'نامشخص' };
        const wallet = db.userWallets[uId] || 0;
        usersListHtml += `<tr><td>${uId}</td><td>${info.name}</td><td>${info.username}</td><td>${wallet.toLocaleString()} تومان</td><td>${info.joinedAt}</td></tr>`;
    });

    res.send(`
        <html dir="rtl"><head><title>داشبورد مدیریت</title>
        <style>body{font-family:Tahoma;background:#f8f9fa;margin:0;padding:20px;} .container{max-width:1000px;margin:auto;background:white;padding:25px;border-radius:10px;box-shadow:0 4px 15px rgba(0,0,0,0.05);} h2{color:#333;border-bottom:2px solid #28a745;padding-bottom:10px;} table{width:100%;border-collapse:collapse;margin-top:15px;} th,td{border:1px solid #dee2e6;padding:10px;text-align:center;font-size:14px;} th{background:#343a40;color:white;}</style>
        </head><body>
            <div class="container">
                <h2>🚀 داشبورد مدیریت وب ربات</h2>
                <p><b>تعداد کل کاربران:</b> ${db.allUsers.length} نفر</p>
                <p><b>تعداد کل اشتراک‌های صادر شده:</b> ${db.allSubscriptionsHistory.length} عدد</p>
                <h3>👥 لیست کاربران ربات</h3>
                <table>
                    <tr><th>شناسه</th><th>نام</th><th>یوزرنیم</th><th>کیف پول</th><th>تاریخ عضویت</th></tr>
                    ${usersListHtml}
                </table>
                <br><a href="/admin" style="color:red;text-decoration:none;font-weight:bold;">خروج از پنل</a>
            </div>
        </body></html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server & Web Panel running on port ${PORT}`);
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

// تابع ثبت‌نام کاربر و گزارش فوری به مالک هنگام استارت
function trackUserAndNotifyAdmin(msg) {
    if (msg && msg.from && msg.from.id) {
        const userId = msg.from.id;
        const user = msg.from;
        const name = user.first_name || user.last_name || 'بدون نام';
        const username = user.username ? `@${user.username}` : 'ندارد';
        const chatId = msg.chat ? msg.chat.id : userId;

        let isBrandNew = false;
        if (!db.allUsers.includes(userId)) {
            db.allUsers.push(userId);
            isBrandNew = true;
        }

        if (!db.usersDetailMap[userId]) {
            db.usersDetailMap[userId] = { name, username, joinedAt: new Date().toLocaleString('fa-IR') };
            isBrandNew = true;
        } else {
            db.usersDetailMap[userId].name = name;
            db.usersDetailMap[userId].username = username;
            if (!db.usersDetailMap[userId].joinedAt) {
                db.usersDetailMap[userId].joinedAt = new Date().toLocaleString('fa-IR');
            }
        }
        saveDatabase();

        if (chatId !== ADMIN_CHAT_ID) {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [[{ text: '👤 پروفایل کاربر', url: `tg://user?id=${userId}` }]]
                }
            };
            bot.sendMessage(
                ADMIN_CHAT_ID, 
                `🚀 **کاربر ربات را استارت کرد!**\n\n📛 نام: ${name}\n🔗 یوزرنیم: ${username}\n🆔 آیدی عددی: \`${userId}\`\n📌 وضعیت: ${isBrandNew ? 'کاربر جدید 🟢' : 'کاربر قدیمی (استارت مجدد) 🔄'}`, 
                { parse_mode: 'Markdown', ...keyboard }
            ).catch(() => {});
        }
    }
}

async function checkMembership(userId) {
    if (!db.CHANNEL_USERNAME || db.CHANNEL_USERNAME === '@YourChannelUsername') return true;
    try {
        const chatMember = await bot.getChatMember(db.CHANNEL_USERNAME, userId);
        const status = chatMember.status;
        return ['creator', 'administrator', 'member'].includes(status);
    } catch (error) {
        return true; 
    }
}

// --- تابع پیشرفته و جامع برای استخراج تمام جزئیات کانفیگ و حجم‌ها ---
async function fetchAndParseConfig(url) {
    let resultInfo = {
        isSubLink: false,
        rawContent: url,
        extractedConfigs: [url],
        upload: 'نامشخص',
        download: 'نامشخص',
        total: 'نامشخص',
        remaining: 'نامشخص',
        expireDate: 'نامشخص'
    };

    try {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            resultInfo.isSubLink = true;
            const response = await axios.get(url, { 
                timeout: 10000,
                validateStatus: () => true 
            });

            // خواندن هدر اطلاعات اشتراک استاندارد پنل‌ها (مثل subscription-userinfo)
            const userInfoHeader = response.headers['subscription-userinfo'] || response.headers['X-Subscription-Userinfo'];
            if (userInfoHeader) {
                // نمونه هدر: upload=123; download=456; total=10737418240; expire=1710000000
                const parts = userInfoHeader.split(';');
                parts.forEach(part => {
                    const [key, val] = part.trim().split('=');
                    if (key && val) {
                        const numVal = parseInt(val, 10);
                        const formatBytes = (bytes) => {
                            if (isNaN(bytes)) return val;
                            if (bytes === 0) return '0 باایت';
                            const k = 1024, dm = 2;
                            const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت', 'ترابایت'];
                            const i = Math.floor(Math.log(bytes) / Math.log(k));
                            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
                        };

                        if (key.toLowerCase() === 'upload') resultInfo.upload = formatBytes(numVal);
                        if (key.toLowerCase() === 'download') resultInfo.download = formatBytes(numVal);
                        if (key.toLowerCase() === 'total') resultInfo.total = formatBytes(numVal);
                        if (key.toLowerCase() === 'expire') {
                            const date = new Date(numVal * 1000);
                            resultInfo.expireDate = date.toLocaleDateString('fa-IR');
                        }
                    }
                });

                // محاسبه حجم مانده اگر کل و مصرف (آپلود + دانلود) موجود باشد
                // توجه: اگر پنل خودش مستقیماً نفرستد، محاسبه تقریبی انجام می‌شود
            }

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

            resultInfo.rawContent = data;
            resultInfo.extractedConfigs = foundConfigs.length > 0 ? foundConfigs : [data];
        }
    } catch (error) {
        console.log('خطا در تحلیل لینک سابسکریپشن:', error.message);
    }

    return resultInfo;
}

function getMainKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🛒 خرید اشتراک پرسرعت', callback_data: 'buy_sub' }],
                [
                    ...(db.isFreeSubEnabled ? [{ text: '🎁 اشتراک رایگان', callback_data: 'free_sub' }] : []),
                    ...(db.isTestServerEnabled ? [{ text: '🧪 سرور تست', callback_data: 'test_server' }] : [])
                ],
                [
                    { text: '💰 کیف پول من', callback_data: 'wallet' },
                    { text: '👤 حساب کاربری من', callback_data: 'my_account_info' }
                ],
                [
                    ...(db.isInviteSystemEnabled ? [{ text: '👥 دعوت دوستان (زیرمجموعه‌گیری)', callback_data: 'invite' }] : []),
                    { text: '📱 اشتراک‌های من', callback_data: 'my_subs' }
                ],
                [
                    { text: '📖 آموزش اتصال', callback_data: 'tutorial' },
                    { text: '📞 پشتیبانی آنلاین', callback_data: 'support' }
                ],
                [{ text: '🔄 استارت مجدد / منوی اصلی', callback_data: 'restart_bot' }]
            ]
        }
    };
}

async function sendMainMenu(chatId) {
    bot.sendMessage(chatId, '✨ **به ربات انحصاری ما خوش آمدید**\n\nلطفاً از منوی زیر گزینه موردنظر خود را انتخاب کنید: 👇', { parse_mode: 'Markdown', ...getMainKeyboard() });
}

async function handleForceJoin(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (isAdmin(msg)) return true; 
    if (!db.isForceJoinEnabled) return true; 

    const isMember = await checkMembership(userId);
    if (!isMember) {
        const joinKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📢 عضویت در کانال ربات', url: `https://t.me/${db.CHANNEL_USERNAME.replace('@', '')}` }],
                    [{ text: '✅ عضو شدم، بررسی کن', callback_data: 'check_membership' }]
                ]
            }
        };
        bot.sendMessage(chatId, `⚠️ برای استفاده از ربات، ابتدا باید در کانال ما عضو شوید:\n\n${db.CHANNEL_USERNAME}\n\nپس از عضویت، روی دکمه زیر کلیک کنید 👇`, joinKeyboard);
        return false;
    }
    return true;
}

bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    loadDatabase(); 
    const chatId = msg.chat.id;
    delete userStates[chatId];

    trackUserAndNotifyAdmin(msg);

    const canProceed = await handleForceJoin(msg);
    if (!canProceed) return;

    const refId = match ? match[1] : null; 

    if (db.isInviteSystemEnabled && refId && refId !== chatId.toString()) {
        if (!db.userWallets[`referred_${chatId}`]) {
            db.userWallets[`referred_${chatId}`] = true; 
            db.userWallets[refId] = (db.userWallets[refId] || 0) + REWARD_AMOUNT;
            db.referals[refId] = (db.referals[refId] || 0) + 1;
            saveDatabase();

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
    loadDatabase();
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) {
        bot.sendMessage(chatId, '❌ شما دسترسی به این بخش ندارید.');
        return;
    }
    sendAdminPanel(chatId);
});

function sendAdminPanel(chatId) {
    const forceJoinStatus = db.isForceJoinEnabled ? `🟢 جوین اجباری: روشن (${db.CHANNEL_USERNAME})` : '🔴 جوین اجباری: خاموش';
    const testServerStatus = db.isTestServerEnabled ? '🟢 سرور تست: روشن' : '🔴 سرور تست: خاموش';
    const freeSubStatus = db.isFreeSubEnabled ? '🟢 اشتراک رایگان: روشن' : '🔴 اشتراک رایگان: خاموش';
    const inviteStatus = db.isInviteSystemEnabled ? '🟢 زیرمجموعه‌گیری: روشن' : '🔴 زیرمجموعه‌گیری: خاموش';
    
    const adminKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '⚙️ مدیریت و ویرایش پلن‌ها', callback_data: 'admin_manage_plans' },
                    { text: '📦 سوابق اشتراک‌ها', callback_data: 'admin_history' }
                ],
                [
                    { text: '💰 شارژ دستی کیف پول (با آیدی)', callback_data: 'admin_charge_wallet' },
                    { text: '📋 سوابق رسیدهای مالی', callback_data: 'admin_receipts' }
                ],
                [
                    { text: '📊 آمار کلی', callback_data: 'admin_stats' },
                    { text: '👥 لیست کاربران', callback_data: 'admin_users' }
                ],
                [
                    { text: testServerStatus, callback_data: 'toggle_test_server' },
                    { text: freeSubStatus, callback_data: 'toggle_free_sub' }
                ],
                [
                    { text: '🧪 تغییر لینک سرور تست', callback_data: 'admin_set_test_link' },
                    { text: '🎁 تغییر لینک اشتراک رایگان', callback_data: 'admin_set_free_link' }
                ],
                [
                    { text: inviteStatus, callback_data: 'toggle_invite_system' },
                    { text: forceJoinStatus, callback_data: 'admin_force_join_menu' }
                ],
                [
                    { text: '📢 ارسال همگانی', callback_data: 'admin_broadcast' },
                    { text: '💳 تنظیمات شماره کارت', callback_data: 'admin_pay_settings' }
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
    loadDatabase(); 
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;

    if (callbackQuery.from) {
        const u = callbackQuery.from;
        const name = u.first_name || u.last_name || 'بدون نام';
        const username = u.username ? `@${u.username}` : 'ندارد';
        if (!db.usersDetailMap[userId]) {
            db.usersDetailMap[userId] = { name, username, joinedAt: new Date().toLocaleString('fa-IR') };
        } else {
            db.usersDetailMap[userId].name = name;
            db.usersDetailMap[userId].username = username;
        }
        if (!db.allUsers.includes(userId)) {
            db.allUsers.push(userId);
        }
        saveDatabase();
    }

    try {
        bot.answerCallbackQuery(callbackQuery.id).catch(() => {});
    } catch (e) {}

    if (data === 'restart_bot') {
        delete userStates[chatId];
        sendMainMenu(chatId);
        return;
    }

    if (data === 'my_account_info') {
        const userInfo = db.usersDetailMap[userId] || db.usersDetailMap[chatId] || { 
            name: callbackQuery.from.first_name || 'کاربر', 
            username: callbackQuery.from.username ? `@${callbackQuery.from.username}` : 'ندارد', 
            joinedAt: new Date().toLocaleString('fa-IR') 
        };
        const userWallet = db.userWallets[userId] || db.userWallets[chatId] || 0;
        const userSubsList = db.userSubscriptions[userId] || db.userSubscriptions[chatId] || [];
        const userReferralsCount = db.referals[userId] || db.referals[chatId] || 0;

        let accountText = `👤 **اطلاعات حساب کاربری شما:**\n\n` +
                          `📛 نام: ${userInfo.name}\n` +
                          `🔗 یوزرنیم: ${userInfo.username}\n` +
                          `🆔 شناسه عددی: \`${userId}\`\n` +
                          `💰 موجودی کیف پول: \`${userWallet.toLocaleString()} تومان\`\n` +
                          `📱 تعداد اشتراک‌های فعال: \`${userSubsList.length} عدد\`\n` +
                          `👥 تعداد زیرمجموعه‌ها: \`${userReferralsCount} نفر\`\n` +
                          `📅 تاریخ پیوستن به ربات: ${userInfo.joinedAt || 'ثبت‌نشده'}`;

        bot.sendMessage(chatId, accountText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_force_join_menu') {
        if (!isAdmin(callbackQuery)) return;
        const statusText = db.isForceJoinEnabled ? '🟢 روشن' : '🔴 خاموش';
        const fjMenu = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: `وضعیت: ${statusText} (تغییر وضعیت)`, callback_data: 'toggle_force_join' }],
                    [{ text: `✏️ تنظیم/تغییر کانال (فعلی: ${db.CHANNEL_USERNAME})`, callback_data: 'set_channel_username' }],
                    [{ text: '🔙 بازگشت', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '📢 **مدیریت کانال و جوین اجباری**\nاز دکمه‌های زیر استفاده کنید:', { parse_mode: 'Markdown', ...fjMenu });
        return;
    }

    if (data === 'toggle_force_join') {
        if (!isAdmin(callbackQuery)) return;
        db.isForceJoinEnabled = !db.isForceJoinEnabled;
        saveDatabase();
        bot.sendMessage(chatId, `جوین اجباری ${db.isForceJoinEnabled ? 'روشن' : 'خاموش'} شد.`);
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'set_channel_username') {
        if (!isAdmin(callbackQuery)) return;
        userStates[chatId] = { step: 'get_new_channel_username' };
        bot.sendMessage(chatId, '📢 لطفاً آیدی کانال خود را با فرمت صحیح (مثلاً `@MyChannel`) ارسال کنید:', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'toggle_test_server') {
        if (!isAdmin(callbackQuery)) return;
        db.isTestServerEnabled = !db.isTestServerEnabled;
        saveDatabase();
        bot.sendMessage(chatId, `🧪 بخش سرور تست با موفقیت ${db.isTestServerEnabled ? 'روشن' : 'خاموش'} شد.`);
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'admin_set_test_link') {
        if (!isAdmin(callbackQuery)) return;
        userStates[chatId] = { step: 'get_new_test_link' };
        bot.sendMessage(chatId, `🧪 لینک یا کانفیگ جدید سرور تست را بفرستید.\nلینک فعلی:\n\`${db.testServerConfig}\``, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'toggle_free_sub') {
        if (!isAdmin(callbackQuery)) return;
        db.isFreeSubEnabled = !db.isFreeSubEnabled;
        saveDatabase();
        bot.sendMessage(chatId, `🎁 بخش اشتراک رایگان با موفقیت ${db.isFreeSubEnabled ? 'روشن' : 'خاموش'} شد.`);
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'admin_set_free_link') {
        if (!isAdmin(callbackQuery)) return;
        userStates[chatId] = { step: 'get_new_free_link' };
        bot.sendMessage(chatId, `🎁 لینک یا کانفیگ جدید اشتراک رایگان را بفرستید.\nلینک فعلی:\n\`${db.freeSubConfig}\``, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'toggle_invite_system') {
        if (!isAdmin(callbackQuery)) return;
        db.isInviteSystemEnabled = !db.isInviteSystemEnabled;
        saveDatabase();
        bot.sendMessage(chatId, `👥 بخش زیرمجموعه‌گیری با موفقیت ${db.isInviteSystemEnabled ? 'روشن' : 'خاموش'} شد.`);
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

    if (data.startsWith('admin_') || data.startsWith('approve_') || data.startsWith('reject_') || data.startsWith('plan_mgmt_') || data.startsWith('edit_plan_') || data.startsWith('del_plan_') || data.startsWith('edit_p_')) {
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
                    [{ text: '✏️ ویرایش یا مدیریت پلن‌های موجود', callback_data: 'plan_mgmt_edit_list' }],
                    [{ text: '🔙 بازگشت به پنل', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '⚙️ **مدیریت و ویرایش پلن‌ها و کانفیگ‌ها**', { parse_mode: 'Markdown', ...plansMenuKeyboard });
        return;
    }

    if (data === 'plan_mgmt_add') {
        userStates[chatId] = { step: 'get_new_plan_name' };
        bot.sendMessage(chatId, '➕ **ساخت پلن جدید**\n\nلطفاً **نام پلن** را وارد کنید:', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'plan_mgmt_edit_list') {
        if (db.customPlans.length === 0) {
            bot.sendMessage(chatId, '📦 هیچ پلنی ثبت نشده است.');
            return;
        }

        let textList = '📋 **لیست پلن‌ها برای ویرایش یا مدیریت:**\n\n';
        const inlineBtns = [];

        db.customPlans.forEach((p) => {
            textList += `▪️ **${p.name}**\n   🌐 حجم: ${p.volume} | ⏳ زمان: ${p.duration} | 💵 قیمت: ${p.price}\n   📦 تعداد کانفیگ انبار: **${p.links.length} عدد**\n\n`;
            inlineBtns.push([
                { text: `✏️ ویرایش: ${p.name}`, callback_data: `edit_p_${p.id}` },
                { text: `➕ افزودن لینک`, callback_data: `add_link_${p.id}` },
                { text: `🗑 حذف`, callback_data: `del_plan_${p.id}` }
            ]);
        });

        inlineBtns.push([{ text: '🔙 بازگشت', callback_data: 'admin_manage_plans' }]);
        bot.sendMessage(chatId, textList, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineBtns } });
        return;
    }

    if (data.startsWith('edit_p_')) {
        const planId = parseInt(data.split('_')[2]);
        userStates[chatId] = { step: 'edit_plan_get_name', targetPlanId: planId };
        bot.sendMessage(chatId, '✏️ **ویرایش پلن**\n\nلطفاً **نام جدید** پلن را وارد کنید:', { parse_mode: 'Markdown' });
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
        db.customPlans = db.customPlans.filter(p => p.id !== planId);
        saveDatabase();
        bot.sendMessage(chatId, '🗑 پلن با موفقیت حذف شد.');
        return;
    }

    if (data === 'admin_back_to_panel') {
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'admin_pay_settings') {
        userStates[chatId] = { step: 'get_new_card_number' };
        bot.sendMessage(chatId, '💳 **تنظیمات شماره کارت**\n\nشماره کارت فعلی: `' + db.paymentCardNumber + '`\n\nشماره کارت جدید را بفرستید:', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_receipts') {
        if (db.receiptsHistory.length === 0) {
            bot.sendMessage(chatId, '📋 هیچ سابقه رسییدی ثبت نشده است.');
            return;
        }
        let receiptText = '📋 **بایگانی سوابق رسیدهای مالی کاربران:**\n\n';
        db.receiptsHistory.forEach((r, idx) => {
            receiptText += `${idx + 1}. نوع: ${r.type}\n   👤 کاربر: ${r.userName} (\`${r.userId}\`)\n   💵 مبلغ/پلن: ${r.details}\n   📌 وضعیت: ${r.status}\n   📅 تاریخ: ${r.date}\n\n`;
        });
        bot.sendMessage(chatId, receiptText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_charge_wallet') {
        userStates[chatId] = { step: 'admin_get_charge_user_id' };
        bot.sendMessage(chatId, '💰 **شارژ دستی کیف پول**\n\nلطفاً **شناسه عددی (Chat ID)** مشتری مورد نظر را ارسال کنید:', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_history') {
        if (db.allSubscriptionsHistory.length === 0) {
            bot.sendMessage(chatId, '📦 هیچ سابقه اشتراکی ثبت نشده است.');
            return;
        }
        let historyText = '📦 **سوابق کامل اشتراک‌های صادر شده:**\n\n';
        db.allSubscriptionsHistory.forEach((sub, index) => {
            historyText += `🔹 **شماره ${index + 1}**\n` +
                           `👤 آیدی مشتری: \`${sub.userId}\`\n` +
                           `📛 نام مشتری: ${sub.userName}\n` +
                           `📦 نام پلن: ${sub.planName}\n` +
                           `🌐 کل حجم: ${sub.totalVolume || sub.volume}\n` +
                           `⏳ تاریخ انقضا: ${sub.expiryDate}\n` +
                           `🔗 لینک: \`${sub.configLink}\`\n\n`;
        });
        bot.sendMessage(chatId, historyText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_users') {
        if (db.allUsers.length === 0) {
            bot.sendMessage(chatId, '👥 هیچ کاربری ثبت نشده است.');
            return;
        }
        let usersText = `👥 **لیست کل کاربران ربات (${db.allUsers.length} نفر):**\n\n`;
        let counter = 1;
        db.allUsers.forEach(uId => {
            const info = db.usersDetailMap[uId] || { name: 'نامشخص', username: 'ندارد', joinedAt: 'نامشخص' };
            usersText += `${counter}. ${info.name} | ${info.username} | آیدی: \`${uId}\`\n`;
            counter++;
        });
        bot.sendMessage(chatId, usersText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_stats') {
        bot.sendMessage(chatId, `📊 **آمار کلی ربات:**\n\n👥 کل کاربران: \`${db.allUsers.length}\`\n📦 کل اشتراک‌های صادر شده: \`${db.allSubscriptionsHistory.length}\`\n📋 کل رسیدهای ثبت شده: \`${db.receiptsHistory.length}\``, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_broadcast') {
        userStates[chatId] = { step: 'get_broadcast_content' };
        bot.sendMessage(chatId, '📢 متن یا عکس پیام همگانی را بفرستید:');
        return;
    }

    if (data === 'wallet') {
        const balance = db.userWallets[userId] || db.userWallets[chatId] || 0;
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
        const availablePlans = db.customPlans.filter(p => p.links && p.links.length > 0);
        if (availablePlans.length === 0) {
            bot.sendMessage(chatId, '🛒 در حال حاضر هیچ پلن یا کانفیگی برای فروش موجود نیست.');
            return;
        }

        let planText = '🛒 **لیست پلن‌های اشتراک پرسرعت:**\n\nلطفاً پلن مد نظر خود را انتخاب کنید 👇';
        const planButtons = availablePlans.map(p => [
            { text: `🌐 ${p.name} - ${p.volume} | 💰 ${p.price}`, callback_data: `buy_custom_${p.id}` }
        ]);
        planButtons.push([{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]);

        bot.sendMessage(chatId, planText, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: planButtons } });
        return;
    }

    if (data.startsWith('buy_custom_')) {
        const planId = parseInt(data.split('_')[2]);
        const selectedPlan = db.customPlans.find(p => p.id === planId);

        if (!selectedPlan || selectedPlan.links.length === 0) {
            bot.sendMessage(chatId, '❌ متأسفانه این پلن تمام شده است.');
            return;
        }

        const priceNumber = parsePrice(selectedPlan.price);
        const userBalance = db.userWallets[userId] || db.userWallets[chatId] || 0;

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
        const plan = db.customPlans.find(p => p.id === planId);

        if (!plan || plan.links.length === 0) {
            bot.sendMessage(chatId, '❌ پلن نامعتبر یا تمام شده است.');
            return;
        }

        const priceNumber = parsePrice(plan.price);
        const userBalance = db.userWallets[userId] || db.userWallets[chatId] || 0;

        if (userBalance < priceNumber) {
            bot.sendMessage(chatId, '❌ موجودی کیف پول شما کافی نیست.');
            return;
        }

        db.userWallets[userId] = userBalance - priceNumber;
        const assignedLink = plan.links.shift();
        delete userStates[chatId];
        saveDatabase();

        // استخراج کامل جزئیات ترافیک و حجم از لینک
        const parsedData = await fetchAndParseConfig(assignedLink);
        const currentDateStr = new Date().toLocaleString('fa-IR');
        const userInfo = db.usersDetailMap[userId] || { name: 'کاربر' };

        const subObj = {
            userId: userId,
            userName: userInfo.name,
            planName: plan.name,
            expiryDate: parsedData.expireDate !== 'نامشخص' ? parsedData.expireDate : plan.duration,
            volume: plan.volume,
            totalVolume: parsedData.total,
            upload: parsedData.upload,
            download: parsedData.download,
            configLink: assignedLink,
            extractedConfigs: parsedData.extractedConfigs,
            purchaseDate: currentDateStr
        };

        if (!db.userSubscriptions[userId]) {
            db.userSubscriptions[userId] = [];
        }
        db.userSubscriptions[userId].push(subObj);
        db.allSubscriptionsHistory.push(subObj);

        db.receiptsHistory.push({
            type: 'خرید با کیف پول',
            userId: userId,
            userName: userInfo.name,
            details: `${plan.name} (${plan.price})`,
            status: 'تایید شده خودکار',
            date: currentDateStr
        });
        saveDatabase();

        let userMsg = `🎉 **خرید موفقیت‌آمیز و از کیف پول کسر شد!**\n\n` +
                      `📦 پلن: ${plan.name}\n` +
                      `🌐 حجم کل: ${parsedData.total !== 'نامشخص' ? parsedData.total : plan.volume}\n` +
                      `⬆️ آپلود مصرفی: ${parsedData.upload}\n` +
                      `⬇️ دانلود مصرفی: ${parsedData.download}\n` +
                      `⏳ تاریخ انقضا: ${subObj.expiryDate}\n` +
                      `💵 مبلغ کسر شده: ${plan.price}\n` +
                      `💰 موجودی جدید کیف پول: \`${db.userWallets[userId].toLocaleString()} تومان\`\n\n` +
                      `🔗 **لینک اشتراک شما:**\n\`${assignedLink}\``;

        if (parsedData.extractedConfigs && parsedData.extractedConfigs.length > 0) {
            userMsg += `\n\n⚙️ **کانفیگ‌ها:**\n\`\`\`\n${parsedData.extractedConfigs.join('\n\n')}\n\`\`\``;
        }

        bot.sendMessage(chatId, userMsg, { parse_mode: 'Markdown' });
        return;
    }

    if (data.startsWith('pay_card_')) {
        const planId = parseInt(data.split('_')[2]);
        const plan = db.customPlans.find(p => p.id === planId);
        if (!plan || plan.links.length === 0) return;

        userStates[chatId] = { step: 'get_card_purchase_receipt', planId: plan.id };

        const checkoutText = `📋 **فاکتور نهایی خرید (کارت به کارت)**\n\n` +
                             `🏷 پلن: \`${plan.name}\` | 💵 مبلغ: \`${plan.price}\`\n\n` +
                             `💳 به شماره کارت زیر واریز کرده و سپس **عکس رسید واریزی** را همینجا بفرستید:\n\`${db.paymentCardNumber}\``;

        bot.sendMessage(chatId, checkoutText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'free_sub') {
        if (!db.isFreeSubEnabled) {
            bot.sendMessage(chatId, '❌ بخش اشتراک رایگان در حال حاضر غیرفعال است.');
            return;
        }
        
        const parsedFree = await fetchAndParseConfig(db.freeSubConfig);
        let freeMsg = `🎁 **سرویس اشتراک رایگان شما:**\n\n` +
                      `🌐 حجم کل: ${parsedFree.total}\n` +
                      `⬆️ آپلود: ${parsedFree.upload} | ⬇️ دانلود: ${parsedFree.download}\n` +
                      `⏳ انقضا: ${parsedFree.expireDate}\n\n` +
                      `🔗 **لینک اشتراک:**\n\`${db.freeSubConfig}\``;
                      
        if (parsedFree.extractedConfigs && parsedFree.extractedConfigs.length > 0) {
            freeMsg += `\n\n⚙️ **کانفیگ‌ها:**\n\`\`\`\n${parsedFree.extractedConfigs.join('\n\n')}\n\`\`\``;
        }
        bot.sendMessage(chatId, freeMsg, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'test_server') {
        if (!db.isTestServerEnabled) {
            bot.sendMessage(chatId, '❌ سرویس تست در حال حاضر غیرفعال است.');
            return;
        }

        const parsedTest = await fetchAndParseConfig(db.testServerConfig);
        let testMsg = `🧪 **سرور تست پرسرعت و رایگان**\n\n` +
                      `🌐 حجم: ${parsedTest.total} | ⏳ انقضا: ${parsedTest.expireDate}\n\n` +
                      `🔗 **لینک اتصال:**\n\`${db.testServerConfig}\``;
        
        if (parsedTest.extractedConfigs && parsedTest.extractedConfigs.length > 0) {
            testMsg += `\n\n⚙️ **کانفیگ‌های مجزا:**\n\`\`\`\n${parsedTest.extractedConfigs.join('\n\n')}\n\`\`\``;
        }
        
        bot.sendMessage(chatId, testMsg, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'my_subs') {
        const subs = db.userSubscriptions[userId] || db.userSubscriptions[chatId];
        
        if (subs && Array.isArray(subs) && subs.length > 0) {
            let subText = `📱 **لیست اشتراک‌های فعال شما (${subs.length} عدد):**\n\n`;
            subs.forEach((sub, idx) => {
                subText += `🔹 **اشتراک شماره ${idx + 1}**\n` +
                           `📦 پلن: ${sub.planName}\n` +
                           `🌐 کل حجم: ${sub.totalVolume || sub.volume}\n` +
                           `⬆️ آپلود مصرفی: ${sub.upload || 'نامشخص'}\n` +
                           `⬇️ دانلود مصرفی: ${sub.download || 'نامشخص'}\n` +
                           `⏳ انقضا: ${sub.expiryDate}\n` +
                           `🔗 **لینک اشتراک:**\n\`${sub.configLink}\`\n\n`;
            });
            bot.sendMessage(chatId, subText, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '📱 شما هنوز اشتراک فعالی ندارید.');
        }
        return;
    }

    if (data === 'tutorial') {
        const tutorialText = `📖 **آموزش اتصال:**\n` +
                             `1️⃣ اپلیکیشن V2Ray (مثل v2rayNG یا FoXray) را نصب کنید.\n` +
                             `2️⃣ لینک اشتراک اختصاصی خود را از بخش «اشتراک‌های من» کپی کنید.\n` +
                             `3️⃣ برنامه را باز کرده، روی علامت + یا Import کلیک و لینک را اضافه کنید.\n` +
                             `4️⃣ روی دکمه اتصال (Connect) ضربه بزنید تا متصل شوید.`;
        bot.sendMessage(chatId, tutorialText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'invite') {
        if (!db.isInviteSystemEnabled) {
            bot.sendMessage(chatId, '❌ سیستم زیرمجموعه‌گیری در حال حاضر غیرفعال است.');
            return;
        }
        const userRefCount = db.referals[userId] || db.referals[chatId] || 0;
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
    loadDatabase();
    trackUserAndNotifyAdmin(msg);
    const chatId = msg.chat.id;
    const text = msg.text;

    if (chatId === ADMIN_CHAT_ID && text === '💻 پنل مدیریت') return;

    if (chatId === ADMIN_CHAT_ID && userStates[chatId]) {
        const state = userStates[chatId];
        if (state.step === 'get_new_channel_username') {
            db.CHANNEL_USERNAME = text.trim();
            delete userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ آیدی کانال جوین اجباری با موفقیت به \`${db.CHANNEL_USERNAME}\` تغییر یافت.`, { parse_mode: 'Markdown' });
            sendAdminPanel(chatId);
            return;
        }
        if (state.step === 'get_new_test_link') {
            db.testServerConfig = text.trim();
            delete userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ لینک سرور تست با موفقیت آپدیت شد.`);
            sendAdminPanel(chatId);
            return;
        }
        if (state.step === 'get_new_free_link') {
            db.freeSubConfig = text.trim();
            delete userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ لینک اشتراک رایگان با موفقیت آپدیت شد.`);
            sendAdminPanel(chatId);
            return;
        }
        if (state.step === 'admin_get_charge_user_id') {
            const targetId = parseInt(text.trim(), 10);
            if (!targetId || isNaN(targetId)) {
                bot.sendMessage(chatId, '❌ شناسه عددی نامعتبر است. لطفاً عدد صحیح وارد کنید.');
                return;
            }
            userStates[chatId] = { step: 'admin_get_charge_amount', targetChargeUserId: targetId };
            bot.sendMessage(chatId, `✅ کاربر با شناسه \`${targetId}\` شناسایی شد.\n\nلطفاً **مبلغ شارژ** (به تومان، مثلاً \`50000\`) را وارد کنید:`, { parse_mode: 'Markdown' });
            return;
        } else if (state.step === 'admin_get_charge_amount') {
            const amount = parseInt(text.replace(/[^0-9]/g, ''), 10);
            if (!amount || amount <= 0) {
                bot.sendMessage(chatId, '❌ مبلغ نامعتبر است.');
                return;
            }
            const targetId = state.targetChargeUserId;
            db.userWallets[targetId] = (db.userWallets[targetId] || 0) + amount;
            delete userStates[chatId];
            saveDatabase();

            bot.sendMessage(chatId, `🎉 کیف پول کاربر با شناسه \`${targetId}\` به مبلغ \`${amount.toLocaleString()} تومان\` با موفقیت شارژ شد.`, { parse_mode: 'Markdown' });
            bot.sendMessage(targetId, `🎉 **کیف پول شما توسط مدیریت شارژ شد!**\nمبلغ \`${amount.toLocaleString()} تومان\` به موجودی شما اضافه گردید.\nموجودی جدید: \`${db.userWallets[targetId].toLocaleString()} تومان\``, { parse_mode: 'Markdown' }).catch(() => {});
            return;
        }
    }

    if (userStates[chatId] && userStates[chatId].step === 'get_wallet_deposit_amount') {
        const amount = parseInt(text.replace(/[^0-9]/g, ''), 10);
        if (!amount || amount <= 0) {
            bot.sendMessage(chatId, '❌ لطفاً یک مبلغ معتبر به صورت عدد وارد کنید.');
            return;
        }
        userStates[chatId] = { step: 'get_wallet_deposit_receipt', depositAmount: amount };
        
        const depositMsg = `💳 **فاکتور شارژ کیف پول**\n\n` +
                           `💵 مبلغ شارژ: \`${amount.toLocaleString()} تومان\`\n\n` +
                           `به شماره کارت زیر واریز کرده و رسید بفرستید:\n\`${db.paymentCardNumber}\``;
        bot.sendMessage(chatId, depositMsg, { parse_mode: 'Markdown' });
        return;
    }

    if (chatId === ADMIN_CHAT_ID && userStates[chatId]) {
        const state = userStates[chatId];
        
        if (state.step === 'edit_plan_get_name') {
            state.editName = text.trim();
            state.step = 'edit_plan_get_volume';
            bot.sendMessage(chatId, '🌐 حجم جدید پلن را وارد کنید:');
            return;
        } else if (state.step === 'edit_plan_get_volume') {
            state.editVolume = text.trim();
            state.step = 'edit_plan_get_duration';
            bot.sendMessage(chatId, '⏳ مدت زمان اعتبار جدید را وارد کنید:');
            return;
        } else if (state.step === 'edit_plan_get_duration') {
            state.editDuration = text.trim();
            state.step = 'edit_plan_get_price';
            bot.sendMessage(chatId, '💵 قیمت جدید پلن را وارد کنید:');
            return;
        } else if (state.step === 'edit_plan_get_price') {
            const planId = state.targetPlanId;
            const plan = db.customPlans.find(p => p.id === planId);
            if (plan) {
                plan.name = state.editName;
                plan.volume = state.editVolume;
                plan.duration = state.editDuration;
                plan.price = text.trim();
                delete userStates[chatId];
                saveDatabase();
                bot.sendMessage(chatId, `✅ پلن مورد نظر با موفقیت ویرایش و آپدیت شد.`);
                return;
            }
        }

        if (state.step === 'get_extra_link_for_plan') {
            const planId = state.targetPlanId;
            const plan = db.customPlans.find(p => p.id === planId);
            if (plan) {
                plan.links.push(text.trim());
                delete userStates[chatId];
                saveDatabase();
                bot.sendMessage(chatId, `✅ لینک جدید به پلن **${plan.name}** اضافه شد.`);
                return;
            }
        }
        if (state.step === 'get_new_plan_name') {
            state.planName = text.trim();
            state.step = 'get_new_plan_volume';
            bot.sendMessage(chatId, '🌐 حجم اشتراک را وارد کنید:');
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
            db.customPlans.push({
                id: Date.now(),
                name: state.planName,
                volume: state.planVolume,
                duration: state.planDuration,
                price: state.planPrice,
                links: [text.trim()]
            });
            delete userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `🎉 پلن جدید با موفقیت ساخته شد!`);
            return;
        }
    }

    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_new_card_number') {
        db.paymentCardNumber = text.trim();
        delete userStates[chatId];
        saveDatabase();
        bot.sendMessage(chatId, '✅ شماره کارت آپدیت شد.');
        return;
    }

    if (chatId === ADMIN_CHAT_ID && userStates[chatId] && userStates[chatId].step === 'get_broadcast_content') {
        delete userStates[chatId];
        bot.sendMessage(chatId, '⏳ در حال ارسال همگانی...');
        db.allUsers.forEach(uId => {
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
    loadDatabase();
    trackUserAndNotifyAdmin(msg);
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userInfo = db.usersDetailMap[userId] || { name: 'کاربر' };
    const photoId = msg.photo[msg.photo.length - 1].file_id;
    const currentDateStr = new Date().toLocaleString('fa-IR');

    if (userStates[chatId]) {
        if (userStates[chatId].step === 'get_wallet_deposit_receipt') {
            const amount = userStates[chatId].depositAmount;
            delete userStates[chatId];

            db.pending_deposits[`deposit_${userId}`] = { amount };
            saveDatabase();
            bot.sendMessage(chatId, '✅ رسید دریافت شد. پس از تایید ادمین مبلغ به کیف پول شما افزوده می‌شود.');

            db.receiptsHistory.push({
                type: 'شارژ کیف پول',
                userId: userId,
                userName: userInfo.name,
                details: `${amount.toLocaleString()} تومان`,
                status: 'در انتظار تایید',
                date: currentDateStr
            });
            saveDatabase();

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
                caption: `🔔 **رسید شارژ کیف پول**\nکاربر: ${userInfo.name} (\`${userId}\`)\nمبلغ: \`${amount.toLocaleString()} تومان\``,
                parse_mode: 'Markdown',
                ...adminDepositKeyboard
            });
            return;
        }

        if (userStates[chatId].step === 'get_card_purchase_receipt') {
            const planId = userStates[chatId].planId;
            const plan = db.customPlans.find(p => p.id === planId);
            delete userStates[chatId];

            if (!plan || plan.links.length === 0) {
                bot.sendMessage(chatId, '❌ متأسفانه این پلن تمام شده یا نامعتبر است.');
                return;
            }

            db.pending_card_purchases[`card_pur_${userId}`] = { planId: plan.id };
            saveDatabase();
            bot.sendMessage(chatId, '✅ رسید خرید شما دریافت شد. پس از بررسی و تایید ادمین، لینک اشتراک برای شما ارسال خواهد شد.');

            db.receiptsHistory.push({
                type: 'خرید کارت به کارت',
                userId: userId,
                userName: userInfo.name,
                details: `${plan.name} (${plan.price})`,
                status: 'در انتظار تایید',
                date: currentDateStr
            });
            saveDatabase();

            const adminCardKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ تایید و ارسال اشتراک', callback_data: `approve_card_${userId}_${plan.id}` },
                            { text: '❌ رد رسید', callback_data: `reject_card_${userId}` }
                        ]
                    ]
                }
            };

            bot.sendPhoto(ADMIN_CHAT_ID, photoId, {
                caption: `🔔 **رسید خرید کارت به کارت (اشتراک)**\nکاربر: ${userInfo.name} (\`${userId}\`)\nپلن: ${plan.name} (${plan.price})`,
                parse_mode: 'Markdown',
                ...adminCardKeyboard
            });
            return;
        }
    }
});

bot.on('callback_query', async (callbackQuery) => {
    loadDatabase();
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;

    if (data.startsWith('approve_deposit_') || data.startsWith('reject_deposit_')) {
        if (!isAdmin(callbackQuery)) return;
        const parts = data.split('_');
        const action = parts[0];
        const targetUserId = parts[2];
        const depositKey = `deposit_${targetUserId}`;

        const rec = db.receiptsHistory.find(r => r.userId.toString() === targetUserId.toString() && r.status === 'در انتظار تایید');
        if (rec) {
            rec.status = (action === 'approve') ? 'تایید شده' : 'رد شده';
        }

        if (action === 'approve') {
            const depositInfo = db.pending_deposits[depositKey];
            if (depositInfo) {
                db.userWallets[targetUserId] = (db.userWallets[targetUserId] || 0) + depositInfo.amount;
                delete db.pending_deposits[depositKey];
                saveDatabase();
                bot.sendMessage(targetUserId, `🎉 شارژ کیف پول شما تایید شد!\nمبلغ \`${depositInfo.amount.toLocaleString()} تومان\` اضافه شد.`, { parse_mode: 'Markdown' }).catch(() => {});
                bot.sendMessage(chatId, '✅ شارژ تایید شد.');
            }
        } else {
            delete db.pending_deposits[depositKey];
            saveDatabase();
            bot.sendMessage(targetUserId, '❌ رسید شارژ شما رد شد.');
            bot.sendMessage(chatId, '❌ رسید رد شد.');
        }
    }

    if (data.startsWith('approve_card_') || data.startsWith('reject_card_')) {
        if (!isAdmin(callbackQuery)) return;
        const parts = data.split('_');
        const action = parts[0];
        const targetUserId = parts[2];
        const cardKey = `card_pur_${targetUserId}`;

        const rec = db.receiptsHistory.find(r => r.userId.toString() === targetUserId.toString() && r.status === 'در انتظار تایید');
        if (rec) {
            rec.status = (action === 'approve') ? 'تایید شده و صادر گردید' : 'رد شده';
        }

        if (action === 'approve') {
            const planId = parseInt(parts[3]);
            const plan = db.customPlans.find(p => p.id === planId);

            if (plan && plan.links.length > 0) {
                const assignedLink = plan.links.shift();
                const parsedData = await fetchAndParseConfig(assignedLink);
                const currentDateStr = new Date().toLocaleString('fa-IR');
                const userInfo = db.usersDetailMap[targetUserId] || { name: 'کاربر' };

                const subObj = {
                    userId: targetUserId,
                    userName: userInfo.name,
                    planName: plan.name,
                    expiryDate: parsedData.expireDate !== 'نامشخص' ? parsedData.expireDate : plan.duration,
                    volume: plan.volume,
                    totalVolume: parsedData.total,
                    upload: parsedData.upload,
                    download: parsedData.download,
                    configLink: assignedLink,
                    extractedConfigs: parsedData.extractedConfigs,
                    purchaseDate: currentDateStr
                };

                if (!db.userSubscriptions[targetUserId]) {
                    db.userSubscriptions[targetUserId] = [];
                }
                db.userSubscriptions[targetUserId].push(subObj);
                db.allSubscriptionsHistory.push(subObj);

                delete db.pending_card_purchases[cardKey];
                saveDatabase();

                let successMsg = `🎉 **خرید شما تایید شد و اشتراک صادر گردید!**\n\n` +
                                 `📦 پلن: ${plan.name}\n` +
                                 `🌐 کل حجم: ${parsedData.total}\n` +
                                 `⬆️ آپلود: ${parsedData.upload} | ⬇️ دانلود: ${parsedData.download}\n` +
                                 `⏳ انقضا: ${subObj.expiryDate}\n\n` +
                                 `🔗 **لینک اشتراک شما:**\n\`${assignedLink}\``;

                if (parsedData.extractedConfigs && parsedData.extractedConfigs.length > 0) {
                    successMsg += `\n\n⚙️ **کانفیگ‌ها:**\n\`\`\`\n${parsedData.extractedConfigs.join('\n\n')}\n\`\`\``;
                }

                bot.sendMessage(targetUserId, successMsg, { parse_mode: 'Markdown' }).catch(() => {});
                bot.sendMessage(chatId, '✅ خرید تایید شد و لینک اشتراک برای کاربر ارسال گردید.');
            } else {
                bot.sendMessage(chatId, '❌ خطا: این پلن دیگر کانفیگ یا لینک بازی ندارد.');
            }
        } else {
            delete db.pending_card_purchases[cardKey];
            saveDatabase();
            bot.sendMessage(targetUserId, '❌ رسید خرید کارت به کارت شما توسط ادمین رد شد.');
            bot.sendMessage(chatId, '❌ رسید رد شد.');
        }
    }
});

process.on('uncaughtException', (err) => {
    console.log('Caught exception:', err);
});
console.log('🤖 ربات با قابلیت خواندن کامل جزئیات ترافیک، حجم و وضعیت کانفیگ فعال شد.');
