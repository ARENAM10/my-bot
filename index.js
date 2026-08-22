import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import * as db from "./database.js";

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const OWNER_USERNAME = "ARENAM_10";
const OWNER_ID = Number(process.env.OWNER_ID);
const STORE_NAME = process.env.STORE_NAME || "LEX VIP";

if (!TOKEN || !OWNER_ID) {
    console.error("خطا: توکن ربات یا آیدی مالک در فایل .env تنظیم نشده است!");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

const userState = {};

// منوی اصلی شیشه‌ای کاربران
function getInlineMenu(userId, username) {
    const isOwner = (userId === OWNER_ID) || (username === OWNER_USERNAME);
    const keyboard = [];

    if (isOwner) {
        keyboard.push([{ text: "🔐 مدیریت ربات", callback_data: "menu_admin" }]);
    }

    keyboard.push([{ text: "🛒 خرید اشتراک", callback_data: "menu_buy" }]);

    keyboard.push(
        [
            { text: "🎁 هدیه روزانه", callback_data: "menu_gift" },
            { text: "💳 حساب کاربری", callback_data: "menu_account" }
        ],
        [
            { text: "📂 اشتراک‌های من", callback_data: "menu_my_subs" },
            { text: "🤝 اخذ نمایندگی", callback_data: "menu_agency" }
        ],
        [
            { text: "🌐 معرفی به دوستان", callback_data: "menu_invite" },
            { text: "☎️ ارتباط با پشتیبانی", callback_data: "menu_support" }
        ]
    );

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

// پنل مدیریت ادمین
function getAdminPanelKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🛒 مدیریت اشتراک", callback_data: "admin_sub_management" },
                    { text: "📦 سوابق اشتراک‌ها", callback_data: "admin_sub_history" }
                ],
                [
                    { text: "📁 رسیدها", callback_data: "admin_receipts" },
                    { text: "💰 شارژ کیف پول", callback_data: "admin_charge_wallet" }
                ],
                [
                    { text: "💬 پیام مشتریان", callback_data: "admin_messages" },
                    { text: "📊 آمار", callback_data: "admin_stats" }
                ],
                [
                    { text: "🔒 عضویت اجباری", callback_data: "admin_forcesub" },
                    { text: "💳 تنظیمات پرداخت", callback_data: "admin_payment_settings" }
                ],
                [
                    { text: "🗑 حذف پیام", callback_data: "admin_delete_msg" },
                    { text: "📢 ارسال همگانی", callback_data: "admin_broadcast" }
                ],
                [
                    { text: "👤 گزینه‌های مشتریان", callback_data: "admin_customer_options" },
                    { text: "📌 سنجاق پیام", callback_data: "admin_pin_msg" }
                ],
                [
                    { text: "🔄 استارت مالک", callback_data: "admin_owner_start" },
                    { text: "🔙 گزینه‌های اصلی", callback_data: "menu_home" }
                ]
            ]
        }
    };
}

function getInlineBack() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🔙 بازگشت به منو", callback_data: "menu_home" }]
            ]
        }
    };
}

function getAdminBack() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🔙 بازگشت به مدیریت", callback_data: "menu_admin" },
                    { text: "🏠 گزینه‌های اصلی", callback_data: "menu_home" }
                ]
            ]
        }
    };
}

