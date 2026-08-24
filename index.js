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
const CHANNEL_LOG_ID = '-1004488082323';

const userCooldowns = new Map();
const COOLDOWN_TIME = 1200;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : __dirname;
const DB_FILE = path.join(DATA_DIR, 'database.json');
const PURCHASES_LOG_FILE = path.join(DATA_DIR, 'purchases_log.txt');

const defaultDatabaseStructure = {
    CHANNEL_USERNAME: '@YourChannelUsername',
    isForceJoinEnabled: false,
    isTestServerEnabled: true,
    testServerConfig: 'vless://example-test-server-link',
    isFreeSubEnabled: true,
    freeSubConfig: 'vless://example-free-sub-link',
    isInviteSystemEnabled: true,
    userStates: {},
    menuNames: {
        buy_sub: '🛒 خرید اشتراک پرسرعت ⚡️',
        free_sub: '🎁 اشتراک رایگان',
        test_server: '🧪 سرور تست',
        wallet: '💰 کیف پول من',
        invite: '👥 زیرمجموعه‌گیری',
        my_subs: '📱 اشتراک‌های من',
        tutorial: '📖 آموزش اتصال',
        support: '📞 پشتیبانی آنلاین'
    },
    botTexts: {
        start_message: '💜 **به ربات CONFIG ARENA خوش آمدید** 💜\n\n⚡️ **خرید کانفیگ‌های پرسرعت و پایدار**\n🚀 **کیفیت بالا + سرعت تضمینی**\n\nاز منوی زیر سرویس موردنظر خود را انتخاب کنید 👇\n\n🔥 **سرور بدون مرز | CONFIG ARENA** 🔥',
        tutorial_message: '📖 **آموزش ساده اتصال:** 💡\n\n1️⃣ اپلیکیشن V2Ray (مثل v2rayNG در اندروید یا FoXray در آیفون) را نصب کنید.\n2️⃣ لینک اشتراک اختصاصی خود را از بخش «اشتراک‌های من» کپی کنید.\n3️⃣ برنامه را باز کرده، روی علامت + یا Import بزنید تا لینک اضافه شود.\n4️⃣ روی دکمه اتصال بزنید و از اینترنت آزاد لذت ببرید! 🚀',
        support_prompt: '📞 پیام یا سوال خود را برای پشتیبانی ارسال کنید: 👇',
        support_success: '✅ پیام شما با موفقیت به پشتیبانی ارسال شد. به زودی پاسخ می‌دهیم! 🙏',
        store_title: '🛒 **فروشگاه اشتراک‌های پرسرعت و اختصاصی** 🚀\n\nلطفاً پلن مورد نظر خود را انتخاب کنید: 👇',
        no_plans: '🛒 در حال حاضر هیچ پلن فعالی موجود نیست. به زودی برمی‌گردیم! 🙏',
        wallet_title: '💰 **کیف پول اختصاصی شما**\n\nموجودی فعلی: \`{balance} تومان\`\n\n🆔 شناسه کاربری شما: \`{userId}\`',
        invite_title: '👥 **سیستم دعوت از دوستان** 🎁\n\nبا ارسال لینک زیر به دوستانتان پاداش بگیرید:\n\`{inviteLink}\`\n\n✨ تعداد زیرمجموعه‌های شما: **{count} نفر**',
        empty_subs: '📱 شما هنوز اشتراک فعالی ندارید. از فروشگاه تهیه کنید! 🛒'
    },
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
            links: ['https://example.com/sub/1-1', 'https://example.com/sub/1-2'] 
        },
        { 
            id: 2, 
            name: 'اشتراک نامحدود 🔥', 
            volume: 'نامحدود (VIP)', 
            duration: '30 روزه', 
            price: '180,000 تومان', 
            links: ['https://example.com/sub/2-1'] 
        }
    ],
    paymentCardNumber: '6037-9971-xxxx-xxxx',
    messagesMap: {}
};

let db = JSON.parse(JSON.stringify(defaultDatabaseStructure));

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            const parsed = JSON.parse(data);
            db = {
                ...defaultDatabaseStructure,
                ...parsed,
                menuNames: { ...defaultDatabaseStructure.menuNames, ...(parsed.menuNames || {}) },
                botTexts: { ...defaultDatabaseStructure.botTexts, ...(parsed.botTexts || {}) },
                userStates: {},
                userWallets: parsed.userWallets || {},
                pending_deposits: parsed.pending_deposits || {},
                pending_card_purchases: parsed.pending_card_purchases || {},
                allUsers: parsed.allUsers || [],
                usersDetailMap: parsed.usersDetailMap || {},
                receiptsHistory: parsed.receiptsHistory || [],
                referals: parsed.referals || [],
                userSubscriptions: parsed.userSubscriptions || {},
                allSubscriptionsHistory: parsed.allSubscriptionsHistory || [],
                customPlans: parsed.customPlans || defaultDatabaseStructure.customPlans,
                messagesMap: parsed.messagesMap || {}
            };
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
        const tempFile = DB_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
        fs.renameSync(tempFile, DB_FILE);
    } catch (e) {
        console.log('❌ خطا در ذخیره‌سازی دیتابیس:', e);
    }
}

function logPurchaseToFile(subObj) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const logEntry = `----------------------------------------\n` +
                         `تاریخ خرید: ${subObj.purchaseDate}\n` +
                         `نام مشتری: ${subObj.userName}\n` +
                         `شناسه کاربر (Chat ID): ${subObj.userId}\n` +
                         `نام پلن: ${subObj.planName}\n` +
                         `حجم کل: ${subObj.totalVolume || subObj.volume}\n` +
                         `تاریخ انقضا: ${subObj.expiryDate}\n` +
                         `لینک اشتراک:\n${subObj.configLink}\n` +
                         `----------------------------------------\n\n`;
        fs.appendFileSync(PURCHASES_LOG_FILE, logEntry, 'utf8');
    } catch (e) {
        console.log('❌ خطا در نوشتن لاگ خرید در فایل متنی:', e);
    }
}

loadDatabase();

