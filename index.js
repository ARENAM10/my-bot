import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";
import http from "http";

const TOKEN = "8850301156:AAGXFnSqSwyGbvPtucnkZdXhkLWIQi2GpWo";
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });
const db = new sqlite3.Database("./arena_shop.db");

// ساخت جدول کاربران در دیتابیس
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        joined_at TEXT
    )`);
});

bot.onText(/\/start/, (msg) => {
    const { id, username, first_name } = msg.from;
    const now = new Date().toISOString();

    // ذخیره یا آپدیت کاربر در دیتابیس
    db.run(`INSERT INTO users (id, username, first_name, joined_at) 
            VALUES (?, ?, ?, ?) 
            ON CONFLICT(id) DO UPDATE SET username = ?, first_name = ?`,
        [id, username || "none", first_name || "User", now, username || "none", first_name || "User"], () => {
            bot.sendMessage(id, `سلام ${first_name || "کاربر"} عزیز!\nدیتابیس متصل شد و نام شما با موفقیت ذخیره گردید. 🟢`);
        });
});

http.createServer((req, res) => {
    res.end("Bot is alive!");
}).listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
