import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./arena.sqlite', (err) => {
    if (err) {
        console.error("خطا در اتصال به دیتابیس:", err.message);
    } else {
        console.log("متصل به پایگاه داده SQLite (arena.sqlite).");
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        firstName TEXT,
        username TEXT,
        balance INTEGER DEFAULT 0,
        joinedDate TEXT,
        isBlocked INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        price INTEGER,
        volume TEXT,
        duration TEXT,
        status INTEGER DEFAULT 1
    )`);

    // جدول انبار کانفیگ‌ها (برای تخصیص خودکار)
    db.run(`CREATE TABLE IF NOT EXISTS config_pool (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productId TEXT,
        config TEXT,
        status INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        orderId TEXT PRIMARY KEY,
        userId TEXT,
        productId TEXT,
        subName TEXT,
        price INTEGER,
        status TEXT,
        date TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        name TEXT,
        volume TEXT,
        duration TEXT,
        startDate TEXT,
        expireDate TEXT,
        config TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        amount INTEGER,
        type TEXT,
        description TEXT,
        date TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('cardNumber', '6037-9971-xxxx-xxxx')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('cardHolder', 'نام صاحب کارت')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('welcomeMessage', '✨ به پنل اختصاصی آرنا خوش آمدید.\\n\\nلطفاً از منوی زیر گزینه مورد نظر را انتخاب کنید:')`);
});

export default db;
