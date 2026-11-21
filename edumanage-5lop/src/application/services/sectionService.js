/**
 * LỚP 2 – APPLICATION / SERVICE: use case lớp học phần.
 *  UC: Xem danh sách · Xem chi tiết + danh sách SV · Mở lớp · Sửa · Xoá · Đăng ký SV · Huỷ đăng ký
 */
const sectionBusiness = require('../../domain/business/sectionBusiness');
const audit = require('../../domain/business/auditBusiness');
const { authorize } = require('../../domain/policies/permissionPolicy');

async function list(user, filters) {
  authorize(user, 'section.read');
  return sectionBusiness.list(user, filters || {});
}

async function getById(user, id) {
  authorize(user, 'section.read');
  return sectionBusiness.getDetail(id);
}

async function create(user, body) {
  authorize(user, 'section.write');
  const item = await sectionBusiness.create(body);
  await audit.record(user, 'CREATE_SECTION', item.id);
  return item;
}

async function update(user, id, body) {
  authorize(user, 'section.write');
  const item = await sectionBusiness.update(id, body);
  await audit.record(user, 'UPDATE_SECTION', id);
  return item;
}

async function remove(user, id) {
  authorize(user, 'section.write');
  await sectionBusiness.remove(id);
  await audit.record(user, 'DELETE_SECTION', id);
}

async function enroll(user, id, studentIds) {
  authorize(user, 'enrollment.write');
  const n = await sectionBusiness.enroll(id, studentIds);
  await audit.record(user, 'ENROLL', `${id}: +${n} sinh viên`);
  return n;
}

async function unenroll(user, id, studentId) {
  authorize(user, 'enrollment.write');
  await sectionBusiness.unenroll(id, studentId);
  await audit.record(user, 'UNENROLL', `${id}: -${studentId}`);
}

module.exports = { list, getById, create, update, remove, enroll, unenroll };
