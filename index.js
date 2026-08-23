const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// توکن مستقیم بدون نیاز به متغیر محیطی
const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';

const bot = new TelegramBot(TOKEN, { polling: true });

app.get('/', (req, res) => {
    res.send('Bot is active and running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'سلام! ربات با موفقیت روشن شد و آماده کاره. 🌹');
});

process.on('uncaughtException', (err) => {
    console.log('خطای مدیریت شده:', err.message);
});

console.log('🤖 ربات استارت شد...');
