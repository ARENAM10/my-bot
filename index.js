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

const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
    console.error('خطا: متغیر BOT_TOKEN یافت نشد!');
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'سلام! ربات روشن است. 🌹');
});

console.log('🤖 ربات استارت شد...');
