import { Bot, InlineKeyboard } from "grammy";
import express from "express";
import {
  getPackages,
  getSettings,
  submitReceipt,
  getReceipt,
  listPendingReceipts,
  approveReceipt,
  rejectReceipt,
} from "./api.js";
import {
  welcomeText,
  packagesText,
  paymentText,
  askUsernameText,
  askReceiptText,
  receiptReceivedText,
  configDeliveredText,
  receiptRejectedText,
  adminNotificationText,
  helpText,
  noPackageSelectedText,
  errorText,
  pendingListText,
  approveSuccessText,
  rejectSuccessText,
  adminHelpText,
  receiptStatusText,
  broadcastSentText,
  broadcastUsageText,
  notAdminText,
} from "./messages.js";
import { registerUser, getAllUsers } from "./userStore.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const PORT = process.env.BOT_HEALTH_PORT || 3001;

if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}

// ─── Caches (avoid redundant API calls) ──────────────────────────────────────
let cachedPackages = null;
let cachedSettings = null;
let cacheTs = 0;
const CACHE_TTL = 60_000;

async function getPackagesCached() {
  if (!cachedPackages || Date.now() - cacheTs > CACHE_TTL) {
    cachedPackages = await getPackages();
    cachedSettings = await getSettings();
    cacheTs = Date.now();
  }
  return cachedPackages;
}

async function getSettingsCached() {
  await getPackagesCached();
  return cachedSettings;
}

// ─── Session state ────────────────────────────────────────────────────────────
const sessions = new Map();

function getSession(chatId) {
  if (!sessions.has(chatId)) sessions.set(chatId, { step: "idle" });
  return sessions.get(chatId);
}

function setSession(chatId, data) {
  sessions.set(chatId, { ...getSession(chatId), ...data });
}

// ─── Pending config delivery: receiptId → { chatId, configLink } ─────────────
const pendingDelivery = new Map();

const POLL_INTERVAL_MS = 30_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isAdmin(chatId) {
  return ADMIN_CHAT_ID && String(chatId) === String(ADMIN_CHAT_ID);
}

const mainKeyboard = {
  keyboard: [
    [{ text: "📦 مشاهده پکیج‌ها" }],
    [{ text: "ℹ️ راهنما" }, { text: "📞 پشتیبانی" }],
  ],
  resize_keyboard: true,
};

// ─── Bot ──────────────────────────────────────────────────────────────────────
const bot = new Bot(TOKEN);

// Global error handler — never crashes the process
bot.catch((err) => {
  console.error("Bot error:", err.message ?? err);
});

// ─── /start ───────────────────────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  const chatId = ctx.chat.id;
  registerUser(chatId);
  setSession(chatId, { step: "idle" });
  const me = await ctx.api.getMe();
  await ctx.reply(welcomeText(me.first_name), {
    parse_mode: "HTML",
    reply_markup: mainKeyboard,
  });
});

// ─── Admin commands ───────────────────────────────────────────────────────────
bot.command("adminhelp", async (ctx) => {
  if (!isAdmin(ctx.chat.id)) { await ctx.reply(notAdminText()); return; }
  await ctx.reply(adminHelpText(), { parse_mode: "HTML" });
});

bot.command("pending", async (ctx) => {
  if (!isAdmin(ctx.chat.id)) { await ctx.reply(notAdminText()); return; }
  try {
    const receipts = await listPendingReceipts();
    await ctx.reply(pendingListText(receipts), { parse_mode: "HTML" });
  } catch (err) {
    console.error("/pending error:", err.message);
    await ctx.reply(errorText());
  }
});

// /approve_<id> [note]
bot.hears(/^\/approve_(\d+)(.*)$/, async (ctx) => {
  if (!isAdmin(ctx.chat.id)) { await ctx.reply(notAdminText()); return; }
  const id = parseInt(ctx.match[1], 10);
  const note = ctx.match[2].trim();
  try {
    await approveReceipt(id, note);
    await ctx.reply(approveSuccessText(id, note), { parse_mode: "HTML" });

    const entry = pendingDelivery.get(id);
    if (entry) {
      const receipt = await getReceipt(id);
      const link = entry.configLink || receipt.configLink || "—";
      await ctx.api
        .sendMessage(entry.chatId, configDeliveredText(link), { parse_mode: "HTML" })
        .catch((e) => console.error("Deliver config error:", e.message));
      pendingDelivery.delete(id);
    }
  } catch (err) {
    console.error(`/approve_${id} error:`, err.message);
    await ctx.reply(`⚠️ خطا در تأیید رسید #${id}: ${err.message}`);
  }
});

