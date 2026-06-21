import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_PATH = `${__dirname}/../data/users.json`;

function load() {
  try {
    if (existsSync(STORE_PATH)) {
      return new Set(JSON.parse(readFileSync(STORE_PATH, "utf8")));
    }
  } catch {}
  return new Set();
}

function save(set) {
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify([...set]), "utf8");
  } catch (e) {
    console.error("userStore save error:", e.message);
  }
}

const users = load();

export function registerUser(chatId) {
  const id = String(chatId);
  if (!users.has(id)) {
    users.add(id);
    save(users);
  }
}

export function getAllUsers() {
  return [...users];
}

export function userCount() {
  return users.size;
}
