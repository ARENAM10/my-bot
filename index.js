/**
 * ============================================================================
 * 🤖 ULTIMATE TELEGRAM MEMBER-GETTER & DIAMOND SYSTEM (ADVANCED ENGINE)
 * ============================================================================
 */

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');

// --- 🛡️ Global Error Handlers ---
process.on('uncaughtException', (err) => console.error('❌ Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => console.error('❌ Unhandled Rejection:', reason));

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = process.env.BOT_TOKEN || '8850301156:AAGr1yWbbtDwWii__eC1TDvXcygzN7TC5JA';
const bot = new TelegramBot(TOKEN, { polling: { autoStart: true, params: { timeout: 10 } } });

const ADMIN_CHAT_ID = 8923324852; 
const ADMIN_USERNAME = 'arenam_10';
const FORCE_CHANNEL_LINK = 'https://t.me/+Z2PQJAePPFwzMmVk';
const FORCE_CHANNEL_USERNAME = '@NetPlusProxy'; 

// --- Database Configuration ---
const DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'database.json');

let db = {
    userDiamonds: {},
    userStates: {},
    allUsers: [],
    referrals: {},
    memberOrders: [],       // سفارشات ثبت شده ممبر
    channelsForEarn: [],    // کانال‌هایی که کاربران برای گرفتن الماس باید جوین دهند
    transfers: [],          // تاریخچه انتقال الماس
    giftCodes: { "SPEED100": 50, "ARENA2026": 100 },
    usedGiftCodes: {}
};

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
        }
    } catch (e) { console.error('Database load error:', e); }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) { console.error('Database save error:', e); }
}

loadDatabase();

app.use(express.json());
app.get('/', (req, res) => res.send('Ultimate Diamond Member-Getter Bot is running!'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// --- Membership Validation ---
async function checkMembership(userId) {
    try {
        const chatMember = await bot.getChatMember(FORCE_CHANNEL_USERNAME, userId);
        return ['creator', 'administrator', 'member'].includes(chatMember.status);
    } catch (e) {
        return true; // جلوگیری از توقف ربات در صورت عدم دسترسی ربات به ادمینی کانال
    }
}

// --- Keyboards (Matches Image 2) ---
function getMainMenu(isAdmin = false) {
    const keyboard = [
        [{ text: '💎 دریافت الماس رایگان 💎' }],
        [{ text: '🚀 سفارش ممبر 🚀' }, { text: '💳 حساب کاربری 💳' }],
        [{ text: '💎 انتقال الماس 💎' }, { text: '👥 زیر مجموعه گیری 👥' }],
        [{ text: '🛍 فروشگاه 🛍' }, { text: '🎁 کد هدیه' }],
        [{ text: '📖 راهنما 📖' }, { text: '🔍 پیگیری سفارشات' }],
        [{ text: '‼️ قوانین | 📞 تماس با ما' }]
    ];
    if (isAdmin) {
        keyboard.push([{ text: '👑 پنل مدیریت پیشرفته' }]);
    }
    return { reply_markup: { keyboard, resize_keyboard: true, is_persistent: true } };
}

// --- /start Command & Referral Engine ---
bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = chatId.toString();

    loadDatabase();
    if (!db.allUsers.includes(userId)) {
        db.allUsers.push(userId);
        saveDatabase();
    }

    const isMember = await checkMembership(userId);
    if (!isMember) {
        return bot.sendMessage(chatId, `⚠️ برای استفاده از ربات باید ابتدا در کانال زیر عضو شوید:\n\n🔗 ${FORCE_CHANNEL_LINK}\n\nپس از عضویت، روی دکمه زیر کلیک کنید.`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔗 عضویت در کانال', url: FORCE_CHANNEL_LINK }],
                    [{ text: '✅ عضو شدم، تایید کن', callback_data: 'verify_force_join' }]
                ]
            }
        });
    }

    const payload = match ? match[1] : null;
    if (payload && payload !== userId && !db.userDiamonds[`ref_${userId}`]) {
        db.userDiamonds[`ref_${userId}`] = true;
        db.userDiamonds[payload] = (db.userDiamonds[payload] || 0) + 3;
        db.referrals[payload] = (db.referrals[payload] || 0) + 1;
        saveDatabase();
        bot.sendMessage(payload, '🎉 یک نفر با لینک دعوت شما وارد ربات شد!\n💎 `3 الماس` به حساب شما اضافه شد.', { parse_mode: 'Markdown' }).catch(() => {});
    }

    const welcomeText = `🌹 سلام !\nبه ربات ممبرگیر رایگان سرعت ممبر خوش اومدی ❤️\n\n🤖 با این ربات بدون هیچ هزینه‌ای ممبر واقعی بگیر 🆓\n\n⚠️ حتماً قبل از استفاده از ربات قوانین ربات رو مطالعه بفرمایید.\n\nبرای ادامه یک گزینه را انتخاب کنید! 👇`;
    bot.sendMessage(chatId, welcomeText, getMainMenu(chatId === ADMIN_CHAT_ID));
});

