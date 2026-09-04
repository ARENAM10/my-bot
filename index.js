const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');

// --- 🛡️ مدیریت خطاهای گلوبال برای جلوگیری از کرش کردن ربات ---
process.on('uncaughtException', (err) => {
    console.error('❌ خطای هندل‌نشده (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ پرامیس رد شده هندل‌نشده (Unhandled Rejection):', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

// توکن ربات شما
const TOKEN = '8850301156:AAH1MryTDXakGuKYsAxTlmVO2h_lSw9lnoM';

const bot = new TelegramBot(TOKEN, { 
    polling: {
        autoStart: true,
        params: {
            timeout: 10
        }
    } 
});

const ADMIN_USERNAME = 'arenam_10';
const ADMIN_CHAT_ID = 8923324852;
const CHANNEL_LOG_ID = '-1004488082323';

// سیستم قفل محلی برای جلوگیری از درخواست‌های تکراری
const userLockMap = new Map();
const LOCK_TIMEOUT = 1200;

function acquireLock(userId) {
    const now = Date.now();
    if (userLockMap.has(userId)) {
        const lastTime = userLockMap.get(userId);
        if (now - lastTime < LOCK_TIMEOUT) {
            return false;
        }
    }
    userLockMap.set(userId, now);
    return true;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getPersianDateTime() {
    try {
        const now = new Date();
        const optionsDate = { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' };
        const optionsTime = { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const dateStr = new Intl.DateTimeFormat('fa-IR-u-ca-persian', optionsDate).format(now);
        const timeStr = new Intl.DateTimeFormat('fa-IR', optionsTime).format(now);
        return `${dateStr} - ${timeStr}`;
    } catch (e) {
        return new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });
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

const defaultDatabaseStructure = {
    coinRewardPerInvite: 1, // سکه به ازای هر دعوت
    userCoins: {},          // موجودی سکه کاربران
    userStates: {},
    menuNames: {
        get_members: '➕ سفارش ممبر 👥',
        free_coins: '🎁 سکه رایگان (دعوت)',
        account: '👤 حساب کاربری و سکه‌ها',
        transfer_coins: '💸 انتقال سکه',
        support: '💬 پشتیبانی'
    },
    botTexts: {
        start_message: '✨🎛 **به ربات بزرگ ممبرگیر و افزایش بازدید خوش آمدید!** 🚀\n\nبا دعوت از دوستان خود سکه رایگان کسب کنید و برای کانال یا گروه خود ممبر واقعی بگیرید. 👇',
        support_text: '💬 **بخش پشتیبانی و ارتباط با مدیریت**\n\nلطفاً برای ارتباط با پشتیبانی روی دکمه زیر کلیک کنید:'
    },
    allUsers: [],
    blockedUsers: [],
    usersDetailMap: {},
    referals: {},
    memberOrders: [] // سفارشات ثبت شده ممبر
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
                userCoins: parsed.userCoins || {},
                allUsers: parsed.allUsers || [],
                blockedUsers: parsed.blockedUsers || [],
                usersDetailMap: parsed.usersDetailMap || {},
                referals: parsed.referals || {},
                memberOrders: parsed.memberOrders || []
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

loadDatabase();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Member-Getter Bot is running smoothly!');
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
                `🚀 **کاربر جدیدی وارد ربات ممبرگیر شد!** 🤖\n\n` +
                `👤 **نام:** ${name}\n` +
                `🔗 **یوزرنیم:** ${username}\n` +
                `🆔 **آیدی عددی:** \`${userId}\`\n` +
                `🕒 **زمان:** ${currentPersianTime}`, 
                { parse_mode: 'Markdown', ...keyboard }
            ).catch(() => {});
        }
    }
}

function getPersistentMenuKeyboard() {
    const names = db.menuNames;
    return {
        reply_markup: {
            keyboard: [
                [{ text: names.get_members }, { text: names.free_coins }],
                [{ text: names.account }, { text: names.transfer_coins }],
                [{ text: names.support }, { text: '🚪 بستن ربات و خروج' }]
            ],
            resize_keyboard: true,
            is_persistent: true
        }
    };
}

async function sendMainMenu(chatId) {
    await bot.sendMessage(chatId, db.botTexts.start_message, { parse_mode: 'Markdown', ...getPersistentMenuKeyboard() }).catch(() => {});
}

bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const userIdStr = msg.from.id.toString();
    if (!acquireLock(userIdStr)) return;

    loadDatabase(); 
    const chatId = msg.chat.id;

    if (!isAdmin(msg) && db.blockedUsers && db.blockedUsers.includes(userIdStr)) {
        return bot.sendMessage(chatId, '❌ شما توسط مدیریت مسدود شده‌اید.').catch(() => {});
    }

    delete db.userStates[chatId];
    saveDatabase();
    trackUserAndNotifyAdmin(msg);

    const payload = match ? match[1] : null; 
    const reward = db.coinRewardPerInvite || 1;

    if (payload && payload !== chatId.toString()) {
        const refId = payload;
        if (!db.userCoins[`referred_${chatId}`]) {
            db.userCoins[`referred_${chatId}`] = true; 
            db.userCoins[refId] = (db.userCoins[refId] || 0) + reward;
            db.referals[refId] = (db.referals[refId] || 0) + 1;
            saveDatabase();

            bot.sendMessage(refId, `🎉 **تبریک!**\nیک کاربر جدید با لینک شما وارد ربات شد.\n\n💰 مقدار \`${reward} سکه\` به حساب شما اضافه شد! 🚀`, { parse_mode: 'Markdown' })
                .catch(() => {});
        }
    }

    if (isAdmin(msg)) {
        const adminKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: '💻 پنل مدیریت ممبرگیر' }],
                    [{ text: '🚪 بستن ربات و خروج' }]
                ],
                resize_keyboard: true,
                is_persistent: true
            }
        };
        bot.sendMessage(chatId, '👑 **پنل مدیریت ربات ممبرگیر برای شما فعال شد.**', adminKeyboard).catch(() => {});
        return;
    }

    sendMainMenu(chatId);
});

