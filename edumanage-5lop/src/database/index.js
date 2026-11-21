/**
 * LỚP 5 – DATABASE: điểm kết nối CSDL dùng chung cho toàn ứng dụng.
 * Khi chuyển sang Microsoft SQL Server, chỉ cần thay file này (tạo connection pool)
 * và phần thân các hàm trong lớp Repository – các lớp phía trên giữ nguyên.
 */
const config = require('../config');
const JsonStore = require('./jsonStore');

module.exports = new JsonStore({ file: config.dbFile, backupDir: config.backupDir, maxBackups: config.maxBackups });