// /reject_<id> [reason]
bot.hears(/^\/reject_(\d+)(.*)$/, async (ctx) => {
  if (!isAdmin(ctx.chat.id)) { await ctx.reply(notAdminText()); return; }
  const id = parseInt(ctx.match[1], 10);
  const note = ctx.match[2].trim();
  try {
    await rejectReceipt(id, note);
    await ctx.reply(rejectSuccessText(id, note), { parse_mode: "HTML" });

    const entry = pendingDelivery.get(id);
    if (entry) {
      await ctx.api
        .sendMessage(entry.chatId, receiptRejectedText(note), { parse_mode: "HTML" })
        .catch((e) => console.error("Reject notify error:", e.message));
      pendingDelivery.delete(id);
    }
  } catch (err) {
    console.error(`/reject_${id} error:`, err.message);
    await ctx.reply(`⚠️ خطا در رد رسید #${id}: ${err.message}`);
  }
});

// /status_<id>
bot.hears(/^\/status_(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.chat.id)) { await ctx.reply(notAdminText()); return; }
  const id = parseInt(ctx.match[1], 10);
  try {
    const receipt = await getReceipt(id);
    await ctx.reply(receiptStatusText(receipt), {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: false },
    });
  } catch (err) {
    console.error(`/status_${id} error:`, err.message);
    await ctx.reply(`⚠️ رسید #${id} یافت نشد.`);
  }
});

// /broadcast <message>
bot.hears(/^\/broadcast(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.chat.id)) { await ctx.reply(notAdminText()); return; }
  const text = ctx.match[1].trim();
  const users = getAllUsers().filter((id) => String(id) !== String(ADMIN_CHAT_ID));
  let sent = 0;
  for (const chatId of users) {
    try {
      await ctx.api.sendMessage(
        chatId,
        `📢 <b>پیام از ادمین:</b>\n\n${text}`,
        { parse_mode: "HTML" }
      );
      sent++;
    } catch (e) {
      console.error(`broadcast to ${chatId} failed:`, e.message);
    }
  }
  await ctx.reply(broadcastSentText(sent), { parse_mode: "HTML" });
});

bot.command("broadcast", async (ctx) => {
  if (!isAdmin(ctx.chat.id)) { await ctx.reply(notAdminText()); return; }
  await ctx.reply(broadcastUsageText(), { parse_mode: "HTML" });
});

// ─── Inline button: package selection ────────────────────────────────────────
bot.callbackQuery(/^pkg_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat.id;
  const pkgId = parseInt(ctx.match[1], 10);
  try {
    const packages = await getPackagesCached();
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) {
      await ctx.reply("⚠️ این پکیج یافت نشد. لطفاً مجدداً تلاش کنید.");
      return;
    }
    const settings = await getSettingsCached();
    setSession(chatId, { step: "awaiting_username", selectedPackage: pkg });
    await ctx.reply(paymentText(pkg, settings), { parse_mode: "HTML" });
    await ctx.reply(askUsernameText(), { parse_mode: "HTML" });
  } catch (err) {
    console.error("Package callback error:", err.message);
    await ctx.reply(errorText());
  }
});

