/** LỚP 2 – APPLICATION / SERVICE: use case điểm danh (Xem phiếu điểm danh · Lưu điểm danh). */
const attendanceBusiness = require('../../domain/business/attendanceBusiness');
const audit = require('../../domain/business/auditBusiness');
const { authorize } = require('../../domain/policies/permissionPolicy');
const { today } = require('../../shared/helpers');

async function getSheet(user, { sectionId, date }) {
  authorize(user, 'attendance.read');
  return attendanceBusiness.getSheet(user, sectionId, date || today());
}

async function save(user, sectionId, date, body) {
  authorize(user, 'attendance.write');
  const n = await attendanceBusiness.save(user, sectionId, date, body && body.records);
  await audit.record(user, 'UPDATE_ATTENDANCE', `${sectionId} ngày ${date}: ${n} sinh viên`);
  return n;
}

module.exports = { getSheet, save };
