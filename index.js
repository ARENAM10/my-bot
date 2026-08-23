const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running successfully!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// توکن رو مستقیماً همینجا گذاشتیم تا دیگه خطای متغیر محیطی نده
const TOKEN = '8850301156:AAF03oS1Aayj4CZ9rv1mmLd4zvZ_HznAbEk';

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'سلام! ربات روشن است. 🌹');
});

console.log('🤖 ربات استارت شد و با موفقیت متصل شد...');
