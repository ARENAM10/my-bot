);
    }
    else if (data === 'admin_client_options') {
        sendClientOptionsPanel(chatId, true, messageId);
    }
    // مدیریت گزینه‌های صفحه مشتریان
    else if (data.startsWith('cli_')) {
        const optionName = data.replace('cli_', '');
        bot.sendMessage(chatId, `⚙️ بخش مشتریان (**${optionName}**) از طریق پنل ادمین مدیریت شد.`);
    }
    else if (data === 'buy_sub') {
        const text = `🛒 **بخش خرید اشتراک**\n\nپکیج مدنظر خود را انتخاب کنید:`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "📦 پکیج ۵ گیگابایت (۳۰ ت)", callback_data: "plan_5gb" }],
                [{ text: "🔙 بازگشت", callback_data: "main_menu" }]
            ]
        };
        bot.editMessageText(text, { chat_id: 
            }
