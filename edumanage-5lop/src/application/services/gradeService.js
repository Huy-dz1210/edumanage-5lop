/** LỚP 2 – APPLICATION / SERVICE: use case nhập điểm (Xem bảng điểm lớp học phần · Lưu điểm). */
const gradeBusiness = require('../../domain/business/gradeBusiness');
const audit = require('../../domain/business/auditBusiness');
const { authorize } = require('../../domain/policies/permissionPolicy');

async function listBySection(user, sectionId) {
  authorize(user, 'grade.read');
  return gradeBusiness.listBySection(user, sectionId);
}

async function saveMany(user, sectionId, body) {
  authorize(user, 'grade.write');
  const { count } = await gradeBusiness.saveMany(user, sectionId, body && body.items);
  await audit.record(user, 'UPDATE_GRADE', `${sectionId}: ${count} sinh viên`);
  return count;
}

module.exports = { listBySection, saveMany };