// ─── Text messages ────────────────────────────────────────────────────────────
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  registerUser(chatId);
  const text = ctx.message.text;

  if (text === "📦 مشاهده پکیج‌ها" || text === "/packages") {
    try {
      const packages = await getPackagesCached();
      if (!packages.length) {
        await ctx.reply("❌ در حال حاضر پکیجی موجود نیست. لطفاً بعداً مراجعه کنید.");
        return;
      }
      const keyboard = new InlineKeyboard();
      for (const pkg of packages) {
        keyboard.text(
          `${pkg.name} — ${Number(pkg.price).toLocaleString("fa-IR")} تومان`,
          `pkg_${pkg.id}`
        ).row();
      }
      await ctx.reply(packagesText(packages), {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (err) {
      console.error("View packages error:", err.message);
      await ctx.reply(errorText());
    }
    return;
  }

  if (text === "ℹ️ راهنما" || text === "/help") {
    await ctx.reply(helpText(), { parse_mode: "HTML" });
    return;
  }

  if (text === "📞 پشتیبانی") {
    await ctx.reply(
      `📞 <b>پشتیبانی</b>\n\nبرای دریافت کمک با @ARENAM10 در ارتباط باشید.`,
      { parse_mode: "HTML" }
    );
    return;
  }

  const session = getSession(chatId);

  if (session.step === "awaiting_username") {
    setSession(chatId, { username: text, step: "awaiting_contact" });
    await ctx.reply(
      `📞 لطفاً <b>راه ارتباطی</b> خود را وارد کنید.\n\n<i>(مثلاً: t.me/نام_کاربری یا شماره تلفن)</i>`,
      { parse_mode: "HTML" }
    );
    return;
  }

  if (session.step === "awaiting_contact") {
    setSession(chatId, { contact: text, step: "awaiting_receipt" });
    await ctx.reply(askReceiptText(), { parse_mode: "HTML" });
    return;
  }
});

// ─── Photo: receipt submission ────────────────────────────────────────────────
bot.on("message:photo", async (ctx) => {
  const chatId = ctx.chat.id;
  const session = getSession(chatId);

  if (session.step !== "awaiting_receipt") {
    await ctx.reply(noPackageSelectedText());
    return;
  }

  const pkg = session.selectedPackage;
  const contact = session.contact || String(chatId);
  const from = ctx.message.from;
  const username =
    session.username ||
    (from?.username ? `@${from.username}` : from?.first_name || String(chatId));

  // Build Telegram file URL
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const file = await ctx.api.getFile(photo.file_id);
  const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;

  try {
    const receipt = await submitReceipt({
      username,
      userContact: contact,
      packageId: pkg.id,
      packageName: pkg.name,
      receiptImageUrl: fileUrl,
    });

    pendingDelivery.set(receipt.id, { chatId, configLink: pkg.configLink });
    setSession(chatId, { step: "idle", selectedPackage: null, contact: null, username: null });

    await ctx.reply(receiptReceivedText(), {
      parse_mode: "HTML",
      reply_markup: mainKeyboard,
    });

    if (ADMIN_CHAT_ID) {
      await ctx.api
        .sendMessage(
          ADMIN_CHAT_ID,
          adminNotificationText(username, contact, pkg.name, pkg.price, receipt.id),
          { parse_mode: "HTML" }
        )
        .catch((e) => console.error("Admin notify failed:", e.message));
      await ctx.api
        .forwardMessage(ADMIN_CHAT_ID, chatId, ctx.message.message_id)
        .catch((e) => console.error("Forward receipt failed:", e.message));
    }
  } catch (err) {
    console.error("submitReceipt error:", err.message);
    await ctx.reply(errorText());
  }
});

// ─── Approved/rejected receipt polling ───────────────────────────────────────
async function pollReceipts() {
  if (!pendingDelivery.size) return;
  for (const [receiptId, { chatId, configLink }] of pendingDelivery.entries()) {
    try {
      const receipt = await getReceipt(receiptId);
      if (receipt.status === "approved") {
        await bot.api.sendMessage(chatId, configDeliveredText(configLink || "—"), {
          parse_mode: "HTML",
        });
        pendingDelivery.delete(receiptId);
      } else if (receipt.status === "rejected") {
        await bot.api.sendMessage(chatId, receiptRejectedText(receipt.adminNote), {
          parse_mode: "HTML",
        });
        pendingDelivery.delete(receiptId);
      }
    } catch (err) {
      console.error(`Poll receipt #${receiptId} error:`, err.message);
    }
  }
}

setInterval(pollReceipts, POLL_INTERVAL_MS);

// ─── Express health server (for UptimeRobot) ──────────────────────────────────
const app = express();

app.get("/bot-ping", (_req, res) => {
  res.json({ status: "ok", bot: "@ARENA10_BOT", uptime: Math.floor(process.uptime()) });
});

app.get("/", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`✅ Health server listening on port ${PORT}`);
});

// ─── Start polling ────────────────────────────────────────────────────────────
bot.start({
  allowed_updates: ["message", "callback_query"],
  onStart: (me) => {
    console.log(`✅ Bot running: @${me.username} (id: ${me.id})`);
    if (!ADMIN_CHAT_ID) {
      console.warn("⚠️  ADMIN_CHAT_ID not set — admin notifications disabled.");
    } else {
      console.log(`✅ Admin notifications → chat ID: ${ADMIN_CHAT_ID}`);
    }
  },
}).catch((err) => {
  console.error("Failed to start bot:", err.message);
  process.exit(1);
})