// --- Core Message Router ---
bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/start')) return;
    const chatId = msg.chat.id;
    const userId = chatId.toString();
    const text = msg.text.trim();

    loadDatabase();
    const state = db.userStates[chatId] || {};

    if (!(await checkMembership(userId))) {
        return bot.sendMessage(chatId, `⚠️ لطفاً ابتدا در کانال زیر عضو شوید:\n\n🔗 ${FORCE_CHANNEL_LINK}`, {
            reply_markup: { inline_keyboard: [[{ text: '🔗 عضویت در کانال', url: FORCE_CHANNEL_LINK }]] }
        });
    }

    // 1. حساب کاربری
    if (text === '💳 حساب کاربری 💳') {
        const diamonds = db.userDiamonds[userId] || 0;
        const refs = db.referrals[userId] || 0;
        return bot.sendMessage(chatId, `👤 **حساب کاربری شما:**\n\n💎 موجودی الماس: \`${diamonds} عدد\`\n👥 زیرمجموعه‌ها: \`${refs} نفر\`\n🆔 شناسه کاربری: \`${userId}\``, { parse_mode: 'Markdown' });
    }

    // 2. زیرمجموعه‌گیری
    if (text === '👥 زیر مجموعه گیری 👥') {
        const botInfo = await bot.getMe();
        const link = `https://t.me/${botInfo.username}?start=${chatId}`;
        const refCount = db.referrals[userId] || 0;
        return bot.sendMessage(chatId, `👥 **سیستم زیرمجموعه‌گیری:**\n\nلینک اختصاصی شما:\n\`${link}\`\n\nبا ارسال این لینک به دوستانتان به ازای هر ورود `3 الماس` هدیه بگیرید.\n✨ دوستان دعوت‌شده: ${refCount} نفر`, { parse_mode: 'Markdown' });
    }

    // 3. دریافت الماس رایگان (مشابه عکس اول برای جوین در کانال‌های ثبت‌شده)
    if (text === '💎 دریافت الماس رایگان 💎') {
        if (db.channelsForEarn.length === 0) {
            return bot.sendMessage(chatId, '📢 در حال حاضر هیچ کانالی برای کسب الماس موجود نیست. بعداً سر بزنید!');
        }
        let txt = '🚀 **بخش دریافت الماس (عضویت در کانال‌ها):**\n\nبرای دریافت الماس روی دکمه‌های زیر کلیک کنید:\n';
        const inlineKeyboard = [];
        db.channelsForEarn.forEach((ch, idx) => {
            inlineKeyboard.push([{ text: `📢 کانال شماره ${idx + 1} (+1 الماس)`, callback_data: `earn_join_${idx}` }]);
        });
        return bot.sendMessage(chatId, txt, { reply_markup: { inline_keyboard } });
    }

    // 4. انتقال الماس به کاربر دیگر
    if (text === '💎 انتقال الماس 💎') {
        db.userStates[chatId] = { step: 'transfer_get_id' };
        saveDatabase();
        return bot.sendMessage(chatId, '💎 **انتقال الماس به دوستان**\n\nلطفاً آیدی عددی (User ID) شخص مورد نظر را وارد کنید:');
    }

    if (state.step === 'transfer_get_id') {
        state.targetId = text;
        state.step = 'transfer_get_amount';
        saveDatabase();
        return bot.sendMessage(chatId, '🔢 چه تعداد الماس می‌خواهید منتقل کنید؟ (عدد وارد کنید):');
    }

    if (state.step === 'transfer_get_amount') {
        const amount = parseInt(text, 10);
        const targetId = state.targetId;
        delete db.userStates[chatId];

        if (isNaN(amount) || amount <= 0) {
            saveDatabase();
            return bot.sendMessage(chatId, '❌ مقدار وارد شده نامعتبر است.');
        }
        const userDiamonds = db.userDiamonds[userId] || 0;
        if (userDiamonds < amount) {
            saveDatabase();
            return bot.sendMessage(chatId, `❌ موجودی الماس شما (${userDiamonds}) برای این انتقال کافی نیست!`);
        }

        db.userDiamonds[userId] = userDiamonds - amount;
        db.userDiamonds[targetId] = (db.userDiamonds[targetId] || 0) + amount;
        db.transfers.push({ from: userId, to: targetId, amount, date: new Date().toLocaleString() });
        saveDatabase();

        bot.sendMessage(chatId, `✅ انتقال با موفقیت انجام شد!\nتعداد \`${amount} الماس\` به کاربر \`${targetId}\` منتقل گردید.`);
        bot.sendMessage(targetId, `🎁 مقدار \`${amount} الماس\` از طرف کاربر \`${userId}\` به حساب شما منتقل شد!`).catch(() => {});
        return;
    }

    // 5. کد هدیه
    if (text === '🎁 کد هدیه') {
        db.userStates[chatId] = { step: 'get_gift_code' };
        saveDatabase();
        return bot.sendMessage(chatId, '🎁 لطفاً کد هدیه خود را ارسال کنید:');
    }

    if (state.step === 'get_gift_code') {
        delete db.userStates[chatId];
        const code = text.toUpperCase();
        if (!db.giftCodes[code] || db.usedGiftCodes[`${userId}_${code}`]) {
            saveDatabase();
            return bot.sendMessage(chatId, '❌ کد هدیه نامعتبر است یا قبلاً استفاده شده است.');
        }
        const reward = db.giftCodes[code];
        db.usedGiftCodes[`${userId}_${code}`] = true;
        db.userDiamonds[userId] = (db.userDiamonds[userId] || 0) + reward;
        saveDatabase();
        return bot.sendMessage(chatId, `🎉 تبریک! کد هدیه اعمال شد و \`${reward} الماس\` به حساب شما واریز گردید.`);
    }

    // 6. سفارش ممبر (ثبت سفارش دقیقاً مثل نمونه عکس اول)
    if (text === '🚀 سفارش ممبر 🚀') {
        db.userStates[chatId] = { step: 'order_get_link' };
        saveDatabase();
        return bot.sendMessage(chatId, '🚀 **ثبت سفارش ممبر جدید**\n\n‼️ لطفاً **آیدی کانال یا گروه خود** (مثلاً @VLONEWOON) را ارسال کنید:');
    }

    if (state.step === 'order_get_link') {
        state.link = text;
        state.step = 'order_get_desc';
        saveDatabase();
        return bot.sendMessage(chatId, '📝 توضیحات کانال خود را وارد کنید (یا عبارت "فاقد توضیحات" را بفرستید):');
    }

    if (state.step === 'order_get_desc') {
        state.desc = text;
        state.step = 'order_get_count';
        saveDatabase();
        return bot.sendMessage(chatId, '🔢 چه تعداد ممبر نیاز دارید؟ (تعداد را به عدد وارد کنید):');
    }

    if (state.step === 'order_get_count') {
        const count = parseInt(text, 10);
        if (isNaN(count) || count <= 0) return bot.sendMessage(chatId, '❌ تعداد وارد شده نامعتبر است.');

        const userDiamonds = db.userDiamonds[userId] || 0;
        if (userDiamonds < count) {
            delete db.userStates[chatId];
            saveDatabase();
            return bot.sendMessage(chatId, `❌ موجودی الماس شما (${userDiamonds}) برای این سفارش (${count} ممبر) کافی نیست!`);
        }

        db.userDiamonds[userId] = userDiamonds - count;
        const orderData = { userId, link: state.link, desc: state.desc, count, date: new Date().toLocaleString() };
        db.memberOrders.push(orderData);
        delete db.userStates[chatId];
        saveDatabase();

        bot.sendMessage(chatId, `✅ **سفارش شما با موفقیت ثبت و در صف قرار گرفت!**\n\n🆔 کانال: ${state.link}\n👥 تعداد: ${count} ممبر`);
        
        // ارسال ساختار سفارشی به کانال یا ادمین دقیقاً مشابه نمونه عکس اول
        bot.sendMessage(ADMIN_CHAT_ID, `🛒 **سفارش جدید | ممبرگیر رایگان سرعت ممبر**\n\n‼️ نام کانال: ${state.link}\n\n📝 توضیحات کانال: ${state.desc}\n\n🚀 سفارش جدید: ${count} ممبر 👥`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: `💎 دریافت الماس (${count})`, callback_data: 'dummy_btn' }, { text: '👥 عضویت', url: FORCE_CHANNEL_LINK }],
                    [{ text: '📊 گزارش سفارش', callback_data: 'dummy_btn' }, { text: '👤 سفارش ممبر', callback_data: 'dummy_btn' }]
                ]
            }
        });
        return;
    }

    // سایر گزینه‌های منو
    if (text === '📖 راهنما 📖') {
        return bot.sendMessage(chatId, '📚 **راهنمای ربات:**\n۱. از بخش دریافت الماس رایگان، کانال‌ها را جوین کنید.\n۲. با ثبت سفارش ممبر، آیدی کانال خود را وارد کنید.');
    }
    if (text === '‼️ قوانین | 📞 تماس با ما') {
        return bot.sendMessage(chatId, `‼️ **قوانین:** لفت دادن از کانال‌ها باعث کسر الماس می‌شود.\n📞 پشتیبانی: @${ADMIN_USERNAME}`);
    }
    if (text === '🔍 پیگیری سفارشات') {
        const orders = db.memberOrders.filter(o => o.userId === userId);
        if (orders.length === 0) return bot.sendMessage(chatId, '❌ شما سفارشی ثبت نکرده‌اید.');
        let txt = '📦 **سفارشات شما:**\n\n';
        orders.forEach((o, i) => { txt += `${i+1}. کانال: ${o.link} | تعداد: ${o.count}\n`; });
        return bot.sendMessage(chatId, txt);
    }
    if (text === '🛍 فروشگاه 🛍') {
        return bot.sendMessage(chatId, `🛍 برای خرید بسته‌های الماس به پشتیبانی پیام دهید:\n@${ADMIN_USERNAME}`);
    }
    if (text === '👑 پنل مدیریت پیشرفته' && chatId === ADMIN_CHAT_ID) {
        return bot.sendMessage(chatId, '👑 **پنل مدیریت ادمین:**', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📊 آمار ربات', callback_data: 'admin_stats' }, { text: '➕ افزودن کانال کسب الماس', callback_data: 'admin_add_ch' }]
                ]
            }
        });
    }
});

