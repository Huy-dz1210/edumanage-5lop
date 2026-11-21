/** LỚP 3 – DOMAIN: quy tắc quản lý lớp sinh hoạt (lớp hành chính, có cố vấn học tập). */
const { classRepository, lecturerRepository, studentRepository } = require('../../repositories');
const AppError = require('../errors/AppError');
const { Validator } = require('../validation/Validator');
const catalog = require('./catalogBusiness');

async function list(filters) {
  const [classes, lecturers, students, faculty] = await Promise.all([
    classRepository.search(filters), lecturerRepository.findAll(), studentRepository.findAll(), catalog.facultyNames(),
  ]);
  return classes.map((c) => {
    const advisor = lecturers.find((x) => x.id === c.advisorId);
    const mine = students.filter((s) => s.classId === c.id);
    return {
      ...c,
      facultyName: faculty[c.facultyId] || '',
      advisorName: advisor ? `${advisor.degree}. ${advisor.fullName}` : '',
      studentCount: mine.length,
      activeCount: mine.filter((s) => s.status === 'Đang học').length,
    };
  });
}

async function validate(body) {
  const data = new Validator(body)
    .string('facultyId', 'Khoa', { required: true })
    .string('major', 'Ngành', { required: true, max: 100 })
    .string('cohort', 'Khoá', { required: true, pattern: /^K\d{2}$/, patternMsg: 'Khoá có dạng K22' })
    .string('advisorId', 'Cố vấn học tập', { max: 10 })
    .done();
  await catalog.assertFacultyExists(data.facultyId);
  if (data.advisorId && !(await lecturerRepository.exists({ id: data.advisorId }))) {
    throw AppError.badRequest('Giảng viên không tồn tại', { advisorId: 'Không tồn tại' });
  }
  data.advisorId = data.advisorId || null;
  return data;
}

async function create(body) {
  const { id } = new Validator(body)
    .string('id', 'Mã lớp', { required: true, max: 20, pattern: /^[A-Z0-9]+$/, patternMsg: 'Mã lớp gồm chữ in hoa và số, ví dụ DH24CNTT01' })
    .done();
  if (await classRepository.exists({ id })) throw AppError.conflict(`Lớp ${id} đã tồn tại`);
  return classRepository.insert({ id, ...(await validate(body)) });
}

async function update(id, body) {
  if (!(await classRepository.exists({ id }))) throw AppError.notFound('Không tìm thấy lớp');
  return classRepository.update(id, await validate(body));
}

async function remove(id) {
  if (!(await classRepository.exists({ id }))) throw AppError.notFound('Không tìm thấy lớp');
  const count = await studentRepository.count({ classId: id });
  if (count) throw AppError.conflict(`Lớp còn ${count} sinh viên. Hãy chuyển sinh viên sang lớp khác trước khi xoá.`);
  await classRepository.delete(id);
}

module.exports = { list, create, update, remove };