async function sendBackupToAdmin() {
    const backupDir = path.join(DATA_DIR, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDbPath = path.join(backupDir, `backup_${timestamp}_database.txt`);
    const backupLogPath = path.join(backupDir, `backup_${timestamp}_purchases_log.txt`);

    try {
        if (fs.existsSync(DB_FILE)) {
            fs.copyFileSync(DB_FILE, backupDbPath);
            await bot.sendDocument(ADMIN_CHAT_ID, backupDbPath, {
                caption: `📦 **پشتیبان خودکار دیتابیس ربات**\n👤 ادمین: arenam_10\n🕒 زمان: ${new Date().toLocaleString('fa-IR')}`
            });
        }
        if (fs.existsSync(PURCHASES_LOG_FILE)) {
            fs.copyFileSync(PURCHASES_LOG_FILE, backupLogPath);
            await bot.sendDocument(ADMIN_CHAT_ID, backupLogPath, {
                caption: `📑 **فایل کامل سوابق و جزئیات خریدهای انجام‌شده**\n👤 ادمین: arenam_10`
            });
        }
    } catch (e) {}
}

setInterval(sendBackupToAdmin, 24 * 60 * 60 * 1000);
const REWARD_AMOUNT = 5000;  

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
    loadDatabase();
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

function trackUserAndNotifyAdmin(msg) {
    if (msg && msg.from && msg.from.id) {
        const userId = msg.from.id;
        const user = msg.from;
        const name = user.first_name || user.last_name || 'بدون نام';
        const username = user.username ? `@${user.username}` : 'ندارد (فاقد یوزرنیم)';
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

        if (isBrandNew && chatId !== ADMIN_CHAT_ID) {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [[{ text: '👤 پروفایل کاربر در تلگرام', url: `tg://user?id=${userId}` }]]
                }
            };
            bot.sendMessage(
                ADMIN_CHAT_ID, 
                `🚀 **یک کاربر جدید ربات را استارت کرد!** 🤖\n\n` +
                `👤 **نام کاربر:** ${name}\n` +
                `🔗 **نام کاربری (Username):** ${username}\n` +
                `🆔 **شناسه عددی (Chat ID):** \`${userId}\``, 
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
        return false;
    }
}

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
            const parsedUrl = new URL(url);
            const hostname = parsedUrl.hostname.toLowerCase();
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.16.')) {
                return resultInfo;
            }

            resultInfo.isSubLink = true;
            const response = await axios.get(url, { timeout: 10000, validateStatus: () => true });

            const userInfoHeader = response.headers['subscription-userinfo'] || response.headers['X-Subscription-Userinfo'];
            if (userInfoHeader) {
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
    } catch (error) {}

    return resultInfo;
}

function getMainKeyboard() {
    const names = db.menuNames;
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: names.buy_sub, callback_data: 'buy_sub' }],
                [
                    ...(db.isFreeSubEnabled ? [{ text: names.free_sub, callback_data: 'free_sub' }] : []),
                    ...(db.isTestServerEnabled ? [{ text: names.test_server, callback_data: 'test_server' }] : [])
                ],
                [
                    { text: names.wallet, callback_data: 'wallet' },
                    ...(db.isInviteSystemEnabled ? [{ text: names.invite, callback_data: 'invite' }] : [])
                ],
                [
                    { text: names.my_subs, callback_data: 'my_subs' },
                    { text: names.tutorial, callback_data: 'tutorial' }
                ],
                [
                    { text: names.support, callback_data: 'support' },
                    { text: '🔄 منوی اصلی', callback_data: 'restart_bot' }
                ]
            ]
        }
    };
}

async function sendMainMenu(chatId) {
    bot.sendMessage(chatId, db.botTexts.start_message, { parse_mode: 'Markdown', ...getMainKeyboard() });
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
                    [{ text: '📢 عضویت در کانال ربات 🔔', url: `https://t.me/${db.CHANNEL_USERNAME.replace('@', '')}` }],
                    [{ text: '✅ عضو شدم، بررسی کن 🔍', callback_data: 'check_membership' }]
                ]
            }
        };
        bot.sendMessage(chatId, `⚠️ **توجه!**\nبرای استفاده از امکانات ربات، لطفا ابتدا در کانال ما عضو شوید:\n\n📢 ${db.CHANNEL_USERNAME}\n\nسپس روی دکمه‌ی بررسی کلیک کنید 👇`, { parse_mode: 'Markdown', ...joinKeyboard });
        return false;
    }
    return true;
}

bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    loadDatabase(); 
    const chatId = msg.chat.id;
    delete db.userStates[chatId];
    saveDatabase();

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

            bot.sendMessage(refId, `🎉 **تبریک!**\nیک نفر با لینک اختصاصی شما وارد ربات شد.\n\n💰 مبلغ \`${REWARD_AMOUNT.toLocaleString()} تومان\` پاداش به کیف پول شما واریز شد! 🎁`, { parse_mode: 'Markdown' })
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
        bot.sendMessage(chatId, '👑 **مدیر گرامی، دسترسی‌های پیشرفته پنل برای شما فعال شد.** 🛡', adminReplyKeyboard);
    }

    sendMainMenu(chatId);
});

bot.onText(/💻 پنل مدیریت|\/panel/, async (msg) => {
    loadDatabase();
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) {
        bot.sendMessage(chatId, '❌ شما به این بخش دسترسی ندارید.');
        return;
    }
    sendAdminPanel(chatId);
});

