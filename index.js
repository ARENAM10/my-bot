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

// اطلاعات کانال مقصد برای گزارش خریدها
const CHANNEL_LOG_ID = '-1004488082323';

// --- مسیر ذخیره‌سازی داده‌ها ---
const DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : __dirname;
const DB_FILE = path.join(DATA_DIR, 'database.json');
const PURCHASES_LOG_FILE = path.join(DATA_DIR, 'purchases_log.txt');

// ساختار پیش‌فرض پایه (برای اولین اجرا)
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
                userStates: parsed.userStates || {},
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
            
            if (
                hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' ||
                hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.16.')
            ) {
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
                    { text: '📝 تغییر متن‌های ربات', callback_data: 'admin_edit_texts_menu' },
                    { text: '📦 سوابق اشتراک‌ها', callback_data: 'admin_history' }
                ],
                [
                    { text: '💰 شارژ دستی کیف پول', callback_data: 'admin_charge_wallet' },
                    { text: '📋 رسیدهای مالی', callback_data: 'admin_receipts' }
                ],
                [
                    { text: '📊 آمار کلی', callback_data: 'admin_stats' },
                    { text: '👥 لیست کاربران', callback_data: 'admin_users' }
                ],
                [
                    { text: '💳 تنظیم شماره کارت', callback_data: 'admin_pay_settings' },
                    { text: '📢 ارسال همگانی', callback_data: 'admin_broadcast' }
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

    // --- مدیریت تعاملی کاربران (ارسال پیام یا شارژ کیف پول مستقیم برای کاربر خاص) ---
    if (data.startsWith('adm_msg_')) {
        if (!isAdmin(callbackQuery)) return;
        const targetUserId = parseInt(data.replace('adm_msg_', ''), 10);
        db.userStates[chatId] = { step: 'admin_direct_message_user', targetUserId: targetUserId };
        saveDatabase();
        bot.sendMessage(chatId, `✉️ **ارسال پیام مستقیم به کاربر** (\`${targetUserId}\`)\n\nمتن پیام خود را ارسال کنید:`, { parse_mode: 'Markdown' });
        return;
    }

    if (data.startsWith('adm_chg_')) {
        if (!isAdmin(callbackQuery)) return;
        const targetUserId = parseInt(data.replace('adm_chg_', ''), 10);
        db.userStates[chatId] = { step: 'admin_direct_charge_user', targetUserId: targetUserId };
        saveDatabase();
        bot.sendMessage(chatId, `💰 **شارژ مستقیم کیف پول کاربر** (\`${targetUserId}\`)\n\nمبلغ به تومان را وارد کنید (مثلاً \`50000\`):`, { parse_mode: 'Markdown' });
        return;
    }

    // --- تایید یا رد شارژ کیف پول ---
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

    // --- تایید یا رد خرید کارت به کارت ---
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

    if (data === 'admin_charge_wallet') {
        db.userStates[chatId] = { step: 'admin_get_charge_user_id' };
        saveDatabase();
        bot.sendMessage(chatId, '💰 **شارژ دستی کیف پول**\n\nلطفاً **شناسه عددی (Chat ID)** کاربر مورد نظر را ارسال کنید:', { parse_Mode: 'Markdown' });
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

    // --- لیست کاربران (فقط نمایش نام و آیدی به همراه امکانات مدیریت پایه) ---
    if (data === 'admin_users') {
        if (db.allUsers.length === 0) {
            bot.sendMessage(chatId, '👥 هیچ کاربری ثبت نشده است.');
            return;
        }

        bot.sendMessage(chatId, `👥 **لیست کل کاربران ربات (مجموع: ${db.allUsers.length} نفر):**\nدر حال ارسال مشخصات...`, { parse_mode: 'Markdown' });

        for (const uId of db.allUsers) {
            const info = db.usersDetailMap[uId] || { name: 'نامشخص', username: 'ندارد', joinedAt: 'نامشخص' };
            const cleanUsername = info.username !== 'ندارد' ? info.username : 'فاقد یوزرنیم';

            let userCardText = `👤 **اطلاعات کلی کاربر:**\n\n`;
            userCardText += `▫️ **نام:** ${info.name}\n`;
            userCardText += `▫️ **آیدی:** ${cleanUsername}\n`;
            userCardText += `🆔 **شناسه عددی:** \`${uId}\``;

            const userActionKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✉️ ارسال پیام', callback_data: `adm_msg_${uId}` },
                            { text: '💰 شارژ کیف پول', callback_data: `adm_chg_${uId}` }
                        ],
                        [
                            { text: '👤 پروفایل تلگرام', url: `tg://user?id=${uId}` }
                        ]
                    ]
                }
            };

            await bot.sendMessage(chatId, userCardText, { parse_mode: 'Markdown', ...userActionKeyboard });
            await new Promise(resolve => setTimeout(resolve, 80)); 
        }
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
        db.userStates[chatId] = { step: 'get_wallet_deposit_amount' };
        saveDatabase();
        bot.sendMessage(chatId, '💳 **افزایش موجودی کیف پول**\n\nلطفاً مبلغ مورد نظر به تومان (مثلاً `50000`) را وارد کنید:', { parse_mode: 'Markdown' });
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
        let testMsg = `🧪 **سرور تست پرسرعت** ⚡️\n\n` +
                      `🌐 حجم: \`${parsedTest.total}\` | ⏳ انقضا: \`${parsedTest.expireDate}\`\n\n` +
                      `🔗 **لینک اتصال:**\n\`${db.testServerConfig}\``;
        
        if (parsedTest.extractedConfigs && parsedTest.extractedConfigs.length > 0) {
            testMsg += `\n\n⚙️ **کانفیگ‌ها:**\n\`\`\`\n${parsedTest.extractedConfigs.join('\n\n')}\n\`\`\``;
        }
        
        bot.sendMessage(chatId, testMsg, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'my_subs') {
        const subs = db.userSubscriptions[userId];
        
        if (subs && Array.isArray(subs) && subs.length > 0) {
            let subText = `📱 **اشتراک‌های فعال شما (${subs.length} عدد):** 🌟\n\n`;
            subs.forEach((sub, idx) => {
                subText += `🔹 **اشتراک شماره ${idx + 1}**\n` +
                           `📦 پلن: ${sub.planName}\n` +
                           `🌐 کل حجم: ${sub.totalVolume || sub.volume}\n` +
                           `⏳ انقضا: ${sub.expiryDate}\n` +
                           `🔗 **لینک اشتراک:**\n\`${sub.configLink}\`\n\n`;
            });
            bot.sendMessage(chatId, subText, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, db.botTexts.empty_subs);
        }
        return;
    }

    if (data === 'tutorial') {
        bot.sendMessage(chatId, db.botTexts.tutorial_message, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'invite') {
        if (!db.isInviteSystemEnabled) {
            bot.sendMessage(chatId, '❌ سیستم زیرمجموعه‌گیری غیرفعال است.');
            return;
        }
        const userRefCount = db.referals[userId] || 0;
        const inviteLink = `https://t.me/${bot.options.username}?start=${chatId}`;
        const customInviteText = (db.botTexts.invite_title || '')
            .replace('{inviteLink}', inviteLink)
            .replace('{count}', userRefCount);

        bot.sendMessage(chatId, customInviteText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'support') {
        db.userStates[chatId] = { awaiting_support_message: true };
        saveDatabase();
        bot.sendMessage(chatId, db.botTexts.support_prompt);
        return;
    }

    if (data === 'back_to_main') {
        delete db.userStates[chatId];
        saveDatabase();
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

    if (chatId === ADMIN_CHAT_ID && db.userStates[chatId] && db.userStates[chatId].step === 'admin_direct_message_user') {
        const targetUserId = db.userStates[chatId].targetUserId;
        delete db.userStates[chatId];
        saveDatabase();

        try {
            await bot.sendMessage(targetUserId, `✉️ **پیام مدیریت:**\n\n${text}`);
            return bot.sendMessage(ADMIN_CHAT_ID, `✅ پیام با موفقیت به کاربر \`${targetUserId}\` ارسال شد.`);
        } catch (e) {
            return bot.sendMessage(ADMIN_CHAT_ID, `❌ خطا در ارسال پیام به کاربر (احتمالاً ربات را بلاک کرده است).`);
        }
    }

    if (chatId === ADMIN_CHAT_ID && db.userStates[chatId] && db.userStates[chatId].step === 'admin_direct_charge_user') {
        const targetUserId = db.userStates[chatId].targetUserId;
        const amount = parseInt((text || '').replace(/[^0-9]/g, ''), 10);
        delete db.userStates[chatId];
        saveDatabase();

        if (!amount || amount <= 0) {
            return bot.sendMessage(ADMIN_CHAT_ID, '❌ مبلغ نامعتبر است.');
        }

        db.userWallets[targetUserId] = (db.userWallets[targetUserId] || 0) + amount;
        saveDatabase();

        bot.sendMessage(ADMIN_CHAT_ID, `✅ مبلغ \`${amount.toLocaleString()} تومان\` به کیف پول کاربر \`${targetUserId}\` اضافه شد.`);
        bot.sendMessage(targetUserId, `🎉 **کیف پول شما توسط مدیریت شارژ شد!** 💳\nمبلغ \`${amount.toLocaleString()} تومان\` به حساب شما واریز گردید. ✨`, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (chatId === ADMIN_CHAT_ID && msg.reply_to_message) {
        const repliedMsgId = msg.reply_to_message.message_id;
        const targetUserId = db.messagesMap[repliedMsgId];

        if (targetUserId) {
            try {
                await bot.sendMessage(targetUserId, `پاسخ مدیریت:\n\n${text || '[پیام غیرمتنی]'}`);
                return bot.sendMessage(ADMIN_CHAT_ID, '✅ پاسخ با موفقیت برای مشتری ارسال شد.');
            } catch (e) {
                return bot.sendMessage(ADMIN_CHAT_ID, '❌ خطا در ارسال پیام به مشتری (احتمالاً ربات را بلاک کرده است).');
            }
        }
    }

    if (chatId === ADMIN_CHAT_ID && db.userStates[chatId]) {
        const state = db.userStates[chatId];

        if (state.step === 'get_new_menu_name') {
            const targetKey = state.targetKey;
            db.menuNames[targetKey] = text.trim();
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ نام دکمه با موفقیت به:\n\`${text.trim()}\`\nتغییر یافت! 🎉`, { parse_mode: 'Markdown' });
            sendAdminPanel(chatId);
            return;
        }

        if (state.step === 'get_new_bot_text') {
            const targetKey = state.targetTextKey;
            db.botTexts[targetKey] = text.trim();
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ متن این بخش با موفقیت آپدیت شد! 📝✨`, { parse_mode: 'Markdown' });
            sendAdminPanel(chatId);
            return;
        }

        if (state.step === 'get_new_channel_username') {
            db.CHANNEL_USERNAME = text.trim();
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ آیدی کانال جوین اجباری آپدیت شد به: \`${db.CHANNEL_USERNAME}\``, { parse_mode: 'Markdown' });
            sendAdminPanel(chatId);
            return;
        }
        if (state.step === 'get_new_test_link') {
            db.testServerConfig = text.trim();
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ لینک سرور تست آپدیت شد.`);
            sendAdminPanel(chatId);
            return;
        }
        if (state.step === 'get_new_free_link') {
            db.freeSubConfig = text.trim();
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ لینک اشتراک رایگان آپدیت شد.`);
            sendAdminPanel(chatId);
            return;
        }
        if (state.step === 'admin_get_charge_user_id') {
            const targetId = parseInt(text.trim(), 10);
            if (!targetId || isNaN(targetId)) {
                bot.sendMessage(chatId, '❌ شناسه عددی نامعتبر است.');
                return;
            }
            db.userStates[chatId] = { step: 'admin_get_charge_amount', targetChargeUserId: targetId };
            saveDatabase();
            bot.sendMessage(chatId, `✅ کاربر شناسایی شد (\`${targetId}\`).\n\nمبلغ شارژ (به تومان) را وارد کنید:`, { parse_mode: 'Markdown' });
            return;
        } else if (state.step === 'admin_get_charge_amount') {
            const amount = parseInt(text.replace(/[^0-9]/g, ''), 10);
            if (!amount || amount <= 0) {
                bot.sendMessage(chatId, '❌ مبلغ نامعتبر است.');
                return;
            }
            const targetId = state.targetChargeUserId;
            db.userWallets[targetId] = (db.userWallets[targetId] || 0) + amount;
            delete db.userStates[chatId];
            saveDatabase();

            bot.sendMessage(chatId, `🎉 کیف پول کاربر \`${targetId}\` به مبلغ \`${amount.toLocaleString()} تومان\` شارژ شد.`);
            bot.sendMessage(targetId, `🎉 **کیف پول شما توسط مدیریت شارژ شد!** 💳\nمبلغ \`${amount.toLocaleString()} تومان\` به موجودی شما اضافه گردید. ✨`, { parse_mode: 'Markdown' }).catch(() => {});
            return;
        }
    }

    if (db.userStates[chatId] && db.userStates[chatId].step === 'get_wallet_deposit_amount') {
        const amount = parseInt(text.replace(/[^0-9]/g, ''), 10);
        if (!amount || amount <= 0) {
            bot.sendMessage(chatId, '❌ لطفاً یک مبلغ معتبر وارد کنید.');
            return;
        }
        db.userStates[chatId] = { step: 'get_wallet_deposit_receipt', depositAmount: amount };
        saveDatabase();
        
        const depositMsg = `💳 **فاکتور شارژ کیف پول**\n\n` +
                           `💵 مبلغ: \`${amount.toLocaleString()} تومان\`\n\n` +
                           `به شماره کارت زیر واریز کرده و عکس رسید را بفرستید: 👇\n\`${db.paymentCardNumber}\``;
        bot.sendMessage(chatId, depositMsg, { parse_mode: 'Markdown' });
        return;
    }

    if (chatId === ADMIN_CHAT_ID && db.userStates[chatId]) {
        const state = db.userStates[chatId];
        
        if (state.step === 'edit_plan_get_name') {
            state.editName = text.trim();
            state.step = 'edit_plan_get_volume';
            saveDatabase();
            bot.sendMessage(chatId, '🌐 حجم جدید پلن را وارد کنید:');
            return;
        } else if (state.step === 'edit_plan_get_volume') {
            state.editVolume = text.trim();
            state.step = 'edit_plan_get_duration';
            saveDatabase();
            bot.sendMessage(chatId, '⏳ مدت اعتبار جدید را وارد کنید:');
            return;
        } else if (state.step === 'edit_plan_get_duration') {
            state.editDuration = text.trim();
            state.step = 'edit_plan_get_price';
            saveDatabase();
            bot.sendMessage(chatId, '💵 قیمت جدید را وارد کنید:');
            return;
        } else if (state.step === 'edit_plan_get_price') {
            const planId = state.targetPlanId;
            const plan = db.customPlans.find(p => p.id === planId);
            if (plan) {
                plan.name = state.editName;
                plan.volume = state.editVolume;
                plan.duration = state.editDuration;
                plan.price = text.trim();
                delete db.userStates[chatId];
                saveDatabase();
                bot.sendMessage(chatId, `✅ پلن با موفقیت ویرایش شد.`);
                return;
            }
        }

        if (state.step === 'get_extra_link_for_plan') {
            const planId = state.targetPlanId;
            const plan = db.customPlans.find(p => p.id === planId);
            if (plan) {
                plan.links.push(text.trim());
                delete db.userStates[chatId];
                saveDatabase();
                bot.sendMessage(chatId, `✅ لینک جدید به پلن **${plan.name}** اضافه شد.`);
                return;
            }
        }
        if (state.step === 'get_new_plan_name') {
            state.planName = text.trim();
            state.step = 'get_new_plan_volume';
            saveDatabase();
            bot.sendMessage(chatId, '🌐 حجم اشتراک را وارد کنید:');
            return;
        } else if (state.step === 'get_new_plan_volume') {
            state.planVolume = text.trim();
            state.step = 'get_new_plan_duration';
            saveDatabase();
            bot.sendMessage(chatId, '⏳ زمان اعتبار را وارد کنید:');
            return;
        } else if (state.step === 'get_new_plan_duration') {
            state.planDuration = text.trim();
            state.step = 'get_new_plan_price';
            saveDatabase();
            bot.sendMessage(chatId, '💵 قیمت پلن را وارد کنید:');
            return;
        } else if (state.step === 'get_new_plan_price') {
            state.planPrice = text.trim();
            state.step = 'get_new_plan_link';
            saveDatabase();
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
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `🎉 پلن جدید با موفقیت ساخته شد!`);
            return;
        }
    }

    if (chatId === ADMIN_CHAT_ID && db.userStates[chatId] && db.userStates[chatId].step === 'get_new_card_number') {
        db.paymentCardNumber = text.trim();
        delete db.userStates[chatId];
        saveDatabase();
        bot.sendMessage(chatId, '✅ شماره کارت آپدیت شد.');
        return;
    }

    if (chatId === ADMIN_CHAT_ID && db.userStates[chatId] && db.userStates[chatId].step === 'get_broadcast_content') {
        delete db.userStates[chatId];
        saveDatabase();
        bot.sendMessage(chatId, '⏳ ارسال همگانی آغاز شد. لطفاً صبر کنید...');
        
        let successCount = 0;
        let blockCount = 0;

        (async () => {
            for (const uId of db.allUsers) {
                try {
                    await bot.sendMessage(uId, text);
                    successCount++;
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (err) {
                    blockCount++;
                }
            }
            bot.sendMessage(ADMIN_CHAT_ID, `✅ ارسال همگانی به پایان رسید.\n\n📤 ارسال موفق: ${successCount}\n❌ بلاک‌کرده/خطا: ${blockCount}`);
        })();
        return;
    }

    if (db.userStates[chatId] && db.userStates[chatId].awaiting_support_message) {
        delete db.userStates[chatId];
        saveDatabase();
        
        bot.sendMessage(chatId, db.botTexts.support_success);

        const userInfo = db.usersDetailMap[chatId] || { name: 'کاربر', username: 'ندارد' };
        const rawUsername = userInfo.username || 'ندارد';
        const cleanUsername = rawUsername.replace('@', '');

        const supportMsg = `💬 **پیام جدید پشتیبانی از کاربر:**\n\n` +
                           `👤 **نام کاربر:** ${userInfo.name}\n` +
                           `🔗 **یوزرنیم:** @${cleanUsername}\n` +
                           `🆔 **شناسه عددی:** \`${chatId}\`\n\n` +
                           `✉️ **متن پیام:**\n${text}`;

        const supportKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '👤 پروفایل و پیام مستقیم به کاربر', url: `tg://user?id=${chatId}` }]
                ]
            }
        };

        const sentAdminMsg = await bot.sendMessage(ADMIN_CHAT_ID, supportMsg, { parse_mode: 'Markdown', ...supportKeyboard });
        
        db.messagesMap[sentAdminMsg.message_id] = chatId;
        saveDatabase();
        return;
    }
});

