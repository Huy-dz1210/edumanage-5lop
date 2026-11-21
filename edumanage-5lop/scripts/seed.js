/**
 * Tạo lại dữ liệu mẫu: npm run seed
 * File db.json hiện tại (nếu có) sẽ được sao lưu trước khi ghi đè.
 */
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { buildSeed } = require('../src/database/seed');

fs.mkdirSync(config.backupDir, { recursive: true });
if (fs.existsSync(config.dbFile)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(config.backupDir, `db-${stamp}-before-seed.json`);
  fs.copyFileSync(config.dbFile, dest);
  console.log('Đã sao lưu dữ liệu cũ:', dest);
}
fs.writeFileSync(config.dbFile, JSON.stringify(buildSeed(), null, 2));
console.log('Đã tạo dữ liệu mẫu tại', config.dbFile);
console.log('Tài khoản: admin / 123456 – gv01 / 123456 – sv01 / 123456');
