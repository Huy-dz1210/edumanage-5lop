/** LỚP 3 – DOMAIN: điểm danh theo buổi học của lớp học phần. */
const { transaction, sectionRepository, enrollmentRepository, studentRepository, attendanceRepository } = require('../../repositories');
const AppError = require('../errors/AppError');
const { isValidDate } = require('../validation/Validator');
const { today } = require('../../shared/helpers');
const { authorizeSection } = require('../policies/permissionPolicy');

const STATUSES = ['present', 'absent', 'late'];

async function loadSection(user, sectionId) {
  const section = await sectionRepository.findById(sectionId);
  if (!section) throw AppError.notFound('Không tìm thấy lớp học phần');
  authorizeSection(user, section);
  return section;
}

function assertDate(date, { notFuture = false } = {}) {
  if (!isValidDate(date)) throw AppError.badRequest('Ngày không hợp lệ (định dạng YYYY-MM-DD)');
  if (notFuture && date > today()) throw AppError.badRequest('Không thể điểm danh cho ngày trong tương lai');
}

async function getSheet(user, sectionId, date) {
  assertDate(date);
  const section = await loadSection(user, sectionId);
  const ids = await enrollmentRepository.studentIdsOf(section.id);
  const [students, records, sessions] = await Promise.all([
    studentRepository.findAll({ id: ids }), attendanceRepository.findAll({ sectionId }), attendanceRepository.datesOf(sectionId),
  ]);
  const rows = students
    .map((s) => ({
      studentId: s.id,
      fullName: s.fullName,
      classId: s.classId,
      status: (records.find((r) => r.studentId === s.id && r.date === date) || {}).status || null,
      totalAbsences: records.filter((r) => r.studentId === s.id && r.status === 'absent').length,
    }))
    .sort((a, b) => a.studentId.localeCompare(b.studentId));
  const summary = { total: rows.length, present: 0, absent: 0, late: 0, unmarked: 0 };
  rows.forEach((r) => (r.status ? summary[r.status]++ : summary.unmarked++));
  return { sectionId, date, sessions, rows, summary };
}

/** records = { '2200001': 'present' | 'late' | 'absent' | null } – null để xoá trạng thái */
async function save(user, sectionId, date, records) {
  assertDate(date, { notFuture: true });
  const section = await loadSection(user, sectionId);
  if (!records || typeof records !== 'object') throw AppError.badRequest('Thiếu dữ liệu điểm danh');
  const enrolled = new Set(await enrollmentRepository.studentIdsOf(section.id));
  const entries = Object.entries(records);
  for (const [sid, st] of entries) {
    if (!enrolled.has(sid)) throw AppError.badRequest(`Sinh viên ${sid} không thuộc lớp học phần này`);
    if (st !== null && !STATUSES.includes(st)) throw AppError.badRequest(`Trạng thái của ${sid} không hợp lệ`);
  }
  await transaction(async () => {
    for (const [sid, st] of entries) {
      if (st === null) await attendanceRepository.deleteWhere({ sectionId, date, studentId: sid });
      else await attendanceRepository.upsert(sectionId, date, sid, st);
    }
  });
  return entries.length;
}

module.exports = { getSheet, save, STATUSES };
