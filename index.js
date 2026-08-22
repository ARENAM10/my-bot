// ===============================
// 📦 مدیریت دستی کانفیگ‌ها
// ===============================

function configAdminKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "➕ افزودن کانفیگ", callback_data: "config_add" }],
      [
        { text: "📋 کانفیگ‌های آزاد", callback_data: "config_available" },
        { text: "🔴 فروخته‌شده‌ها", callback_data: "config_sold" }
      ],
      [
        { text: "📊 موجودی کانفیگ‌ها", callback_data: "config_stock" },
        { text: "🗑 حذف کانفیگ", callback_data: "config_delete" }
      ],
      [{ text: "🔙 بازگشت به مدیریت", callback_data: "open_admin_panel" }]
    ]
  };
}

function sendConfigAdmin(chatId, edit = false, messageId = null) {
  const text =
`📦 مدیریت کانفیگ‌ها

از این بخش می‌توانید کانفیگ‌ها را به‌صورت دستی وارد کنید.

➕ افزودن کانفیگ جدید
📋 مشاهده کانفیگ‌های آزاد
🔴 مشاهده کانفیگ‌های فروخته‌شده
📊 مشاهده موجودی
🗑 حذف کانفیگ`;

  const options = {
    reply_markup: configAdminKeyboard()
  };

  if (edit) {
    return bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      ...options
    }).catch(() => {});
  }

  return bot.sendMessage(chatId, text, options);
}


// وضعیت موقت عملیات ادمین
const adminState = {};


// انتخاب محصول برای افزودن کانفیگ
function configProductKeyboard() {
  const rows = db.products.map(p => [
    {
      text: `📦 ${p.name} | ${p.volume}GB | ${p.days} روز`,
      callback_data: `config_product:${p.id}`
    }
  ]);

  rows.push([
    { text: "🔙 بازگشت", callback_data: "admin_configs" }
  ]);

  return { inline_keyboard: rows };
}[
  { text: "📦 مدیریت کانفیگ‌ها", callback_data: "admin_configs" }
],// ===============================
// 📦 پنل مدیریت کانفیگ
// ===============================

if (data === "admin_configs") {
  return sendConfigAdmin(chatId, true, messageId);
}


// ➕ افزودن کانفیگ
if (data === "config_add") {

  adminState[chatId] = {
    action: "select_config_product"
  };

  return bot.editMessageText(
    "📦 محصولی که می‌خواهید کانفیگ به آن اضافه شود را انتخاب کنید:",
    {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: configProductKeyboard()
    }
  ).catch(() => {});
}


// انتخاب محصول
if (data.startsWith("config_product:")) {

  const productId = Number(data.split(":")[1]);

  const product = db.products.find(p => p.id === productId);

  if (!product) {
    return bot.sendMessage(chatId, "❌ محصول پیدا نشد.");
  }

  adminState[chatId] = {
    action: "waiting_config",
    productId
  };

  return bot.editMessageText(
`🔐 افزودن کانفیگ

📦 محصول:
${product.name}

💾 حجم:
${product.volume}GB

📅 مدت:
${product.days} روز

حالا کانفیگ را در یک پیام ارسال کنید.

مثال:

vless://example...

برای لغو:
لغو`,
    {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ لغو", callback_data: "admin_configs" }]
        ]
      }
    }
  ).catch(() => {});
}


// 📋 کانفیگ‌های آزاد
if (data === "config_available") {

  const available = db.configs.filter(c => !c.sold);

  if (!available.length) {
    return bot.editMessageText(
      "📋 هیچ کانفیگ آزادی وجود ندارد.",
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: configAdminKeyboard()
      }
    );
  }

  let text = "📋 کانفیگ‌های آزاد\n\n";

  available.slice(0, 50).forEach((c, index) => {

    const product = db.products.find(p => p.id === c.productId);

    text +=
`#${c.id}
📦 ${product ? product.name : "نامشخص"}
💾 ${product ? product.volume : "-"}GB
🟢 آزاد

`;

  });

  return bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: configAdminKeyboard()
  }).catch(() => {});
}


// 🔴 کانفیگ‌های فروخته‌شده
if (data === "config_sold") {

  const sold = db.configs.filter(c => c.sold);

  if (!sold.length) {
    return bot.editMessageText(
      "🔴 هنوز کانفیگی فروخته نشده است.",
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: configAdminKeyboard()
      }
    );
  }

  let text = "🔴 کانفیگ‌های فروخته‌شده\n\n";

  sold.slice(-30).reverse().forEach(c => {

    const product = db.products.find(p => p.id === c.productId);

    text +=
`#${c.id}
📦 ${product ? product.name : "نامشخص"}
👤 خریدار: ${c.soldTo || "-"}
🧾 سفارش: #${c.orderId || "-"}
📅 ${new Date(c.soldAt).toLocaleString("fa-IR")}

`;

  });

  return bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: configAdminKeyboard()
  }).catch(() => {});
}


