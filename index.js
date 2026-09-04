const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');

// --- 🛡️ مدیریت خطاهای گلوبال برای جلوگیری از کرش ربات ---
process.on('uncaughtException', (err) => {
    console.error('❌ خطای هندل‌نشده:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ پرامیس رد شده:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ حتماً توکن جدید و امن خود را اینجا قرار دهید یا از متغیر محیطی استفاده کنید
const TOKEN = process.env.BOT_TOKEN || 'توکن_جدید_شما_اینجا';

const bot = new TelegramBot(TOKEN, { 
    polling: { autoStart: true, params: { timeout: 10 } } 
});

const ADMIN_CHAT_ID = 8923324852; // آیدی عددی شما به عنوان ادمین
const ADMIN_USERNAME = 'arenam_10';

// سیستم قفل برای جلوگیری از اسپم درخواست کاربران
const userLockMap = new Map();
function acquireLock(userId) {
    const now = Date.now();
    if (userLockMap.has(userId) && now - userLockMap.get(userId) < 1000) return false;
    userLockMap.set(userId, now);
    return true;
}

// مدیریت دیتابیس محلی با فایل JSON
const DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'database.json');

let db = {
    coinRewardPerInvite: 2, // سکه هدیه به ازای دعوت هر نفر
    userCoins: {},
    userStates: {},
    allUsers: [],
    referals: {},
    memberOrders: []
};

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            db = { ...db, ...JSON.parse(data) };
        }
    } catch (e) {
        console.log('خطا در خواندن دیتابیس:', e);
    }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        console.log('خطا در ذخیره دیتابیس:', e);
    }
}

loadDatabase();

app.use(express.json());
app.get('/', (req, res) => res.send('Professional Member-Getter Bot is running!'));
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

function isAdmin(chatId) {
    return chatId === ADMIN_CHAT_ID;
}

// کیبورد اصلی شیشه‌ای و دائمی
function getMainMenu() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '➕ سفارش ممبر 👥' }, { text: '🎁 سکه رایگان (دعوت)' }],
                [{ text: '👤 حساب کاربری' }, { text: '💬 پشتیبانی' }]
            ],
            resize_keyboard: true,
            is_persistent: true
        }
    };
}

// دستور استارت و سیستم زیرمجموعه‌گیری
bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    if (!acquireLock(userId)) return;

    loadDatabase();
    if (!db.allUsers.includes(userId)) {
        db.allUsers.push(userId);
        saveDatabase();
    }

    const payload = match ? match[1] : null;
    if (payload && payload !== userId && !db.userCoins[`referred_${userId}`]) {
        db.userCoins[`referred_${userId}`] = true;
        db.userCoins[payload] = (db.userCoins[payload] || 0) + db.coinRewardPerInvite;
        db.referals[payload] = (db.referals[payload] || 0) + 1;
        saveDatabase();

        bot.sendMessage(payload, `🎉 یک نفر با لینک دعوت شما وارد ربات شد!\n💰 \`${db.coinRewardPerInvite} سکه\` به حساب شما اضافه شد.`, { parse_mode: 'Markdown' }).catch(() => {});
    }

    if (isAdmin(chatId)) {
        return bot.sendMessage(chatId, '👑 **خوش آمدید ادمین عزیز. پنل مدیریت ربات ممبرگیر:**', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📊 آمار کلی ربات', callback_data: 'admin_stats' }],
                    [{ text: '🎁 تنظیم سکه هدیه دعوت', callback_data: 'admin_set_reward' }],
                    [{ text: '📦 بررسی سفارشات ممبر', callback_data: 'admin_orders' }]
                ]
            }
        });
    }

    bot.sendMessage(chatId, '✨ به ربات ممبرگیر و افزایش بازدید خوش آمدید!\n\nاز منوی زیر می‌توانید برای کانال خود ممبر بگیرید یا با دعوت دوستانتان سکه جمع کنید:', getMainMenu());
});

