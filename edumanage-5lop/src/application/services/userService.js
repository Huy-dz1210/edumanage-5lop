/** LỚP 2 – APPLICATION / SERVICE: use case quản lý tài khoản (Xem · Tạo · Sửa/Đặt lại mật khẩu · Xoá). */
const userBusiness = require('../../domain/business/userBusiness');
const audit = require('../../domain/business/auditBusiness');
const { authorize } = require('../../domain/policies/permissionPolicy');

async function list(user) {
  authorize(user, 'user.manage');
  return userBusiness.list();
}

async function create(user, body) {
  authorize(user, 'user.manage');
  const item = await userBusiness.create(body);
  await audit.record(user, 'CREATE_USER', item.username);
  return item;
}

async function update(user, id, body) {
  authorize(user, 'user.manage');
  const { user: item, passwordReset } = await userBusiness.update(user.id, id, body);
  await audit.record(user, 'UPDATE_USER', item.username + (passwordReset ? ' (đặt lại mật khẩu)' : ''));
  return item;
}

async function remove(user, id) {
  authorize(user, 'user.manage');
  const item = await userBusiness.remove(user.id, id);
  await audit.record(user, 'DELETE_USER', item.username);
}

module.exports = { list, create, update, remove };