// --- Callback Query Handler ---
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = chatId.toString();
    const data = query.data;
    try { await bot.answerCallbackQuery(query.id); } catch (e) {}

    loadDatabase();

    if (data === 'verify_force_join') {
        if (await checkMembership(userId)) {
            bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
            bot.sendMessage(chatId, '✅ تایید شد! حالا می‌توانید از ربات استفاده کنید.', getMainMenu(chatId === ADMIN_CHAT_ID));
        } else {
            bot.sendMessage(chatId, `❌ هنوز عضو کانال نشده‌اید:\n🔗 ${FORCE_CHANNEL_LINK}`);
        }
    } else if (data.startsWith('earn_join_')) {
        const index = parseInt(data.replace('earn_join_', ''), 10);
        db.userDiamonds[userId] = (db.userDiamonds[userId] || 0) + 1;
        saveDatabase();
        bot.sendMessage(chatId, '🎉 عضویت تایید شد و `1 الماس` به حساب شما واریز گردید.');
    } else if (data === 'admin_stats' && chatId === ADMIN_CHAT_ID) {
        bot.sendMessage(chatId, `📊 آمار ربات:\n👥 کل کاربران: ${db.allUsers.length}\n📦 کل سفارشات: ${db.memberOrders.length}`);
    } else if (data === 'admin_add_ch' && chatId === ADMIN_CHAT_ID) {
        db.channelsForEarn.push('@NetPlusProxy');
        saveDatabase();
        bot.sendMessage(chatId, '✅ کانال نمونه با موفقیت به بخش جوین اضافه شد.');
    }
});
