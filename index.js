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
const COOLDOWN_TIME = 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// تابع کمکی برای دریافت تاریخ و ساعت شمسی دقیق و خودکار
function getPersianDateTime() {
    try {
        const now = new Date();
        const dateStr = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(now);
        
        const timeStr = now.toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        return `${dateStr} - ${timeStr}`;
    } catch (e) {
        return new Date().toLocaleString('fa-IR');
    }
}

const DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
        console.log('خطا در ایجاد پوشه داده‌ها:', e);
    }
}

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
        agency_request: '🤝 درخواست نمایندگی',
        tutorial: '📖 آموزش اتصال',
        support: '📞 پشتیبانی آنلاین'
    },
    botTexts: {
        start_message: '🔥 **سلام رفيق! به خفن‌ترین و پرسرعت‌ترین مرکز کانفیگ خوش اومدی!** 🚀\n\n⚡️ اینجا سرعت و کیفیت بی‌معنی نیست، یعنی پرواز!\n💎 از منوی زیر پریدن تو دنیای اینترنت آزاد رو شروع کن 👇\n\n👑 **CONFIG ARENA | بدون مرز، بدون محدودیت** 🔥',
        tutorial_message: '📖 **راهنمای سریع و حرفه‌ای اتصال:** 💡\n\n1️⃣ اپلیکیشن V2Ray (مثل v2rayNG در اندروید یا FoXray در آیفون) رو نصب کن.\n2️⃣ لینک اشتراک اختصاصی خودت رو از بخش «اشتراک‌های من» کپی کن.\n3️⃣ برنامه رو باز کن، روی علامت + بزن و لینک رو اضافه کن.\n4️⃣ بزن رو دکمه اتصال و از پرواز تو اینترنت لذت ببر! 🚀✨',
        support_prompt: '📞 سوال یا مشکلی داری؟ پیامت رو بفرست تا خفن‌ترین پشتیبانی دنیا جوابت رو بده: 👇',
        support_success: '🎯 **دمت گرم!** پیام تو با موفقیت به تیم پشتیبانی پرتاب شد. خیلی زود چک می‌کنیم! 🙏✨',
        store_title: '🛒 **فروشگاه ترکش‌وار و فوق‌العاده اشتراک‌ها** 🚀\n\nلطفاً پلن مورد نظرت رو برای شروع پرواز انتخاب کن: 👇',
        no_plans: '🛒 فعلاً ترکش‌های این بخش تموم شده! به زودی با کلی پلن خفن‌تر برمی‌گردیم. 😎',
        wallet_title: '💰 **کیف پول سلطنتی شما**\n\nموجودی فعلی: `{balance} تومان`\n\n🆔 شناسه کاربری شما: `{userId}`',
        invite_title: '👥 **دعوت رفقا = پاداش خفن!** 🎁\n\nلینک اختصاصیت رو بفرست واسه رفیقات:\n`{inviteLink}`\n\n✨ تعداد رفقایی که آوردی: **{count} نفر**',
        empty_subs: '📱 داداش هنوز هیچ اشتراک فعالی نداری! از فروشگاه یه دونه بزن به بدن. 🛒🔥',
        agency_prompt: '🤝 **درخواست نمایندگی VIP**\n\nرزومه یا درخواست خفنت رو بفرست تا بررسی کنیم و با هم بترکونیم:',
        agency_success: '✅ درخواست نمایندگی‌ات با موفقیت ثبت شد. به زودی باهات تماس می‌گیریم! 👑'
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
    discountCodes: {}, 
    appliedDiscounts: {}, 
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
                referals: parsed.referals || {},
                userSubscriptions: parsed.userSubscriptions || {},
                allSubscriptionsHistory: parsed.allSubscriptionsHistory || [],
                customPlans: parsed.customPlans || defaultDatabaseStructure.customPlans,
                discountCodes: parsed.discountCodes || {},
                appliedDiscounts: parsed.appliedDiscounts || {},
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
                caption: `📦 **پشتیبان خودکار دیتابیس ربات**\n👤 ادمین: arenam_10\n🕒 زمان: ${getPersianDateTime()}`
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
        const info = db.usersDetailMap[uId] || { name: 'نامشخص', username: 'ندارد', joinedAt: getPersianDateTime() };
        const wallet = db.userWallets[uId] || 0;
        usersListHtml += `<tr><td>${uId}</td><td>${info.name}</td><td>${info.username}</td><td>${wallet.toLocaleString()} تومان</td><td>${info.joinedAt || getPersianDateTime()}</td></tr>`;
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
                    <tr><th>آیدی عددی</th><th>نام</th><th>نام کاربری</th><th>کیف پول</th><th>تاریخ عضویت</th></tr>
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
        const currentPersianTime = getPersianDateTime();

        let isBrandNew = false;
        if (!db.allUsers.includes(userId)) {
            db.allUsers.push(userId);
            isBrandNew = true;
        }

        if (!db.usersDetailMap[userId]) {
            db.usersDetailMap[userId] = { name, username, joinedAt: currentPersianTime };
            isBrandNew = true;
        } else {
            db.usersDetailMap[userId].name = name;
            db.usersDetailMap[userId].username = username;
            if (!db.usersDetailMap[userId].joinedAt) {
                db.usersDetailMap[userId].joinedAt = currentPersianTime;
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
                `🚀 **یک کاربر خفن ربات رو استارت کرد!** 🤖\n\n` +
                `👤 **نام کاربر:** ${name}\n` +
                `🔗 **نام کاربری (Username):** ${username}\n` +
                `🆔 **شناسه عددی (Chat ID):** \`${userId}\`\n` +
                `🕒 **تاریخ و ساعت ثبت:** ${currentPersianTime}`, 
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
                            if (bytes === 0) return '0 بایت';
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
                            resultInfo.expireDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
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

// ----------------------------------------------------
// توابع مدیریت کیبوردها (طراحی جدید، خفن‌تر و با ایموجی‌های جذاب + حذف دکمه بازگشت)
// ----------------------------------------------------
function getPersistentMenuKeyboard() {
    const names = db.menuNames;
    let keyboardRows = [
        [{ text: `🛒 ${names.buy_sub} 🌟` }, { text: `💰 ${names.wallet} 💎` }],
        [{ text: `📱 ${names.my_subs} ⚡️` }, { text: `📞 ${names.support} 🎯` }]
    ];

    if (db.isFreeSubEnabled) {
        keyboardRows.push([{ text: `🎁 ${names.free_sub} 🔥` }]);
    }
    if (db.isTestServerEnabled) {
        keyboardRows.push([{ text: `🧪 ${names.test_server} 🚀` }]);
    }
    if (db.isInviteSystemEnabled) {
        keyboardRows.push([{ text: `👥 ${names.invite} ✨` }]);
    }
    
    keyboardRows.push([{ text: `🤝 ${names.agency_request} 👑` }, { text: `📖 ${names.tutorial} 💡` }]);

    return {
        reply_markup: {
            keyboard: keyboardRows,
            resize_keyboard: true,
            is_persistent: true,
            remove_keyboard: false
        }
    };
}

async function sendMainMenu(chatId) {
    await bot.sendMessage(chatId, db.botTexts.start_message, { parse_mode: 'Markdown', ...getPersistentMenuKeyboard() });
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
                    [{ text: '📢 عضویت در کانال خفن ما 🔔', url: `https://t.me/${db.CHANNEL_USERNAME.replace('@', '')}` }],
                    [{ text: '✅ عضو شدم، بزن بریم! 🚀', callback_data: 'check_membership' }]
                ],
                remove_keyboard: true
            }
        };
        bot.sendMessage(chatId, `⚠️ **ای بابا رفیق!**\nبرای پرواز تو ربات، اول باید تو کانال خفن زیر عضو بشی:\n\n📢 ${db.CHANNEL_USERNAME}\n\nبعدش بزن رو دکمه بررسی پایین 👇`, { parse_mode: 'Markdown', ...joinKeyboard });
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

            bot.sendMessage(refId, `🎉 **ایول رفیق!**\nیک نفر با لینک اختصاصیت وارد ربات شد.\n\n💰 مبلغ \`${REWARD_AMOUNT.toLocaleString()} تومان\` پاداش به کیف پولت واریز شد! 🚀🔥`, { parse_mode: 'Markdown' })
                .catch(() => {});
        }
    }

    if (isAdmin(msg)) {
        const adminReplyKeyboard = {
            reply_markup: {
                keyboard: [[{ text: '💻 پنل مدیریت ⚡️' }], ...getPersistentMenuKeyboard().reply_markup.keyboard],
                resize_keyboard: true,
                is_persistent: true,
                remove_keyboard: false
            }
        };
        bot.sendMessage(chatId, '👑 **سلطان! دسترسی‌های پیشرفته پنل مدیریت واست فعال شد.** 🛡⚡️', adminReplyKeyboard);
    }

    sendMainMenu(chatId);
});