function sendAdminPanel(chatId) {
    const forceJoinStatus = db.isForceJoinEnabled ? `🟢 جوین اجباری: روشن` : '🔴 جوین اجباری: خاموش';
    const testServerStatus = db.isTestServerEnabled ? '🟢 سرور تست: روشن' : '🔴 سرور تست: خاموش';
    const freeSubStatus = db.isFreeSubEnabled ? '🟢 اشتراک رایگان: روشن' : '🔴 اشتراک رایگان: خاموش';
    const inviteStatus = db.isInviteSystemEnabled ? '🟢 زیرمجموعه‌گیری: روشن' : '🔴 زیرمجموعه‌گیری: خاموش';
    
    const adminKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '⚙️ مدیریت پلن‌ها', callback_data: 'admin_manage_plans' },
                    { text: '✏️ تغییر نام دکمه‌ها', callback_data: 'admin_edit_names_menu' }
                ],
                [
                    { text: '📦 سوابق اشتراک‌ها', callback_data: 'admin_history' },
                    { text: '✏️ تغییر متن‌های ربات', callback_data: 'admin_edit_texts_menu' }
                ],
                [
                    { text: '💰 مدیریت کیف پول مشتری‌ها', callback_data: 'manage_wallets' },
                    { text: '📁 رسیدهای مالی', callback_data: 'admin_receipts' }
                ],
                [
                    { text: '📊 آمار کلی', callback_data: 'admin_stats' }
                ],
                [
                    { text: '📢 ارسال همگانی', callback_data: 'admin_broadcast' },
                    { text: '💳 تنظیم شماره کارت', callback_data: 'admin_pay_settings' }
                ],
                [
                    { text: testServerStatus, callback_data: 'toggle_test_server' },
                    { text: freeSubStatus, callback_data: 'toggle_free_sub' }
                ],
                [
                    { text: '🧪 لینک سرور تست', callback_data: 'admin_set_test_link' },
                    { text: '🎁 لینک اشتراک رایگان', callback_data: 'admin_set_free_link' }
                ],
                [
                    { text: inviteStatus, callback_data: 'toggle_invite_system' },
                    { text: forceJoinStatus, callback_data: 'admin_force_join_menu' }
                ],
                [
                    { text: '📦 دریافت دستی بکاپ', callback_data: 'admin_send_backup' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, '⚙️ **پنل مدیریت پیشرفته ربات**\nگزینه مورد نظر را انتخاب کنید: 👇', {
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
    const currentTime = Date.now();

    if (userCooldowns.has(userId)) {
        const lastClickTime = userCooldowns.get(userId);
        if (currentTime - lastClickTime < COOLDOWN_TIME) {
            return bot.answerCallbackQuery(callbackQuery.id, {
                text: '⚠️ لطفاً کمی آهسته‌تر دکمه‌ها را بزنید...',
                show_alert: false
            }).catch(() => {});
        }
    }
    userCooldowns.set(userId, currentTime);

    await sleep(400);

    const userObj = callbackQuery.from;
    if (userObj) {
        const name = userObj.first_name || userObj.last_name || 'بدون نام';
        const username = userObj.username ? `@${userObj.username}` : 'ندارد';
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

    if (data === 'manage_wallets') {
        if (!isAdmin(callbackQuery)) return;
        try {
            const userIds = [...db.allUsers];
            if (!userIds || userIds.length === 0) {
                return bot.answerCallbackQuery(callbackQuery.id, { text: "❌ هیچ کاربری در ربات ثبت‌نام نکرده است.", show_alert: true });
            }

            let buttons = userIds.map(uId => {
                let info = db.usersDetailMap[uId] || { name: 'بدون نام', username: 'ندارد' };
                let name = info.name;
                let uname = info.username && info.username !== 'ندارد' ? info.username : uId;
                let balance = db.userWallets[uId] || 0;
                return [{
                    text: `👤 ${name} (${uname}) - 💰 ${balance.toLocaleString()} تومان`,
                    callback_data: `wallet_user_${uId}`
                }];
            });

            buttons.push([{ text: "🔙 بازگشت به پنل مدیریت", callback_data: "admin_back_to_panel" }]);

            await bot.editMessageText(`💼 **بخش مدیریت کیف پول مشتری‌ها**\n\nتعداد کل کاربران: ${userIds.length} نفر\nکاربر مورد نظر خود را از لیست زیر انتخاب کنید:`, {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: buttons }
            });
        } catch (e) {
            console.error(e);
        }
        return;
    }

    if (data.startsWith('wallet_user_')) {
        if (!isAdmin(callbackQuery)) return;
        const targetChatId = data.replace('wallet_user_', '');
        const userInfo = db.usersDetailMap[targetChatId] || { name: 'نامشخص', username: 'ندارد' };
        const balance = db.userWallets[targetChatId] || 0;

        const walletMsg = `
💼 **مدیریت کیف پول کاربر:**
👤 نام: ${userInfo.name}
🆔 یوزرنیم: ${userInfo.username}
🔢 چت آیدی: \`${targetChatId}\`
💰 موجودی فعلی: **${balance.toLocaleString()} تومان**

لطفاً عملیات مورد نظر را انتخاب کنید:
        `;

        await bot.editMessageText(walletMsg, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "➕ افزایش موجودی", callback_data: `w_inc_${targetChatId}` },
                        { text: "➖ کاهش موجودی", callback_data: `w_dec_${targetChatId}` }
                    ],
                    [
                        { text: "🔙 بازگشت به لیست کاربران", callback_data: "manage_wallets" }
                    ]
                ]
            }
        });
        return;
    }

    if (data.startsWith('w_inc_') || data.startsWith('w_dec_')) {
        if (!isAdmin(callbackQuery)) return;
        const parts = data.split('_');
        const action = parts[1] === 'inc' ? 'inc' : 'dec';
        const targetUser = parts[2];
        const actionTitle = action === 'inc' ? 'افزایش' : 'کاهش';

        const quickAmountsKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "➕ ۵۰ هزار تومان", callback_data: `w_amt_${action}_${targetUser}_50000` },
                        { text: "➕ ۱۰۰ هزار تومان", callback_data: `w_amt_${action}_${targetUser}_100000` }
                    ],
                    [
                        { text: "➕ ۲۰۰ هزار تومان", callback_data: `w_amt_${action}_${targetUser}_200000` },
                        { text: "➕ ۵۰۰ هزار تومان", callback_data: `w_amt_${action}_${targetUser}_500000` }
                    ],
                    [
                        { text: "🔙 بازگشت", callback_data: `wallet_user_${targetUser}` }
                    ]
                ]
            }
        };

        if (action === 'dec') {
            quickAmountsKeyboard.inline_keyboard[0][0].text = "➖ ۵۰ هزار تومان";
            quickAmountsKeyboard.inline_keyboard[0][1].text = "➖ ۱۰۰ هزار تومان";
            quickAmountsKeyboard.inline_keyboard[1][0].text = "➖ ۲۰۰ هزار تومان";
            quickAmountsKeyboard.inline_keyboard[1][1].text = "➖ ۵۰۰ هزار تومان";
        }

        db.userStates[chatId] = { step: 'wallet_manager_waiting_for_amount', targetUser, action };
        saveDatabase();

        await bot.editMessageText(`💵 لطفاً یکی از مبالغ زیر را برای **${actionTitle}** موجودی انتخاب کنید یا مبلغ دلخواه خود را به صورت عدد در چت ارسال کنید:`, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: quickAmountsKeyboard.reply_markup
        });
        return;
    }

    if (data.startsWith('w_amt_')) {
        if (!isAdmin(callbackQuery)) return;
        const parts = data.split('_');
        const action = parts[2]; 
        const targetUser = parts[3];
        const amount = parseInt(parts[4], 10);

        const currentBalance = db.userWallets[targetUser] || 0;
        if (action === 'inc') {
            db.userWallets[targetUser] = currentBalance + amount;
        } else {
            db.userWallets[targetUser] = Math.max(0, currentBalance - amount);
        }

        delete db.userStates[chatId];
        saveDatabase();

        const actionText = action === 'inc' ? 'افزایش یافته' : 'کاهش یافته';
        
        await bot.answerCallbackQuery(callbackQuery.id, { text: `✅ با موفقیت اعمال شد.`, show_alert: false });
        await bot.sendMessage(chatId, `✅ عملیات با موفقیت انجام شد.\nمبلغ ${amount.toLocaleString()} تومان به حساب کاربر \`${targetUser}\` ${actionText}.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`, { parse_mode: 'Markdown' });
        
        try {
            const notifyText = action === 'inc' 
                ? `🎉 حساب شما توسط مدیریت به مبلغ ${amount.toLocaleString()} تومان شارژ شد.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`
                : `⚠️ مبلغ ${amount.toLocaleString()} تومان توسط مدیریت از حساب شما کسر شد.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`;
            await bot.sendMessage(targetUser, notifyText);
        } catch (e) {}
        return;
    }

    if (data.startsWith('approve_deposit_') || data.startsWith('reject_deposit_')) {
        if (!isAdmin(callbackQuery)) return;
        const parts = data.split('_');
        const action = parts[0];
        const targetUserId = parts[2];
        const depositKey = `deposit_${targetUserId}`;

        const rec = db.receiptsHistory.find(r => r.userId.toString() === targetUserId.toString() && r.status === 'در انتظار تایید' && r.type === 'شارژ کیف پول');
        if (!rec) {
            bot.answerCallbackQuery(callbackQuery.id, { text: '⚠️ این رسید قبلاً پردازش شده یا نامعتبر است!', show_alert: true });
            return;
        }

        rec.status = (action === 'approve') ? 'تایید شده' : 'رد شده';
        saveDatabase();

        if (action === 'approve') {
            const depositInfo = db.pending_deposits[depositKey];
            if (depositInfo) {
                db.userWallets[targetUserId] = (db.userWallets[targetUserId] || 0) + depositInfo.amount;
                delete db.pending_deposits[depositKey];
                saveDatabase();
                bot.sendMessage(targetUserId, `🎉 **شارژ کیف پول شما تایید شد!**\nمبلغ \`${depositInfo.amount.toLocaleString()} تومان\` به حسابتان واریز شد. ✨`, { parse_mode: 'Markdown' }).catch(() => {});
                bot.sendMessage(chatId, '✅ شارژ تایید شد.');
            }
        } else {
            delete db.pending_deposits[depositKey];
            saveDatabase();
            bot.sendMessage(targetUserId, '❌ رسید شارژ کیف پول شما توسط ادمین رد شد.');
            bot.sendMessage(chatId, '❌ رسید رد شد.');
        }
        return;
    }

    if (data.startsWith('approve_card_') || data.startsWith('reject_card_')) {
        if (!isAdmin(callbackQuery)) return;
        const parts = data.split('_');
        const action = parts[0];
        const targetUserId = parts[2];
        const cardKey = `card_pur_${targetUserId}`;

        const rec = db.receiptsHistory.find(r => r.userId.toString() === targetUserId.toString() && r.status === 'در انتظار تایید' && r.type === 'خرید کارت به کارت');
        if (!rec) {
            bot.answerCallbackQuery(callbackQuery.id, { text: '⚠️ این رسید قبلاً پردازش شده یا نامعتبر است!', show_alert: true });
            return;
        }

        rec.status = (action === 'approve') ? 'تایید شده و صادر گردید' : 'رد شده';
        saveDatabase();

        if (action === 'approve') {
            const planId = parseInt(parts[3]);
            const plan = db.customPlans.find(p => p.id === planId);

            if (plan && plan.links.length > 0) {
                const assignedLink = plan.links.shift();
                const parsedData = await fetchAndParseConfig(assignedLink);
                const currentDateStr = new Date().toLocaleString('fa-IR');
                const userInfo = db.usersDetailMap[targetUserId] || { name: 'کاربر', username: 'ندارد' };

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

                logPurchaseToFile(subObj);
                delete db.pending_card_purchases[cardKey];
                saveDatabase();

                const rawUsername = userInfo.username || 'ندارد';
                const cleanUsername = rawUsername.replace('@', '');
                const purchaseMessage = `🛒 **خرید جدید ثبت شد:**\n` +
                                        `👤 **نام کاربری:** @${cleanUsername}\n` +
                                        `⏰ **زمان خرید:** ${currentDateStr}\n` +
                                        `📦 **حجم:** ${parsedData.total !== 'نامشخص' ? parsedData.total : plan.volume}\n\n` +
                                        `🔗 **لینک اشتراک:**\n\`${assignedLink}\``;
                
                const channelKeyboard = {
                    reply_markup: {
                        inline_keyboard: [[{ text: '👤 پروفایل کاربر در تلگرام', url: `tg://user?id=${targetUserId}` }]]
                    }
                };

                await bot.sendMessage(CHANNEL_LOG_ID, purchaseMessage, { parse_mode: 'Markdown', ...channelKeyboard }).catch(() => {});

                let successMsg = `🎉 **خرید شما تایید شد و اشتراک صادر گردید!** 🚀\n\n` +
                                 `📦 پلن: \`${plan.name}\`\n` +
                                 `🌐 حجم: \`${parsedData.total}\`\n` +
                                 `⏳ انقضا: \`${subObj.expiryDate}\`\n\n` +
                                 `🔗 **لینک اشتراک اختصاصی شما:**\n\`${assignedLink}\``;

                if (parsedData.extractedConfigs && parsedData.extractedConfigs.length > 0) {
                    successMsg += `\n\n⚙️ **کانفیگ‌ها:**\n\`\`\`\n${parsedData.extractedConfigs.join('\n\n')}\n\`\`\``;
                }

                bot.sendMessage(targetUserId, successMsg, { parse_mode: 'Markdown' }).catch(() => {});
                bot.sendMessage(chatId, '✅ خرید تایید شد و لینک اشتراک برای کاربر ارسال گردید.');
            } else {
                bot.sendMessage(chatId, '❌ خطا: این پلن دیگر لینک بازی ندارد.');
            }
        } else {
            delete db.pending_card_purchases[cardKey];
            saveDatabase();
            bot.sendMessage(targetUserId, '❌ رسید خرید کارت به کارت شما توسط ادمین رد شد.');
            bot.sendMessage(chatId, '❌ رسید رد شد.');
        }
        return;
    }

    if (data === 'admin_send_backup') {
        if (!isAdmin(callbackQuery)) return;
        bot.sendMessage(chatId, '⏳ در حال تهیه و ارسال فایل‌های پشتیبان و لاگ...');
        await sendBackupToAdmin();
        return;
    }

    if (data === 'restart_bot') {
        delete db.userStates[chatId];
        saveDatabase();
        sendMainMenu(chatId);
        return;
    }

    if (data === 'admin_edit_names_menu') {
        if (!isAdmin(callbackQuery)) return;
        const names = db.menuNames;
        const editNamesKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: `✏️ خرید اشتراک: ${names.buy_sub}`, callback_data: 'set_name_buy_sub' }],
                    [{ text: `✏️ اشتراک رایگان: ${names.free_sub}`, callback_data: 'set_name_free_sub' }],
                    [{ text: `✏️ سرور تست: ${names.test_server}`, callback_data: 'set_name_test_server' }],
                    [{ text: `✏️ کیف پول: ${names.wallet}`, callback_data: 'set_name_wallet' }],
                    [{ text: `✏️ زیرمجموعه‌گیری: ${names.invite}`, callback_data: 'set_name_invite' }],
                    [{ text: `✏️ اشتراک‌های من: ${names.my_subs}`, callback_data: 'set_name_my_subs' }],
                    [{ text: `✏️ آموزش اتصال: ${names.tutorial}`, callback_data: 'set_name_tutorial' }],
                    [{ text: `✏️ پشتیبانی: ${names.support}`, callback_data: 'set_name_support' }],
                    [{ text: '🔙 بازگشت به پنل', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '✏️ **تغییر نام دکمه‌ها و بخش‌های منوی اصلی**\nبخشی که می‌خواهید نامش را عوض کنید انتخاب کنید:', { parse_mode: 'Markdown', ...editNamesKeyboard });
        return;
    }

    if (data.startsWith('set_name_')) {
        if (!isAdmin(callbackQuery)) return;
        const key = data.replace('set_name_', '');
        db.userStates[chatId] = { step: 'get_new_menu_name', targetKey: key };
        saveDatabase();
        bot.sendMessage(chatId, `✏️ نام جدید این دکمه را وارد کنید:`, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_edit_texts_menu') {
        if (!isAdmin(callbackQuery)) return;
        const editTextKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📝 متن پیام استارت / منوی اصلی', callback_data: 'set_text_start_message' }],
                    [{ text: '📝 متن آموزش اتصال', callback_data: 'set_text_tutorial_message' }],
                    [{ text: '📝 متن درخواست پشتیبانی', callback_data: 'set_text_support_prompt' }],
                    [{ text: '📝 متن موفقیت ارسال پیام پشتیبانی', callback_data: 'set_text_support_success' }],
                    [{ text: '📝 متن صفحه فروشگاه پلن‌ها', callback_data: 'set_text_store_title' }],
                    [{ text: '📝 متن اتمام پلن‌ها / خالی بودن', callback_data: 'set_text_no_plans' }],
                    [{ text: '📝 متن منوی کیف پول', callback_data: 'set_text_wallet_title' }],
                    [{ text: '📝 متن منوی زیرمجموعه‌گیری', callback_data: 'set_text_invite_title' }],
                    [{ text: '📝 متن نداشتن اشتراک فعال', callback_data: 'set_text_empty_subs' }],
                    [{ text: '🔙 بازگشت به پنل', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '📝 **تغییر متن‌های بخش‌های مختلف ربات**\nمتنی که می‌خواهید ویرایش کنید را انتخاب کنید:', { parse_mode: 'Markdown', ...editTextKeyboard });
        return;
    }

    if (data.startsWith('set_text_')) {
        if (!isAdmin(callbackQuery)) return;
        const key = data.replace('set_text_', '');
        db.userStates[chatId] = { step: 'get_new_bot_text', targetTextKey: key };
        saveDatabase();
        bot.sendMessage(chatId, `📝 متن جدید برای این بخش را ارسال کنید:\n\n*(متن فعلی):\n\`${db.botTexts[key] || ''}\`*`, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_force_join_menu') {
        if (!isAdmin(callbackQuery)) return;
        const statusText = db.isForceJoinEnabled ? '🟢 روشن' : '🔴 خاموش';
        const fjMenu = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: `وضعیت: ${statusText} (تغییر وضعیت)`, callback_data: 'toggle_force_join' }],
                    [{ text: `✏️ تنظیم کانال (فعلی: ${db.CHANNEL_USERNAME})`, callback_data: 'set_channel_username' }],
                    [{ text: '🔙 بازگشت', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '📢 **مدیریت کانال و جوین اجباری**', { parse_mode: 'Markdown', ...fjMenu });
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
        db.userStates[chatId] = { step: 'get_new_channel_username' };
        saveDatabase();
        bot.sendMessage(chatId, '📢 آیدی کانال جدید را با فرمت صحیح بفرستید (مثلاً `@MyChannel`):', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'toggle_test_server') {
        if (!isAdmin(callbackQuery)) return;
        db.isTestServerEnabled = !db.isTestServerEnabled;
        saveDatabase();
        bot.sendMessage(chatId, `🧪 سرور تست ${db.isTestServerEnabled ? 'روشن' : 'خاموش'} شد.`);
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'admin_set_test_link') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'get_new_test_link' };
        saveDatabase();
        bot.sendMessage(chatId, `🧪 لینک جدید سرور تست را بفرستید:\n\`${db.testServerConfig}\``, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'toggle_free_sub') {
        if (!isAdmin(callbackQuery)) return;
        db.isFreeSubEnabled = !db.isFreeSubEnabled;
        saveDatabase();
        bot.sendMessage(chatId, `🎁 اشتراک رایگان ${db.isFreeSubEnabled ? 'روشن' : 'خاموش'} شد.`);
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'admin_set_free_link') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'get_new_free_link' };
        saveDatabase();
        bot.sendMessage(chatId, `🎁 لینک جدید اشتراک رایگان را بفرستید:\n\`${db.freeSubConfig}\``, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'toggle_invite_system') {
        if (!isAdmin(callbackQuery)) return;
        db.isInviteSystemEnabled = !db.isInviteSystemEnabled;
        saveDatabase();
        bot.sendMessage(chatId, `👥 سیستم زیرمجموعه‌گیری ${db.isInviteSystemEnabled ? 'روشن' : 'خاموش'} شد.`);
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'check_membership') {
        const isMember = await checkMembership(userId);
        if (isMember) {
            bot.sendMessage(chatId, '✅ عضویت شما تایید شد! حالا می‌توانید از ربات لذت ببرید. 🎉');
            sendMainMenu(chatId);
        } else {
            bot.sendMessage(chatId, '❌ شما هنوز در کانال عضو نشده‌اید یا خطایی رخ داده است. لطفاً جوین شوید و دوباره تلاش کنید. ⚠️');
        }
        return;
    }

    if (data === 'admin_manage_plans') {
        const plansMenuKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ افزودن پلن جدید', callback_data: 'plan_mgmt_add' }],
                    [{ text: '✏️ ویرایش یا مدیریت پلن‌ها', callback_data: 'plan_mgmt_edit_list' }],
                    [{ text: '🔙 بازگشت به پنل', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '⚙️ **مدیریت پلن‌ها و کانفیگ‌ها**', { parse_mode: 'Markdown', ...plansMenuKeyboard });
        return;
    }

    if (data === 'plan_mgmt_add') {
        db.userStates[chatId] = { step: 'get_new_plan_name' };
        saveDatabase();
        bot.sendMessage(chatId, '➕ **ساخت پلن جدید**\n\nلطفاً نام پلن را وارد کنید:', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'plan_mgmt_edit_list') {
        if (db.customPlans.length === 0) {
            bot.sendMessage(chatId, '📦 هیچ پلنی ثبت نشده است.');
            return;
        }

        let textList = '📋 **لیست پلن‌های موجود:**\n\n';
        const inlineBtns = [];

        db.customPlans.forEach((p) => {
            textList += `▪️ **${p.name}**\n   🌐 حجم: ${p.volume} | ⏳ مدت: ${p.duration} | 💵 قیمت: ${p.price}\n   📦 تعداد کانفیگ انبار: **${p.links.length} عدد**\n\n`;
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
        db.userStates[chatId] = { step: 'edit_plan_get_name', targetPlanId: planId };
        saveDatabase();
        bot.sendMessage(chatId, '✏️ نام جدید پلن را وارد کنید:', { parse_mode: 'Markdown' });
        return;
    }

    if (data.startsWith('add_link_')) {
        const planId = parseInt(data.split('_')[2]);
        db.userStates[chatId] = { step: 'get_extra_link_for_plan', targetPlanId: planId };
        saveDatabase();
        bot.sendMessage(chatId, '🔗 لینک سابسکریپشن یا کانفیگ جدید را بفرستید:', { parse_mode: 'Markdown' });
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
        db.userStates[chatId] = { step: 'get_new_card_number' };
        saveDatabase();
        bot.sendMessage(chatId, '💳 **تنظیمات شماره کارت**\n\nشماره کارت فعلی: `' + db.paymentCardNumber + '`\n\nشماره کارت جدید را بفرستید:', { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_receipts') {
        if (db.receiptsHistory.length === 0) {
            bot.sendMessage(chatId, '📋 هیچ سابقه رسییدی ثبت نشده است.');
            return;
        }
        let receiptText = '📋 **بایگانی سوابق رسیدهای مالی:**\n\n';
        db.receiptsHistory.forEach((r, idx) => {
            receiptText += `${idx + 1}. نوع: ${r.type}\n   👤 کاربر: ${r.userName} (\`${r.userId}\`)\n   💵 جزئیات: ${r.details}\n   📌 وضعیت: ${r.status}\n   📅 تاریخ: ${r.date}\n\n`;
        });
        bot.sendMessage(chatId, receiptText, { parse_mode: 'Markdown' });
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
                           `📛 نام: ${sub.planName}\n` +
                           `📦 پلن: ${sub.planName}\n` +
                           `🌐 حجم: ${sub.totalVolume || sub.volume}\n` +
                           `⏳ انقضا: ${sub.expiryDate}\n` +
                           `🔗 لینک: \`${sub.configLink}\`\n\n`;
        });
        bot.sendMessage(chatId, historyText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_stats') {
        bot.sendMessage(chatId, `📊 **آمار کلی ربات:**\n\n👥 کل کاربران: \`${db.allUsers.length}\`\n📦 کل اشتراک‌ها: \`${db.allSubscriptionsHistory.length}\`\n📋 کل رسیدها: \`${db.receiptsHistory.length}\``, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_broadcast') {
        db.userStates[chatId] = { step: 'get_broadcast_content' };
        saveDatabase();
        bot.sendMessage(chatId, '📢 متن پیام همگانی را بفرستید:');
        return;
    }

    if (data === 'wallet') {
        const balance = db.userWallets[userId] || 0;
        const walletKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ شارژ کیف پول 💳', callback_data: 'wallet_deposit' }],
                    [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]
                ]
            }
        };
        const customWalletText = (db.botTexts.wallet_title || '')
            .replace('{balance}', balance.toLocaleString())
            .replace('{userId}', userId);

        bot.sendMessage(chatId, customWalletText, { parse_mode: 'Markdown', ...walletKeyboard });
        return;
    }

    if (data === 'wallet_deposit') {
        const depositAmountsKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "50,000 تومان 💵", callback_data: 'user_dep_50000' },
                        { text: "100,000 تومان 💵", callback_data: 'user_dep_100000' }
                    ],
                    [
                        { text: "200,000 تومان 💵", callback_data: 'user_dep_200000' },
                        { text: "500,000 تومان 🚀", callback_data: 'user_dep_500000' }
                    ],
                    [
                        { text: '🔙 بازگشت به کیف پول', callback_data: 'wallet' }
                    ]
                ]
            }
        };

        delete db.userStates[chatId];
        saveDatabase();
        
        await bot.editMessageText('💳 **افزایش موجودی کیف پول**\n\nلطفاً یکی از مبالغ زیر را برای شارژ حساب انتخاب کنید: 👇', {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: depositAmountsKeyboard.reply_markup
        });
        return;
    }

    if (data.startsWith('user_dep_')) {
        const amount = parseInt(data.replace('user_dep_', ''), 10);
        db.userStates[chatId] = { step: 'get_wallet_deposit_receipt', depositAmount: amount };
        saveDatabase();

        const depositMsg = `💳 **فاکتور شارژ کیف پول**\n\n` +
                           `💵 مبلغ انتخابی: \`${amount.toLocaleString()} تومان\`\n\n` +
                           `به شماره کارت زیر واریز کرده و **عکس رسید** را همینجا بفرستید: 👇\n\`${db.paymentCardNumber}\``;
        
        await bot.editMessageText(depositMsg, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 بازگشت', callback_data: 'wallet_deposit' }]
                ]
            }
        });
        return;
    }

    if (data === 'buy_sub') {
        const availablePlans = db.customPlans.filter(p => p.links && p.links.length > 0);
        if (availablePlans.length === 0) {
            bot.sendMessage(chatId, db.botTexts.no_plans);
            return;
        }

        let planText = db.botTexts.store_title;
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
            bot.sendMessage(chatId, '❌ متأسفانه این پلن به اتمام رسیده است.');
            return;
        }

        const priceNumber = parsePrice(selectedPlan.price);
        const userBalance = db.userWallets[userId] || 0;

        const inlineBtns = [];
        let paymentDesc = `📋 **فاکتور نهایی خرید اشتراک** ⚡️\n\n` +
                          `🏷 نام پلن: \`${selectedPlan.name}\`\n` +
                          `🌐 حجم ترافیک: \`${selectedPlan.volume}\`\n` +
                          `⏳ مدت زمان: \`${selectedPlan.duration}\`\n` +
                          `💵 **مبلغ قابل پرداخت: ${selectedPlan.price}**\n` +
                          `💰 موجودی کیف پول شما: \`${userBalance.toLocaleString()} تومان\`\n\n`;

        if (userBalance >= priceNumber) {
            paymentDesc += `✅ موجودی کیف پول شما کافی است.`;
            inlineBtns.push([{ text: `💳 پرداخت آنی از کیف پول (${selectedPlan.price}) ✨`, callback_data: `pay_wallet_${selectedPlan.id}` }]);
        } else {
            paymentDesc += `⚠️ موجودی کیف پول کافی نیست.`;
            inlineBtns.push([{ text: `➕ شارژ کیف پول 💳`, callback_data: 'wallet_deposit' }]);
        }
        inlineBtns.push([{ text: `💳 پرداخت کارت به کارت 🧾`, callback_data: `pay_card_${selectedPlan.id}` }]);
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
        const userBalance = db.userWallets[userId] || 0;

        if (userBalance < priceNumber) {
            bot.sendMessage(chatId, '❌ موجودی کیف پول کافی نیست.');
            return;
        }

        db.userWallets[userId] = userBalance - priceNumber;
        const assignedLink = plan.links.shift();
        delete db.userStates[chatId];
        saveDatabase();

        const parsedData = await fetchAndParseConfig(assignedLink);
        const currentDateStr = new Date().toLocaleString('fa-IR');
        const userInfo = db.usersDetailMap[userId] || { name: 'کاربر', username: 'ندارد' };

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

        logPurchaseToFile(subObj);
        db.receiptsHistory.push({
            type: 'خرید با کیف پول',
            userId: userId,
            userName: userInfo.name,
            details: `${plan.name} (${plan.price})`,
            status: 'تایید شده خودکار',
            date: currentDateStr
        });
        saveDatabase();

        const rawUsername = userInfo.username || 'ندارد';
        const cleanUsername = rawUsername.replace('@', '');
        const purchaseMessage = `🛒 **خرید جدید ثبت شد:**\n` +
                                `👤 **نام کاربری:** @${cleanUsername}\n` +
                                `⏰ **زمان خرید:** ${currentDateStr}\n` +
                                `📦 **حجم:** ${parsedData.total !== 'نامشخص' ? parsedData.total : plan.volume}\n\n` +
                                `🔗 **لینک اشتراک:**\n\`${assignedLink}\``;
        
        const channelKeyboard = {
            reply_markup: {
                inline_keyboard: [[{ text: '👤 پروفایل کاربر در تلگرام', url: `tg://user?id=${userId}` }]]
            }
        };

        await bot.sendMessage(CHANNEL_LOG_ID, purchaseMessage, { parse_mode: 'Markdown', ...channelKeyboard }).catch(() => {});

        let userMsg = `🎉 **خرید موفقیت‌آمیز انجام شد!** 🚀\n\n` +
                      `📦 پلن: \`${plan.name}\`\n` +
                      `🌐 کل حجم: \`${parsedData.total !== 'نامشخص' ? parsedData.total : plan.volume}\`\n` +
                      `⏳ انقضا: \`${subObj.expiryDate}\`\n` +
                      `💰 موجودی جدید کیف پول: \`${db.userWallets[userId].toLocaleString()} تومان\`\n\n` +
                      `🔗 **لینک اختصاصی اشتراک شما:**\n\`${assignedLink}\``;

        if (parsedData.extractedConfigs && parsedData.extractedConfigs.length > 0) {
            userMsg += `\n\n⚙️ **کانفیگ‌های مجزا:**\n\`\`\`\n${parsedData.extractedConfigs.join('\n\n')}\n\`\`\``;
        }

        bot.sendMessage(chatId, userMsg, { parse_mode: 'Markdown' });
        return;
    }

    if (data.startsWith('pay_card_')) {
        const planId = parseInt(data.split('_')[2]);
        const plan = db.customPlans.find(p => p.id === planId);
        if (!plan || plan.links.length === 0) return;

        db.userStates[chatId] = { step: 'get_card_purchase_receipt', planId: plan.id };
        saveDatabase();

        const checkoutText = `📋 **فاکتور نهایی خرید کارت به کارت** 💳\n\n` +
                             `🏷 پلن: \`${plan.name}\` | 💵 مبلغ: \`${plan.price}\`\n\n` +
                             `مبلغ را به شماره کارت زیر واریز کرده و **عکس رسید** را همینجا ارسال کنید: 👇\n\`${db.paymentCardNumber}\``;

        bot.sendMessage(chatId, checkoutText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'free_sub') {
        if (!db.isFreeSubEnabled) {
            bot.sendMessage(chatId, '❌ بخش اشتراک رایگان غیرفعال است.');
            return;
        }
        const parsedFree = await fetchAndParseConfig(db.freeSubConfig);
        let freeMsg = `🎁 **هدیه اشتراک رایگان شما:** 🌟\n\n` +
                      `🌐 حجم کل: \`${parsedFree.total}\`\n` +
                      `⏳ انقضا: \`${parsedFree.expireDate}\`\n\n` +
                      `🔗 **لینک اتصال:**\n\`${db.freeSubConfig}\``;
                      
        if (parsedFree.extractedConfigs && parsedFree.extractedConfigs.length > 0) {
            freeMsg += `\n\n⚙️ **کانفیگ‌ها:**\n\`\`\`\n${parsedFree.extractedConfigs.join('\n\n')}\n\`\`\``;
        }
        bot.sendMessage(chatId, freeMsg, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'test_server') {
        if (!db.isTestServerEnabled) {
            bot.sendMessage(chatId, '❌ سرور تست غیرفعال است.');
            return;
        }
        const parsedTest = await fetchAndParseConfig(db.testServerConfig);
        let testMsg = `🧪 **کانفیگ سرور تست:** ⚡️\n\n` +
                      `🔗 **لینک اتصال:**\n\`${db.testServerConfig}\``;
                      
        if (parsedTest.extractedConfigs && parsedTest.extractedConfigs.length > 0) {
            testMsg += `\n\n⚙️ **کانفیگ‌ها:**\n\`\`\`\n${parsedTest.extractedConfigs.join('\n\n')}\n\`\`\``;
        }
        bot.sendMessage(chatId, testMsg, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'invite') {
        const inviteLink = `https://t.me/${(await bot.getMe()).username}?start=${userId}`;
        const count = db.referals[userId] || 0;
        const inviteText = (db.botTexts.invite_title || '')
            .replace('{inviteLink}', inviteLink)
            .replace('{count}', count);
        bot.sendMessage(chatId, inviteText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'tutorial') {
        bot.sendMessage(chatId, db.botTexts.tutorial_message, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'support') {
        db.userStates[chatId] = { step: 'waiting_for_support_message' };
        saveDatabase();
        bot.sendMessage(chatId, db.botTexts.support_prompt, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'my_subs') {
        const subs = db.userSubscriptions[userId];
        if (!subs || subs.length === 0) {
            bot.sendMessage(chatId, db.botTexts.empty_subs, { parse_mode: 'Markdown' });
            return;
        }

        let subsText = `📱 **اشتراک‌های فعال و خریداری شده شما:**\n\n`;
        subs.forEach((s, idx) => {
            subsText += `🔹 **اشتراک شماره ${idx + 1}**\n` +
                        `🏷 پلن: ${s.planName}\n` +
                        `🌐 حجم: ${s.totalVolume || s.volume}\n` +
                        `⏳ انقضا: ${s.expiryDate}\n` +
                        `🔗 لینک اشتراک:\n\`${s.configLink}\`\n\n`;
        });
        bot.sendMessage(chatId, subsText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'back_to_main') {
        delete db.userStates[chatId];
        saveDatabase();
        sendMainMenu(chatId);
        return;
    }
});

// هندلر عکس‌ها (دریافت رسید و پردازش ادمین)
bot.on('photo', async (msg) => {
    loadDatabase();
    const chatId = msg.chat.id;
    const userId = msg.from ? msg.from.id : null;
    if (!userId) return;

    trackUserAndNotifyAdmin(msg);

    const userState = db.userStates[chatId];
    if (!userState) return;

    if (userState.step === 'get_wallet_deposit_receipt') {
        const amount = userState.depositAmount;
        const photoFileId = msg.photo[msg.photo.length - 1].file_id;
        const depositKey = `deposit_${userId}`;

        db.pending_deposits[depositKey] = { amount: amount };
        const userInfo = db.usersDetailMap[userId] || { name: 'کاربر', username: 'ندارد' };
        const currentDateStr = new Date().toLocaleString('fa-IR');

        db.receiptsHistory.push({
            type: 'شارژ کیف پول',
            userId: userId,
            userName: userInfo.name,
            details: `${amount.toLocaleString()} تومان`,
            status: 'در انتظار تایید',
            date: currentDateStr
        });
        saveDatabase();

        const adminKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ تایید شارژ کیف پول', callback_data: `approve_deposit_${userId}` },
                        { text: '❌ رد رسید', callback_data: `reject_deposit_${userId}` }
                    ]
                ]
            }
        };

        const captionToAdmin = `🔔 **رسید جدید شارژ کیف پول!**\n\n` +
                               `👤 کاربر: ${userInfo.name} (\`${userId}\`)\n` +
                               `💵 مبلغ شارژ: \`${amount.toLocaleString()} تومان\``;

        await bot.sendPhoto(ADMIN_CHAT_ID, photoFileId, { caption: captionToAdmin, parse_mode: 'Markdown', ...adminKeyboard }).catch(() => {});
        
        delete db.userStates[chatId];
        saveDatabase();

        bot.sendMessage(chatId, '✅ **رسید شارژ کیف پول دریافت شد.** پس از بررسی ادمین، موجودی کیف پول شما شارژ خواهد شد. ⏳', { parse_mode: 'Markdown' });
        return;
    }

    if (userState.step === 'get_card_purchase_receipt') {
        const planId = userState.planId;
        const plan = db.customPlans.find(p => p.id === planId);
        if (!plan) return;

        const photoFileId = msg.photo[msg.photo.length - 1].file_id;
        const cardKey = `card_pur_${userId}`;

        db.pending_card_purchases[cardKey] = { planId: plan.id };
        const userInfo = db.usersDetailMap[userId] || { name: 'کاربر', username: 'ندارد' };
        const currentDateStr = new Date().toLocaleString('fa-IR');

        db.receiptsHistory.push({
            type: 'خرید کارت به کارت',
            userId: userId,
            userName: userInfo.name,
            details: `${plan.name} (${plan.price})`,
            status: 'در انتظار تایید',
            date: currentDateStr
        });
        saveDatabase();

        const adminKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ تایید و ارسال اشتراک', callback_data: `approve_card_${userId}_${plan.id}` },
                        { text: '❌ رد رسید', callback_data: `reject_card_${userId}` }
                    ]
                ]
            }
        };

        const captionToAdmin = `🔔 **رسید جدید خرید اشتراک!**\n\n` +
                               `👤 کاربر: ${userInfo.name} (\`${userId}\`)\n` +
                               `📦 پلن درخواستی: \`${plan.name}\` (${plan.price})`;

        await bot.sendPhoto(ADMIN_CHAT_ID, photoFileId, { caption: captionToAdmin, parse_mode: 'Markdown', ...adminKeyboard }).catch(() => {});

        delete db.userStates[chatId];
        saveDatabase();

        bot.sendMessage(chatId, '✅ **رسید خرید اشتراک دریافت شد.** پس از بررسی ادمین، لینک اشتراک برای شما ارسال می‌شود. ⏳', { parse_mode: 'Markdown' });
        return;
    }
});

