const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- 🛡️ مدیریت خطاهای گلوبال برای جلوگیری از کرش کردن ربات در ترافیک بالا ---
process.on('uncaughtException', (err) => {
    console.error('❌ خطای هندل‌نشده (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ پرامیس رد شده هندل‌نشده (Unhandled Rejection):', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';
// استفاده از polling با تنظیمات بهینه برای جلوگیری از تداخل درخواست‌ها
const bot = new TelegramBot(TOKEN, { 
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    } 
});

const ADMIN_USERNAME = 'arenam_10';
const ADMIN_CHAT_ID = 8923324852;

const CHANNEL_LOG_ID = '-1004488082323';

const userCooldowns = new Map();
const COOLDOWN_TIME = 1500; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    inviteRewardAmount: 5000, 
    userStates: {},
    menuNames: {
        buy_sub: '🛒 خرید اشتراک VIP',
        free_sub: '🎁 اشتراک هدیه',
        test_server: '🧪 سرور تست',
        wallet: '💳 کیف پول من',
        invite: '👥 دعوت دوستان',
        my_subs: '📱 اشتراک‌های من',
        agency_request: '🤝 اخذ نمایندگی',
        tutorial: '📖 آموزش اتصال',
        support: '📞 پشتیبانی آنلاین'
    },
    botTexts: {
        start_message: '✨🎛 **به سامانه هوشمند و فوق‌العاده آرنا خوش آمدید!** 🚀\n\n🌐 بالاترین سرعت، کمترین پینگ و پایداری ۱۰۰٪ را با سرورهای قدرتمند ما تجربه کنید.\n💎 از کلیدهای شیک زیر برای شروع پرواز در اینترنت آزاد استفاده کنید 👇\n\n🔥 **ARENA VIP | امن، پایدار، بدون محدودیت** 🛡',
        tutorial_message: '📖 **راهنمای سریع و آسان اتصال به سرورها:** 💡\n\n1️⃣ اپلیکیشن اختصاصی V2Ray (مثل `v2rayNG` در اندروید یا `FoXray` در آیفون) را نصب کنید.\n2️⃣ لینک اشتراک اختصاصی خود را از بخش «اشتراک‌های من» کپی کنید.\n3️⃣ برنامه را باز کرده، روی علامت `+` بزنید و گزینه ورود از کلیپ‌بورد را انتخاب کنید.\n4️⃣ روی دکمه اتصال ⚡️ ضربه بزنید و از اینترنت پرسرعت لذت ببرید! 🚀',
        support_prompt: '📞 سوال، پیشنهاد یا مشکلی دارید؟ پیام خود را ارسال کنید تا کارشناسان ما در سریع‌ترین زمان ممکن پاسخگوی شما باشند: 👇',
        support_success: '🎯 **پیام شما با موفقیت به واحد پشتیبانی ارسال شد.** تیم ما به‌زودی آن را بررسی و پاسخ خواهد داد. 🙏✨',
        store_title: '🛒 **فروشگاه اشتراک‌های پرسرعت و اختصاصی آرنا** 🚀\n\nلطفاً پلن فوق‌العاده مورد نظر خود را انتخاب کنید: 👇',
        no_plans: '🛒 در حال حاضر پلنی در این بخش موجود نمی‌باشد. لطفاً بعداً سر بزنید. 😎',
        wallet_title: '💳 **مدیریت کیف پول حساب کاربری**\n\n💰 موجودی فعلی: `✨ {balance} تومان`\n\n🆔 شناسه کاربری شما: `{userId}`',
        invite_title: '👥 **سیستم دعوت از دوستان و کسب درآمد** 🎁\n\nلینک اختصاصی زیر را برای دوستان خود بفرستید و به ازای هر دعوت پاداش بگیرید:\n`{inviteLink}`\n\n✨ تعداد کاربرانی که تا کنون دعوت کرده‌اید: **{count} نفر**',
        empty_subs: '📱 شما هنوز هیچ اشتراک فعالی ندارید! از طریق فروشگاه جذاب ما اقدام به تهیه سرویس کنید. 🛒🔥',
        agency_prompt: '🤝 **درخواست اخذ نمایندگی رسمی VIP آرنا**\n\nرزومه، کانال یا درخواست خود را ارسال کنید تا پس از بررسی توسط مدیریت با شما تماس بگیریم:',
        agency_success: '✅ درخواست نمایندگی شما با موفقیت ثبت شد. به‌زودی با شما ارتباط برقرار خواهیم کرد! 👑'
    },
    userWallets: {},
    pending_deposits: {},
    pending_card_purchases: {},
    allUsers: [],
    blockedUsers: [],
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
    agents: {}, 
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
                inviteRewardAmount: parsed.inviteRewardAmount !== undefined ? parsed.inviteRewardAmount : defaultDatabaseStructure.inviteRewardAmount,
                menuNames: { ...defaultDatabaseStructure.menuNames, ...(parsed.menuNames || {}) },
                botTexts: { ...defaultDatabaseStructure.botTexts, ...(parsed.botTexts || {}) },
                userStates: parsed.userStates || {},
                userWallets: parsed.userWallets || {},
                pending_deposits: parsed.pending_deposits || {},
                pending_card_purchases: parsed.pending_card_purchases || {},
                allUsers: parsed.allUsers || [],
                blockedUsers: parsed.blockedUsers || [],
                usersDetailMap: parsed.usersDetailMap || {},
                receiptsHistory: parsed.receiptsHistory || [],
                referals: parsed.referals || {},
                userSubscriptions: parsed.userSubscriptions || {},
                allSubscriptionsHistory: parsed.allSubscriptionsHistory || [],
                customPlans: parsed.customPlans || defaultDatabaseStructure.customPlans,
                discountCodes: parsed.discountCodes || {},
                appliedDiscounts: parsed.appliedDiscounts || {},
                agents: parsed.agents || {},
                messagesMap: parsed.messagesMap || {}
            };
        } else {
            saveDatabase();
        }
    } catch (e) {
        console.log('❌ خطا در خواندن دیتابیس:', e);
    }
}

let isSaving = false;
function saveDatabase() {
    if (isSaving) return;
    try {
        isSaving = true;
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const tempFile = DB_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
        fs.renameSync(tempFile, DB_FILE);
    } catch (e) {
        console.log('❌ خطا در ذخیره‌سازی دیتابیس:', e);
    } finally {
        isSaving = false;
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
            }).catch(() => {});
        }
        if (fs.existsSync(PURCHASES_LOG_FILE)) {
            fs.copyFileSync(PURCHASES_LOG_FILE, backupLogPath);
            await bot.sendDocument(ADMIN_CHAT_ID, backupLogPath, {
                caption: `📑 **فایل کامل سوابق و جزئیات خریدهای انجام‌شده**\n👤 ادمین: arenam_10`
            }).catch(() => {});
        }
    } catch (e) {}
}

setInterval(sendBackupToAdmin, 24 * 60 * 60 * 1000);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Bot is running successfully!');
});

app.listen(PORT, () => {
    console.log(`Bot Server running on port ${PORT}`);
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

        if (isBrandNew && chatId.toString() !== ADMIN_CHAT_ID.toString()) {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [[{ text: '👤 پروفایل کاربر در تلگرام', url: `tg://user?id=${userId}` }]]
                }
            };
            bot.sendMessage(
                ADMIN_CHAT_ID, 
                `🚀 **کاربر جدیدی ربات را استارت کرد!** 🤖\n\n` +
                `👤 **نام کاربر:** ${name}\n` +
                `🔗 **نام کاربری:** ${username}\n` +
                `🆔 **شناسه عددی:** \`${userId}\`\n` +
                `🕒 **تاریخ و ساعت:** ${currentPersianTime}`, 
                { parse_mode: 'Markdown', ...keyboard }
            ).catch((err) => console.log('❌ خطا در ارسال پیام کاربر جدید به ادمین:', err));
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
            const response = await axios.get(url, { timeout: 8000, validateStatus: () => true });

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

function getPersistentMenuKeyboard() {
    const names = db.menuNames;
    let keyboardRows = [
        [{ text: `🛒 ${names.buy_sub}` }, { text: `💳 ${names.wallet}` }],
        [{ text: `📱 ${names.my_subs}` }, { text: `📞 ${names.support}` }]
    ];

    if (db.isFreeSubEnabled) {
        keyboardRows.push([{ text: `🎁 ${names.free_sub}` }]);
    }
    if (db.isTestServerEnabled) {
        keyboardRows.push([{ text: `🧪 ${names.test_server}` }]);
    }
    if (db.isInviteSystemEnabled) {
        keyboardRows.push([{ text: `👥 ${names.invite}` }]);
    }
    
    keyboardRows.push([{ text: `🤝 ${names.agency_request}` }, { text: `📖 ${names.tutorial}` }]);
    keyboardRows.push([{ text: '🚪 بستن کیبورد ربات' }]);

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
    await bot.sendMessage(chatId, db.botTexts.start_message, { parse_mode: 'Markdown', ...getPersistentMenuKeyboard() }).catch(() => {});
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
                    [{ text: '📢 عضویت در کانال رسمی ما', url: `https://t.me/${db.CHANNEL_USERNAME.replace('@', '')}` }],
                    [{ text: '✅ عضو شدم، ادامه بده', callback_data: 'check_membership' }]
                ],
                remove_keyboard: true
            }
        };
        bot.sendMessage(chatId, `⚠️ **کاربر گرامی!**\nبرای استفاده از ربات، لطفاً ابتدا در کانال زیر عضو شوید:\n\n📢 ${db.CHANNEL_USERNAME}\n\nسپس روی دکمه تایید زیر کلیک کنید 👇`, { parse_mode: 'Markdown', ...joinKeyboard }).catch(() => {});
        return false;
    }
    return true;
}

bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    loadDatabase(); 
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    if (!isAdmin(msg) && db.blockedUsers && db.blockedUsers.includes(userId)) {
        return bot.sendMessage(chatId, '❌ شما توسط مدیریت مسدود شده‌اید و نمی‌توانید از ربات استفاده کنید.').catch(() => {});
    }

    delete db.userStates[chatId];
    saveDatabase();

    trackUserAndNotifyAdmin(msg);
    const canProceed = await handleForceJoin(msg);
    if (!canProceed) return;

    const payload = match ? match[1] : null; 
    const currentReward = db.inviteRewardAmount || 5000;

    if (payload && db.isInviteSystemEnabled && payload !== chatId.toString()) {
        const refId = payload;
        if (!db.userWallets[`referred_${chatId}`]) {
            db.userWallets[`referred_${chatId}`] = true; 
            db.userWallets[refId] = (db.userWallets[refId] || 0) + currentReward;
            db.referals[refId] = (db.referals[refId] || 0) + 1;
            saveDatabase();

            bot.sendMessage(refId, `🎉 **تبریک!**\nیک کاربر جدید با لینک اختصاصی شما وارد ربات شد.\n\n💰 مبلغ \`${currentReward.toLocaleString()} تومان\` به کیف پول شما واریز شد! 🚀`, { parse_mode: 'Markdown' })
                .catch(() => {});
        }
    }

    if (isAdmin(msg)) {
        const adminReplyKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: '💻 پنل مدیریت' }],
                    [{ text: '🚪 بستن کیبورد ربات' }]
                ],
                resize_keyboard: true,
                is_persistent: true,
                remove_keyboard: false
            }
        };
        bot.sendMessage(chatId, '👑 **دسترسی‌های پنل مدیریت برای شما فعال شد.**\nبرای دسترسی به پنل از دکمه زیر یا دستور `/panel` استفاده کنید. 🛡', adminReplyKeyboard).catch(() => {});
        return;
    }

    sendMainMenu(chatId);
});

