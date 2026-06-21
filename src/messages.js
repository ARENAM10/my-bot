${e(r.userContact)}\n` +
    `📊 وضعیت: ${statusLabel}\n`;

  if (r.adminNote) text += `📝 یادداشت ادمین: ${e(r.adminNote)}\n`;
  if (r.receiptImageUrl) text += `\n🖼 <a href="${e(r.receiptImageUrl)}">مشاهده تصویر رسید</a>`;

  if (r.status === "pending") {
    text += `\n\nتأیید: /approve_${r.id}   رد: /reject_${r.id}`;
  }

  return text;
}

export function broadcastSentText(count) {
  return `📢 <b>پیام ارسال شد.</b>\n\nبه ${count} کاربر ارسال شد.`;
}

export function broadcastUsageText() {
  return (
    `📢 <b>ارسال پیام همگانی</b>\n\n` +
    `برای ارسال پیام به تمام کاربران از دستور زیر استفاده کنید:\n\n` +
    `/broadcast &lt;متن پیام&gt;\n\n` +
    `<b>مثال:</b>\n` +
    `/broadcast پکیج‌های جدید اضافه شد!`
  );
}

export function notAdminText() {
  return "⛔️ شما دسترسی به این دستور را ندارید.";
}

export function noPackageSelectedText() {
  return "لطفاً ابتدا با زدن دکمه 📦 مشاهده پکیج‌ها یک پکیج انتخاب کنید.";
}

export function errorText() {
  return `⚠️ خطایی رخ داد. لطفاً مجدداً تلاش کنید یا با پشتیبانی ${SUPPORT} تماس بگیرید.`;
}