// مدیریت کلیک روی دکمه‌های شیشه‌ای
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    try { await bot.answerCallbackQuery(query.id); } catch (e) {}

    loadDatabase();

    if (data === 'admin_stats') {
        if (!isAdmin(chatId)) return;
        bot.sendMessage(chatId, `📊 **آمار ربات:**\n\n👥 کل کاربران: ${db.allUsers.length} نفر\n📦 کل سفارشات: ${db.memberOrders.length} عدد`);
    } else if (data === 'admin_orders') {
        if (!isAdmin(chatId)) return;
        if (db.memberOrders.length === 0) return bot.sendMessage(chatId, '❌ هیچ سفارشی ثبت نشده است.');
        let txt = '📦 **لیست سفارشات:**\n\n';
        db.memberOrders.forEach((o, i) => {
            txt += `${i + 1}. کاربر: \`${o.userId}\` | لینک: ${o.link} | تعداد: ${o.count}\n`;
        });
        bot.sendMessage(chatId, txt, { parse_mode: 'Markdown' });
    } else if (data === 'order_start') {
        db.userStates[chatId] = { step: 'get_link' };
        saveDatabase();
        bot.sendMessage(chatId, '🔗 لطفاً لینک کانال یا گروه خود را ارسال کنید:');
    }
});

// مدیریت پیام‌های متنی کاربران
bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/start')) return;
    const chatId = msg.chat.id;
    const userId = chatId.toString();
    const text = msg.text.trim();
    if (!acquireLock(userId)) return;

    loadDatabase();
    const state = db.userStates[chatId];

    if (text === '👤 حساب کاربری') {
        const coins = db.userCoins[userId] || 0;
        const refs = db.referals[userId] || 0;
        return bot.sendMessage(chatId, `👤 **حساب کاربری شما:**\n\n💰 موجودی سکه: \`${coins}\`\n👥 دوستان دعوت‌شده: \`${refs} نفر\``, { parse_mode: 'Markdown' });
    }

    if (text === '🎁 سکه رایگان (دعوت)') {
        const botInfo = await bot.getMe();
        const link = `https://t.me/${botInfo.username}?start=${chatId}`;
        return bot.sendMessage(chatId, `🎁 **دریافت سکه رایگان**\n\nلینک زیر را برای دوستان خود بفرستید و به ازای هر ورود، \`${db.coinRewardPerInvite} سکه\` جایزه بگیرید:\n\n\`${link}\``, { parse_mode: 'Markdown' });
    }

    if (text === '➕ سفارش ممبر 👥') {
        return bot.sendMessage(chatId, '👥 برای ثبت سفارش و دریافت ممبر برای کانال یا گروه خود، روی دکمه زیر کلیک کنید:', {
            reply_markup: {
                inline_keyboard: [[{ text: '➕ ثبت سفارش جدید', callback_data: 'order_start' }]]
            }
        });
    }

    if (text === '💬 پشتیبانی') {
        return bot.sendMessage(chatId, `💬 برای ارتباط با پشتیبانی به آیدی زیر پیام دهید:\n@${ADMIN_USERNAME}`);
    }

    // مراحل ثبت سفارش
    if (state && state.step === 'get_link') {
        state.link = text;
        state.step = 'get_count';
        saveDatabase();
        return bot.sendMessage(chatId, '🔢 چه تعداد ممبر نیاز دارید؟ (تعداد را به عدد وارد کنید):');
    }

    if (state && state.step === 'get_count') {
        const count = parseInt(text, 10);
        if (isNaN(count) || count <= 0) return bot.sendMessage(chatId, '❌ لطفاً یک عدد معتبر وارد کنید.');

        const userCoins = db.userCoins[userId] || 0;
        if (userCoins < count) {
            delete db.userStates[chatId];
            saveDatabase();
            return bot.sendMessage(chatId, `❌ موجودی سکه شما (${userCoins}) برای این سفارش (${count} ممبر) کافی نیست!`);
        }

        db.userCoins[userId] = userCoins - count;
        db.memberOrders.push({ userId, link: state.link, count, date: new Date().toLocaleString() });
        delete db.userStates[chatId];
        saveDatabase();

        bot.sendMessage(chatId, `✅ **سفارش شما با موفقیت ثبت شد!**\n\nتعداد: ${count} ممبر\nاز حساب شما کسر گردید.`);
        bot.sendMessage(ADMIN_CHAT_ID, `📦 **سفارش ممبر جدید ثبت شد:**\nکاربر: \`${userId}\`\nلینک: ${state.link}\nتعداد: ${count}`, { parse_mode: 'Markdown' });
    }
});
