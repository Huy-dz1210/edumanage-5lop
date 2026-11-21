/**
 * Điểm khởi chạy – lắp ráp 5 lớp:
 *   1. Presentation  (src/presentation)  ← giao diện + nhận request
 *   2. Application   (src/application)   ← điều phối use case
 *   3. Domain        (src/domain)        ← quy tắc nghiệp vụ, xác thực, phân quyền
 *   4. Repository    (src/repositories)  ← truy vấn / thêm / sửa / xoá / transaction
 *   5. Database      (src/database)      ← lưu trữ dữ liệu
 */
const config = require('./config');
const database = require('./database');
const createApp = require('./presentation/http/app');
const systemService = require('./application/services/systemService');

database.load();

if (config.isProd && config.sessionSecret === 'dev-only-secret-change-me') {
  console.error('[!] Chưa đặt SESSION_SECRET cho môi trường production. Dừng khởi động.');
  process.exit(1);
}

const app = createApp();

// Sao lưu tự động khi khởi động và định kỳ (NFR03)
const autoBackup = () => systemService.autoBackup().then((n) => console.log('[backup] Đã sao lưu', n)).catch((e) => console.error('[backup] Lỗi:', e.message));
autoBackup();
setInterval(autoBackup, config.autoBackupHours * 3600 * 1000).unref();

const server = app.listen(config.port, () => {
  console.log(`\n  EduManage University đang chạy tại http://localhost:${config.port}`);
  console.log('  Tài khoản demo: admin / 123456 (Phòng đào tạo) – gv01 / 123456 (giảng viên) – sv01 / 123456 (sinh viên)\n');
});

const shutdown = () => {
  console.log('\nĐang dừng server...');
  server.close(() => database.save().finally(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
