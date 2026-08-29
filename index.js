const TelegramBot = require('node-telegram-bot-api');

const token = '7994848248:AAEjIu3pMZZrWzVz1X3kQ_Vp2J9xZ8Y2w7Q';
const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'سلام! ربات شما با موفقیت روشن شد و به درستی کار می‌کند. 🚀');
});