bot.onText(/💻 پنل مدیریت|\/panel/, async (msg) => {
    loadDatabase();
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) {
        bot.sendMessage(chatId, '❌ داداش اشتباهی اومدی، دسترسی نداری!');
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
                    { text: '⚙️ مدیریت پلن‌ها 📦', callback_data: 'admin_manage_plans' },
                    { text: '✏️ تغییر نام دکمه‌ها 🎛', callback_data: 'admin_edit_names_menu' }
                ],
                [
                    { text: '🎟 مدیریت کدهای تخفیف 🔥', callback_data: 'admin_discount_menu' },
                    { text: '✏️ تغییر متن‌های ربات 📝', callback_data: 'admin_edit_texts_menu' }
                ],
                [
                    { text: '📦 سوابق اشتراک‌ها 📊', callback_data: 'admin_history' },
                    { text: '📁 رسیدهای مالی 🧾', callback_data: 'admin_receipts' }
                ],
                [
                    { text: '💰 مدیریت کیف پول مشتری‌ها 💳', callback_data: 'manage_wallets' },
                    { text: '📱 مدیریت اشتراک مشتریان 🚀', callback_data: 'manage_user_subs' }
                ],
                [
                    { text: '📊 آمار کلی ربات 📈', callback_data: 'admin_stats' },
                    { text: '💳 تنظیم شماره کارت 🏦', callback_data: 'admin_pay_settings' }
                ],
                [
                    { text: testServerStatus, callback_data: 'toggle_test_server' },
                    { text: freeSubStatus, callback_data: 'toggle_free_sub' }
                ],
                [
                    { text: '🧪 لینک سرور تست 🔗', callback_data: 'admin_set_test_link' },
                    { text: '🎁 لینک اشتراک رایگان 💎', callback_data: 'admin_set_free_link' }
                ],
                [
                    { text: inviteStatus, callback_data: 'toggle_invite_system' },
                    { text: forceJoinStatus, callback_data: 'admin_force_join_menu' }
                ],
                [
                    { text: '📢 ارسال همگانی پیام ⚡️', callback_data: 'admin_broadcast' },
                    { text: '📦 دریافت دستی بکاپ 💾', callback_data: 'admin_send_backup' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, '⚙️ **پنل مدیریت پیشرفته و سلطنتی ربات**\nگزینه مورد نظر رو انتخاب کن سلطان: 👇', {
        parse_mode: 'Markdown',
        ...adminKeyboard
    });
}

async function sendUserSubscriptionsPage(chatId, messageId, userId, page = 0, callbackQueryId = null) {
    const userSubs = db.userSubscriptions[userId] || [];
    
    if (userSubs.length === 0) {
        if (callbackQueryId) {
            await bot.answerCallbackQuery(callbackQueryId, {
                text: '❌ داداش فعلاً هیچ اشتراک فعالی نداری!',
                show_alert: true
            }).catch(() => {});
        }
        return;
    }

    const ITEMS_PER_PAGE = 5;
    const totalPages = Math.ceil(userSubs.length / ITEMS_PER_PAGE);
    const validPage = Math.max(0, Math.min(page, totalPages - 1));
    
    const startIndex = validPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentItems = userSubs.slice(startIndex, endIndex);

    let responseText = `🛒 **اشتراک های خفن خریداری شده توسط شما** ⚡️\n\n` +
                       `⚠️ برای دیدن جزئیات و مدیریت، روی نام اشتراک کلیک کن\n\n` +
                       `📄 صفحه ${validPage + 1} از ${totalPages} | 📊 کل: ${userSubs.length} سرویس`;

    let inlineKeyboard = [];

    currentItems.forEach((sub, localIndex) => {
        const globalIndex = startIndex + localIndex;
        const buttonText = `🔥 سرویس شماره ${globalIndex + 1} (${sub.planName}) ✨`;
        inlineKeyboard.push([{ text: buttonText, callback_data: `view_sub_${globalIndex}` }]);
    });

    let paginationRow = [];
    if (validPage > 0) {
        paginationRow.push({ text: '⬅️ صفحه قبل', callback_data: `sub_page_${validPage - 1}` });
    }
    if (validPage < totalPages - 1) {
        paginationRow.push({ text: 'صفحه بعد ➡️', callback_data: `sub_page_${validPage + 1}` });
    }
    if (paginationRow.length > 0) {
        inlineKeyboard.push(paginationRow);
    }

    inlineKeyboard.push([{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]);

    const replyMarkup = { inline_keyboard: inlineKeyboard };

    try {
        if (messageId) {
            await bot.editMessageText(responseText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: replyMarkup
            });
        } else {
            await bot.sendMessage(chatId, responseText, {
                parse_mode: 'Markdown',
                reply_markup: replyMarkup
            });
        }
    } catch (e) {}
}

bot.on('callback_query', async (callbackQuery) => {
    loadDatabase(); 
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id.toString();
    const currentTime = Date.now();

    if (userCooldowns.has(userId)) {
        const lastClickTime = userCooldowns.get(userId);
        if (currentTime - lastClickTime < COOLDOWN_TIME) {
            return bot.answerCallbackQuery(callbackQuery.id, {
                text: '⚠️ آروم‌تر داداش! کمی صبر کن...',
                show_alert: false
            }).catch(() => {});
        }
    }
    userCooldowns.set(userId, currentTime);

    await sleep(200);

    const userObj = callbackQuery.from;
    if (userObj) {
        const name = userObj.first_name || userObj.last_name || 'بدون نام';
        const username = userObj.username ? `@${userObj.username}` : 'ندارد';
        const currentPersianTime = getPersianDateTime();
        
        if (!db.usersDetailMap[userId]) {
            db.usersDetailMap[userId] = { name, username, joinedAt: currentPersianTime };
        } else {
            db.usersDetailMap[userId].name = name;
            db.usersDetailMap[userId].username = username;
            if (!db.usersDetailMap[userId].joinedAt) {
                db.usersDetailMap[userId].joinedAt = currentPersianTime;
            }
        }
        if (!db.allUsers.includes(userId)) {
            db.allUsers.push(userId);
        }
        saveDatabase();
    }

    try {
        bot.answerCallbackQuery(callbackQuery.id).catch(() => {});
    } catch (e) {}

    if (data === 'my_subscriptions') {
        await sendUserSubscriptionsPage(chatId, msg.message_id, userId, 0, callbackQuery.id);
        return;
    }

    if (data.startsWith('sub_page_')) {
        const targetPage = parseInt(data.replace('sub_page_', ''), 10);
        await sendUserSubscriptionsPage(chatId, msg.message_id, userId, targetPage, callbackQuery.id);
        return;
    }

    if (data.startsWith('view_sub_')) {
        const subIndex = parseInt(data.replace('view_sub_', ''), 10);
        const subs = db.userSubscriptions[userId];
        if (subs && subs[subIndex]) {
            const sub = subs[subIndex];
            let subDetailMsg = `📱 **جزئیات سرویس خفن شما:**\n\n` +
                               `📦 پلن: \`${sub.planName}\`\n` +
                               `🌐 حجم کل: \`${sub.totalVolume || sub.volume}\`\n` +
                               `⏳ تاریخ انقضا: \`${sub.expiryDate}\`\n\n` +
                               `🔗 **لینک اشتراک اختصاصی:**\n\`${sub.configLink}\``;

            if (sub.extractedConfigs && sub.extractedConfigs.length > 0) {
                subDetailMsg += `\n\n⚙️ **کانفیگ‌های مجزا:**\n\`\`\`\n${sub.extractedConfigs.join('\n\n')}\n\`\`\``;
            }

            await bot.editMessageText(subDetailMsg, {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 بازگشت به لیست اشتراک‌ها ⚡️', callback_data: 'my_subscriptions' }]]
                }
            });
        } else {
            bot.answerCallbackQuery(callbackQuery.id, { text: '❌ متأسفانه این اشتراک پیدا نشد.', show_alert: true });
        }
        return;
    }

    if (data === 'adm_add_sub_by_identifier') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'admin_waiting_for_user_identifier' };
        saveDatabase();
        bot.sendMessage(chatId, `🔍 **افزایش اشتراک با آیدی یا یوزرنیم**\n\nلطفاً **آیدی عددی (Chat ID)** یا **نام کاربری (مثل @username یا username)** کاربر مورد نظر رو بفرست:`, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'manage_user_subs') {
        if (!isAdmin(callbackQuery)) return;
        try {
            const userIds = Object.keys(db.userSubscriptions).filter(uId => db.userSubscriptions[uId] && db.userSubscriptions[uId].length > 0);
            
            let buttons = userIds.map(uId => {
                let info = db.usersDetailMap[uId] || { name: 'بدون نام', username: 'ندارد' };
                let name = info.name;
                let subsCount = db.userSubscriptions[uId].length;
                return [{
                    text: `👤 ${name} (${uId}) - ${subsCount} اشتراک فعال 🔥`,
                    callback_data: `adm_user_subs_${uId}`
                }];
            });

            buttons.unshift([{ text: "➕ افزودن اشتراک با آیدی یا یوزرنیم جدید 🔍", callback_data: "adm_add_sub_by_identifier" }]);
            buttons.push([{ text: "🔙 بازگشت به پنل مدیریت ⚙️", callback_data: "admin_back_to_panel" }]);

            await bot.editMessageText(`📱 **بخش مدیریت اشتراک مشتریان**\n\nمی‌تونی برای کاربران زیر مدیریت انجام بدی یا اشتراک جدید اضافه کنی:`, {
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

    if (data.startsWith('adm_user_subs_')) {
        if (!isAdmin(callbackQuery)) return;
        const targetUserId = data.replace('adm_user_subs_', '');
        const subs = db.userSubscriptions[targetUserId] || [];
        const userInfo = db.usersDetailMap[targetUserId] || { name: 'نامشخص', username: 'ندارد' };

        let subText = `📱 **اشتراک‌های کاربر:** ${userInfo.name} (\`${targetUserId}\`)\n\n`;
        let inlineBtns = [];

        if (subs.length > 0) {
            subs.forEach((sub, idx) => {
                subText += `🔹 **اشتراک ${idx + 1}:** ${sub.planName} | انقضا: ${sub.expiryDate}\n`;
                inlineBtns.push([{ text: `🗑 حذف اشتراک ${idx + 1} (${sub.planName})`, callback_data: `adm_del_sub_${targetUserId}_${idx}` }]);
            });
        } else {
            subText += `این کاربر فعلاً هیچ اشتراک فعالی نداره.\n`;
        }

        inlineBtns.push([{ text: `➕ افزودن اشتراک دستی ⚡️`, callback_data: `adm_add_sub_${targetUserId}` }]);
        inlineBtns.push([{ text: `🔙 بازگشت به لیست کاربران 👥`, callback_data: 'manage_user_subs' }]);

        await bot.editMessageText(subText, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineBtns }
        });
        return;
    }

    if (data.startsWith('adm_del_sub_')) {
        if (!isAdmin(callbackQuery)) return;
        const parts = data.replace('adm_del_sub_', '').split('_');
        const targetUserId = parts[0];
        const subIndex = parseInt(parts[1], 10);

        if (db.userSubscriptions[targetUserId] && db.userSubscriptions[targetUserId][subIndex]) {
            db.userSubscriptions[targetUserId].splice(subIndex, 1);
            saveDatabase();
            bot.answerCallbackQuery(callbackQuery.id, { text: '✅ اشتراک با موفقیت حذف شد.', show_alert: true });
        } else {
            bot.answerCallbackQuery(callbackQuery.id, { text: '❌ اشتراک پیدا نشد.', show_alert: true });
        }
        return;
    }

    if (data.startsWith('adm_add_sub_')) {
        if (!isAdmin(callbackQuery)) return;
        const targetUserId = data.replace('adm_add_sub_', '');
        db.userStates[chatId] = { step: 'admin_manual_add_sub_link', targetUserId };
        saveDatabase();
        bot.sendMessage(chatId, `➕ **ثبت اشتراک دستی برای کاربر** (\`${targetUserId}\`)\n\nلطفاً **لینک کانفیگ یا سابسکریپشن** رو بفرست:`, { parse_mode: 'Markdown' });
        return;
    }

    if (data.startsWith('user_dep_')) {
        const amount = parseInt(data.replace('user_dep_', ''), 10);
        
        db.userStates[chatId] = { 
            step: 'get_wallet_deposit_receipt', 
            depositAmount: amount 
        };
        saveDatabase();

        const depositMsg = `💳 **فاکتور شارژ کیف پول سلطنتی**\n\n` +
                           `💵 مبلغ انتخابی: \`${amount.toLocaleString()} تومان\`\n\n` +
                           `به شماره کارت زیر واریز کن و **عکس رسید** رو همینجا برامون بفرست تا تاییدش کنیم: 👇\n\`${db.paymentCardNumber}\``;
        
        await bot.sendMessage(chatId, depositMsg, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 بازگشت به کیف پول 💰', callback_data: 'wallet' }]
                ]
            }
        });
        return;
    }

    if (data === 'admin_discount_menu') {
        if (!isAdmin(callbackQuery)) return;
        const codesList = Object.keys(db.discountCodes);
        let textMsg = '🎟 **مدیریت کدهای تخفیف خفن ربات**\n\n';
        const inlineBtns = [[{ text: '➕ افزودن کد تخفیف جدید 🔥', callback_data: 'admin_add_discount' }]];

        if (codesList.length > 0) {
            textMsg += 'کدهای تخفیف فعال فعلی:\n';
            codesList.forEach(code => {
                const info = db.discountCodes[code];
                textMsg += `🔹 \`${code}\` -> **${info.percent}%** تخفیف\n`;
                inlineBtns.push([{ text: `🗑 حذف کد: ${code}`, callback_data: `admin_del_discount_${code}` }]);
            });
        } else {
            textMsg += 'هیچ کد تخفیفی ثبت نشده است.';
        }
        inlineBtns.push([{ text: '🔙 بازگشت به پنل ⚙️', callback_data: 'admin_back_to_panel' }]);

        await bot.editMessageText(textMsg, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineBtns }
        });
        return;
    }

    if (data === 'admin_add_discount') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'get_new_discount_code' };
        saveDatabase();
        bot.sendMessage(chatId, '🎟 لطفاً کد تخفیفت رو وارد کن (مثلاً `ARENA50`):');
        return;
    }

    if (data.startsWith('admin_del_discount_')) {
        if (!isAdmin(callbackQuery)) return;
        const codeToDel = data.replace('admin_del_discount_', '');
        delete db.discountCodes[codeToDel];
        saveDatabase();
        bot.sendMessage(chatId, `✅ کد تخفیف \`${codeToDel}\` با موفقیت پاک شد.`);
        sendAdminPanel(chatId);
        return;
    }

    if (data.startsWith('enter_discount_')) {
        const planId = parseInt(data.replace('enter_discount_', ''));
        db.userStates[chatId] = { step: 'get_user_discount_input', planId };
        saveDatabase();
        bot.sendMessage(chatId, '🎟 لطفاً کد تخفیف خفنت رو بفرست:');
        return;
    }

    if (data.startsWith('close_ticket_')) {
        if (!isAdmin(callbackQuery)) return;
        const targetUser = data.replace('close_ticket_', '');
        try {
            await bot.sendMessage(targetUser, '🔒 **تیکت پشتیبانی شما توسط مدیریت بسته شد.**\nاگر سوال دیگه‌ای داری، از منو پیام بفرست.');
            await bot.editMessageCaption('🔒 **این تیکت بسته شد.**', { chat_id: chatId, message_id: msg.message_id, parse_mode: 'Markdown' }).catch(() => {
                bot.editMessageText('🔒 **این تیکت بسته شد.**', { chat_id: chatId, message_id: msg.message_id, parse_mode: 'Markdown' });
            });
        } catch (e) {}
        return;
    }

    if (data === 'manage_wallets') {
        if (!isAdmin(callbackQuery)) return;
        try {
            const userIds = [...db.allUsers];
            if (!userIds || userIds.length === 0) {
                return bot.answerCallbackQuery(callbackQuery.id, { text: "❌ هیچ کاربری تو ربات نیست.", show_alert: true });
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

            buttons.push([{ text: "🔙 بازگشت به پنل مدیریت ⚙️", callback_data: "admin_back_to_panel" }]);

            await bot.editMessageText(`💼 **بخش مدیریت کیف پول مشتری‌ها**\n\nتعداد کل کاربران: ${userIds.length} نفر\nکاربر مورد نظرت رو انتخاب کن:`, {
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

لطفاً عملیات مورد نظر رو انتخاب کن:
        `;

        await bot.editMessageText(walletMsg, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "➕ افزایش موجودی ⚡️", callback_data: `w_inc_${targetChatId}` },
                        { text: "➖ کاهش موجودی 🔻", callback_data: `w_dec_${targetChatId}` }
                    ],
                    [
                        { text: "🔙 بازگشت به لیست کاربران 👥", callback_data: "manage_wallets" }
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
                        { text: "🔙 بازگشت ↩️", callback_data: `wallet_user_${targetUser}` }
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

        await bot.editMessageText(`💵 لطفاً یکی از مبالغ زیر رو برای **${actionTitle}** موجودی انتخاب کن یا مبلغ دلخواهت رو به صورت عدد بفرست:`, {
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
            bot.answerCallbackQuery(callbackQuery.id, { text: '⚠️ این رسید قبلاً پردازش شده یا معتبر نیست!', show_alert: true });
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
                bot.sendMessage(targetUserId, `🎉 **شارژ کیف پولت تایید شد سلطان!**\nمبلغ \`${depositInfo.amount.toLocaleString()} تومان\` به حسابت نشست. ✨`, { parse_mode: 'Markdown' }).catch(() => {});
                bot.sendMessage(chatId, '✅ شارژ کیف پول تایید شد.');
            }
        } else {
            delete db.pending_deposits[depositKey];
            saveDatabase();
            bot.sendMessage(targetUserId, '❌ ای بابا! رسید شارژ کیف پولت توسط مدیریت رد شد.');
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
            bot.answerCallbackQuery(callbackQuery.id, { text: '⚠️ این رسید خرید قبلاً بررسی شده یا نامعتبر است!', show_alert: true });
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
                const currentDateStr = getPersianDateTime();
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
                const purchaseMessage = `🛒 **خرید کارت به کارت جدید تایید شد:**\n` +
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

                let successMsg = `🎉 **رسید کارت به کارت تایید شد و اشتراکت صادر گردید!** 🚀🔥\n\n` +
                                 `📦 پلن: \`${plan.name}\`\n` +
                                 `🌐 حجم: \`${parsedData.total}\`\n` +
                                 `⏳ انقضا: \`${subObj.expiryDate}\`\n\n` +
                                 `🔗 **لینک اشتراک اختصاصی شما:**\n\`${assignedLink}\``;

                if (parsedData.extractedConfigs && parsedData.extractedConfigs.length > 0) {
                    successMsg += `\n\n⚙️ **کانفیگ‌های مجزا:**\n\`\`\`\n${parsedData.extractedConfigs.join('\n\n')}\n\`\`\``;
                }

                bot.sendMessage(targetUserId, successMsg, { parse_mode: 'Markdown' }).catch(() => {});
                bot.sendMessage(chatId, '✅ خرید کارت به کارت تایید شد و لینک اشتراک برای کاربر فرستاده شد.');
            } else {
                bot.sendMessage(chatId, '❌ خطا: لینکی برای این پلن در انبار باقی نمانده است.');
            }
        } else {
            delete db.pending_card_purchases[cardKey];
            saveDatabase();
            bot.sendMessage(targetUserId, '❌ رسید کارت به کارت شما توسط مدیریت رد شد. لطفاً بررسی و در صورت نیاز مجدداً ارسال کنید.');
            bot.sendMessage(chatId, '❌ رسید کارت به کارت رد شد.');
        }
        return;
    }

    if (data === 'admin_send_backup') {
        if (!isAdmin(callbackQuery)) return;
        bot.sendMessage(chatId, '⏳ در حال ساخت و ارسال فایل‌های پشتیبان...');
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
                    [{ text: `✏️ درخواست نمایندگی: ${names.agency_request}`, callback_data: 'set_name_agency_request' }],
                    [{ text: `✏️ آموزش اتصال: ${names.tutorial}`, callback_data: 'set_name_tutorial' }],
                    [{ text: `✏️ پشتیبانی: ${names.support}`, callback_data: 'set_name_support' }],
                    [{ text: '🔙 بازگشت به پنل ⚙️', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '✏️ **تغییر نام دکمه‌های منوی اصلی**\nبخشی که می‌خوای نامش عوض بشه رو انتخاب کن:', { parse_mode: 'Markdown', ...editNamesKeyboard });
        return;
    }

    if (data.startsWith('set_name_')) {
        if (!isAdmin(callbackQuery)) return;
        const key = data.replace('set_name_', '');
        db.userStates[chatId] = { step: 'get_new_menu_name', targetKey: key };
        saveDatabase();
        bot.sendMessage(chatId, `✏️ نام جدید این دکمه رو بفرست:`, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'admin_edit_texts_menu') {
        if (!isAdmin(callbackQuery)) return;
        const editTextKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📝 متن پیام استارت', callback_data: 'set_text_start_message' }],
                    [{ text: '📝 متن آموزش اتصال', callback_data: 'set_text_tutorial_message' }],
                    [{ text: '📝 متن درخواست پشتیبانی', callback_data: 'set_text_support_prompt' }],
                    [{ text: '📝 متن موفقیت پشتیبانی', callback_data: 'set_text_support_success' }],
                    [{ text: '📝 متن فروشگاه پلن‌ها', callback_data: 'set_text_store_title' }],
                    [{ text: '📝 متن اتمام پلن‌ها', callback_data: 'set_text_no_plans' }],
                    [{ text: '📝 متن منوی کیف پول', callback_data: 'set_text_wallet_title' }],
                    [{ text: '📝 متن زیرمجموعه‌گیری', callback_data: 'set_text_invite_title' }],
                    [{ text: '📝 متن نداشتن اشتراک', callback_data: 'set_text_empty_subs' }],
                    [{ text: '📝 متن درخواست نمایندگی', callback_data: 'set_text_agency_prompt' }],
                    [{ text: '📝 متن موفقیت نمایندگی', callback_data: 'set_text_agency_success' }],
                    [{ text: '🔙 بازگشت به پنل ⚙️', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '📝 **تغییر متن‌های بخش‌های مختلف ربات**\nمتنی که می‌خوای ویرایش کنی رو انتخاب کن:', { parse_mode: 'Markdown', ...editTextKeyboard });
        return;
    }

    if (data.startsWith('set_text_')) {
        if (!isAdmin(callbackQuery)) return;
        const key = data.replace('set_text_', '');
        db.userStates[chatId] = { step: 'get_new_bot_text', targetTextKey: key };
        saveDatabase();
        bot.sendMessage(chatId, `📝 متن جدید این بخش رو بفرست:\n\n*(متن فعلی):\n\`${db.botTexts[key] || ''}\`*`, { parse_mode: 'Markdown' });
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
                    [{ text: '🔙 بازگشت ↩️', callback_data: 'admin_back_to_panel' }]
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
        bot.sendMessage(chatId, '📢 آیدی کانال جدید رو با فرمت درست بفرست (مثلاً `@MyChannel`):', { parse_mode: 'Markdown' });
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
        bot.sendMessage(chatId, `🧪 لینک جدید سرور تست رو بفرست:\n\`${db.testServerConfig}\``, { parse_mode: 'Markdown' });
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
        bot.sendMessage(chatId, `🎁 لینک جدید اشتراک رایگان رو بفرست:\n\`${db.freeSubConfig}\``, { parse_mode: 'Markdown' });
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
            bot.sendMessage(chatId, '✅ عضویتت تایید شد سلطان! حالا بزن بریم. 🎉🚀');
            sendMainMenu(chatId);
        } else {
            bot.sendMessage(chatId, '❌ هنوز تو کانال عضو نشدی یا ربات نتونست چکت کنه. اول عضو شو بعد دکمه رو بزن ⚠️');
        }
        return;
    }

    if (data === 'admin_manage_plans') {
        const plansMenuKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ افزودن پلن جدید 📦', callback_data: 'plan_mgmt_add' }],
                    [{ text: '✏️ ویرایش یا مدیریت پلن‌ها ⚙️', callback_data: 'plan_mgmt_edit_list' }],
                    [{ text: '🔙 بازگشت به پنل ⚙️', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '⚙️ **مدیریت پلن‌ها و کانفیگ‌ها**', { parse_mode: 'Markdown', ...plansMenuKeyboard });
        return;
    }

    if (data === 'plan_mgmt_add') {
        db.userStates[chatId] = { step: 'get_new_plan_name' };
        saveDatabase();
        bot.sendMessage(chatId, '➕ **ساخت پلن جدید**\n\nلطفاً نام پلن رو وارد کن:', { parse_mode: 'Markdown' });
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

        inlineBtns.push([{ text: '🔙 بازگشت ↩️', callback_data: 'admin_manage_plans' }]);
        bot.sendMessage(chatId, textList, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineBtns } });
        return;
    }

    if (data.startsWith('edit_p_')) {
        const planId = parseInt(data.split('_')[2]);
        db.userStates[chatId] = { step: 'edit_plan_get_name', targetPlanId: planId };
        saveDatabase();
        bot.sendMessage(chatId, '✏️ نام جدید پلن رو وارد کن:', { parse_mode: 'Markdown' });
        return;
    }

    if (data.startsWith('add_link_')) {
        const planId = parseInt(data.split('_')[2]);
        db.userStates[chatId] = { step: 'get_extra_link_for_plan', targetPlanId: planId };
        saveDatabase();
        bot.sendMessage(chatId, '🔗 لینک سابسکریپشن یا کانفیگ جدید رو بفرست:', { parse_mode: 'Markdown' });
        return;
    }

    if (data.startsWith('del_plan_')) {
        const planId = parseInt(data.split('_')[2]);
        db.customPlans = db.customPlans.filter(p => p.id !== planId);
        saveDatabase();
        bot.sendMessage(chatId, '🗑 پلن با موفقیت پاک شد.');
        return;
    }

    if (data === 'admin_back_to_panel') {
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'admin_pay_settings') {
        db.userStates[chatId] = { step: 'get_new_card_number' };
        saveDatabase();
        bot.sendMessage(chatId, '💳 **تنظیمات شماره کارت**\n\nشماره کارت فعلی: `' + db.paymentCardNumber + '`\n\nشماره کارت جدید رو بفرست:', { parse_mode: 'Markdown' });
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
        if (!isAdmin(callbackQuery)) return;
        
        let statsReport = `📊 **آمار کلی و لیست کاربران ربات:**\n\n` +
                          `👥 کل کاربران ثبت‌نامی: \`${db.allUsers.length}\`\n` +
                          `📦 کل اشتراک‌ها: \`${db.allSubscriptionsHistory.length}\`\n` +
                          `📋 کل رسیدها: \`${db.receiptsHistory.length}\`\n\n` +
                          `👤 **لیست کاربران:**\n`;

        db.allUsers.forEach((uId, idx) => {
            const uInfo = db.usersDetailMap[uId] || { name: 'نامشخص', username: 'ندارد', joinedAt: getPersianDateTime() };
            statsReport += `${idx + 1}. نام: **${uInfo.name}**\n` +
                           `   🆔 آیدی عددی: \`${uId}\`\n` +
                           `   🔗 نام کاربری: ${uInfo.username}\n` +
                           `   🕒 عضویت: ${uInfo.joinedAt || getPersianDateTime()}\n\n`;
        });

        if (statsReport.length > 4000) {
            bot.sendMessage(chatId, `📊 **آمار کلی ربات:**\n\n👥 کل کاربران: \`${db.allUsers.length}\`\n📦 کل اشتراک‌ها: \`${db.allSubscriptionsHistory.length}\``, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, statsReport, { parse_mode: 'Markdown' });
        }
        return;
    }

    if (data === 'admin_broadcast') {
        db.userStates[chatId] = { step: 'get_broadcast_content' };
        saveDatabase();
        bot.sendMessage(chatId, '📢 متن پیام همگانی رو بفرست سلطان:');
        return;
    }

    if (data === 'wallet') {
        const balance = db.userWallets[userId] || 0;
        const walletKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ شارژ کیف پول سلطنتی 💳', callback_data: 'wallet_deposit' }],
                    [{ text: '🔙 بازگشت به منوی اصلی 🏠', callback_data: 'back_to_main' }]
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
                        { text: '🔙 بازگشت به کیف پول 💰', callback_data: 'wallet' }
                    ]
                ]
            }
        };

        delete db.userStates[chatId];
        saveDatabase();
        
        bot.sendMessage(chatId, '💳 **افزایش موجودی کیف پول**\n\nمبلغ مورد نظرت رو برای شارژ حساب انتخاب کن: 👇', {
            parse_mode: 'Markdown',
            reply_markup: depositAmountsKeyboard.reply_markup
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
            { text: `🌐 ${p.name} - ${p.volume} | 💰 ${p.price} ✨`, callback_data: `buy_custom_${p.id}` }
        ]);
        planButtons.push([{ text: '🔙 بازگشت به منوی اصلی 🏠', callback_data: 'back_to_main' }]);

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

        let priceNumber = parsePrice(selectedPlan.price);
        
        let discountInfoText = '';
        if (db.appliedDiscounts && db.appliedDiscounts[userId]) {
            const disc = db.appliedDiscounts[userId];
            const discountAmount = Math.min(priceNumber, Math.floor((priceNumber * disc.percent) / 100));
            priceNumber -= discountAmount;
            discountInfoText = `🎟 تخفیف اعمال شده: **${disc.percent}%** (-${discountAmount.toLocaleString()} تومان)\n`;
        }

        const userBalance = db.userWallets[userId] || 0;

        const inlineBtns = [];
        let paymentDesc = `📋 **فاکتور نهایی خرید اشتراک خفن** ⚡️\n\n` +
                          `🏷 نام پلن: \`${selectedPlan.name}\`\n` +
                          `🌐 حجم ترافیک: \`${selectedPlan.volume}\`\n` +
                          `⏳ مدت زمان: \`${selectedPlan.duration}\`\n` +
                          discountInfoText +
                          `💵 **مبلغ قابل پرداخت: ${priceNumber.toLocaleString()} تومان**\n` +
                          `💰 موجودی کیف پول شما: \`${userBalance.toLocaleString()} تومان\`\n\n`;

        if (userBalance >= priceNumber) {
            paymentDesc += `✅ موجودی کیف پولت کافیه!`;
            inlineBtns.push([{ text: `💳 پرداخت آنی از کیف پول (${priceNumber.toLocaleString()} تومان) ✨`, callback_data: `pay_wallet_${selectedPlan.id}` }]);
        } else {
            paymentDesc += `⚠️ موجودی کیف پول کافی نیست.`;
            inlineBtns.push([{ text: `➕ شارژ کیف پول 💳`, callback_data: 'wallet_deposit' }]);
        }
        inlineBtns.push([{ text: `🎟 ثبت کد تخفیف 🔥`, callback_data: `enter_discount_${selectedPlan.id}` }]);
        inlineBtns.push([{ text: `💳 پرداخت کارت به کارت 🧾`, callback_data: `pay_card_${selectedPlan.id}` }]);
        inlineBtns.push([{ text: `🔙 بازگشت ↩️`, callback_data: 'buy_sub' }]);

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

        let priceNumber = parsePrice(plan.price);
        if (db.appliedDiscounts && db.appliedDiscounts[userId]) {
            const disc = db.appliedDiscounts[userId];
            const discountAmount = Math.min(priceNumber, Math.floor((priceNumber * disc.percent) / 100));
            priceNumber -= discountAmount;
            delete db.appliedDiscounts[userId];
        }

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
        const currentDateStr = getPersianDateTime();
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
            details: `${plan.name} (${priceNumber.toLocaleString()} تومان)`,
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

        let userMsg = `🎉 **خرید موفقیت‌آمیز انجام شد!** 🚀🔥\n\n` +
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
        if (!plan) {
            bot.sendMessage(chatId, '❌ پلن نامعتبر است.');
            return;
        }

        let priceNumber = parsePrice(plan.price);
        if (db.appliedDiscounts && db.appliedDiscounts[userId]) {
            const disc = db.appliedDiscounts[userId];
            const discountAmount = Math.min(priceNumber, Math.floor((priceNumber * disc.percent) / 100));
            priceNumber -= discountAmount;
            delete db.appliedDiscounts[userId];
        }

        db.userStates[chatId] = {
            step: 'get_card_purchase_receipt',
            planId: plan.id,
            amountToPay: priceNumber
        };
        saveDatabase();

        const cardText = `💳 **پرداخت کارت به کارت**\n\n` +
                         `📦 پلن: \`${plan.name}\`\n` +
                         `💵 مبلغ قابل پرداخت: \`${priceNumber.toLocaleString()} تومان\`\n\n` +
                         `لطفاً مبلغ فوق رو به شماره کارت زیر واریز کن و **عکس رسید** رو بفرست:\n\`${db.paymentCardNumber}\``;

        bot.sendMessage(chatId, cardText, { parse_mode: 'Markdown' });
        return;
    }

    if (data === 'back_to_main') {
        delete db.userStates[chatId];
        saveDatabase();
        sendMainMenu(chatId);
        return;
    }
});