bot.onText(/💻 پنل مدیریت|\/panel/, async (msg) => {
    loadDatabase();
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) {
        bot.sendMessage(chatId, '❌ شما به این بخش دسترسی ندارید.').catch(() => {});
        return;
    }
    sendAdminPanel(chatId);
});

function sendAdminPanel(chatId) {
    const forceJoinStatus = db.isForceJoinEnabled ? `🟢 جوین اجباری: روشن` : '🔴 جوین اجباری: خاموش';
    const testServerStatus = db.isTestServerEnabled ? '🟢 سرور تست: روشن' : '🔴 سرور تست: خاموش';
    const freeSubStatus = db.isFreeSubEnabled ? '🟢 اشتراک رایگان: روشن' : '🔴 اشتراک رایگان: خاموش';
    const inviteStatus = db.isInviteSystemEnabled ? '🟢 زیرمجموعه‌گیری: روشن' : '🔴 زیرمجموعه‌گیری: خاموش';
    
    const uniqueUsersCount = [...new Set(db.allUsers)].length;

    const adminKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: `📊 آمار ربات (${uniqueUsersCount} کاربر)`, callback_data: 'admin_stats' }
                ],
                [
                    { text: `🎁 تنظیم پاداش دعوت (${(db.inviteRewardAmount || 5000).toLocaleString()} ت)`, callback_data: 'admin_set_invite_reward' }
                ],
                [
                    { text: '🤝 مدیریت نمایندگان', callback_data: 'admin_agents_menu' },
                    { text: '⚙️ مدیریت پلن‌ها', callback_data: 'admin_manage_plans' }
                ],
                [
                    { text: '🎟 مدیریت کدهای تخفیف', callback_data: 'admin_discount_menu' },
                    { text: '✏️ ویرایش نام دکمه‌ها', callback_data: 'admin_edit_names_menu' }
                ],
                [
                    { text: '📝 ویرایش متن‌های ربات', callback_data: 'admin_edit_texts_menu' },
                    { text: '📦 سوابق اشتراک‌ها', callback_data: 'admin_history' }
                ],
                [
                    { text: '📁 رسیدهای مالی', callback_data: 'admin_receipts' },
                    { text: '💰 مدیریت کیف پول‌ها', callback_data: 'manage_wallets' }
                ],
                [
                    { text: '📱 مدیریت اشتراک کاربران', callback_data: 'manage_user_subs' },
                    { text: '🚫 مسدودسازی کاربران', callback_data: 'admin_block_menu' }
                ],
                [
                    { text: '💳 تنظیم شماره کارت', callback_data: 'admin_pay_settings' },
                    { text: testServerStatus, callback_data: 'toggle_test_server' }
                ],
                [
                    { text: freeSubStatus, callback_data: 'toggle_free_sub' },
                    { text: '🧪 لینک سرور تست', callback_data: 'admin_set_test_link' }
                ],
                [
                    { text: '🎁 لینک اشتراک رایگان', callback_data: 'admin_set_free_link' },
                    { text: inviteStatus, callback_data: 'toggle_invite_system' }
                ],
                [
                    { text: forceJoinStatus, callback_data: 'admin_force_join_menu' },
                    { text: '📢 ارسال پیام همگانی', callback_data: 'admin_broadcast' }
                ],
                [
                    { text: '📦 پشتیبان‌گیری دستی', callback_data: 'admin_send_backup' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, '⚙️ **پنل مدیریت پیشرفته ربات**\nلطفاً گزینه مورد نظر را انتخاب کنید: 👇', {
        parse_mode: 'Markdown',
        ...adminKeyboard
    }).catch(() => {});
}

