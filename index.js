const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');

// --- جلوگیری از کرش ربات ---
process.on('uncaughtException', (err) => console.error('❌ خطای هندل‌نشده:', err));
process.on('unhandledRejection', (reason) => console.error('❌ پرامیس رد شده:', reason));

const app = express();
const PORT = process.env.PORT || 3000;

// توکن شما (برای امنیت بهتر حتماً بعداً از متغیر محیطی استفاده کنید)
const TOKEN = '8850301156:AAGr1yWbbtDwWii__eC1TDvXcygzN7TC5JA';

const bot = new TelegramBot(TOKEN, { 
    polling: { autoStart: true, params: { timeout: 10 } } 
});

const ADMIN_CHAT_ID = 8923324852; 
const ADMIN_USERNAME = 'arenam_10';

// مدیریت فایل دیتابیس لوکال
const DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'database.json');

let db = {
    userDiamonds: {}, // موجودی الماس کاربران
    userStates: {},
    allUsers: [],
    referals: {},
    memberOrders: []
};

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
        }
    } catch (e) { console.log('خطا در خواندن دیتابیس'); }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) { console.log('خطا در ذخیره دیتابیس'); }
}

loadDatabase();

app.use(express.json());
app.get('/', (req, res) => res.send('Diamond Member-Getter Bot is running!'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// کیبورد اصلی مطابق تصویر دوم ربات
function getMainMenu() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '💎 دریافت الماس رایگان 💎' }],
                [{ text: '🚀 سفارش ممبر 🚀' }, { text: '💳 حساب کاربری 💳' }],
                [{ text: '👥 زیر مجموعه گیری 👥' }, { text: '🛍 فروشگاه 🛍' }],
                [{ text: '🎁 کد هدیه' }, { text: '📖 راهنما 📖' }],
                [{ text: '🔍 پیگیری سفارشات' }, { text: '‼️ قوانین | 📞 تماس با ما' }]
            ],
            resize_keyboard: true,
            is_persistent: true
        }
    };
}

// دستور /start
bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = chatId.toString();

    loadDatabase();
    if (!db.allUsers.includes(userId)) {
        db.allUsers.push(userId);
        saveDatabase();
    }

    const payload = match ? match[1] : null;
    if (payload && payload !== userId && !db.userDiamonds[`ref_${userId}`]) {
        db.userDiamonds[`ref_${userId}`] = true;
        db.userDiamonds[payload] = (db.userDiamonds[payload] || 0) + 2; // ۲ الماس هدیه دعوت
        db.referals[payload] = (db.referals[payload] || 0) + 1;
        saveDatabase();
        bot.sendMessage(payload, '🎉 یک نفر با لینک دعوت شما وارد ربات شد!\n💎 `2 الماس` به حساب شما اضافه شد.', { parse_mode: 'Markdown' }).catch(() => {});
    }

    const welcomeText = `🌹 سلام !\nبه ربات ممبرگیر رایگان سرعت ممبر خوش اومدی ❤️\n\n🤖 با این ربات بدون هیچ هزینه ای ممبر بگیر 🆓\n\n⚠️ حتماً قبل از استفاده از ربات قوانین ربات رو مطالعه بفرمایید.\n\n📚 برای آشنایی با ربات و روش کار آن دستور /help را ارسال کنید!\n\nبرای ادامه یک گزینه را انتخاب کنید! 👇`;
    
    bot.sendMessage(chatId, welcomeText, getMainMenu());
});