// هندلر پیام‌های متنی
bot.on('message', async (msg) => {
    loadDatabase();
    const chatId = msg.chat.id;
    const userId = msg.from ? msg.from.id : null;
    if (!userId) return;

    trackUserAndNotifyAdmin(msg);

    const userState = db.userStates[chatId];
    if (!userState) return;

    const text = msg.text;

    if (userState.step === 'wallet_manager_waiting_for_amount' && text) {
        if (!isAdmin(msg)) return;
        const amount = parseInt(text.replace(/[^0-9]/g, ''), 10);
        if (isNaN(amount) || amount <= 0) {
            bot.sendMessage(chatId, '❌ لطفاً یک عدد معتبر برای مبلغ وارد کنید.');
            return;
        }

        const targetUser = userState.targetUser;
        const action = userState.action;
        const currentBalance = db.userWallets[targetUser] || 0;

        if (action === 'inc') {
            db.userWallets[targetUser] = currentBalance + amount;
        } else {
            db.userWallets[targetUser] = Math.max(0, currentBalance - amount);
        }

        delete db.userStates[chatId];
        saveDatabase();

        const actionText = action === 'inc' ? 'افزایش یافته' : 'کاهش یافته';
        bot.sendMessage(chatId, `✅ عملیات با موفقیت انجام شد.\nمبلغ ${amount.toLocaleString()} تومان به حساب کاربر \`${targetUser}\` ${actionText}.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`, { parse_mode: 'Markdown' });
        
        try {
            const notifyText = action === 'inc' 
                ? `🎉 حساب شما توسط مدیریت به مبلغ ${amount.toLocaleString()} تومان شارژ شد.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`
                : `⚠️ مبلغ ${amount.toLocaleString()} تومان توسط مدیریت از حساب شما کسر شد.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`;
            await bot.sendMessage(targetUser, notifyText);
        } catch (e) {}
        return;
    }

    if (userState.step === 'waiting_for_support_message' && text) {
        delete db.userStates[chatId];
        saveDatabase();

        const userInfo = db.usersDetailMap[userId] || { name: 'کاربر', username: 'ندارد' };
        const supportForwardText = `📞 **پیام جدید پشتیبانی!**\n\n` +
                                   `👤 کاربر: ${userInfo.name}\n` +
                                   `🆔 یوزرنیم: ${userInfo.username}\n` +
                                   `🔢 چت آیدی: \`${userId}\`\n\n` +
                                   `💬 متن پیام:\n${text}`;

        const supportKeyboard = {
            reply_markup: {
                inline_keyboard: [[{ text: '👤 پروفایل کاربر در تلگرام', url: `tg://user?id=${userId}` }]]
            }
        };

        await bot.sendMessage(ADMIN_CHAT_ID, supportForwardText, { parse_mode: 'Markdown', ...supportKeyboard }).catch(() => {});
        bot.sendMessage(chatId, db.botTexts.support_success, { parse_mode: 'Markdown' });
        return;
    }
});
