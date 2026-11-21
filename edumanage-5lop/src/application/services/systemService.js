/** LỚP 2 – APPLICATION / SERVICE: use case hệ thống (Xem nhật ký · Sao lưu · Khôi phục · Sao lưu tự động). */
const backupBusiness = require('../../domain/business/backupBusiness');
const audit = require('../../domain/business/auditBusiness');
const { authorize } = require('../../domain/policies/permissionPolicy');

async function auditLogs(user, filters) {
  authorize(user, 'system.manage');
  return audit.search(filters || {});
}

async function listBackups(user) {
  authorize(user, 'system.manage');
  return backupBusiness.list();
}

async function createBackup(user) {
  authorize(user, 'system.manage');
  const name = await backupBusiness.create('manual');
  await audit.record(user, 'BACKUP', name);
  return name;
}

async function restoreBackup(user, name) {
  authorize(user, 'system.manage');
  await backupBusiness.restore(name);
  await audit.record(user, 'RESTORE', name);
}

/** Sao lưu tự động (do server gọi định kỳ, không cần người dùng). */
const autoBackup = () => backupBusiness.create('auto');

module.exports = { auditLogs, listBackups, createBackup, restoreBackup, autoBackup };
