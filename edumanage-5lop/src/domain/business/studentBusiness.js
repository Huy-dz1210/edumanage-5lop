/** LỚP 3 – DOMAIN: quy tắc quản lý sinh viên. MSSV tự cấp theo khoá: K22 → 22xxxxx. */
const {
  transaction, studentRepository, classRepository, enrollmentRepository,
  gradeRepository, attendanceRepository, userRepository,
} = require('../../repositories');
const AppError = require('../errors/AppError');
const { Validator } = require('../validation/Validator');
const { STUDENT_STATUSES } = require('../constants');
const { today } = require('../../shared/helpers');
const catalog = require('./catalogBusiness');
const gradeBusiness = require('./gradeBusiness');

const PHONE = /^0\d{9,10}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Gắn thêm thông tin khoa, ngành, GPA cho danh sách sinh viên. */
async function enrich(students) {
  const [classes, faculty, sums] = await Promise.all([
    classRepository.findAll(), catalog.facultyNames(), gradeBusiness.summaries(students.map((s) => s.id)),
  ]);
  return students.map((s) => {
    const cls = classes.find((c) => c.id === s.classId) || {};
    const sum = sums[s.id];
    return {
      ...s,
      facultyId: cls.facultyId || '',
      facultyName: faculty[cls.facultyId] || '',
      major: cls.major || '',
      cohort: cls.cohort || '',
      gpa: sum.gpa,
      creditsEarned: sum.creditsEarned,
      classification: sum.classification,
    };
  });
}

async function list({ q = '', classId = '', facultyId = '', status = '' } = {}) {
  const classIds = facultyId ? (await classRepository.findAll({ facultyId })).map((c) => c.id) : null;
  return enrich(await studentRepository.search({ q, classId, classIds, status }));
}

async function getById(id) {
  const s = await studentRepository.findById(id);
  if (!s) throw AppError.notFound('Không tìm thấy sinh viên');
  return (await enrich([s]))[0];
}

async function validate(body) {
  const data = new Validator(body)
    .string('fullName', 'Họ tên', { required: true, max: 100 })
    .oneOf('gender', 'Giới tính', ['Nam', 'Nữ'])
    .date('dob', 'Ngày sinh', { required: true })
    .string('classId', 'Lớp sinh hoạt', { required: true })
    .string('email', 'Email', { max: 100, pattern: EMAIL, patternMsg: 'Email không hợp lệ' })
    .string('phone', 'Số điện thoại', { pattern: PHONE, patternMsg: 'Số điện thoại gồm 10–11 số, bắt đầu bằng 0' })
    .string('hometown', 'Quê quán', { max: 100 })
    .oneOf('status', 'Tình trạng', STUDENT_STATUSES, { defaultValue: 'Đang học' })
    .custom('dob', (v) => (v && v > today() ? 'Ngày sinh không được ở tương lai' : null))
    .done();
  if (!(await classRepository.exists({ id: data.classId }))) throw AppError.badRequest('Lớp không tồn tại', { classId: 'Lớp không tồn tại' });
  return data;
}

/** Quy tắc cấp MSSV: 2 số cuối của khoá + 5 chữ số thứ tự. */
async function nextStudentId(classId) {
  const cls = await classRepository.findById(classId);
  const yy = cls.cohort.slice(1);
  return yy + String((await studentRepository.maxSequenceOfCohort(yy)) + 1).padStart(5, '0');
}

async function create(body) {
  const data = await validate(body);
  return transaction(async () => {
    const id = await nextStudentId(data.classId);
    await studentRepository.insert({ id, ...data, email: data.email || `${id}@sv.edumanage.edu.vn`, createdAt: new Date().toISOString() });
    return getById(id);
  });
}

async function update(id, body) {
  if (!(await studentRepository.exists({ id }))) throw AppError.notFound('Không tìm thấy sinh viên');
  await studentRepository.update(id, { ...(await validate(body)), updatedAt: new Date().toISOString() });
  return getById(id);
}

/** Xoá sinh viên và toàn bộ dữ liệu liên quan trong một transaction. */
async function remove(id) {
  const s = await studentRepository.findById(id);
  if (!s) throw AppError.notFound('Không tìm thấy sinh viên');
  await transaction(async () => {
    await enrollmentRepository.deleteWhere({ studentId: id });
    await gradeRepository.deleteWhere({ studentId: id });
    await attendanceRepository.deleteWhere({ studentId: id });
    await userRepository.updateWhere({ studentId: id }, { active: false });
    await studentRepository.delete(id);
  });
  return s;
}

module.exports = { list, getById, create, update, remove };
