/** LỚP 3 – DOMAIN: quy tắc quản lý giảng viên. */
const { lecturerRepository, classRepository, sectionRepository } = require('../../repositories');
const AppError = require('../errors/AppError');
const { Validator } = require('../validation/Validator');
const { DEGREES, CURRENT_SEMESTER } = require('../constants');
const catalog = require('./catalogBusiness');

const PHONE = /^0\d{9,10}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function list(filters) {
  const [lecturers, classes, sections, faculty] = await Promise.all([
    lecturerRepository.search(filters), classRepository.findAll(),
    sectionRepository.findAll({ semester: CURRENT_SEMESTER }), catalog.facultyNames(),
  ]);
  return lecturers.map((t) => ({
    ...t,
    facultyName: faculty[t.facultyId] || '',
    advisorOf: classes.filter((c) => c.advisorId === t.id).map((c) => c.id),
    currentSections: sections.filter((s) => s.lecturerId === t.id).length,
  }));
}

async function validate(body) {
  const data = new Validator(body)
    .string('fullName', 'Họ tên', { required: true, max: 100 })
    .oneOf('gender', 'Giới tính', ['Nam', 'Nữ'])
    .oneOf('degree', 'Học hàm/học vị', DEGREES)
    .string('facultyId', 'Khoa', { required: true })
    .string('phone', 'Số điện thoại', { pattern: PHONE, patternMsg: 'Số điện thoại gồm 10–11 số, bắt đầu bằng 0' })
    .string('email', 'Email', { max: 100, pattern: EMAIL, patternMsg: 'Email không hợp lệ' })
    .done();
  await catalog.assertFacultyExists(data.facultyId);
  return data;
}

async function create(body) {
  const data = await validate(body);
  const id = 'GV' + String((await lecturerRepository.maxSequence('GV')) + 1).padStart(3, '0');
  return lecturerRepository.insert({ id, ...data });
}

async function update(id, body) {
  if (!(await lecturerRepository.exists({ id }))) throw AppError.notFound('Không tìm thấy giảng viên');
  return lecturerRepository.update(id, await validate(body));
}

async function remove(id) {
  const t = await lecturerRepository.findById(id);
  if (!t) throw AppError.notFound('Không tìm thấy giảng viên');
  const advisor = (await classRepository.findAll({ advisorId: id })).map((c) => c.id);
  if (advisor.length) throw AppError.conflict(`Giảng viên đang làm cố vấn học tập lớp ${advisor.join(', ')}. Hãy đổi cố vấn trước khi xoá.`);
  const teaching = (await sectionRepository.findAll({ lecturerId: id })).map((s) => s.id);
  if (teaching.length) throw AppError.conflict(`Giảng viên đang phụ trách ${teaching.length} lớp học phần (${teaching.slice(0, 3).join(', ')}...). Hãy phân công giảng viên khác trước khi xoá.`);
  await lecturerRepository.delete(id);
  return t;
}

module.exports = { list, create, update, remove };