// 📊 موجودی
if (data === "config_stock") {

  let text = "📊 موجودی کانفیگ‌ها\n\n";

  db.products.forEach(product => {

    const total = db.configs.filter(
      c => c.productId === product.id
    ).length;

    const available = db.configs.filter(
      c => c.productId === product.id && !c.sold
    ).length;

    const sold = total - available;

    text +=
`📦 ${product.name}
💾 ${product.volume}GB
📅 ${product.days} روز

📥 کل: ${total}
🟢 آزاد: ${available}
🔴 فروخته: ${sold}

──────────────

`;
  });

  return bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: configAdminKeyboard()
  }).catch(() => {});
}


// 🗑 حذف کانفیگ
if (data === "config_delete") {

  const available = db.configs.filter(c => !c.sold);

  if (!available.length) {
    return bot.editMessageText(
      "❌ کانفیگ آزادی برای حذف وجود ندارد.",
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: configAdminKeyboard()
      }
    );
  }

  const rows = available.slice(0, 30).map(c => {

    const product = db.products.find(p => p.id === c.productId);

    return [{
      text: `🗑 #${c.id} | ${product?.name || "نامشخص"} | ${product?.volume || "-"}GB`,
      callback_data: `config_remove:${c.id}`
    }];

  });

  rows.push([
    { text: "🔙 بازگشت", callback_data: "admin_configs" }
  ]);

  return bot.editMessageText(
    "🗑 کانفیگی را که می‌خواهید حذف کنید انتخاب کنید:",
    {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: rows }
    }
  ).catch(() => {});
}


// حذف واقعی کانفیگ
if (data.startsWith("config_remove:")) {

  const configId = Number(data.split(":")[1]);

  const index = db.configs.findIndex(
    c => c.id === configId && !c.sold
  );

  if (index === -1) {
    return bot.answerCallbackQuery(query.id, {
      text: "❌ کانفیگ پیدا نشد.",
      show_alert: true
    });
  }

  db.configs.splice(index, 1);

  saveDb();

  return bot.editMessageText(
    "✅ کانفیگ با موفقیت حذف شد.",
    {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: configAdminKeyboard()
    }
  ).catch(() => {});
  }// ===============================
// 🔐 دریافت کانفیگ از مالک
// ===============================

bot.on("message", async msg => {

  if (!msg.text) return;
  if (!isOwner(msg.from)) return;

  const state = adminState[msg.chat.id];

  if (!state) return;

  if (msg.text.trim() === "لغو") {

    delete adminState[msg.chat.id];

    return sendConfigAdmin(msg.chat.id);
  }

  if (state.action !== "waiting_config") return;

  const configText = msg.text.trim();

  if (configText.length < 10) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ کانفیگ معتبر به نظر نمی‌رسد.\nلطفاً کانفیگ کامل را ارسال کنید."
    );
  }

  const product = db.products.find(
    p => p.id === state.productId
  );

  if (!product) {
    delete adminState[msg.chat.id];

    return bot.sendMessage(
      msg.chat.id,
      "❌ محصول پیدا نشد."
    );
  }

  const newConfig = {
    id: db.configs.length
      ? Math.max(...db.configs.map(c => c.id)) + 1
      : 1,

    productId: product.id,

    config: configText,

    sold: false,

    soldTo: null,

    orderId: null,

    createdAt: Date.now(),

    soldAt: null
  };

  db.configs.push(newConfig);

  // افزایش موجودی محصول
  product.stock =
    db.configs.filter(
      c => c.productId === product.id && !c.sold
    ).length;

  saveDb();

  delete adminState[msg.chat.id];

  return bot.sendMessage(
    msg.chat.id,
`✅ کانفیگ با موفقیت اضافه شد.

🆔 شناسه: #${newConfig.id}

📦 محصول:
${product.name}

💾 حجم:
${product.volume}GB

📅 مدت:
${product.days} روز

🟢 وضعیت:
آماده فروش

📊 موجودی فعلی:
${product.stock}`,
    {
      reply_markup: configAdminKeyboard()
    }
  );
});async function createConfigForProduct(product, user, orderId) {

  const index = db.configs.findIndex(
    c => c.productId === product.id && !c.sold
  );

  if (index === -1) {
    throw new Error("NO_CONFIG_AVAILABLE");
  }

  const config = db.configs[index];

  config.sold = true;
  config.soldTo = user.id;
  config.orderId = orderId;
  config.soldAt = Date.now();

  product.stock =
    db.configs.filter(
      c => c.productId === product.id && !c.sold
    ).length;

  saveDb();

  return config.config;
      }const config = await createConfigForProduct(
  product,
  user,
  order.id
);