// رویداد استارت ربات
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;
    const firstName = msg.from.first_name || "بدون نام";
    const user = msg.from;

    delete userState[userId];
    db.addUser(user);

    if (userId !== OWNER_ID) {
        const startAlertText = `🤖 **ربات استارت خورد**\n\n` +
            `👤 نام: ${firstName}\n` +
            `💎 نام کاربری: ${username ? `@${username}` : "ندارد"}\n` +
            `🆔 شناسه: \`${userId}\``;
        
        try {
            await bot.sendMessage(OWNER_ID, startAlertText, { parse_mode: "Markdown" });
        } catch (e) {
            console.error("خطا در ارسال گزارش استارت به مالک:", e);
        }
    }

    bot.sendMessage(
        chatId,
        `✨ به پنل اختصاصی ${STORE_NAME} خوش آمدید.\n\nلطفاً از گزینه‌های زیر انتخاب کنید:`,
        getInlineMenu(userId, username)
    );
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;
    const text = msg.text;

    if (!text && !msg.photo) return;

    db.addUser(msg.from);

    const isOwner = (userId === OWNER_ID) || (username === OWNER_USERNAME);
    const state = userState[userId];

    if (state) {
        if (isOwner) {
            if (state.action === "set_card_number") {
                db.setSetting("card_number", text);
                delete userState[userId];
                return bot.sendMessage(chatId, `✔️ شماره کارت جدید ثبت شد:\n\`${text}\``, {
                    parse_mode: "Markdown",
                    ...getAdminPanelKeyboard()
                });
            }
            if (state.action === "set_card_holder") {
                db.setSetting("card_holder", text);
                delete userState[userId];
                return bot.sendMessage(chatId, "✔️ نام صاحب کارت به‌روزرسانی شد.", getAdminPanelKeyboard());
            }
            if (state.action === "set_bank_name") {
                db.setSetting("bank_name", text);
                delete userState[userId];
                return bot.sendMessage(chatId, "✔️ نام بانک به‌روزرسانی شد.", getAdminPanelKeyboard());
            }
            if (state.action === "set_pay_guide_text") {
                db.setSetting("pay_guide", text);
                delete userState[userId];
                return bot.sendMessage(chatId, "✔️ متن راهنمای پرداخت به‌روزرسانی شد.", getAdminPanelKeyboard());
            }
        }

        if (state.action === "waiting_wallet_amount") {
            if (text === "انصراف") {
                delete userState[userId];
                return bot.sendMessage(chatId, "❌ عملیات لغو شد.", getInlineMenu(userId, username));
            }

            const amount = parseInt(text);
            if (isNaN(amount) || amount <= 0) {
                return bot.sendMessage(chatId, "❌ لطفاً مبلغ معتبری (به تومان) وارد کنید:");
            }

            const cardNum = db.getSetting("card_number") || "ثبت نشده";
            const cardHold = db.getSetting("card_holder") || "ثبت نشده";
            const payGuide = db.getSetting("pay_guide") || "لطفا پس از واریز رسید خود را ارسال کنید";

            userState[userId] = { action: "waiting_wallet_receipt", amount };

            const paymentText = `💳 **اطلاعات کارت جهت واریز وجه:**\n\n` +
                `🏦 شماره کارت: \`${cardNum}\`\n` +
                `👤 نام صاحب کارت: ${cardHold}\n\n` +
                `💰 مبلغ شارژ: **${amount} تومان**\n\n` +
                `⚠️ لطفاً دقیقاً همین مبلغ را واریز کرده و عکس رسید آن را ارسال کنید.\n\n` +
                `📝 ${payGuide}\n\n(برای لغو کلمه «انصراف» را بفرستید)`;

            return bot.sendMessage(chatId, paymentText, { parse_mode: "Markdown" });
        }

        if (state.action === "waiting_wallet_receipt") {
            if (text === "انصراف") {
                delete userState[userId];
                return bot.sendMessage(chatId, "❌ عملیات لغو شد.", getInlineMenu(userId, username));
            }

            const amount = state.amount;
            let receiptValue = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.text;

            delete userState[userId];

            bot.sendMessage(chatId, "✔️ رسید شارژ کیف پول با موفقیت برای مدیریت ارسال شد.", getInlineMenu(userId, username));

            const ownerMsg = `🔔 **رسید شارژ کیف پول جدید!**\n\n` +
                `👤 کاربر: @${username || "ندارد"} (${msg.from.first_name})\n` +
                `🆔 شناسه: \`${userId}\`\n` +
                `💰 مبلغ درخواستی: ${amount} تومان`;

            if (msg.photo) {
                await bot.sendPhoto(OWNER_ID, receiptValue, { caption: ownerMsg, parse_mode: "Markdown" });
            } else {
                await bot.sendMessage(OWNER_ID, `${ownerMsg}\n\n📄 متن رسید: ${receiptValue}`, { parse_mode: "Markdown" });
            }
            return;
        }

        // دریافت و ثبت رسید خرید اشتراک (رفع باگ جریان خرید)
        if (state.action === "waiting_receipt") {
            if (text === "انصراف") {
                delete userState[userId];
                return bot.sendMessage(chatId, "❌ عملیات لغو شد.", getInlineMenu(userId, username));
            }

            const orderId = state.orderId;
            let receiptValue = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.text;

            db.setReceipt(orderId, receiptValue);
            delete userState[userId];

            bot.sendMessage(chatId, "✔️ رسید شما ثبت شد و جهت بررسی نهایی به مدیریت ارسال گردید.", getInlineMenu(userId, username));

            const orderInfo = db.getOrder(orderId);
            const ownerMsg = `🔔 **رسید خرید اشتراک جدید!**\n\n` +
                `👤 کاربر: @${username || "ندارد"} (${msg.from.first_name})\n` +
                `📦 پکیج: ${orderInfo ? orderInfo.title : "نامشخص"}\n` +
                `💵 مبلغ: ${orderInfo ? orderInfo.price : 0} تومان\n` +
                `📌 شناسه سفارش: ${orderId}`;

            const ownerKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ تأیید و ارسال کانفیگ", callback_data: `approve_${orderId}` },
                            { text: "❌ رد سفارش", callback_data: `reject_${orderId}` }
                        ]
                    ]
                }
            };

            if (msg.photo) {
                await bot.sendPhoto(OWNER_ID, receiptValue, { caption: ownerMsg, parse_mode: "Markdown", ...ownerKeyboard });
            } else {
                await bot.sendMessage(OWNER_ID, `${ownerMsg}\n\n📄 جزئیات رسید: ${receiptValue}`, { parse_mode: "Markdown", ...ownerKeyboard });
            }
            return;
        }

        if (state.action === "waiting_agency_request") {
            if (text === "انصراف") {
                delete userState[userId];
                return bot.sendMessage(chatId, "❌ درخواست نمایندگی لغو شد.", getInlineMenu(userId, username));
            }

            delete userState[userId];
            bot.sendMessage(chatId, "✔️ درخواست شما ارسال شد.", getInlineMenu(userId, username));

            const agencyMsg = `🤝 **درخواست نمایندگی جدید:**\n\n` +
                `👤 کاربر: @${username || "ندارد"} (${msg.from.first_name})\n` +
                `🆔 شناسه: \`${userId}\`\n\n` +
                `📝 **متن ارسالی:**\n${text}`;

            await bot.sendMessage(OWNER_ID, agencyMsg, { parse_mode: "Markdown" });
            return;
        }

        if (isOwner) {
            if (state.action === "add_title") {
                state.title = text;
                state.action = "add_category";
                return bot.sendMessage(chatId, "دسته‌بندی اشتراک را وارد کنید:");
            }
            if (state.action === "add_category") {
                state.category = text;
                state.action = "add_volume";
                return bot.sendMessage(chatId, "حجم یا تعداد کاربر را وارد کنید:");
            }
            if (state.action === "add_volume") {
                state.volume = text;
                state.action = "add_duration";
                return bot.sendMessage(chatId, "مدت زمان اعتبار را وارد کنید:");
            }
            if (state.action === "add_duration") {
                state.duration = text;
                state.action = "add_price";
                return bot.sendMessage(chatId, "مبلغ (به تومان) را وارد کنید:");
            }
            if (state.action === "add_price") {
                const price = parseInt(text);
                if (isNaN(price)) return bot.sendMessage(chatId, "❌ لطفاً فقط یک عدد معتبر وارد کنید.");
                state.price = price;
                state.action = "add_config_string";
                return bot.sendMessage(chatId, "لینک یا کانفیگ اتصال را ارسال کنید:");
            }
            if (state.action === "add_config_string") {
                state.config = text;
                state.action = "add_desc";
                return bot.sendMessage(chatId, "توضیحات تکمیلی را وارد کنید (یا کلمه 'ندارد' را بفرستید):");
            }
            if (state.action === "add_desc") {
                state.description = text === "ندارد" ? "" : text;
                
                db.addConfig(state);
                delete userState[userId];

                const configs = db.getConfigs();
                const packageKeyboard = [
                    [{ text: "➕ افزودن اشتراک", callback_data: "admin_add" }]
                ];
                configs.forEach(c => {
                    packageKeyboard.push([{ text: `${c.title} | ${c.volume} ✅`, callback_data: `edit_config_${c.id}` }]);
                });
                packageKeyboard.push([
                    { text: "🔙 بازگشت به مدیریت", callback_data: "menu_admin" },
                    { text: "🏠 گزینه‌های اصلی", callback_data: "menu_home" }
                ]);

                return bot.sendMessage(chatId, "📦 **مدیریت پکیج‌ها**\n\nپکیج جدید با موفقیت ثبت شد.", {
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: packageKeyboard }
                });
            }

            if (state.action === "broadcast_text") {
                delete userState[userId];
                bot.sendMessage(chatId, "📢 ارسال همگانی پیام آغاز شد...", getAdminPanelKeyboard());
                const allUsers = db.getAllUsers ? db.getAllUsers() : [];
                let count = 0;
                for (const u of allUsers) {
                    try {
                        await bot.sendMessage(u.user_id, text);
                        count++;
                    } catch (e) {}
                }
                return bot.sendMessage(chatId, `✔️ پیام همگانی به ${count} کاربر ارسال شد.`);
            }
        }
    }
});

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const username = query.from.username;
    const data = query.data;
    const isOwner = (userId === OWNER_ID) || (username === OWNER_USERNAME);

    try {
        if (data === "menu_home") {
            delete userState[userId];
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText(`✨ به پنل اختصاصی ${STORE_NAME} خوش آمدید.\n\nلطفاً از گزینه‌های زیر انتخاب کنید:`, {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineMenu(userId, username)
            });
        }

        if (data === "menu_buy") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("لطفاً بخش مورد نظر را انتخاب کنید:", {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📂 مشاهده لیست اشتراک‌ها", callback_data: "cat_all" }],
                        [{ text: "🔙 بازگشت به منو", callback_data: "menu_home" }]
                    ]
                }
            });
        }

        if (data === "menu_gift") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("🎁 در حال حاضر هدیه‌ای وجود ندارد.", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "menu_account") {
            const accountText = `👤 شناسه کاربری: \`${userId}\`\n` +
                `💰 موجودی کیف پول: **0 تومان**\n` +
                `📅 وضعیت حساب: عادی`;

            bot.answerCallbackQuery(query.id);
            return bot.editMessageText(accountText, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "➕ شارژ حساب", callback_data: "wallet_charge" },
                            { text: "🏷 ثبت کد تخفیف", callback_data: "wallet_gift" }
                        ],
                        [{ text: "🔙 بازگشت به منو", callback_data: "menu_home" }]
                    ]
                }
            });
        }

        if (data === "menu_my_subs") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("📌 شما در حال حاضر هیچ اشتراک فعالی ندارید.", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "menu_agency") {
            userState[userId] = { action: "waiting_agency_request" };
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("✍️ لطفاً درخواست خود را ارسال کنید:\n\nبرای لغو کلمه «انصراف» را بفرستید.", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "menu_invite") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("🌐 سیستم معرفی دوستان غیرفعال است.", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

        if (data === "menu_support") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText(`☎️ ارتباط با پشتیبانی:\n\nآیدی: \`@${OWNER_USERNAME}\``, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown",
                ...getInlineBack()
            });
        }

        if (data === "menu_admin" && isOwner) {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("🛠 **پنل مدیریت ربات**", {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown",
                ...getAdminPanelKeyboard()
            });
        }

        if (isOwner) {
            if (data === "admin_sub_management") {
                bot.answerCallbackQuery(query.id);
                const configs = db.getConfigs();
                const packageKeyboard = [
                    [{ text: "➕ افزودن اشتراک", callback_data: "admin_add" }]
                ];
                
                if (configs && configs.length > 0) {
                    configs.forEach(c => {
                        packageKeyboard.push([{ text: `${c.title} | ${c.volume} ✅`, callback_data: `edit_config_${c.id}` }]);
                    });
                }

                packageKeyboard.push([
                    { text: "🔙 بازگشت به مدیریت", callback_data: "menu_admin" },
                    { text: "🏠 گزینه‌های اصلی", callback_data: "menu_home" }
                ]);

                return bot.editMessageText("📦 **مدیریت پکیج‌ها**", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: packageKeyboard }
                });
            }

            if (data === "admin_sub_history") {
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("📦 سوابق فروش:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "Markdown",
                    ...getAdminBack()
                });
            }

            if (data === "admin_receipts") {
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("📁 رسیدی در انتظار وجود ندارد.", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "admin_charge_wallet") {
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("💰 شارژ دستی کیف پول:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "admin_messages") {
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("💬 پیام مشتریان:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "admin_stats") {
                const stats = db.getStats();
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText(`📊 **آمار ربات**\n\n👥 کاربران: ${stats.users}`, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "Markdown",
                    ...getAdminBack()
                });
            }

            if (data === "admin_forcesub") {
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("🔒 تنظیمات عضویت اجباری:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "admin_payment_settings") {
                const cardNum = db.getSetting("card_number") || "ثبت نشده";
                const cardHold = db.getSetting("card_holder") || "ثبت نشده";
                const bankName = db.getSetting("bank_name") || "ثبت نشده";
                const payGuide = db.getSetting("pay_guide") || "ثبت نشده";

                bot.answerCallbackQuery(query.id);
                return bot.editMessageText(`💳 **تنظیمات پرداخت**\n\n🏦 شماره کارت: \`${cardNum}\`\n👤 نام صاحب کارت: ${cardHold}\n🏦 نام بانک: ${bankName}\n📝 راهنما: ${payGuide}`, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "💳 شماره کارت", callback_data: "set_card" },
                                { text: "👤 صاحب کارت", callback_data: "set_holder" }
                            ],
                            [
                                { text: "🏦 نام بانک", callback_data: "set_bank" },
                                { text: "📝 راهنمای پرداخت", callback_data: "set_pay_guide" }
                            ],
                            [
                                { text: "🔙 بازگشت به مدیریت", callback_data: "menu_admin" },
                                { text: "🏠 گزینه‌های اصلی", callback_data: "menu_home" }
                            ]
                        ]
                    }
                });
            }

            if (data === "set_card") {
                userState[userId] = { action: "set_card_number" };
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("💳 شماره کارت جدید را ارسال کنید:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "set_holder") {
                userState[userId] = { action: "set_card_holder" };
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("👤 نام صاحب کارت جدید را ارسال کنید:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "set_bank") {
                userState[userId] = { action: "set_bank_name" };
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("🏦 نام بانک جدید را ارسال کنید:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "set_pay_guide") {
                userState[userId] = { action: "set_pay_guide_text" };
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("📝 متن راهنمای پرداخت را ارسال کنید:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "admin_delete_msg") {
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("🗑 حذف پیام:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "admin_broadcast") {
                userState[userId] = { action: "broadcast_text" };
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("📢 متن پیام همگانی را بفرستید:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "admin_customer_options") {
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("👤 گزینه‌های مشتریان:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "admin_pin_msg") {
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("📌 سنجاق پیام:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "admin_owner_start") {
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("🔄 ربات استارت خورد.", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }

            if (data === "admin_add") {
                userState[userId] = { action: "add_title" };
                bot.answerCallbackQuery(query.id);
                return bot.editMessageText("➕ عنوان محصول را وارد کنید:", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...getAdminBack()
                });
            }
        }

        if (data === "cat_all" || data.startsWith("cat_")) {
            const configs = db.getConfigs();
            if (!configs || configs.length === 0) {
                return bot.answerCallbackQuery(query.id, { text: "هیچ اشتراکی موجود نیست.", show_alert: true });
            }

            const inlineKeyboard = configs.map(c => [
                { text: `${c.title} | ${c.volume} - ${c.price} تومان`, callback_data: `buy_${c.id}` }
            ]);
            inlineKeyboard.push([{ text: "🔙 بازگشت به منو", callback_data: "menu_home" }]);

            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("لیست اشتراک‌های موجود:", {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: { inline_keyboard: inlineKeyboard }
            });
        }

        // رفع باگ خرید پکیج و تولید سفارش صحیح
        if (data.startsWith("buy_")) {
            const configId = parseInt(data.split("_")[1]);
            const config = db.getConfig(configId);

            if (!config) {
                return bot.answerCallbackQuery(query.id, { text: "پکیج مورد نظر یافت نشد.", show_alert: true });
            }

            const orderId = db.createOrder(userId, configId);

            const cardNum = db.getSetting("card_number") || "ثبت نشده";
            const cardHold = db.getSetting("card_holder") || "ثبت نشده";
            const payGuide = db.getSetting("pay_guide") || "لطفا پس از واریز رسید خود را ارسال کنید";

            const text = `💎 **لطفاً دقیقاً مبلغ تعیین شده را به شماره کارت زیر واریز کنید:**\n\n` +
                `💳 شماره کارت: \`${cardNum}\`\n` +
                `👤 نام صاحب کارت: ${cardHold}\n\n` +
                `💎 مبلغ قابل پرداخت:\n` +
                `**${config.price} تومان**\n\n` +
                `⚠️ **توجه:** لطفاً مبلغ را رند نکنید و دقیقاً **همین مبلغ** را واریز نمایید.\n\n` +
                `📝 ${payGuide}`;

            bot.answerCallbackQuery(query.id);
            return bot.editMessageText(text, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📥 ارسال رسید پرداخت", callback_data: `send_receipt_${orderId}` }],
                        [{ text: "❌ انصراف", callback_data: "menu_home" }]
                    ]
                }
            });
        }

        if (data.startsWith("send_receipt_")) {
            const orderId = parseInt(data.split("_")[2]);
            userState[userId] = { action: "waiting_receipt", orderId };

            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("💎 لطفاً عکس رسید کارت به کارت خود را ارسال کنید.\n\n(برای لغو کلمه «انصراف» را بفرستید)", {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown"
            });
        }

        // تأیید سفارش و ارسال کانفیگ به مشتری بدون باگ
        if (data.startsWith("approve_") && isOwner) {
            const orderId = parseInt(data.split("_")[1]);
            const order = db.getOrder(orderId);

            if (!order) {
                return bot.answerCallbackQuery(query.id, { text: "سفارش یافت نشد.", show_alert: true });
            }

            db.updateOrderStatus(orderId, "approved");
            db.markConfigSold(order.config_id);

            await bot.sendMessage(order.user_id, `🎉 **پرداخت و سفارش شما تأیید شد!**\n\nلینک اتصال / کانفیگ شما:\n\`${order.config}\``, {
                parse_mode: "Markdown"
            });

            bot.answerCallbackQuery(query.id, { text: "تأیید شد و کانفیگ ارسال گردید." });
            return bot.editMessageCaption(`✔️ **تأییدشده و کانفیگ ارسال شد**\n\n` + query.message.caption, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown"
            });
        }

        if (data.startsWith("reject_") && isOwner) {
            const orderId = parseInt(data.split("_")[1]);
            db.updateOrderStatus(orderId, "rejected");

            const order = db.getOrder(orderId);
            if (order) {
                await bot.sendMessage(order.user_id, "❌ متأسفانه رسید پرداختی شما رد شد.");
            }

            bot.answerCallbackQuery(query.id, { text: "رد شد." });
            return bot.editMessageCaption(`❌ **رد شده توسط مدیریت**\n\n` + query.message.caption, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown"
            });
        }

        if (data === "wallet_charge") {
            userState[userId] = { action: "waiting_wallet_amount" };
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("💳 لطفاً مبلغ مورد نظر برای شارژ حساب (به تومان) را وارد کنید:\n\n(برای لغو کلمه «انصراف» را بفرستید)", {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "Markdown"
            });
        }

        if (data === "wallet_gift") {
            bot.answerCallbackQuery(query.id);
            return bot.editMessageText("🎁 کد هدیه خود را ارسال کنید:", {
                chat_id: chatId,
                message_id: query.message.message_id,
                ...getInlineBack()
            });
        }

    } catch (error) {
        console.error("خطا:", error);
    }
});

console.log("🤖 ربات به‌روزرسانی شد و باگ‌های خرید اشتراک و دریافت کانفیگ برطرف گردید.");
