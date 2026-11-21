/**
 * Cấu hình ứng dụng. Đọc biến môi trường (và file .env nếu có).
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');

// Trình đọc .env tối giản (không cần thêm thư viện dotenv)
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');

module.exports = {
  root: ROOT,
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  sessionMaxAgeMs: 8 * 60 * 60 * 1000, // 8 giờ
  dataDir,
  dbFile: path.join(dataDir, 'db.json'),
  backupDir: path.join(dataDir, 'backups'),
  maxBackups: Number(process.env.MAX_BACKUPS) || 10,
  autoBackupHours: Number(process.env.AUTO_BACKUP_HOURS) || 6,
  login: { maxAttempts: 5, lockMinutes: 15 },
};