bot.on('photo', async (msg) => {
    loadDatabase();
    trackUserAndNotifyAdmin(msg);
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userInfo = db.usersDetailMap[userId] || { name: 'کاربر', username: 'ندارد' };
    const photoId = msg.photo[msg.photo.length - 1].file_id;
    const currentDateStr = new Date().toLocaleString('fa-IR');

    if (db.userStates[chatId]) {
        if (db.userStates[chatId].step === 'get_wallet_deposit_receipt') {
            const amount = db.userStates[chatId].depositAmount;
            delete db.userStates[chatId];

            db.pending_deposits[`deposit_${userId}`] = { amount };
            saveDatabase();
            bot.sendMessage(chatId, '✅ رسید دریافت شد. پس از تایید مدیریت، موجودی شما شارژ خواهد شد. ⏳');

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
                caption: `🔔 **رسید جدید شارژ کیف پول**\n\n👤 نام: ${userInfo.name}\n🆔 آیدی عددی: \`${userId}\`\n💵 مبلغ: \`${amount.toLocaleString()} تومان\``,
                parse_mode: 'Markdown',
                ...adminDepositKeyboard
            });
            return;
        }

        if (db.userStates[chatId].step === 'get_card_purchase_receipt') {
            const planId = db.userStates[chatId].planId;
            const plan = db.customPlans.find(p => p.id === planId);
            delete db.userStates[chatId];

            if (!plan || plan.links.length === 0) {
                bot.sendMessage(chatId, '❌ متأسفانه این پلن تمام شده است.');
                return;
            }

            db.pending_card_purchases[`card_pur_${userId}`] = { planId: plan.id };
            saveDatabase();
            bot.sendMessage(chatId, '✅ رسید خرید دریافت شد. پس از بررسی ادمین، لینک اشتراک ارسال می‌شود. ⏳');

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
                caption: `🔔 **رسید جدید خرید کارت به کارت**\n\n👤 نام: ${userInfo.name}\n🆔 آیدی عددی: \`${userId}\`\n📦 پلن: ${plan.name} (${plan.price})`,
                parse_mode: 'Markdown',
                ...adminCardKeyboard
            });
            return;
        }
    }
});

process.on('uncaughtException', (err) => {
    console.log('Caught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});
