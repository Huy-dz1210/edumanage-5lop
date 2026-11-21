/** LỚP 3 – DOMAIN: quy tắc sao lưu / khôi phục dữ liệu (NFR03). */
const { backupRepository } = require('../../repositories');
const AppError = require('../errors/AppError');

const NAME = /^db-[\w-]+\.json$/;

const list = () => backupRepository.list();
const create = (reason = 'manual') => backupRepository.create(reason);

/** Khôi phục: kiểm tra tên file, nội dung hợp lệ, tự sao lưu dữ liệu hiện tại trước khi ghi đè. */
async function restore(name) {
  if (!NAME.test(name)) throw AppError.badRequest('Tên bản sao lưu không hợp lệ');
  if (!(await backupRepository.exists(name))) throw AppError.notFound('Không tìm thấy bản sao lưu');
  const data = await backupRepository.read(name);
  if (!data || !Array.isArray(data.users) || !Array.isArray(data.students)) {
    throw AppError.badRequest('File sao lưu bị hỏng hoặc không đúng cấu trúc, không thể khôi phục');
  }
  await backupRepository.create('before-restore');
  await backupRepository.replaceAll(data);
}

module.exports = { list, create, restore };