// ====================================================
// مدیریت پیام‌ها و ارسال ریپلای مستقیم ادمین به پشتیبانی
// ====================================================
bot.on('message', async (msg) => {
    loadDatabase();
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text || '';

    if (text.startsWith('/')) return;

    trackUserAndNotifyAdmin(msg);

    // ۱. بررسی اینکه آیا ادمین به پیامی در ربات ریپلای کرده است (پاسخ مستقیم به کاربر برای پشتیبانی)
    if (isAdmin(msg) && msg.reply_to_message) {
        const repliedMessageId = msg.reply_to_message.message_id;
        const targetUserId = db.messagesMap && db.messagesMap[repliedMessageId];

        if (targetUserId) {
            try {
                // ارسال پاسخ ادمین مستقیماً به کاربر
                await bot.sendMessage(targetUserId, `💬 **پاسخ تیم پشتیبانی به شما:**\n\n${text}`);
                await bot.sendMessage(chatId, `✅ پیام پاسخ با موفقیت به کاربر \`${targetUserId}\` ارسال شد. 🚀`, { parse_mode: 'Markdown' });
            } catch (e) {
                await bot.sendMessage(chatId, `❌ خطا در ارسال پاسخ به کاربر: ${e.message}`);
            }
            return;
        }
    }

    const names = db.menuNames;

    // دکمه‌های منوی اصلی (بدون دکمه‌های خروج اضافه)
    if (text === `🛒 ${names.buy_sub} 🌟` || text === `🛒 ${names.buy_sub}`) {
        delete db.userStates[chatId];
        saveDatabase();
        const availablePlans = db.customPlans.filter(p => p.links && p.links.length > 0);
        if (availablePlans.length === 0) {
            bot.sendMessage(chatId, db.botTexts.no_plans);
            return;
        }
        let planText = db.botTexts.store_title;
        const planButtons = availablePlans.map(p => [
            { text: `🌐 ${p.name} - ${p.volume} | 💰 ${p.price} ✨`, callback_data: `buy_custom_${p.id}` }
        ]);
        planButtons.push([{ text: '🔙 بازگشت به منوی اصلی 🏠', callback_data: 'back_to_main' }]);
        bot.sendMessage(chatId, planText, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: planButtons } });
        return;
    }

    if (text === `💰 ${names.wallet} 💎` || text === `💰 ${names.wallet}`) {
        delete db.userStates[chatId];
        saveDatabase();
        const balance = db.userWallets[userId] || 0;
        const walletKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ شارژ کیف پول سلطنتی 💳', callback_data: 'wallet_deposit' }],
                    [{ text: '🔙 بازگشت به منوی اصلی 🏠', callback_data: 'back_to_main' }]
                ]
            }
        };
        const customWalletText = (db.botTexts.wallet_title || '')
            .replace('{balance}', balance.toLocaleString())
            .replace('{userId}', userId);
        bot.sendMessage(chatId, customWalletText, { parse_mode: 'Markdown', ...walletKeyboard });
        return;
    }

    if (text === `📱 ${names.my_subs} ⚡️` || text === `📱 ${names.my_subs}`) {
        delete db.userStates[chatId];
        saveDatabase();
        await sendUserSubscriptionsPage(chatId, null, userId, 0, null);
        return;
    }

    if (text === `📞 ${names.support} 🎯` || text === `📞 ${names.support}`) {
        db.userStates[chatId] = { step: 'waiting_for_support_message' };
        saveDatabase();
        bot.sendMessage(chatId, db.botTexts.support_prompt, { parse_mode: 'Markdown' });
        return;
    }

    if (db.isFreeSubEnabled && (text === `🎁 ${names.free_sub} 🔥` || text === `🎁 ${names.free_sub}`)) {
        delete db.userStates[chatId];
        saveDatabase();
        bot.sendMessage(chatId, `🎁 **اشتراک رایگان شما:**\n\n\`${db.freeSubConfig}\``, { parse_mode: 'Markdown' });
        return;
    }

    if (db.isTestServerEnabled && (text === `🧪 ${names.test_server} 🚀` || text === `🧪 ${names.test_server}`)) {
        delete db.userStates[chatId];
        saveDatabase();
        bot.sendMessage(chatId, `🧪 **سرور تست اختصاصی:**\n\n\`${db.testServerConfig}\``, { parse_mode: 'Markdown' });
        return;
    }

    if (db.isInviteSystemEnabled && (text === `👥 ${names.invite} ✨` || text === `👥 ${names.invite}`)) {
        delete db.userStates[chatId];
        saveDatabase();
        const botInfo = await bot.getMe();
        const inviteLink = `https://t.me/${botInfo.username}?start=${userId}`;
        const refCount = db.referals[userId] || 0;
        const customInviteText = (db.botTexts.invite_title || '')
            .replace('{inviteLink}', inviteLink)
            .replace('{count}', refCount);
        bot.sendMessage(chatId, customInviteText, { parse_mode: 'Markdown' });
        return;
    }

    if (text === `🤝 ${names.agency_request} 👑` || text === `🤝 ${names.agency_request}`) {
        db.userStates[chatId] = { step: 'waiting_for_agency_request' };
        saveDatabase();
        bot.sendMessage(chatId, db.botTexts.agency_prompt, { parse_mode: 'Markdown' });
        return;
    }

    if (text === `📖 ${names.tutorial} 💡` || text === `📖 ${names.tutorial}`) {
        delete db.userStates[chatId];
        saveDatabase();
        bot.sendMessage(chatId, db.botTexts.tutorial_message, { parse_mode: 'Markdown' });
        return;
    }

    // حالت‌های مختلف ورودی (States)
    const currentState = db.userStates && db.userStates[chatId];
    if (currentState) {
        const step = currentState.step;

        if (step === 'waiting_for_support_message') {
            const userInfo = db.usersDetailMap[userId] || { name: 'کاربر', username: 'ندارد' };
            const cleanUsername = userInfo.username && userInfo.username !== 'ندارد' ? userInfo.username : 'ندارد';
            
            const supportMsg = `🎯 **پیام جدید به پشتیبانی از کاربر:**\n\n` +
                               `👤 نام: ${userInfo.name}\n` +
                               `🔗 یوزرنیم: @${cleanUsername.replace('@', '')}\n` +
                               `🆔 چت آیدی: \`${userId}\`\n\n` +
                               `💬 **متن پیام:**\n${text}`;
            
            const sentAdminMsg = await bot.sendMessage(ADMIN_CHAT_ID, supportMsg, { parse_mode: 'Markdown' });
            
            // ذخیره نگاشت پیام ادمین به کاربر برای پاسخ مستقیم (ریپلی)
            if (!db.messagesMap) db.messagesMap = {};
            db.messagesMap[sentAdminMsg.message_id] = userId;
            saveDatabase();

            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, db.botTexts.support_success, { parse_mode: 'Markdown' });
            return;
        }

        if (step === 'waiting_for_agency_request') {
            const userInfo = db.usersDetailMap[userId] || { name: 'کاربر', username: 'ندارد' };
            const agencyMsg = `🤝 **درخواست نمایندگی VIP جدید:**\n\n` +
                              `👤 نام: ${userInfo.name}\n` +
                              `🔗 یوزرنیم: ${userInfo.username}\n` +
                              `🆔 چت آیدی: \`${userId}\`\n\n` +
                              `📝 درخواست:\n${text}`;
            bot.sendMessage(ADMIN_CHAT_ID, agencyMsg, { parse_mode: 'Markdown' });
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, db.botTexts.agency_success, { parse_mode: 'Markdown' });
            return;
        }

        if (step === 'get_new_menu_name') {
            if (!isAdmin({ chat: { id: chatId }, from: msg.from })) return;
            const key = currentState.targetKey;
            db.menuNames[key] = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ نام دکمه با موفقیت تغییر کرد.`);
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_new_bot_text') {
            if (!isAdmin({ chat: { id: chatId }, from: msg.from })) return;
            const key = currentState.targetTextKey;
            db.botTexts[key] = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ متن ربات با موفقیت بروزرسانی شد.`);
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_new_channel_username') {
            if (!isAdmin({ chat: { id: chatId }, from: msg.from })) return;
            db.CHANNEL_USERNAME = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ آیدی کانال به \`${text}\` تغییر یافت.`);
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_new_test_link') {
            if (!isAdmin({ chat: { id: chatId }, from: msg.from })) return;
            db.testServerConfig = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ لینک سرور تست آپدیت شد.`);
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_new_free_link') {
            if (!isAdmin({ chat: { id: chatId }, from: msg.from })) return;
            db.freeSubConfig = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ لینک اشتراک رایگان آپدیت شد.`);
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_new_plan_name') {
            db.userStates[chatId] = { step: 'get_new_plan_volume', planData: { name: text } };
            saveDatabase();
            bot.sendMessage(chatId, '🌐 حجم پلن رو وارد کن (مثلاً 50 گیگابایت یا نامحدود):');
            return;
        }

        if (step === 'get_new_plan_volume') {
            currentState.planData.volume = text;
            currentState.step = 'get_new_plan_duration';
            saveDatabase();
            bot.sendMessage(chatId, '⏳ مدت زمان پلن رو وارد کن (مثلاً 30 روزه):');
            return;
        }

        if (step === 'get_new_plan_duration') {
            currentState.planData.duration = text;
            currentState.step = 'get_new_plan_price';
            saveDatabase();
            bot.sendMessage(chatId, '💵 قیمت پلن رو وارد کن (مثلاً 120,000 تومان):');
            return;
        }

        if (step === 'get_new_plan_price') {
            currentState.planData.price = text;
            currentState.step = 'get_new_plan_links';
            saveDatabase();
            bot.sendMessage(chatId, '🔗 لینک‌های سابسکریپشن این پلن رو بفرست (هر لینک در یک خط جداگانه یا یکجا):');
            return;
        }

        if (step === 'get_new_plan_links') {
            const links = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const newId = db.customPlans.length > 0 ? Math.max(...db.customPlans.map(p => p.id)) + 1 : 1;
            
            db.customPlans.push({
                id: newId,
                name: currentState.planData.name,
                volume: currentState.planData.volume,
                duration: currentState.planData.duration,
                price: currentState.planData.price,
                links: links
            });

            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ پلن جدید با موفقیت ساخته شد و ${links.length} لینک به انبارش اضافه گردید! 🎉`);
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'edit_plan_get_name') {
            const planId = currentState.targetPlanId;
            const p = db.customPlans.find(item => item.id === planId);
            if (p) p.name = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, '✅ نام پلن تغییر کرد.');
            return;
        }

        if (step === 'get_extra_link_for_plan') {
            const planId = currentState.targetPlanId;
            const p = db.customPlans.find(item => item.id === planId);
            if (p) {
                const newLinks = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                p.links.push(...newLinks);
                saveDatabase();
                bot.sendMessage(chatId, `✅ ${newLinks.length} لینک جدید به انبار پلن اضافه شد.`);
            }
            delete db.userStates[chatId];
            return;
        }

        if (step === 'get_new_card_number') {
            if (!isAdmin({ chat: { id: chatId }, from: msg.from })) return;
            db.paymentCardNumber = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ شماره کارت با موفقیت تغییر کرد.`);
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_broadcast_content') {
            if (!isAdmin({ chat: { id: chatId }, from: msg.from })) return;
            delete db.userStates[chatId];
            saveDatabase();

            bot.sendMessage(chatId, '⏳ ارسال همگانی پیام شروع شد...');
            let successCount = 0;
            for (const uId of db.allUsers) {
                try {
                    await bot.sendMessage(uId, text, { parse_mode: 'Markdown' });
                    successCount++;
                    await sleep(50);
                } catch (e) {}
            }
            bot.sendMessage(chatId, `✅ پیام همگانی با موفقیت به ${successCount} کاربر ارسال شد.`);
            return;
        }

        if (step === 'wallet_manager_waiting_for_amount') {
            if (!isAdmin({ chat: { id: chatId }, from: msg.from })) return;
            const amount = parseInt(text.replace(/[^0-9]/g, ''), 10);
            if (isNaN(amount) || amount <= 0) {
                return bot.sendMessage(chatId, '❌ لطفاً یک عدد معتبر وارد کن.');
            }

            const targetUser = currentState.targetUser;
            const action = currentState.action;
            const currentBalance = db.userWallets[targetUser] || 0;

            if (action === 'inc') {
                db.userWallets[targetUser] = currentBalance + amount;
            } else {
                db.userWallets[targetUser] = Math.max(0, currentBalance - amount);
            }

            delete db.userStates[chatId];
            saveDatabase();

            const actionText = action === 'inc' ? 'افزایش یافته' : 'کاهش یافته';
            bot.sendMessage(chatId, `✅ مبلغ ${amount.toLocaleString()} تومان با موفقیت به حساب کاربر \`${targetUser}\` ${actionText}.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`, { parse_mode: 'Markdown' });

            try {
                const notifyText = action === 'inc' 
                    ? `🎉 حساب شما توسط مدیریت به مبلغ ${amount.toLocaleString()} تومان شارژ شد.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`
                    : `⚠️ مبلغ ${amount.toLocaleString()} تومان توسط مدیریت از حساب شما کسر شد.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`;
                await bot.sendMessage(targetUser, notifyText);
            } catch (e) {}
            return;
        }

        if (step === 'get_new_discount_code') {
            if (!isAdmin({ chat: { id: chatId }, from: msg.from })) return;
            const code = text.trim();
            db.userStates[chatId] = { step: 'get_new_discount_percent', codeToSave: code };
            saveDatabase();
            bot.sendMessage(chatId, `🎟 درصد تخفیف برای کد \`${code}\` رو به صورت عدد وارد کن (مثلاً 20):`);
            return;
        }

        if (step === 'get_new_discount_percent') {
            if (!isAdmin({ chat: { id: chatId }, from: msg.from })) return;
            const percent = parseInt(text.replace(/[^0-9]/g, ''), 10);
            const code = currentState.codeToSave;
            if (isNaN(percent) || percent <= 0 || percent > 100) {
                return bot.sendMessage(chatId, '❌ لطفاً عددی بین 1 تا 100 وارد کن.');
            }

            db.discountCodes[code] = { percent };
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ کد تخفیف \`${code}\` با **${percent}%** تخفیف ذخیره شد!`);
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_user_discount_input') {
            const code = text.trim();
            const planId = currentState.planId;
            delete db.userStates[chatId];
            saveDatabase();

            if (db.discountCodes && db.discountCodes[code]) {
                const disc = db.discountCodes[code];
                if (!db.appliedDiscounts) db.appliedDiscounts = {};
                db.appliedDiscounts[userId] = disc;
                saveDatabase();
                bot.sendMessage(chatId, `🎉 **کد تخفیف با موفقیت اعمال شد!** (${disc.percent}% تخفیف)\nحالا می‌تونی از منوی زیر پلن رو با تخفیف بخوای پرداخت کنی 👇`);
            } else {
                bot.sendMessage(chatId, '❌ این کد تخفیف نامعتبر یا منقضی شده است.');
            }
            return;
        }

        if (step === 'admin_waiting_for_user_identifier') {
            if (!isAdmin({ chat: { id: chatId }, from: msg.from })) return;
            let targetUserId = text.trim();
            if (targetUserId.startsWith('@')) {
                const cleanUname = targetUserId.replace('@', '').toLowerCase();
                const foundEntry = Object.entries(db.usersDetailMap).find(([uId, info]) => info.username && info.username.replace('@', '').toLowerCase() === cleanUname);
                if (foundEntry) {
                    targetUserId = foundEntry[0];
                } else {
                    delete db.userStates[chatId];
                    saveDatabase();
                    return bot.sendMessage(chatId, '❌ کاربری با این یوزرنیم در دیتابیس ربات یافت نشد.');
                }
            }
            
            db.userStates[chatId] = { step: 'admin_manual_add_sub_link', targetUserId };
            saveDatabase();
            bot.sendMessage(chatId, `➕ کاربر مورد نظر پیدا شد (\`${targetUserId}\`). حالا لینک کانفیگ یا سابسکریپشن رو بفرست:`, { parse_mode: 'Markdown' });
            return;
        }

        if (step === 'admin_manual_add_sub_link') {
            if (!isAdmin({ chat: { id: chatId }, from: msg.from })) return;
            const targetUserId = currentState.targetUserId;
            const link = text.trim();
            delete db.userStates[chatId];
            saveDatabase();

            const parsedData = await fetchAndParseConfig(link);
            const currentDateStr = getPersianDateTime();
            const userInfo = db.usersDetailMap[targetUserId] || { name: 'مشتری', username: 'ندارد' };

            const subObj = {
                userId: targetUserId,
                userName: userInfo.name,
                planName: 'اشتراک دستی ادمین 🎁',
                expiryDate: parsedData.expireDate !== 'نامشخص' ? parsedData.expireDate : '30 روزه',
                volume: parsedData.total !== 'نامشخص' ? parsedData.total : 'نامحدود',
                totalVolume: parsedData.total,
                upload: parsedData.upload,
                download: parsedData.download,
                configLink: link,
                extractedConfigs: parsedData.extractedConfigs,
                purchaseDate: currentDateStr
            };

            if (!db.userSubscriptions[targetUserId]) {
                db.userSubscriptions[targetUserId] = [];
            }
            db.userSubscriptions[targetUserId].push(subObj);
            db.allSubscriptionsHistory.push(subObj);
            saveDatabase();

            bot.sendMessage(chatId, `✅ اشتراک دستی با موفقیت برای کاربر \`${targetUserId}\` ثبت و ارسال شد.`);
            bot.sendMessage(targetUserId, `🎉 **یک اشتراک جدید و خفن از طرف مدیریت به شما اختصاص یافت!** 🚀🔥\n\n🔗 **لینک اشتراک:**\n\`${link}\``, { parse_mode: 'Markdown' }).catch(() => {});
            return;
        }
    }

    // ارسال رسید مالی شارژ کیف پول
    if (msg.photo && currentState && currentState.step === 'get_wallet_deposit_receipt') {
        const amount = currentState.amount;
        const photo = msg.photo[msg.photo.length - 1];
        const fileId = photo.file_id;
        const depositKey = `deposit_${userId}`;

        db.pending_deposits[depositKey] = { amount };
        db.receiptsHistory.push({
            type: 'شارژ کیف پول',
            userId: userId,
            userName: msg.from.first_name || 'کاربر',
            details: `${amount.toLocaleString()} تومان`,
            status: 'در انتظار تایید',
            date: getPersianDateTime()
        });
        delete db.userStates[chatId];
        saveDatabase();

        const adminReceiptKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ تایید شارژ کیف پول', callback_data: `approve_deposit_yes_${userId}` },
                        { text: '❌ رد رسید', callback_data: `reject_deposit_no_${userId}` }
                    ]
                ]
            }
        };

        const captionText = `🧾 **رسید جدید شارژ کیف پول**\n\n` +
                            `👤 کاربر: ${msg.from.first_name} (\`${userId}\`)\n` +
                            `💵 مبلغ درخواستی: \`${amount.toLocaleString()} تومان\``;

        await bot.sendPhoto(ADMIN_CHAT_ID, fileId, { caption: captionText, parse_mode: 'Markdown', ...adminReceiptKeyboard });
        bot.sendMessage(chatId, '✅ رسید شما با موفقیت برای تیم پشتیبانی ارسال شد. پس از بررسی، حساب شما شارژ می‌شود. 🙏✨');
        return;
    }

    // ارسال رسید خرید کارت به کارت اشتراک
    if (msg.photo && currentState && currentState.step === 'get_card_purchase_receipt') {
        const planId = currentState.planId;
        const amountToPay = currentState.amountToPay;
        const plan = db.customPlans.find(p => p.id === planId);

        if (!plan) {
            delete db.userStates[chatId];
            saveDatabase();
            return bot.sendMessage(chatId, '❌ پلن مورد نظر یافت نشد.');
        }

        const photo = msg.photo[msg.photo.length - 1];
        const fileId = photo.file_id;
        const cardKey = `card_pur_${userId}`;

        db.pending_card_purchases[cardKey] = { planId, amountToPay };
        db.receiptsHistory.push({
            type: 'خرید کارت به کارت',
            userId: userId,
            userName: msg.from.first_name || 'کاربر',
            details: `${plan.name} (${amountToPay.toLocaleString()} تومان)`,
            status: 'در انتظار تایید',
            date: getPersianDateTime()
        });
        delete db.userStates[chatId];
        saveDatabase();

        const adminCardKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ تایید خرید و صدور اشتراک 🚀', callback_data: `approve_card_yes_${userId}_${planId}` },
                        { text: '❌ رد رسید 🛑', callback_data: `reject_card_no_${userId}` }
                    ]
                ]
            }
        };

        const cardCaption = `🧾 **رسید خرید کارت به کارت جدید**\n\n` +
                            `👤 کاربر: ${msg.from.first_name} (\`${userId}\`)\n` +
                            `📦 پلن درخواستی: \`${plan.name}\`\n` +
                            `💵 مبلغ: \`${amountToPay.toLocaleString()} تومان\``;

        await bot.sendPhoto(ADMIN_CHAT_ID, fileId, { caption: cardCaption, parse_mode: 'Markdown', ...adminCardKeyboard });
        bot.sendMessage(chatId, '✅ رسید کارت به کارت شما با موفقیت ارسال شد. پس از بررسی توسط مدیریت، اشتراک شما صادر و همینجا ارسال می‌شود. 🙏✨');
        return;
    }
});
