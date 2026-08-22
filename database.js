import Database from "better-sqlite3";

const db = new Database("arena.db");

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    volume TEXT NOT NULL,
    duration TEXT NOT NULL,
    price INTEGER NOT NULL,
    config TEXT NOT NULL,
    description TEXT DEFAULT '',
    sold INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    config_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    receipt TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);
`);

export function addUser(user) {
    db.prepare(`
        INSERT INTO users (id, username, first_name)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            username=excluded.username,
            first_name=excluded.first_name
    `).run(
        user.id,
        user.username || "",
        user.first_name || ""
    );
}

export function addConfig(data) {
    const result = db.prepare(`
        INSERT INTO configs
        (title, category, volume, duration, price, config, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        data.title,
        data.category,
        data.volume,
        data.duration,
        data.price,
        data.config,
        data.description || ""
    );

    return result.lastInsertRowid;
}

export function getConfigs(category = null) {
    if (category) {
        return db.prepare(`
            SELECT * FROM configs
            WHERE category = ? AND sold = 0
            ORDER BY id DESC
        `).all(category);
    }

    return db.prepare(`
        SELECT * FROM configs
        WHERE sold = 0
        ORDER BY id DESC
    `).all();
}

export function getConfig(id) {
    return db.prepare(`
        SELECT * FROM configs WHERE id = ?
    `).get(id);
}

export function deleteConfig(id) {
    return db.prepare(`
        DELETE FROM configs WHERE id = ?
    `).run(id);
}

export function updatePrice(id, price) {
    return db.prepare(`
        UPDATE configs SET price = ? WHERE id = ?
    `).run(price, id);
}

export function createOrder(userId, configId) {
    const result = db.prepare(`
        INSERT INTO orders (user_id, config_id)
        VALUES (?, ?)
    `).run(userId, configId);

    return result.lastInsertRowid;
}

export function setReceipt(orderId, receipt) {
    return db.prepare(`
        UPDATE orders
        SET receipt = ?
        WHERE id = ?
    `).run(receipt, orderId);
}

export function getOrder(id) {
    return db.prepare(`
        SELECT
            orders.*,
            configs.title,
            configs.volume,
            configs.duration,
            configs.price,
            configs.config,
            users.username,
            users.first_name
        FROM orders
        JOIN configs ON configs.id = orders.config_id
        JOIN users ON users.id = orders.user_id
        WHERE orders.id = ?
    `).get(id);
}

export function updateOrderStatus(id, status) {
    return db.prepare(`
        UPDATE orders SET status = ? WHERE id = ?
    `).run(status, id);
}

export function markConfigSold(id) {
    return db.prepare(`
        UPDATE configs SET sold = 1 WHERE id = ?
    `).run(id);
}

export function getPendingOrders() {
    return db.prepare(`
        SELECT
            orders.*,
            configs.title,
            configs.volume,
            configs.duration,
            configs.price,
            users.username,
            users.first_name
        FROM orders
        JOIN configs ON configs.id = orders.config_id
        JOIN users ON users.id = orders.user_id
        WHERE orders.status = 'pending'
        ORDER BY orders.id DESC
    `).all();
}

export function getStats() {
    return {
        users: db.prepare(`
            SELECT COUNT(*) AS count FROM users
        `).get().count,

        configs: db.prepare(`
            SELECT COUNT(*) AS count FROM configs
            WHERE sold = 0
        `).get().count,

        orders: db.prepare(`
            SELECT COUNT(*) AS count FROM orders
        `).get().count,

        completed: db.prepare(`
            SELECT COUNT(*) AS count
            FROM orders
            WHERE status = 'approved'
        `).get().count,

        revenue: db.prepare(`
            SELECT COALESCE(SUM(configs.price), 0) AS total
            FROM orders
            JOIN configs ON configs.id = orders.config_id
            WHERE orders.status = 'approved'
        `).get().total
    };
}

export function getUsers() {
    return db.prepare(`
        SELECT * FROM users ORDER BY id DESC
    `).all();
}
