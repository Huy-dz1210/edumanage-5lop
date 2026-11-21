/** LỚP 3 – DOMAIN: quy tắc quản lý học phần (môn học, số tín chỉ). */
const { courseRepository, sectionRepository } = require('../../repositories');
const AppError = require('../errors/AppError');
const { Validator } = require('../validation/Validator');
const { COURSE_TYPES } = require('../constants');
const catalog = require('./catalogBusiness');

async function list(filters) {
  const [courses, sections, faculty] = await Promise.all([courseRepository.search(filters), sectionRepository.findAll(), catalog.facultyNames()]);
  return courses.map((c) => ({
    ...c,
    facultyName: faculty[c.facultyId] || '',
    sectionCount: sections.filter((s) => s.courseId === c.id).length,
  }));
}

async function validate(body) {
  const data = new Validator(body)
    .string('name', 'Tên học phần', { required: true, max: 150 })
    .number('credits', 'Số tín chỉ', { required: true, min: 1, max: 10, integer: true })
    .string('facultyId', 'Khoa quản lý', { required: true })
    .oneOf('type', 'Loại học phần', COURSE_TYPES)
    .done();
  await catalog.assertFacultyExists(data.facultyId);
  return data;
}

async function create(body) {
  const { id } = new Validator(body)
    .string('id', 'Mã học phần', { required: true, max: 10, pattern: /^[A-Z]{2,4}\d{3,4}$/, patternMsg: 'Mã học phần có dạng IT006, EC010...' })
    .done();
  if (await courseRepository.exists({ id })) throw AppError.conflict(`Học phần ${id} đã tồn tại`);
  return courseRepository.insert({ id, ...(await validate(body)) });
}

async function update(id, body) {
  if (!(await courseRepository.exists({ id }))) throw AppError.notFound('Không tìm thấy học phần');
  return courseRepository.update(id, await validate(body));
}

async function remove(id) {
  const c = await courseRepository.findById(id);
  if (!c) throw AppError.notFound('Không tìm thấy học phần');
  const n = await sectionRepository.count({ courseId: id });
  if (n) throw AppError.conflict(`Học phần đã có ${n} lớp học phần, không thể xoá.`);
  await courseRepository.delete(id);
  return c;
}

module.exports = { list, create, update, remove };
