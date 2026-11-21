/** LỚP 3 – DOMAIN: danh mục dùng chung (khoa, học kỳ, thang điểm...). */
const { facultyRepository, metaRepository } = require('../../repositories');
const C = require('../constants');
const AppError = require('../errors/AppError');

async function getCatalog() {
  const [meta, faculties] = await Promise.all([metaRepository.get(), facultyRepository.findAll()]);
  return {
    schoolName: meta.schoolName,
    faculties,
    semesters: C.SEMESTERS,
    currentSemester: C.CURRENT_SEMESTER,
    weights: C.WEIGHTS,
    gradeScale: C.GRADE_SCALE,
    studentStatuses: C.STUDENT_STATUSES,
    degrees: C.DEGREES,
    courseTypes: C.COURSE_TYPES,
  };
}

/** Bảng tra cứu nhanh tên khoa: { CNTT: 'Công nghệ thông tin', ... } */
async function facultyNames() {
  return Object.fromEntries((await facultyRepository.findAll()).map((f) => [f.id, f.name]));
}

async function assertFacultyExists(facultyId) {
  if (!(await facultyRepository.exists({ id: facultyId }))) {
    throw AppError.badRequest('Khoa không tồn tại', { facultyId: 'Không tồn tại' });
  }
}

module.exports = { getCatalog, facultyNames, assertFacultyExists };