// مدیریت دستورات و دکمه‌های متنی منو
bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/start')) return;
    const chatId = msg.chat.id;
    const userId = chatId.toString();
    const text = msg.text.trim();

    loadDatabase();
    const state = db.userStates[chatId];

    if (text === '💎 دریافت الماس رایگان 💎') {
        return bot.sendMessage(chatId, '📢 بخش دریافت الماس:\n\nبا عضویت در کانال‌های زیر می‌توانید الماس کسب کنید:\n*(بخش کانال‌های جوین اجباری در حال توسعه)*', {
            reply_markup: {
                inline_keyboard: [[{ text: '➕ دریافت کانال برای جوین و کسب الماس', callback_data: 'earn_diamond' }]]
            }
        });
    }

    if (text === '💳 حساب کاربری 💳') {
        const diamonds = db.userDiamonds[userId] || 0;
        const refs = db.referals[userId] || 0;
        return bot.sendMessage(chatId, `👤 **حساب کاربری شما:**\n\n💎 موجودی الماس: \`${diamonds} عدد\`\n👥 تعداد زیرمجموعه‌ها: \`${refs} نفر\`\n🆔 شناسه کاربری: \`${userId}\``, { parse_mode: 'Markdown' });
    }

    if (text === '👥 زیر مجموعه گیری 👥') {
        const botInfo = await bot.getMe();
        const link = `https://t.me/${botInfo.username}?start=${chatId}`;
        const refCount = db.referals[userId] || 0;
        return bot.sendMessage(chatId, `👥 **سیستم زیرمجموعه‌گیری:**\n\nلینک اختصاصی شما:\n\`${link}\`\n\nبا ارسال این لینک به دوستانتان به ازای هر ورود الماس هدیه بگیرید.\n✨ دوستان دعوت‌شده: ${refCount} نفر`, { parse_mode: 'Markdown' });
    }

    if (text === '📖 راهنما 📖') {
        return bot.sendMessage(chatId, '📚 **راهنمای ربات:**\n۱. از بخش دریافت الماس رایگان، کانال‌ها را جوین دهید و الماس جمع کنید.\n۲. از بخش سفارش ممبر، لینک کانال یا گروه خود را بفرستید تا برایتان ممبر واریز شود.');
    }

    if (text === '‼️ قوانین | 📞 تماس با ما') {
        return bot.sendMessage(chatId, `‼️ **قوانین و پشتیبانی:**\n\n- لفت دادن از کانال‌ها باعث کسر الماس می‌شود.\n- ارتباط با مدیریت: @${ADMIN_USERNAME}`);
    }

    if (text === '🚀 سفارش ممبر 🚀') {
        db.userStates[chatId] = { step: 'get_order_link' };
        saveDatabase();
        return bot.sendMessage(chatId, '🚀 **ثبت سفارش ممبر جدید**\n\nلطفاً لینک کانال یا گروه خود را ارسال کنید:');
    }

    // فرآیند دریافت لینک و ثبت سفارش
    if (state && state.step === 'get_order_link') {
        state.link = text;
        state.step = 'get_order_count';
        saveDatabase();
        return bot.sendMessage(chatId, '🔢 چه تعداد ممبر نیاز دارید؟ (تعداد درخواست را به عدد وارد کنید):');
    }

    if (state && state.step === 'get_order_count') {
        const count = parseInt(text, 10);
        if (isNaN(count) || count <= 0) return bot.sendMessage(chatId, '❌ لطفاً یک عدد معتبر وارد کنید.');

        const userDiamonds = db.userDiamonds[userId] || 0;
        if (userDiamonds < count) {
            delete db.userStates[chatId];
            saveDatabase();
            return bot.sendMessage(chatId, `❌ موجودی الماس شما (${userDiamonds}) برای این سفارش (${count} ممبر) کافی نیست!`);
        }

        db.userDiamonds[userId] = userDiamonds - count;
        db.memberOrders.push({ userId, link: state.link, count, date: new Date().toLocaleString() });
        delete db.userStates[chatId];
        saveDatabase();

        bot.sendMessage(chatId, `✅ **سفارش شما با موفقیت ثبت شد!**\n\n🔗 لینک: ${state.link}\n👥 تعداد: ${count} ممبر\n💎 الماس کسر شده: ${count}`);
        bot.sendMessage(ADMIN_CHAT_ID, `📦 **سفارش ممبر جدید ثبت شد:**\nکاربر: \`${userId}\`\nلینک: ${state.link}\nتعداد: ${count}`, { parse_mode: 'Markdown' });
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    try { await bot.answerCallbackQuery(query.id); } catch (e) {}
    if (query.data === 'earn_diamond') {
        bot.sendMessage(chatId, '🎯 فعلاً کانالی برای عضویت وجود ندارد. بعداً دوباره بررسی کنید.');
    }
});