async function sendUserSubscriptionsPage(chatId, messageId, userId, page = 0, callbackQueryId = null) {
    const userSubs = db.userSubscriptions[userId] || [];
    
    if (userSubs.length === 0) {
        if (callbackQueryId) {
            await bot.answerCallbackQuery(callbackQueryId, {
                text: '❌ شما هنوز هیچ اشتراک فعالی ندارید!',
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

    let responseText = `📱 **اشتراک‌های خریداری شده شما** ⚡️\n\n` +
                       `⚠️ برای مشاهده جزئیات و کانفیگ‌ها، روی سرویس مورد نظر کلیک کنید:\n\n` +
                       `📄 صفحه ${validPage + 1} از ${totalPages} | 📊 مجموع: ${userSubs.length} سرویس`;

    let inlineKeyboard = [];

    currentItems.forEach((sub, localIndex) => {
        const globalIndex = startIndex + localIndex;
        const buttonText = `🔹 سرویس شماره ${globalIndex + 1} (${sub.planName})`;
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

    const replyMarkup = { inline_keyboard: inlineKeyboard };

    try {
        if (messageId) {
            await bot.editMessageText(responseText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: replyMarkup
            }).catch(() => {});
        } else {
            await bot.sendMessage(chatId, responseText, {
                parse_mode: 'Markdown',
                reply_markup: replyMarkup
            }).catch(() => {});
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

    if (!isAdmin(callbackQuery) && db.blockedUsers && db.blockedUsers.includes(userId)) {
        return bot.answerCallbackQuery(callbackQuery.id, { text: '❌ شما مسدود شده‌اید.', show_alert: true }).catch(() => {});
    }

    if (userCooldowns.has(userId)) {
        const lastClickTime = userCooldowns.get(userId);
        if (currentTime - lastClickTime < COOLDOWN_TIME) {
            return bot.answerCallbackQuery(callbackQuery.id, {
                text: '⚠️ لطفاً کمی آهسته‌تر کلیک کنید...',
                show_alert: false
            }).catch(() => {});
        }
    }
    userCooldowns.set(userId, currentTime);

    await sleep(100);

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

    const currentMenuNames = db.menuNames;
    
    if (data === 'free_sub' || msg.text === `🎁 ${currentMenuNames.free_sub}`) {
        if (!db.isFreeSubEnabled) {
            return bot.sendMessage(chatId, '❌ بخش اشتراک هدیه در حال حاضر غیرفعال است.').catch(() => {});
        }
        if (!db.freeSubConfig || db.freeSubConfig === 'vless://example-free-sub-link') {
            return bot.sendMessage(chatId, '⚠️ لینک اشتراک هدیه توسط مدیریت تنظیم نشده است.').catch(() => {});
        }

        if (!db.userWallets) db.userWallets = {};
        if (db.userWallets[`free_claimed_${userId}`]) {
            return bot.sendMessage(chatId, '⚠️ شما قبلاً اشتراک هدیه خود را دریافت کرده‌اید! هر کاربر تنها یک بار می‌تواند اشتراک هدیه بگیرد. 🎁').catch(() => {});
        }

        db.userWallets[`free_claimed_${userId}`] = true;
        saveDatabase();

        const freeMsg = `🎁 **اشتراک هدیه و رایگان شما آماده است!** 🚀\n\n` +
                        `لینک اختصاصی شما:\n\`${db.freeSubConfig}\``;
        await bot.sendMessage(chatId, freeMsg, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'test_server' || msg.text === `🧪 ${currentMenuNames.test_server}`) {
        if (!db.isTestServerEnabled) {
            return bot.sendMessage(chatId, '❌ بخش سرور تست در حال حاضر غیرفعال است.').catch(() => {});
        }
        if (!db.testServerConfig || db.testServerConfig === 'vless://example-test-server-link') {
            return bot.sendMessage(chatId, '⚠️ لینک سرور تست توسط مدیریت تنظیم نشده است.').catch(() => {});
        }

        const testMsg = `🧪 **اطلاعات اتصال به سرور تست آرنا:** ⚡️\n\n` +
                        `می‌توانید از کانفیگ زیر برای تست کیفیت و پینگ سرورها استفاده کنید:\n\n` +
                        `\`${db.testServerConfig}\``;
        await bot.sendMessage(chatId, testMsg, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'invite' || msg.text === `👥 ${currentMenuNames.invite}`) {
        if (!db.isInviteSystemEnabled) {
            return bot.sendMessage(chatId, '❌ سیستم دعوت از دوستان در حال حاضر غیرفعال است.').catch(() => {});
        }

        const botInfo = await bot.getMe();
        const botUsername = botInfo.username;
        const inviteLink = `https://t.me/${botUsername}?start=${userId}`;
        const refCount = db.referals && db.referals[userId] ? db.referals[userId] : 0;

        let inviteText = (db.botTexts.invite_title || '')
            .replace('{inviteLink}', inviteLink)
            .replace('{count}', refCount);

        await bot.sendMessage(chatId, inviteText, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'support' || data === 'support_online' || msg.text === `📞 ${currentMenuNames.support}`) {
        db.userStates[chatId] = { step: 'support_waiting_message' };
        saveDatabase();
        await bot.sendMessage(chatId, db.botTexts.support_prompt, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'agency_request' || msg.text === `🤝 ${currentMenuNames.agency_request}`) {
        db.userStates[chatId] = { step: 'agency_waiting_message' };
        saveDatabase();
        await bot.sendMessage(chatId, db.botTexts.agency_prompt, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'admin_set_invite_reward') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'get_new_invite_reward' };
        saveDatabase();
        bot.sendMessage(chatId, `🎁 **تنظیم مبلغ پاداش دعوت**\n\nمبلغ فعلی: \`${(db.inviteRewardAmount || 5000).toLocaleString()} تومان\`\n\nلطفاً مبلغ جدید پاداش را به تومان و به عدد وارد کنید (مثلا 10000):`, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'admin_edit_names_menu') {
        if (!isAdmin(callbackQuery)) return;
        const names = db.menuNames;
        const editNamesKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: `✏️ خرید اشتراک: ${names.buy_sub}`, callback_data: 'set_name_buy_sub' }],
                    [{ text: `✏️ اشتراک هدیه: ${names.free_sub}`, callback_data: 'set_name_free_sub' }],
                    [{ text: `✏️ سرور تست: ${names.test_server}`, callback_data: 'set_name_test_server' }],
                    [{ text: `✏️ کیف پول: ${names.wallet}`, callback_data: 'set_name_wallet' }],
                    [{ text: `✏️ دعوت دوستان: ${names.invite}`, callback_data: 'set_name_invite' }],
                    [{ text: `✏️ اشتراک‌های من: ${names.my_subs}`, callback_data: 'set_name_my_subs' }],
                    [{ text: `✏️ نمایندگی: ${names.agency_request}`, callback_data: 'set_name_agency_request' }],
                    [{ text: `✏️ آموزش: ${names.tutorial}`, callback_data: 'set_name_tutorial' }],
                    [{ text: `✏️ پشتیبانی: ${names.support}`, callback_data: 'set_name_support' }],
                    [{ text: '🔙 بازگشت به پنل', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        await bot.editMessageText('✏️ **تغییر نام دکمه‌های منوی اصلی**\nگزینه مورد نظر را انتخاب کنید:', { parse_mode: 'Markdown', ...editNamesKeyboard }).catch(() => {});
        return;
    }

    if (data.startsWith('set_name_')) {
        if (!isAdmin(callbackQuery)) return;
        const key = data.replace('set_name_', '');
        db.userStates[chatId] = { step: 'get_new_menu_name', targetKey: key };
        saveDatabase();
        bot.sendMessage(chatId, `✏️ نام جدید این دکمه را ارسال کنید:`, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'admin_agents_menu') {
        if (!isAdmin(callbackQuery)) return;
        const agentsList = Object.keys(db.agents || {});
        let textMsg = '🤝 **مدیریت نمایندگان و تخفیف‌ها**\n\n';
        const inlineBtns = [[{ text: '➕ افزودن نماینده جدید', callback_data: 'admin_add_agent' }]];

        if (agentsList.length > 0) {
            textMsg += 'لیست نمایندگان فعال:\n';
            agentsList.forEach(agId => {
                const info = db.agents[agId];
                const uInfo = db.usersDetailMap[agId] || { name: 'بدون نام', username: 'ندارد' };
                textMsg += `👤 ${uInfo.name} (\`${agId}\`) -> **${info.discountPercent}%** تخفیف\n`;
                inlineBtns.push([{ text: `🗑 حذف نماینده: ${uInfo.name}`, callback_data: `admin_del_agent_${agId}` }]);
            });
        } else {
            textMsg += 'هیچ نماینده‌ای ثبت نشده است.';
        }
        inlineBtns.push([{ text: '🔙 بازگشت به پنل', callback_data: 'admin_back_to_panel' }]);

        await bot.editMessageText(textMsg, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineBtns }
        }).catch(() => {});
        return;
    }

    if (data === 'admin_add_agent') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'admin_waiting_for_agent_identifier' };
        saveDatabase();
        bot.sendMessage(chatId, '🤝 **افزودن نماینده جدید**\n\nلطفاً **آیدی عددی** یا **یوزرنیم** کاربر مورد نظر را ارسال کنید:', { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data.startsWith('admin_del_agent_')) {
        if (!isAdmin(callbackQuery)) return;
        const agentIdToDel = data.replace('admin_del_agent_', '');
        delete db.agents[agentIdToDel];
        saveDatabase();
        bot.sendMessage(chatId, `✅ نماینده با شناسه \`${agentIdToDel}\` حذف شد.`).catch(() => {});
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'admin_block_menu') {
        if (!isAdmin(callbackQuery)) return;
        const blockKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🚫 مسدود کردن کاربر جدید', callback_data: 'adm_block_user_prompt' }],
                    [{ text: '🟢 رفع مسدودیت کاربر', callback_data: 'adm_unblock_user_list' }],
                    [{ text: '🔙 بازگشت به پنل مدیریت', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        await bot.editMessageText(`🚫 **مدیریت مسدودسازی کاربران**\n\nتعداد کاربران مسدود شده: \`${(db.blockedUsers || []).length}\` نفر`, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: blockKeyboard.reply_markup
        }).catch(() => {});
        return;
    }

    if (data === 'adm_block_user_prompt') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'admin_waiting_for_block_identifier' };
        saveDatabase();
        bot.sendMessage(chatId, `🚫 **مسدود کردن کاربر**\n\nلطفاً **آیدی عددی** یا **یوزرنیم** کاربر مورد نظر را ارسال کنید:`, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'adm_unblock_user_list') {
        if (!isAdmin(callbackQuery)) return;
        const blockedList = db.blockedUsers || [];
        if (blockedList.length === 0) {
            return bot.answerCallbackQuery(callbackQuery.id, { text: '❌ هیچ کاربری در لیست مسدودیت نیست.', show_alert: true }).catch(() => {});
        }

        let unblockBtns = blockedList.map(uId => {
            let info = db.usersDetailMap[uId] || { name: 'بدون نام', username: 'ندارد' };
            return [{ text: `🟢 رفع مسدودیت: ${info.name} (${uId})`, callback_data: `adm_unblock_${uId}` }];
        });
        unblockBtns.push([{ text: '🔙 بازگشت', callback_data: 'admin_block_menu' }]);

        await bot.editMessageText(`🟢 **لیست کاربران مسدود شده:**\nبرای رفع مسدودیت روی کاربر مورد نظر کلیک کنید:`, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: unblockBtns }
        }).catch(() => {});
        return;
    }

    if (data.startsWith('adm_unblock_')) {
        if (!isAdmin(callbackQuery)) return;
        const targetUserId = data.replace('adm_unblock_', '');
        db.blockedUsers = (db.blockedUsers || []).filter(id => id.toString() !== targetUserId.toString());
        saveDatabase();
        bot.answerCallbackQuery(callbackQuery.id, { text: '✅ کاربر از لیست مسدودیت خارج شد.', show_alert: true }).catch(() => {});
        try {
            bot.sendMessage(targetUserId, '🟢 **حساب شما توسط مدیریت از حالت مسدود خارج شد.** 🎉');
        } catch (e) {}
        sendAdminPanel(chatId);
        return;
    }

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
            let subDetailMsg = `📱 **جزئیات اشتراک شما:**\n\n` +
                               `📦 پلن: \`${sub.planName}\`\n` +
                               `🌐 حجم کل: \`${sub.totalVolume || sub.volume}\`\n` +
                               `⏳ تاریخ انقضا: \`${sub.expiryDate}\`\n\n` +
                               `🔗 **لینک اشتراک:**\n\`${sub.configLink}\``;

            if (sub.extractedConfigs && sub.extractedConfigs.length > 0) {
                subDetailMsg += `\n\n⚙️ **کانفیگ‌های مجزا:**\n\`\`\`\n${sub.extractedConfigs.join('\n\n')}\n\`\`\``;
            }

            await bot.editMessageText(subDetailMsg, {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 بازگشت به لیست اشتراک‌ها', callback_data: 'my_subscriptions' }]]
                }
            }).catch(() => {});
        } else {
            bot.answerCallbackQuery(callbackQuery.id, { text: '❌ اشتراک مورد نظر یافت نشد.', show_alert: true }).catch(() => {});
        }
        return;
    }

    if (data === 'adm_add_sub_by_identifier') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'admin_waiting_for_user_identifier' };
        saveDatabase();
        bot.sendMessage(chatId, `🔍 **افزایش اشتراک با شناسه یا نام کاربری**\n\nلطفاً **آیدی عددی** یا **یوزرنیم** کاربر را ارسال کنید:`, { parse_mode: 'Markdown' }).catch(() => {});
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
                    text: `👤 ${name} (${uId}) - ${subsCount} اشتراک`,
                    callback_data: `adm_user_subs_${uId}`
                }];
            });

            buttons.unshift([{ text: "➕ افزودن اشتراک با شناسه جدید", callback_data: "adm_add_sub_by_identifier" }]);
            buttons.push([{ text: "🔙 بازگشت به پنل مدیریت", callback_data: "admin_back_to_panel" }]);

            await bot.editMessageText(`📱 **مدیریت اشتراک کاربران**\n\nلیست کاربرانی که دارای اشتراک هستند:`, {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: buttons }
            }).catch(() => {});
        } catch (e) {}
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
                inlineBtns.push([{ text: `🗑 حذف اشتراک ${idx + 1}`, callback_data: `adm_del_sub_${targetUserId}_${idx}` }]);
            });
        } else {
            subText += `این کاربر در حال حاضر اشتراک فعالی ندارد.\n`;
        }

        inlineBtns.push([{ text: `➕ افزودن اشتراک دستی`, callback_data: `adm_add_sub_${targetUserId}` }]);
        inlineBtns.push([{ text: `🔙 بازگشت به لیست`, callback_data: 'manage_user_subs' }]);

        await bot.editMessageText(subText, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineBtns }
        }).catch(() => {});
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
            bot.answerCallbackQuery(callbackQuery.id, { text: '✅ اشتراک با موفقیت حذف شد.', show_alert: true }).catch(() => {});
        } else {
            bot.answerCallbackQuery(callbackQuery.id, { text: '❌ اشتراک یافت نشد.', show_alert: true }).catch(() => {});
        }
        return;
    }

    if (data.startsWith('adm_add_sub_')) {
        if (!isAdmin(callbackQuery)) return;
        const targetUserId = data.replace('adm_add_sub_', '');
        db.userStates[chatId] = { step: 'admin_manual_add_sub_link', targetUserId };
        saveDatabase();
        bot.sendMessage(chatId, `➕ **ثبت اشتراک دستی** (\`${targetUserId}\`)\n\nلطفاً **لینک کانفیگ یا سابسکریپشن** را ارسال کنید:`, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data.startsWith('user_dep_')) {
        const amount = parseInt(data.replace('user_dep_', ''), 10);
        
        db.userStates[chatId] = { 
            step: 'get_wallet_deposit_receipt', 
            depositAmount: amount 
        };
        saveDatabase();

        const depositMsg = `💳 **فاکتور شارژ کیف پول**\n\n` +
                           `💵 مبلغ انتخابی: \`${amount.toLocaleString()} تومان\`\n\n` +
                           `لطفاً مبلغ را به شماره کارت زیر واریز کرده و **عکس رسید** را همینجا ارسال کنید تا تأیید شود:\n\`${db.paymentCardNumber}\``;
        
        await bot.sendMessage(chatId, depositMsg, {
            parse_mode: 'Markdown'
        }).catch(() => {});
        return;
    }

    if (data === 'admin_discount_menu') {
        if (!isAdmin(callbackQuery)) return;
        const codesList = Object.keys(db.discountCodes);
        let textMsg = '🎟 **مدیریت کدهای تخفیف**\n\n';
        const inlineBtns = [[{ text: '➕ افزودن کد تخفیف جدید', callback_data: 'admin_add_discount' }]];

        if (codesList.length > 0) {
            textMsg += 'کدهای تخفیف فعال:\n';
            codesList.forEach(code => {
                const info = db.discountCodes[code];
                textMsg += `🔹 \`${code}\` -> **${info.percent}%** تخفیف\n`;
                inlineBtns.push([{ text: `🗑 حذف کد: ${code}`, callback_data: `admin_del_discount_${code}` }]);
            });
        } else {
            textMsg += 'هیچ کد تخفیفی ثبت نشده است.';
        }
        inlineBtns.push([{ text: '🔙 بازگشت به پنل', callback_data: 'admin_back_to_panel' }]);

        await bot.editMessageText(textMsg, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineBtns }
        }).catch(() => {});
        return;
    }

    if (data === 'admin_add_discount') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'get_new_discount_code' };
        saveDatabase();
        bot.sendMessage(chatId, '🎟 لطفاً کد تخفیف خود را وارد کنید (مثلاً `OFF50`):').catch(() => {});
        return;
    }

    if (data.startsWith('admin_del_discount_')) {
        if (!isAdmin(callbackQuery)) return;
        const codeToDel = data.replace('admin_del_discount_', '');
        delete db.discountCodes[codeToDel];
        saveDatabase();
        bot.sendMessage(chatId, `✅ کد تخفیف \`${codeToDel}\` حذف شد.`).catch(() => {});
        sendAdminPanel(chatId);
        return;
    }

    if (data.startsWith('enter_discount_')) {
        const planId = parseInt(data.replace('enter_discount_', ''));
        db.userStates[chatId] = { step: 'get_user_discount_input', planId };
        saveDatabase();
        bot.sendMessage(chatId, '🎟 لطفاً کد تخفیف خود را ارسال کنید:').catch(() => {});
        return;
    }

    if (data.startsWith('close_ticket_')) {
        if (!isAdmin(callbackQuery)) return;
        const targetUser = data.replace('close_ticket_', '');
        try {
            await bot.sendMessage(targetUser, '🔒 **تیکت پشتیبانی شما توسط مدیریت بسته شد.**');
            await bot.editMessageCaption('🔒 **این تیکت بسته شد.**', { chat_id: chatId, message_id: msg.message_id, parse_mode: 'Markdown' }).catch(() => {
                bot.editMessageText('🔒 **این تیکت بسته شد.**', { chat_id: chatId, message_id: msg.message_id, parse_mode: 'Markdown' }).catch(() => {});
            });
        } catch (e) {}
        return;
    }

    if (data === 'manage_wallets') {
        if (!isAdmin(callbackQuery)) return;
        try {
            const userIds = [...new Set(db.allUsers)];
            if (!userIds || userIds.length === 0) {
                return bot.answerCallbackQuery(callbackQuery.id, { text: "❌ هیچ کاربری در ربات وجود ندارد.", show_alert: true }).catch(() => {});
            }

            let buttons = userIds.map(uId => {
                let info = db.usersDetailMap[uId] || { name: 'بدون نام', username: 'ندارد' };
                let name = info.name;
                let uname = info.username && info.username !== 'ندارد' ? info.username : uId;
                let balance = db.userWallets[uId] || 0;
                return [{
                    text: `👤 ${name} (${uname}) - 💳 ${balance.toLocaleString()} ت`,
                    callback_data: `wallet_user_${uId}`
                }];
            });

            buttons.push([{ text: "🔙 بازگشت به پنل مدیریت", callback_data: "admin_back_to_panel" }]);

            await bot.editMessageText(`💳 **مدیریت کیف پول کاربران**\n\nتعداد کل کاربران: ${userIds.length} نفر\nکاربر مورد نظر را انتخاب کنید:`, {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: buttons }
            }).catch(() => {});
        } catch (e) {}
        return;
    }

    if (data.startsWith('wallet_user_')) {
        if (!isAdmin(callbackQuery)) return;
        const targetChatId = data.replace('wallet_user_', '');
        const userInfo = db.usersDetailMap[targetChatId] || { name: 'نامشخص', username: 'ندارد' };
        const balance = db.userWallets[targetChatId] || 0;

        const walletMsg = `
💳 **مدیریت کیف پول کاربر:**
👤 نام: ${userInfo.name}
🆔 یوزرنیم: ${userInfo.username}
🔢 شناسه: \`${targetChatId}\`
💰 موجودی فعلی: **${balance.toLocaleString()} تومان**

عملیات مورد نظر را انتخاب کنید:
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
                        { text: "🔙 بازگشت به لیست", callback_data: "manage_wallets" }
                    ]
                ]
            }
        }).catch(() => {});
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

        await bot.editMessageText(`💵 لطفاً یکی از مبالغ زیر را برای **${actionTitle}** موجودی انتخاب کرده یا مبلغ دلخواه را به عدد بفرستید:`, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: quickAmountsKeyboard.reply_markup
        }).catch(() => {});
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

        const actionText = action === 'inc' ? 'افزایش یافت' : 'کاهش یافت';
        
        await bot.answerCallbackQuery(callbackQuery.id, { text: `✅ با موفقیت اعمال شد.`, show_alert: false }).catch(() => {});
        await bot.sendMessage(chatId, `✅ عملیات موفق:\nمبلغ ${amount.toLocaleString()} تومان به حساب کاربر \`${targetUser}\` ${actionText}.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`, { parse_mode: 'Markdown' }).catch(() => {});
        
        try {
            const notifyText = action === 'inc' 
                ? `🎉 حساب شما توسط مدیریت به مبلغ ${amount.toLocaleString()} تومان شارژ شد.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`
                : `⚠️ مبلغ ${amount.toLocaleString()} تومان توسط مدیریت از حساب شما کسر گردید.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`;
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
            bot.answerCallbackQuery(callbackQuery.id, { text: '⚠️ این رسید قبلاً پردازش شده است!', show_alert: true }).catch(() => {});
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
                bot.sendMessage(targetUserId, `🎉 **شارژ کیف پول شما تأیید شد!**\nمبلغ \`${depositInfo.amount.toLocaleString()} تومان\` به حسابتان واریز شد. ✨`, { parse_mode: 'Markdown' }).catch(() => {});
                bot.sendMessage(chatId, '✅ شارژ کیف پول تأیید شد.').catch(() => {});
            }
        } else {
            delete db.pending_deposits[depositKey];
            saveDatabase();
            bot.sendMessage(targetUserId, '❌ درخواست شارژ کیف پول شما توسط مدیریت رد شد.').catch(() => {});
            bot.sendMessage(chatId, '❌ رسید رد شد.').catch(() => {});
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
            bot.answerCallbackQuery(callbackQuery.id, { text: '⚠️ این رسید قبلاً بررسی شده است!', show_alert: true }).catch(() => {});
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
                const purchaseMessage = `🛒 **خرید کارت به کارت جدید:**\n` +
                                        `👤 **نام کاربری:** @${cleanUsername}\n` +
                                        `⏰ **زمان:** ${currentDateStr}\n` +
                                        `📦 **حجم:** ${parsedData.total !== 'نامشخص' ? parsedData.total : plan.volume}\n\n` +
                                        `🔗 **لینک اشتراک:**\n\`${assignedLink}\``;
                
                const channelKeyboard = {
                    reply_markup: {
                        inline_keyboard: [[{ text: '👤 پروفایل کاربر در تلگرام', url: `tg://user?id=${targetUserId}` }]]
                    }
                };

                await bot.sendMessage(CHANNEL_LOG_ID, purchaseMessage, { parse_mode: 'Markdown', ...channelKeyboard }).catch(() => {});

                let successMsg = `🎉 **پرداخت شما تأیید و اشتراک صادر شد!** 🚀\n\n` +
                                 `📦 پلن: \`${plan.name}\`\n` +
                                 `🌐 حجم: \`${parsedData.total}\`\n` +
                                 `⏳ انقضا: \`${subObj.expiryDate}\`\n\n` +
                                 `🔗 **لینک اشتراک اختصاصی:**\n\`${assignedLink}\``;

                if (parsedData.extractedConfigs && parsedData.extractedConfigs.length > 0) {
                    successMsg += `\n\n⚙️ **کانفیگ‌های مجزا:**\n\`\`\`\n${parsedData.extractedConfigs.join('\n\n')}\n\`\`\``;
                }

                bot.sendMessage(targetUserId, successMsg, { parse_mode: 'Markdown' }).catch(() => {});
                bot.sendMessage(chatId, '✅ پرداخت کارت به کارت تأیید شد و اشتراک برای کاربر ارسال گردید.').catch(() => {});
            } else {
                bot.sendMessage(chatId, '❌ خطا: لینکی برای این پلن در انبار موجود نیست.').catch(() => {});
            }
        } else {
            delete db.pending_card_purchases[cardKey];
            saveDatabase();
            bot.sendMessage(targetUserId, '❌ رسید پرداخت کارت به کارت شما توسط مدیریت رد شد.').catch(() => {});
            bot.sendMessage(chatId, '❌ رسید رد شد.').catch(() => {});
        }
        return;
    }

    if (data === 'admin_send_backup') {
        if (!isAdmin(callbackQuery)) return;
        bot.sendMessage(chatId, '⏳ در حال ارسال فایل‌های پشتیبان...').catch(() => {});
        await sendBackupToAdmin();
        return;
    }

    if (data === 'restart_bot') {
        delete db.userStates[chatId];
        saveDatabase();
        if (isAdmin(callbackQuery)) {
            bot.sendMessage(chatId, '👑 پنل مدیریت ربات:', {
                reply_markup: {
                    keyboard: [[{ text: '💻 پنل مدیریت' }], [{ text: '🚪 بستن کیبورد ربات' }]],
                    resize_keyboard: true,
                    is_persistent: true
                }
            });
        } else {
            sendMainMenu(chatId);
        }
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
                    [{ text: '📝 متن دعوت دوستان', callback_data: 'set_text_invite_title' }],
                    [{ text: '📝 متن نداشتن اشتراک', callback_data: 'set_text_empty_subs' }],
                    [{ text: '📝 متن درخواست نمایندگی', callback_data: 'set_text_agency_prompt' }],
                    [{ text: '📝 متن موفقیت نمایندگی', callback_data: 'set_text_agency_success' }],
                    [{ text: '🔙 بازگشت به پنل', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '📝 **ویرایش متون ربات**\nبخش مورد نظر را انتخاب کنید:', { parse_mode: 'Markdown', ...editTextKeyboard }).catch(() => {});
        return;
    }

    if (data.startsWith('set_text_')) {
        if (!isAdmin(callbackQuery)) return;
        const key = data.replace('set_text_', '');
        db.userStates[chatId] = { step: 'get_new_bot_text', targetTextKey: key };
        saveDatabase();
        bot.sendMessage(chatId, `📝 متن جدید را ارسال کنید:\n\n*(متن فعلی):\n\`${db.botTexts[key] || ''}\`*`, { parse_mode: 'Markdown' }).catch(() => {});
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
        bot.sendMessage(chatId, '📢 **مدیریت جوین اجباری**', { parse_mode: 'Markdown', ...fjMenu }).catch(() => {});
        return;
    }

    if (data === 'toggle_force_join') {
        if (!isAdmin(callbackQuery)) return;
        db.isForceJoinEnabled = !db.isForceJoinEnabled;
        saveDatabase();
        bot.sendMessage(chatId, `جوین اجباری ${db.isForceJoinEnabled ? 'روشن' : 'خاموش'} شد.`).catch(() => {});
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'set_channel_username') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'get_new_channel_username' };
        saveDatabase();
        bot.sendMessage(chatId, '📢 آیدی کانال جدید را با فرمت صحیح بفرستید (مثلاً `@ChannelName`):', { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'toggle_test_server') {
        if (!isAdmin(callbackQuery)) return;
        db.isTestServerEnabled = !db.isTestServerEnabled;
        saveDatabase();
        bot.sendMessage(chatId, `🧪 سرور تست ${db.isTestServerEnabled ? 'روشن' : 'خاموش'} شد.`).catch(() => {});
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'admin_set_test_link') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'get_new_test_link' };
        saveDatabase();
        bot.sendMessage(chatId, `🧪 لینک جدید سرور تست را بفرستید:\n\`${db.testServerConfig}\``, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'toggle_free_sub') {
        if (!isAdmin(callbackQuery)) return;
        db.isFreeSubEnabled = !db.isFreeSubEnabled;
        saveDatabase();
        bot.sendMessage(chatId, `🎁 اشتراک هدیه ${db.isFreeSubEnabled ? 'روشن' : 'خاموش'} شد.`).catch(() => {});
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'admin_set_free_link') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'get_new_free_link' };
        saveDatabase();
        bot.sendMessage(chatId, `🎁 لینک جدید اشتراک هدیه را بفرستید:\n\`${db.freeSubConfig}\``, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'toggle_invite_system') {
        if (!isAdmin(callbackQuery)) return;
        db.isInviteSystemEnabled = !db.isInviteSystemEnabled;
        saveDatabase();
        bot.sendMessage(chatId, `👥 سیستم دعوت دوستان ${db.isInviteSystemEnabled ? 'روشن' : 'خاموش'} شد.`).catch(() => {});
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'check_membership') {
        const isMember = await checkMembership(userId);
        if (isMember) {
            bot.sendMessage(chatId, '✅ عضویت شما تأیید شد. خوش آمدید! 🎉').catch(() => {});
            sendMainMenu(chatId);
        } else {
            bot.sendMessage(chatId, '❌ شما هنوز در کانال عضو نشده‌اید یا ربات قادر به بررسی نیست. لطفاً مجدداً تلاش کنید ⚠️').catch(() => {});
        }
        return;
    }

    if (data === 'admin_manage_plans') {
        const plansMenuKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ افزودن پلن جدید', callback_data: 'plan_mgmt_add' }],
                    [{ text: '✏️ مدیریت و ویرایش پلن‌ها', callback_data: 'plan_mgmt_edit_list' }],
                    [{ text: '🔙 بازگشت به پنل', callback_data: 'admin_back_to_panel' }]
                ]
            }
        };
        bot.sendMessage(chatId, '⚙️ **مدیریت پلن‌های فروشگاه**', { parse_mode: 'Markdown', ...plansMenuKeyboard }).catch(() => {});
        return;
    }

    if (data === 'plan_mgmt_add') {
        db.userStates[chatId] = { step: 'get_new_plan_name' };
        saveDatabase();
        bot.sendMessage(chatId, '➕ **ایجاد پلن جدید**\n\nلطفاً نام پلن را وارد کنید:', { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'plan_mgmt_edit_list') {
        if (db.customPlans.length === 0) {
            bot.sendMessage(chatId, '📦 هیچ پلنی ثبت نشده است.').catch(() => {});
            return;
        }

        let textList = '📋 **لیست پلن‌های موجود:**\n\n';
        const inlineBtns = [];

        db.customPlans.forEach((p) => {
            textList += `▪️ **${p.name}**\n   🌐 حجم: ${p.volume} | ⏳ مدت: ${p.duration} | 💵 قیمت: ${p.price}\n   📦 تعداد لینک‌های انبار: **${p.links.length} عدد**\n\n`;
            inlineBtns.push([
                { text: `✏️ ویرایش نام`, callback_data: `edit_p_${p.id}` },
                { text: `➕ افزودن لینک`, callback_data: `add_link_${p.id}` },
                { text: `🗑 حذف`, callback_data: `del_plan_${p.id}` }
            ]);
        });

        inlineBtns.push([{ text: '🔙 بازگشت', callback_data: 'admin_manage_plans' }]);
        bot.sendMessage(chatId, textList, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineBtns } }).catch(() => {});
        return;
    }

    if (data.startsWith('edit_p_')) {
        const planId = parseInt(data.split('_')[2]);
        db.userStates[chatId] = { step: 'edit_plan_get_name', targetPlanId: planId };
        saveDatabase();
        bot.sendMessage(chatId, '✏️ نام جدید پلن را وارد کنید:', { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data.startsWith('add_link_')) {
        const planId = parseInt(data.split('_')[2]);
        db.userStates[chatId] = { step: 'get_extra_link_for_plan', targetPlanId: planId };
        saveDatabase();
        bot.sendMessage(chatId, '🔗 لینک سابسکریپشن یا کانفیگ جدید را ارسال کنید:', { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data.startsWith('del_plan_')) {
        const planId = parseInt(data.split('_')[2]);
        db.customPlans = db.customPlans.filter(p => p.id !== planId);
        saveDatabase();
        bot.sendMessage(chatId, '🗑 پلن با موفقیت حذف شد.').catch(() => {});
        return;
    }

    if (data === 'admin_back_to_panel') {
        sendAdminPanel(chatId);
        return;
    }

    if (data === 'admin_pay_settings') {
        db.userStates[chatId] = { step: 'get_new_card_number' };
        saveDatabase();
        bot.sendMessage(chatId, '💳 **تنظیم شماره کارت**\n\nشماره کارت فعلی: `' + db.paymentCardNumber + '`\n\nشماره کارت جدید را ارسال کنید:', { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'admin_receipts') {
        if (db.receiptsHistory.length === 0) {
            bot.sendMessage(chatId, '📋 هیچ سابقه رسییدی ثبت نشده است.').catch(() => {});
            return;
        }
        let receiptText = '📋 **بایگانی رسیدهای مالی:**\n\n';
        db.receiptsHistory.forEach((r, idx) => {
            receiptText += `${idx + 1}. نوع: ${r.type}\n   👤 کاربر: ${r.userName} (\`${r.userId}\`)\n   💵 جزئیات: ${r.details}\n   📌 وضعیت: ${r.status}\n   📅 تاریخ: ${r.date}\n\n`;
        });
        bot.sendMessage(chatId, receiptText, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'admin_history') {
        if (db.allSubscriptionsHistory.length === 0) {
            bot.sendMessage(chatId, '📦 هیچ سابقه اشتراکی ثبت نشده است.').catch(() => {});
            return;
        }
        let historyText = '📦 **سوابق کامل اشتراک‌های صادر شده:**\n\n';
        db.allSubscriptionsHistory.forEach((sub, index) => {
            historyText += `🔹 **شماره ${index + 1}**\n` +
                           `👤 شناسه مشتری: \`${sub.userId}\`\n` +
                           `📛 نام پلن: ${sub.planName}\n` +
                           `🌐 حجم: ${sub.totalVolume || sub.volume}\n` +
                           `⏳ انقضا: ${sub.expiryDate}\n` +
                           `🔗 لینک: \`${sub.configLink}\`\n\n`;
        });
        bot.sendMessage(chatId, historyText, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'admin_stats') {
        if (!isAdmin(callbackQuery)) return;
        const uniqueUsersCount = [...new Set(db.allUsers)].length;
        
        let statsReport = `📊 **آمار کلی ربات:**\n\n` +
                          `👥 کل کاربران: \`${uniqueUsersCount}\`\n` +
                          `📦 کل اشتراک‌ها: \`${db.allSubscriptionsHistory.length}\`\n` +
                          `📋 کل رسیدها: \`${db.receiptsHistory.length}\`\n\n` +
                          `👤 **لیست کاربران:**\n`;

        const uniqueUsers = [...new Set(db.allUsers)];
        uniqueUsers.forEach((uId, idx) => {
            const uInfo = db.usersDetailMap[uId] || { name: 'نامشخص', username: 'ندارد', joinedAt: getPersianDateTime() };
            statsReport += `${idx + 1}. نام: **${uInfo.name}**\n` +
                           `   🆔 شناسه: \`${uId}\`\n` +
                           `   🔗 یوزرنیم: ${uInfo.username}\n` +
                           `   🕒 عضویت: ${uInfo.joinedAt || getPersianDateTime()}\n\n`;
        });

        if (statsReport.length > 4000) {
            bot.sendMessage(chatId, `📊 **آمار کلی ربات:**\n\n👥 کل کاربران: \`${uniqueUsersCount}\`\n📦 کل اشتراک‌ها: \`${db.allSubscriptionsHistory.length}\``, { parse_mode: 'Markdown' }).catch(() => {});
        } else {
            bot.sendMessage(chatId, statsReport, { parse_mode: 'Markdown' }).catch(() => {});
        }
        return;
    }

    if (data === 'admin_broadcast') {
        db.userStates[chatId] = { step: 'get_broadcast_content' };
        saveDatabase();
        bot.sendMessage(chatId, '📢 متن پیام همگانی را ارسال کنید:').catch(() => {});
        return;
    }

    if (data === 'wallet') {
        const balance = db.userWallets[userId] || 0;
        const walletKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ شارژ کیف پول', callback_data: 'wallet_deposit' }]
                ]
            }
        };
        const customWalletText = (db.botTexts.wallet_title || '')
            .replace('{balance}', balance.toLocaleString())
            .replace('{userId}', userId);

        bot.sendMessage(chatId, customWalletText, { parse_mode: 'Markdown', ...walletKeyboard }).catch(() => {});
        return;
    }

    if (data === 'wallet_deposit') {
        const depositAmountsKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "50,000 تومان", callback_data: 'user_dep_50000' },
                        { text: "100,000 تومان", callback_data: 'user_dep_100000' }
                    ],
                    [
                        { text: "200,000 تومان", callback_data: 'user_dep_200000' },
                        { text: "500,000 تومان", callback_data: 'user_dep_500000' }
                    ]
                ]
            }
        };

        delete db.userStates[chatId];
        saveDatabase();
        
        bot.sendMessage(chatId, '💳 **افزایش موجودی کیف پول**\n\nمبلغ مورد نظر خود را برای شارژ حساب انتخاب کنید: 👇', {
            parse_mode: 'Markdown',
            reply_markup: depositAmountsKeyboard.reply_markup
        }).catch(() => {});
        return;
    }

    if (data === 'buy_sub') {
        const availablePlans = db.customPlans.filter(p => p.links && p.links.length > 0);
        if (availablePlans.length === 0) {
            bot.sendMessage(chatId, db.botTexts.no_plans).catch(() => {});
            return;
        }

        let planText = db.botTexts.store_title;
        const planButtons = availablePlans.map(p => [
            { text: `🌐 ${p.name} - ${p.volume} | 💰 ${p.price}`, callback_data: `buy_custom_${p.id}` }
        ]);

        bot.sendMessage(chatId, planText, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: planButtons } }).catch(() => {});
        return;
    }

    if (data.startsWith('buy_custom_')) {
        const planId = parseInt(data.split('_')[2]);
        const selectedPlan = db.customPlans.find(p => p.id === planId);

        if (!selectedPlan || selectedPlan.links.length === 0) {
            bot.sendMessage(chatId, '❌ این پلن به اتمام رسیده است.').catch(() => {});
            return;
        }

        let priceNumber = parsePrice(selectedPlan.price);
        let discountInfoText = '';
        
        let agentDiscountPercent = 0;
        if (db.agents && db.agents[userId]) {
            agentDiscountPercent = db.agents[userId].discountPercent || 0;
        }

        if (agentDiscountPercent > 0) {
            const agentDiscountAmount = Math.min(priceNumber, Math.floor((priceNumber * agentDiscountPercent) / 100));
            priceNumber -= agentDiscountAmount;
            discountInfoText += `🤝 تخفیف نمایندگی (${agentDiscountPercent}%): -${agentDiscountAmount.toLocaleString()} تومان\n`;
        }

        if (db.appliedDiscounts && db.appliedDiscounts[userId]) {
            const disc = db.appliedDiscounts[userId];
            const discountAmount = Math.min(priceNumber, Math.floor((priceNumber * disc.percent) / 100));
            priceNumber -= discountAmount;
            discountInfoText += `🎟 تخفیف کد (${disc.percent}%): -${discountAmount.toLocaleString()} تومان\n`;
        }

        const userBalance = db.userWallets[userId] || 0;

        const inlineBtns = [];
        let paymentDesc = `📋 **فاکتور نهایی خرید اشتراک** ⚡️\n\n` +
                          `🏷 نام پلن: \`${selectedPlan.name}\`\n` +
                          `🌐 حجم ترافیک: \`${selectedPlan.volume}\`\n` +
                          `⏳ مدت زمان: \`${selectedPlan.duration}\`\n` +
                          discountInfoText +
                          `💵 **مبلغ قابل پرداخت: ${priceNumber.toLocaleString()} تومان**\n` +
                          `💰 موجودی کیف پول شما: \`${userBalance.toLocaleString()} تومان\`\n\n`;

        if (userBalance >= priceNumber) {
            paymentDesc += `✅ موجودی کیف پول شما کافی است.`;
            inlineBtns.push([{ text: `💳 پرداخت آنی از کیف پول (${priceNumber.toLocaleString()} ت)`, callback_data: `pay_wallet_${selectedPlan.id}` }]);
        } else {
            paymentDesc += `⚠️ موجودی کیف پول کافی نیست.`;
            inlineBtns.push([{ text: `➕ شارژ کیف پول`, callback_data: 'wallet_deposit' }]);
        }
        inlineBtns.push([{ text: `🎟 ثبت کد تخفیف`, callback_data: `enter_discount_${selectedPlan.id}` }]);
        inlineBtns.push([{ text: `💳 پرداخت کارت به کارت`, callback_data: `pay_card_${selectedPlan.id}` }]);

        bot.sendMessage(chatId, paymentDesc, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineBtns } }).catch(() => {});
        return;
    }

    if (data.startsWith('pay_wallet_')) {
        const planId = parseInt(data.split('_')[2]);
        const plan = db.customPlans.find(p => p.id === planId);

        if (!plan || plan.links.length === 0) {
            bot.sendMessage(chatId, '❌ پلن نامعتبر یا به اتمام رسیده است.').catch(() => {});
            return;
        }

        let priceNumber = parsePrice(plan.price);
        
        let agentDiscountPercent = 0;
        if (db.agents && db.agents[userId]) {
            agentDiscountPercent = db.agents[userId].discountPercent || 0;
        }
        if (agentDiscountPercent > 0) {
            const agentDiscountAmount = Math.min(priceNumber, Math.floor((priceNumber * agentDiscountPercent) / 100));
            priceNumber -= agentDiscountAmount;
        }

        if (db.appliedDiscounts && db.appliedDiscounts[userId]) {
            const disc = db.appliedDiscounts[userId];
            const discountAmount = Math.min(priceNumber, Math.floor((priceNumber * disc.percent) / 100));
            priceNumber -= discountAmount;
            delete db.appliedDiscounts[userId];
        }

        const userBalance = db.userWallets[userId] || 0;

        if (userBalance < priceNumber) {
            bot.sendMessage(chatId, '❌ موجودی کیف پول کافی نیست.').catch(() => {});
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
                                `⏰ **زمان:** ${currentDateStr}\n` +
                                `📦 **حجم:** ${parsedData.total !== 'نامشخص' ? parsedData.total : plan.volume}\n\n` +
                                `🔗 **لینک اشتراک:**\n\`${assignedLink}\``;
        
        const channelKeyboard = {
            reply_markup: {
                inline_keyboard: [[{ text: '👤 پروفایل کاربر در تلگرام', url: `tg://user?id=${userId}` }]]
            }
        };

        await bot.sendMessage(CHANNEL_LOG_ID, purchaseMessage, { parse_mode: 'Markdown', ...channelKeyboard }).catch(() => {});

        let userMsg = `🎉 **خرید با موفقیت انجام شد!** 🚀\n\n` +
                      `📦 پلن: \`${plan.name}\`\n` +
                      `🌐 حجم کل: \`${parsedData.total !== 'نامشخص' ? parsedData.total : plan.volume}\`\n` +
                      `⏳ انقضا: \`${subObj.expiryDate}\`\n` +
                      `💰 موجودی جدید کیف پول: \`${db.userWallets[userId].toLocaleString()} تومان\`\n\n` +
                      `🔗 **لینک اختصاصی اشتراک شما:**\n\`${assignedLink}\``;

        if (parsedData.extractedConfigs && parsedData.extractedConfigs.length > 0) {
            userMsg += `\n\n⚙️ **کانفیگ‌های مجزا:**\n\`\`\`\n${parsedData.extractedConfigs.join('\n\n')}\n\`\`\``;
        }

        bot.sendMessage(chatId, userMsg, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data.startsWith('pay_card_')) {
        const planId = parseInt(data.split('_')[2]);
        const plan = db.customPlans.find(p => p.id === planId);
        if (!plan) {
            bot.sendMessage(chatId, '❌ پلن نامعتبر است.').catch(() => {});
            return;
        }

        let priceNumber = parsePrice(plan.price);
        
        let agentDiscountPercent = 0;
        if (db.agents && db.agents[userId]) {
            agentDiscountPercent = db.agents[userId].discountPercent || 0;
        }
        if (agentDiscountPercent > 0) {
            const agentDiscountAmount = Math.min(priceNumber, Math.floor((priceNumber * agentDiscountPercent) / 100));
            priceNumber -= agentDiscountAmount;
        }

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
                         `لطفاً مبلغ را به شماره کارت زیر واریز کرده و **عکس رسید** را همینجا ارسال کنید:\n\`${db.paymentCardNumber}\``;
        
        bot.sendMessage(chatId, cardText, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }
});

bot.on('message', async (msg) => {
    loadDatabase();
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text ? msg.text.trim() : '';

    if (!isAdmin(msg) && db.blockedUsers && db.blockedUsers.includes(userId)) {
        return bot.sendMessage(chatId, '❌ شما توسط مدیریت مسدود شده‌اید و نمی‌توانید از ربات استفاده کنید.').catch(() => {});
    }

    trackUserAndNotifyAdmin(msg);
    const canProceed = await handleForceJoin(msg);
    if (!canProceed) return;

    if (text === '🚪 بستن کیبورد ربات') {
        delete db.userStates[chatId];
        saveDatabase();
        await bot.sendMessage(chatId, '👋 کیبورد ربات بسته شد. برای بازگشت مجدد دستور /start را ارسال کنید.', {
            reply_markup: {
                remove_keyboard: true
            }
        }).catch(() => {});
        return;
    }

    const currentMenuNames = db.menuNames;
    
    if (text === `🎁 ${currentMenuNames.free_sub}`) {
        if (!db.isFreeSubEnabled) {
            return bot.sendMessage(chatId, '❌ بخش اشتراک هدیه در حال حاضر غیرفعال است.').catch(() => {});
        }
        if (!db.freeSubConfig || db.freeSubConfig === 'vless://example-free-sub-link') {
            return bot.sendMessage(chatId, '⚠️ لینک اشتراک هدیه توسط مدیریت تنظیم نشده است.').catch(() => {});
        }

        if (!db.userWallets) db.userWallets = {};
        if (db.userWallets[`free_claimed_${userId}`]) {
            return bot.sendMessage(chatId, '⚠️ شما قبلاً اشتراک هدیه خود را دریافت کرده‌اید! هر کاربر تنها یک بار می‌تواند اشتراک هدیه بگیرد. 🎁').catch(() => {});
        }

        db.userWallets[`free_claimed_${userId}`] = true;
        saveDatabase();

        const freeMsg = `🎁 **اشتراک هدیه و رایگان شما آماده است!** 🚀\n\n` +
                        `لینک اختصاصی شما:\n\`${db.freeSubConfig}\``;
        await bot.sendMessage(chatId, freeMsg, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (text === `🧪 ${currentMenuNames.test_server}`) {
        if (!db.isTestServerEnabled) {
            return bot.sendMessage(chatId, '❌ بخش سرور تست در حال حاضر غیرفعال است.').catch(() => {});
        }
        if (!db.testServerConfig || db.testServerConfig === 'vless://example-test-server-link') {
            return bot.sendMessage(chatId, '⚠️ لینک سرور تست توسط مدیریت تنظیم نشده است.').catch(() => {});
        }

        const testMsg = `🧪 **اطلاعات اتصال به سرور تست آرنا:** ⚡️\n\n` +
                        `می‌توانید از کانفیگ زیر برای تست کیفیت و پینگ سرورها استفاده کنید:\n\n` +
                        `\`${db.testServerConfig}\``;
        await bot.sendMessage(chatId, testMsg, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (text === `👥 ${currentMenuNames.invite}`) {
        if (!db.isInviteSystemEnabled) {
            return bot.sendMessage(chatId, '❌ سیستم دعوت از دوستان در حال حاضر غیرفعال است.').catch(() => {});
        }

        const botInfo = await bot.getMe();
        const botUsername = botInfo.username;
        const inviteLink = `https://t.me/${botUsername}?start=${userId}`;
        const refCount = db.referals && db.referals[userId] ? db.referals[userId] : 0;

        let inviteText = (db.botTexts.invite_title || '')
            .replace('{inviteLink}', inviteLink)
            .replace('{count}', refCount);

        await bot.sendMessage(chatId, inviteText, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (text === `📞 ${currentMenuNames.support}`) {
        db.userStates[chatId] = { step: 'support_waiting_message' };
        saveDatabase();
        await bot.sendMessage(chatId, db.botTexts.support_prompt, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (text === `🤝 ${currentMenuNames.agency_request}`) {
        db.userStates[chatId] = { step: 'agency_waiting_message' };
        saveDatabase();
        await bot.sendMessage(chatId, db.botTexts.agency_prompt, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (isAdmin(msg) && msg.reply_to_message) {
        const repliedText = msg.reply_to_message.text || msg.reply_to_message.caption || '';
        const matchUserId = repliedText.match(/شناسه عددی:\s*`?(\d+)`?/);
        
        if (matchUserId && matchUserId[1]) {
            const targetCustomerId = matchUserId[1];
            try {
                await bot.sendMessage(targetCustomerId, `💬 **پاسخ پشتیبانی:**\n\n${text}`);
                await bot.sendMessage(chatId, '✅ پاسخ با موفقیت ارسال شد.');
            } catch (e) {
                await bot.sendMessage(chatId, '❌ خطا در ارسال پیام به کاربر (ممکن است ربات را بلاک کرده باشد).').catch(() => {});
            }
            return;
        }
    }

    const userState = db.userStates[chatId];

    if (msg.photo && userState && userState.step) {
        const step = userState.step;
        const photo = msg.photo[msg.photo.length - 1];
        const fileId = photo.file_id;

        if (step === 'get_wallet_deposit_receipt') {
            const amount = userState.depositAmount;
            delete db.userStates[chatId];
            saveDatabase();

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
            saveDatabase();

            bot.sendMessage(chatId, '✅ رسید شارژ کیف پول با موفقیت برای مدیریت ارسال شد.\nبه‌زودی پس از بررسی، حساب شما شارژ خواهد شد. 🙏✨').catch(() => {});

            const adminReceiptCaption = `🧾 **رسید جدید شارژ کیف پول**\n\n` +
                                       `👤 کاربر: ${msg.from.first_name || 'بدون نام'} (\`${userId}\`)\n` +
                                       `💵 مبلغ: \`${amount.toLocaleString()} تومان\``;

            const adminReceiptKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ تایید شارژ', callback_data: `approve_deposit_${userId}` },
                            { text: '❌ رد رسید', callback_data: `reject_deposit_${userId}` }
                        ],
                        [{ text: '👤 پروفایل کاربر در تلگرام', url: `tg://user?id=${userId}` }]
                    ]
                }
            };

            bot.sendPhoto(ADMIN_CHAT_ID, fileId, { caption: adminReceiptCaption, parse_mode: 'Markdown', ...adminReceiptKeyboard }).catch(() => {});
            bot.sendPhoto(CHANNEL_LOG_ID, fileId, { caption: adminReceiptCaption, parse_mode: 'Markdown', reply_markup: adminReceiptKeyboard.reply_markup }).catch(() => {});
            return;
        }

        if (step === 'get_card_purchase_receipt') {
            const planId = userState.planId;
            const amountToPay = userState.amountToPay;
            delete db.userStates[chatId];
            saveDatabase();

            const cardKey = `card_pur_${userId}`;
            db.pending_card_purchases[cardKey] = { planId };

            const plan = db.customPlans.find(p => p.id === planId);
            const planName = plan ? plan.name : 'پلن خرید';

            db.receiptsHistory.push({
                type: 'خرید کارت به کارت',
                userId: userId,
                userName: msg.from.first_name || 'کاربر',
                details: `${planName} (${amountToPay.toLocaleString()} تومان)`,
                status: 'در انتظار تایید',
                date: getPersianDateTime()
            });
            saveDatabase();

            bot.sendMessage(chatId, '✅ رسید پرداخت کارت به کارت شما ارسال شد.\nپس از بررسی، لینک اشتراک برای شما ارسال خواهد شد. 🚀').catch(() => {});

            const adminCardCaption = `🧾 **رسید جدید خرید کارت به کارت**\n\n` +
                                     `👤 کاربر: ${msg.from.first_name || 'بدون نام'} (\`${userId}\`)\n` +
                                     `📦 پلن: \`${planName}\`\n` +
                                     `💵 مبلغ: \`${amountToPay.toLocaleString()} تومان\``;

            const adminCardKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ تایید و ارسال لینک', callback_data: `approve_card_${userId}_${planId}` },
                            { text: '❌ رد رسید', callback_data: `reject_card_${userId}` }
                        ],
                        [{ text: '👤 پروفایل کاربر در تلگرام', url: `tg://user?id=${userId}` }]
                    ]
                }
            };

            bot.sendPhoto(ADMIN_CHAT_ID, fileId, { caption: adminCardCaption, parse_mode: 'Markdown', ...adminCardKeyboard }).catch(() => {});
            bot.sendPhoto(CHANNEL_LOG_ID, fileId, { caption: adminCardCaption, parse_mode: 'Markdown', reply_markup: adminCardKeyboard.reply_markup }).catch(() => {});
            return;
        }
    }

    if (!text) return;

    if (userState && userState.step) {
        const step = userState.step;

        if (step === 'support_waiting_message') {
            delete db.userStates[chatId];
            saveDatabase();

            bot.sendMessage(chatId, db.botTexts.support_success, { parse_mode: 'Markdown', ...getPersistentMenuKeyboard() }).catch(() => {});

            const userInfo = db.usersDetailMap[userId] || { name: 'بدون نام', username: 'ندارد' };
            const cleanUsername = (userInfo.username || 'ندارد').replace('@', '');

            const supportMsgToAdmin = `📞 **پیام جدید به بخش پشتیبانی**\n\n` +
                                      `👤 **نام کاربر:** ${userInfo.name}\n` +
                                      `🔗 **یوزرنیم:** @${cleanUsername}\n` +
                                      `🆔 **شناسه عددی:** \`${userId}\`\n` +
                                      `🕒 **زمان:** ${getPersianDateTime()}\n\n` +
                                      `💬 **متن پیام:**\n${text}`;

            const adminSupportKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '👤 پروفایل کاربر در تلگرام', url: `tg://user?id=${userId}` }],
                        [{ text: '🔒 بستن تیکت', callback_data: `close_ticket_${userId}` }]
                    ]
                }
            };

            bot.sendMessage(ADMIN_CHAT_ID, supportMsgToAdmin, { parse_mode: 'Markdown', ...adminSupportKeyboard }).catch((err) => {
                console.log('❌ خطا در ارسال پیام پشتیبانی به ادمین:', err);
            });
            return;
        }

        if (step === 'agency_waiting_message') {
            delete db.userStates[chatId];
            saveDatabase();

            bot.sendMessage(chatId, db.botTexts.agency_success, { parse_mode: 'Markdown', ...getPersistentMenuKeyboard() }).catch(() => {});

            const userInfo = db.usersDetailMap[userId] || { name: 'بدون نام', username: 'ندارد' };
            const cleanUsername = (userInfo.username || 'ندارد').replace('@', '');

            const agencyMsgToAdmin = `🤝 **درخواست جدید اخذ نمایندگی**\n\n` +
                                     `👤 **نام کاربر:** ${userInfo.name}\n` +
                                     `🔗 **یوزرنیم:** @${cleanUsername}\n` +
                                     `🆔 **شناسه عددی:** \`${userId}\`\n` +
                                     `🕒 **زمان:** ${getPersianDateTime()}\n\n` +
                                     `📄 **متن درخواست / رزومه:**\n${text}`;

            const adminAgencyKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '👤 پروفایل کاربر در تلگرام', url: `tg://user?id=${userId}` }]
                    ]
                }
            };

            bot.sendMessage(ADMIN_CHAT_ID, agencyMsgToAdmin, { parse_mode: 'Markdown', ...adminAgencyKeyboard }).catch((err) => {
                console.log('❌ خطا در ارسال درخواست نمایندگی به ادمین:', err);
            });
            return;
        }

        if (step === 'get_new_invite_reward') {
            if (!isAdmin(msg)) return;
            const newReward = parseInt(text.replace(/[^0-9]/g, ''), 10);
            if (isNaN(newReward) || newReward < 0) {
                return bot.sendMessage(chatId, '❌ مبلغ نامعتبر است. یک عدد صحیح وارد کنید:').catch(() => {});
            }
            db.inviteRewardAmount = newReward;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ پاداش دعوت با موفقیت به **${newReward.toLocaleString()} تومان** تغییر یافت. 🎉`, { parse_mode: 'Markdown' }).catch(() => {});
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'admin_waiting_for_agent_identifier') {
            if (!isAdmin(msg)) return;
            let targetId = text.replace('@', '').trim();
            let foundUserId = null;

            if (/^\d+$/.test(targetId)) {
                foundUserId = targetId;
            } else {
                for (const uId of db.allUsers) {
                    const info = db.usersDetailMap[uId];
                    if (info && info.username && info.username.replace('@', '').toLowerCase() === targetId.toLowerCase()) {
                        foundUserId = uId;
                        break;
                    }
                }
            }

            if (!foundUserId) {
                return bot.sendMessage(chatId, '❌ کاربری با این مشخصات یافت نشد. لطفاً شناسه یا یوزرنیم معتبر وارد کنید:').catch(() => {});
            }

            db.userStates[chatId] = { step: 'admin_waiting_for_agent_percent', agentId: foundUserId };
            saveDatabase();
            bot.sendMessage(chatId, `🤝 کاربر انتخاب شد (\`${foundUserId}\`).\n\nحالا **درصد تخفیف** این نماینده را وارد کنید (فقط عدد، مثلاً 15):`, { parse_mode: 'Markdown' }).catch(() => {});
            return;
        }

        if (step === 'admin_waiting_for_agent_percent') {
            if (!isAdmin(msg)) return;
            const percent = parseInt(text, 10);
            if (isNaN(percent) || percent <= 0 || percent > 100) {
                return bot.sendMessage(chatId, '❌ درصد نامعتبر است. عددی بین 1 تا 100 وارد کنید:').catch(() => {});
            }

            const agentId = userState.agentId;
            if (!db.agents) db.agents = {};
            db.agents[agentId] = { discountPercent: percent };
            delete db.userStates[chatId];
            saveDatabase();

            bot.sendMessage(chatId, `✅ نماینده با موفقیت ثبت شد!\n\n🆔 شناسه کاربر: \`${agentId}\`\n🎁 درصد تخفیف مستقیم: **${percent}%**`, { parse_mode: 'Markdown' }).catch(() => {});
            try {
                bot.sendMessage(agentId, `🎉 **تبریک! شما به عنوان نماینده رسمی ما انتخاب شدید.**\n\n✨ از این پس هر زمان از ربات خرید کنید، تخفیف **${percent}%** به صورت خودکار روی فاکتور شما اعمال خواهد شد. 🚀`, { parse_mode: 'Markdown' });
            } catch (e) {}
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'admin_waiting_for_block_identifier') {
            if (!isAdmin(msg)) return;
            let targetId = text.replace('@', '').trim();
            let foundUserId = null;

            if (/^\d+$/.test(targetId)) {
                foundUserId = targetId;
            } else {
                for (const uId of db.allUsers) {
                    const info = db.usersDetailMap[uId];
                    if (info && info.username && info.username.replace('@', '').toLowerCase() === targetId.toLowerCase()) {
                        foundUserId = uId;
                        break;
                    }
                }
            }

            if (!foundUserId) {
                return bot.sendMessage(chatId, '❌ کاربری با این مشخصات یافت نشد. لطفاً شناسه یا یوزرنیم معتبر وارد کنید:').catch(() => {});
            }

            if (!db.blockedUsers) db.blockedUsers = [];
            if (!db.blockedUsers.includes(foundUserId)) {
                db.blockedUsers.push(foundUserId);
            }
            delete db.userStates[chatId];
            saveDatabase();

            bot.sendMessage(chatId, `🚫 کاربر مورد نظر (\`${foundUserId}\`) با موفقیت مسدود شد.`).catch(() => {});
            try {
                bot.sendMessage(foundUserId, '❌ **حساب شما توسط مدیریت مسدود گردید.**');
            } catch (e) {}
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'admin_waiting_for_user_identifier') {
            if (!isAdmin(msg)) return;
            let targetId = text.replace('@', '').trim();
            let foundUserId = null;

            if (/^\d+$/.test(targetId)) {
                foundUserId = targetId;
            } else {
                for (const uId of db.allUsers) {
                    const info = db.usersDetailMap[uId];
                    if (info && info.username && info.username.replace('@', '').toLowerCase() === targetId.toLowerCase()) {
                        foundUserId = uId;
                        break;
                    }
                }
            }

            if (!foundUserId) {
                return bot.sendMessage(chatId, '❌ کاربری با این مشخصات یافت نشد. لطفاً شناسه یا یوزرنیم معتبر وارد کنید:').catch(() => {});
            }

            delete db.userStates[chatId];
            saveDatabase();
            
            const userInfo = db.usersDetailMap[foundUserId] || { name: 'نامشخص' };
            bot.sendMessage(chatId, `✅ کاربر پیدا شد: ${userInfo.name} (\`${foundUserId}\`)\n\nحالا **لینک کانفیگ یا سابسکریپشن** را ارسال کنید:`, { parse_mode: 'Markdown' }).catch(() => {});
            db.userStates[chatId] = { step: 'admin_manual_add_sub_link', targetUserId: foundUserId };
            saveDatabase();
            return;
        }

        if (step === 'admin_manual_add_sub_link') {
            if (!isAdmin(msg)) return;
            const targetUserId = userState.targetUserId;
            const configLink = text;

            const parsedData = await fetchAndParseConfig(configLink);
            const currentDateStr = getPersianDateTime();
            const userInfo = db.usersDetailMap[targetUserId] || { name: 'کاربر', username: 'ندارد' };

            const subObj = {
                userId: targetUserId,
                userName: userInfo.name,
                planName: 'اشتراک دستی ادمین 👑',
                expiryDate: parsedData.expireDate !== 'نامشخص' ? parsedData.expireDate : '30 روزه',
                volume: parsedData.total !== 'نامشخص' ? parsedData.total : 'نامشخص',
                totalVolume: parsedData.total,
                upload: parsedData.upload,
                download: parsedData.download,
                configLink: configLink,
                extractedConfigs: parsedData.extractedConfigs,
                purchaseDate: currentDateStr
            };

            if (!db.userSubscriptions[targetUserId]) {
                db.userSubscriptions[targetUserId] = [];
            }
            db.userSubscriptions[targetUserId].push(subObj);
            db.allSubscriptionsHistory.push(subObj);

            logPurchaseToFile(subObj);
            delete db.userStates[chatId];
            saveDatabase();

            bot.sendMessage(chatId, `✅ اشتراک با موفقیت برای کاربر \`${targetUserId}\` ثبت شد.`).catch(() => {});
            
            let userNotify = `🎉 **یک اشتراک جدید از طرف مدیریت به شما اختصاص یافت!** 🚀\n\n` +
                             `🔗 **لینک اشتراک:**\n\`${configLink}\``;
            if (parsedData.extractedConfigs && parsedData.extractedConfigs.length > 0) {
                userNotify += `\n\n⚙️ **کانفیگ‌های مجزا:**\n\`\`\`\n${parsedData.extractedConfigs.join('\n\n')}\n\`\`\``;
            }
            bot.sendMessage(targetUserId, userNotify, { parse_mode: 'Markdown' }).catch(() => {});
            return;
        }

        if (step === 'get_new_menu_name') {
            if (!isAdmin(msg)) return;
            const key = userState.targetKey;
            db.menuNames[key] = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ نام دکمه با موفقیت تغییر یافت.`).catch(() => {});
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_new_bot_text') {
            if (!isAdmin(msg)) return;
            const key = userState.targetTextKey;
            db.botTexts[key] = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ متن مورد نظر بروز شد.`).catch(() => {});
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_new_channel_username') {
            if (!isAdmin(msg)) return;
            db.CHANNEL_USERNAME = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ آیدی کانال به \`${text}\` تغییر یافت.`).catch(() => {});
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_new_test_link') {
            if (!isAdmin(msg)) return;
            db.testServerConfig = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ لینک سرور تست آپدیت شد.`).catch(() => {});
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_new_free_link') {
            if (!isAdmin(msg)) return;
            db.freeSubConfig = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ لینک اشتراک هدیه آپدیت شد.`).catch(() => {});
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_new_card_number') {
            if (!isAdmin(msg)) return;
            db.paymentCardNumber = text;
            delete db.userStates[chatId];
            saveDatabase();
            bot.sendMessage(chatId, `✅ شماره کارت با موفقیت تغییر یافت.`).catch(() => {});
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_broadcast_content') {
            if (!isAdmin(msg)) return;
            delete db.userStates[chatId];
            saveDatabase();

            const allUsers = [...new Set(db.allUsers)];
            bot.sendMessage(chatId, `📢 ارسال پیام همگانی به ${allUsers.length} کاربر آغاز شد...`).catch(() => {});

            let successCount = 0;
            let failCount = 0;

            for (const uId of allUsers) {
                try {
                    await bot.sendMessage(uId, text, { parse_mode: 'Markdown' });
                    successCount++;
                    await sleep(50); 
                } catch (e) {
                    failCount++;
                }
            }

            bot.sendMessage(chatId, `✅ **ارسال پیام همگانی به پایان رسید.**\n\n📤 موفق: \`${successCount}\` نفر\n❌ ناموفق: \`${failCount}\` نفر`, { parse_mode: 'Markdown' }).catch(() => {});
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'wallet_manager_waiting_for_amount') {
            if (!isAdmin(msg)) return;
            const amount = parseInt(text.replace(/[^0-9]/g, ''), 10);
            if (isNaN(amount) || amount <= 0) {
                return bot.sendMessage(chatId, '❌ مبلغ نامعتبر است. یک عدد صحیح وارد کنید:').catch(() => {});
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

            const actionText = action === 'inc' ? 'افزایش یافت' : 'کاهش یافت';
            bot.sendMessage(chatId, `✅ عملیات موفق:\nمبلغ ${amount.toLocaleString()} تومان به حساب کاربر \`${targetUser}\` ${actionText}.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`, { parse_mode: 'Markdown' }).catch(() => {});
            
            try {
                const notifyText = action === 'inc' 
                    ? `🎉 حساب شما توسط مدیریت به مبلغ ${amount.toLocaleString()} تومان شارژ شد.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`
                    : `⚠️ مبلغ ${amount.toLocaleString()} تومان توسط مدیریت از حساب شما کسر گردید.\n💰 موجودی جدید: ${db.userWallets[targetUser].toLocaleString()} تومان`;
                await bot.sendMessage(targetUser, notifyText);
            } catch (e) {}
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_new_discount_code') {
            if (!isAdmin(msg)) return;
            const code = text.toUpperCase();
            db.userStates[chatId] = { step: 'get_new_discount_percent', codeToCreate: code };
            saveDatabase();
            bot.sendMessage(chatId, `🎟 لطفاً **درصد تخفیف** را برای کد \`${code}\` وارد کنید (فقط عدد، مثلاً 20):`, { parse_mode: 'Markdown' }).catch(() => {});
            return;
        }

        if (step === 'get_new_discount_percent') {
            if (!isAdmin(msg)) return;
            const percent = parseInt(text, 10);
            if (isNaN(percent) || percent <= 0 || percent > 100) {
                return bot.sendMessage(chatId, '❌ درصد نامعتبر است. عددی بین 1 تا 100 وارد کنید:').catch(() => {});
            }

            const code = userState.codeToCreate;
            if (!db.discountCodes) db.discountCodes = {};
            db.discountCodes[code] = { percent };
            delete db.userStates[chatId];
            saveDatabase();

            bot.sendMessage(chatId, `✅ کد تخفیف \`${code}\` با **${percent}%** تخفیف ساخته شد! 🎉`, { parse_mode: 'Markdown' }).catch(() => {});
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_user_discount_input') {
            const planId = userState.planId;
            const code = text.toUpperCase();

            if (db.discountCodes && db.discountCodes[code]) {
                const disc = db.discountCodes[code];
                if (!db.appliedDiscounts) db.appliedDiscounts = {};
                db.appliedDiscounts[userId] = disc;
                delete db.userStates[chatId];
                saveDatabase();

                bot.sendMessage(chatId, `✅ کد تخفیف \`${code}\` (${disc.percent}٪) با موفقیت روی فاکتور شما اعمال شد! 🎉`).catch(() => {});
            } else {
                delete db.userStates[chatId];
                saveDatabase();
                bot.sendMessage(chatId, '❌ کد تخفیف وارد شده معتبر یا منقضی شده است.').catch(() => {});
            }
            return;
        }

        if (step === 'get_new_plan_name') {
            if (!isAdmin(msg)) return;
            const planName = text;
            const newId = db.customPlans.length > 0 ? Math.max(...db.customPlans.map(p => p.id)) + 1 : 1;
            db.userStates[chatId] = { step: 'get_new_plan_volume', newPlan: { id: newId, name: planName, links: [] } };
            saveDatabase();
            bot.sendMessage(chatId, '🌐 حجم ترافیک پلن را وارد کنید (مثلاً `20 گیگابایت` یا `نامحدود`):', { parse_mode: 'Markdown' }).catch(() => {});
            return;
        }

        if (step === 'get_new_plan_volume') {
            if (!isAdmin(msg)) return;
            userState.newPlan.volume = text;
            db.userStates[chatId] = { step: 'get_new_plan_duration', newPlan: userState.newPlan };
            saveDatabase();
            bot.sendMessage(chatId, '⏳ مدت زمان اعتبار پلن را وارد کنید (مثلاً `30 روزه`):', { parse_mode: 'Markdown' }).catch(() => {});
            return;
        }

        if (step === 'get_new_plan_duration') {
            if (!isAdmin(msg)) return;
            userState.newPlan.duration = text;
            db.userStates[chatId] = { step: 'get_new_plan_price', newPlan: userState.newPlan };
            saveDatabase();
            bot.sendMessage(chatId, '💵 قیمت پلن را وارد کنید (مثلاً `150,000 تومان`):', { parse_mode: 'Markdown' }).catch(() => {});
            return;
        }

        if (step === 'get_new_plan_price') {
            if (!isAdmin(msg)) return;
            userState.newPlan.price = text;
            db.userStates[chatId] = { step: 'get_new_plan_links', newPlan: userState.newPlan };
            saveDatabase();
            bot.sendMessage(chatId, '🔗 لطفاً حداقل یک لینک سابسکریپشن یا کانفیگ برای این پلن ارسال کنید:', { parse_mode: 'Markdown' }).catch(() => {});
            return;
        }

        if (step === 'get_new_plan_links') {
            if (!isAdmin(msg)) return;
            const link = text;
            userState.newPlan.links.push(link);
            db.customPlans.push(userState.newPlan);
            delete db.userStates[chatId];
            saveDatabase();

            bot.sendMessage(chatId, `✅ پلن جدید با نام **${userState.newPlan.name}** با موفقیت ساخته شد و به فروشگاه اضافه گردید! 🚀`, { parse_mode: 'Markdown' }).catch(() => {});
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'edit_plan_get_name') {
            if (!isAdmin(msg)) return;
            const planId = userState.targetPlanId;
            const plan = db.customPlans.find(p => p.id === planId);
            if (plan) {
                plan.name = text;
                saveDatabase();
                bot.sendMessage(chatId, '✅ نام پلن با موفقیت ویرایش شد.').catch(() => {});
            }
            delete db.userStates[chatId];
            sendAdminPanel(chatId);
            return;
        }

        if (step === 'get_extra_link_for_plan') {
            if (!isAdmin(msg)) return;
            const planId = userState.targetPlanId;
            const plan = db.customPlans.find(p => p.id === planId);
            if (plan) {
                if (!plan.links) plan.links = [];
                plan.links.push(text);
                saveDatabase();
                bot.sendMessage(chatId, `✅ لینک جدید با موفقیت به انبار پلن «${plan.name}» اضافه شد.\n📊 مجموع لینک‌های موجود: ${plan.links.length} عدد`).catch(() => {});
            }
            delete db.userStates[chatId];
            sendAdminPanel(chatId);
            return;
        }
    }
});