bot.onText(/💻 پنل مدیریت ممبرگیر|\/panel/, async (msg) => {
    const userIdStr = msg.from.id.toString();
    if (!acquireLock(userIdStr)) return;

    loadDatabase();
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    sendAdminPanel(chatId);
});

function sendAdminPanel(chatId) {
    const uniqueUsersCount = [...new Set(db.allUsers)].length;
    const adminKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: `📊 آمار کلی ربات (${uniqueUsersCount} کاربر)`, callback_data: 'admin_stats' }],
                [{ text: `🎁 تنظیم سکه هدیه دعوت (${db.coinRewardPerInvite} سکه)`, callback_data: 'admin_set_reward' }],
                [{ text: '📦 بررسی سفارشات ممبر', callback_data: 'admin_check_orders' }],
                [{ text: '📢 ارسال پیام همگانی', callback_data: 'admin_broadcast' }]
            ]
        }
    };

    bot.sendMessage(chatId, '⚙️ **پنل مدیریت ربات ممبرگیر**\nلطفاً گزینه مورد نظر را انتخاب کنید:', {
        parse_mode: 'Markdown',
        ...adminKeyboard
    }).catch(() => {});
}

bot.on('callback_query', async (callbackQuery) => {
    const userId = callbackQuery.from.id.toString();
    if (!acquireLock(userId)) return;

    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    try { await bot.answerCallbackQuery(callbackQuery.id); } catch (e) {}

    loadDatabase(); 
    const msg = callbackQuery.message;
    const names = db.menuNames;

    if (data === 'admin_set_reward') {
        if (!isAdmin(callbackQuery)) return;
        db.userStates[chatId] = { step: 'get_new_coin_reward' };
        saveDatabase();
        bot.sendMessage(chatId, `🎁 تعداد سکه هدیه فعلی به ازای هر دعوت: \`${db.coinRewardPerInvite}\`\nمقدار جدید را به عدد بفرستید:`).catch(() => {});
        return;
    }

    if (data === 'admin_check_orders') {
        if (!isAdmin(callbackQuery)) return;
        if (db.memberOrders.length === 0) {
            return bot.sendMessage(chatId, '❌ هیچ سفارشی ثبت نشده است.');
        }
        let txt = '📦 **لیست سفارشات ممبر:**\n\n';
        db.memberOrders.forEach((o, idx) => {
            txt += `${idx + 1}. کاربر: \`${o.userId}\` | لینک: ${o.link} | وضعیت: ${o.status}\n`;
        });
        bot.sendMessage(chatId, txt, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }

    if (data === 'admin_stats') {
        if (!isAdmin(callbackQuery)) return;
        const count = [...new Set(db.allUsers)].length;
        bot.sendMessage(chatId, `📊 آمار ربات:\nکل کاربران: ${count} نفر\nتعداد کل سفارشات: ${db.memberOrders.length}`).catch(() => {});
        return;
    }

    if (data === 'admin_broadcast') {
        db.userStates[chatId] = { step: 'get_broadcast_content' };
        saveDatabase();
        bot.sendMessage(chatId, '📢 متن پیام همگانی را ارسال کنید:').catch(() => {});
        return;
    }

    if (data === 'order_members') {
        db.userStates[chatId] = { step: 'get_order_link' };
        saveDatabase();
        bot.sendMessage(chatId, '➕ **ثبت سفارش ممبر**\n\nلطفاً لینک کانگ یا گروه خود را ارسال کنید (مثلا لینک عمومی یا جوین):').catch(() => {});
        return;
    }

    if (data === 'free_coins') {
        const botInfo = await bot.getMe();
        const inviteLink = `https://t.me/${botInfo.username}?start=${chatId}`;
        const refCount = db.referals[chatId] || 0;
        const text = `👥 **بخش دریافت سکه رایگان**\n\nلینک زیر را برای دوستان خود بفرستید و به ازای هر ورود، \`${db.coinRewardPerInvite} سکه\` جایزه بگیرید:\n\`${inviteLink}\`\n\n✨ تعداد دعوت‌های شما: **${refCount} نفر**`;
        bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(() => {});
        return;
    }
});

bot.on('message', async (msg) => {
    if (!msg.text) return;
    const userIdStr = msg.from.id.toString();
    if (!acquireLock(userIdStr)) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text.trim();

    if (text.startsWith('/start') || text === '💻 پنل مدیریت ممبرگیر' || text === '/panel') return;

    if (text === '🚪 بستن ربات و خروج') {
        return bot.sendMessage(chatId, '🚪 کیبورد ربات بسته شد. برای باز کردن /start را بزنید.', {
            reply_markup: { remove_keyboard: true }
        }).catch(() => {});
    }

    loadDatabase();
    trackUserAndNotifyAdmin(msg);

    const names = db.menuNames;

    if (text === names.free_coins) {
        const botInfo = await bot.getMe();
        const inviteLink = `https://t.me/${botInfo.username}?start=${chatId}`;
        const refCount = db.referals[chatId] || 0;
        return bot.sendMessage(chatId, `👥 لینک دعوت شما:\n\`${inviteLink}\`\n\nتعداد دعوت‌شده‌ها: ${refCount} نفر`, { parse_mode: 'Markdown' });
    }

    if (text === names.account) {
        const coins = db.userCoins[userId] || 0;
        const refs = db.referals[userId] || 0;
        return bot.sendMessage(chatId, `👤 **حساب کاربری شما:**\n\n💰 موجودی سکه: \`${coins} عدد\`\n👥 تعداد زیرمجموعه‌ها: \`${refs} نفر\`\n🆔 شناسه کاربری: \`${userId}\``, { parse_mode: 'Markdown' });
    }

    if (text === names.get_members) {
        const inline = {
            reply_markup: {
                inline_keyboard: [[{ text: '➕ ثبت سفارش جدید ممبر', callback_data: 'order_members' }]]
            }
        };
        return bot.sendMessage(chatId, '👥 از طریق دکمه زیر می‌توانید برای کانال یا گروه خود درخواست ممبر ثبت کنید:', inline);
    }

    if (text === names.support) {
        return bot.sendMessage(chatId, db.botTexts.support_text, {
            reply_markup: {
                inline_keyboard: [[{ text: '💬 ارتباط با پشتیبانی', url: `https://t.me/${ADMIN_USERNAME}` }]]
            }
        });
    }

    const currentState = db.userStates[chatId];
    if (!currentState) return;

    if (currentState.step === 'get_new_coin_reward' && isAdmin(msg)) {
        const val = parseInt(text, 10);
        if (isNaN(val) || val <= 0) return bot.sendMessage(chatId, '❌ مقدار نامعتبر است.');
        db.coinRewardPerInvite = val;
        delete db.userStates[chatId];
        saveDatabase();
        bot.sendMessage(chatId, `✅ پاداش دعوت به ${val} سکه تغییر یافت.`);
        sendAdminPanel(chatId);
        return;
    }

    if (currentState.step === 'get_order_link') {
        currentState.link = text;
        currentState.step = 'get_order_count';
        saveDatabase();
        return bot.sendMessage(chatId, '🔢 چه تعداد ممبر نیاز دارید؟ (تعداد درخواست را به عدد بفرستید):');
    }

    if (currentState.step === 'get_order_count') {
        const count = parseInt(text, 10);
        if (isNaN(count) || count <= 0) return bot.sendMessage(chatId, '❌ تعداد نامعتبر است.');
        
        const userCoins = db.userCoins[userId] || 0;
        // فرض هر ممبر معادل ۱ سکه
        if (userCoins < count) {
            delete db.userStates[chatId];
            saveDatabase();
            return bot.sendMessage(chatId, `❌ موجودی سکه شما (${userCoins}) برای ثبت این سفارش (${count} ممبر) کافی نیست!`);
        }

        db.userCoins[userId] = userCoins - count;
        db.memberOrders.push({
            userId,
            link: currentState.link,
            count,
            status: 'در حال انجام',
            date: getPersianDateTime()
        });
        delete db.userStates[chatId];
        saveDatabase();

        bot.sendMessage(chatId, `✅ **سفارش شما با موفقیت ثبت شد!**\n\nتعداد: ${count} ممبر\nموجودی کسر شده: ${count} سکه`);
        bot.sendMessage(ADMIN_CHAT_ID, `📦 **سفارش ممبر جدید:**\nکاربر: \`${userId}\`\nلینک: ${currentState.link}\nتعداد: ${count}`, { parse_mode: 'Markdown' });
        return;
    }

    if (currentState.step === 'get_broadcast_content' && isAdmin(msg)) {
        delete db.userStates[chatId];
        saveDatabase();
        const users = [...new Set(db.allUsers)];
        bot.sendMessage(chatId, `📢 ارسال به ${users.length} کاربر شروع شد...`);
        for (const uId of users) {
            try {
                await bot.sendMessage(uId, text);
                await sleep(50);
            } catch (e) {}
        }
        bot.sendMessage(chatId, '✅ ارسال همگانی به پایان رسید.');
        return;
    }
});
