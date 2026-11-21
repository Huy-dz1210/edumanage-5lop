/** LỚP 3 – DOMAIN: lớp học phần – mở lớp, phân công giảng viên, đăng ký sinh viên. */
const {
  transaction, sectionRepository, courseRepository, lecturerRepository, enrollmentRepository,
  studentRepository, gradeRepository, attendanceRepository,
} = require('../../repositories');
const AppError = require('../errors/AppError');
const { Validator } = require('../validation/Validator');
const { SEMESTERS } = require('../constants');
const { normalize } = require('../../shared/helpers');

/** Gắn tên học phần, số tín chỉ, tên giảng viên, sĩ số đã đăng ký. */
async function enrich(sections) {
  const [courses, lecturers, counts] = await Promise.all([courseRepository.findAll(), lecturerRepository.findAll(), enrollmentRepository.countBySection()]);
  return sections.map((s) => {
    const course = courses.find((c) => c.id === s.courseId) || {};
    const lecturer = lecturers.find((l) => l.id === s.lecturerId);
    return {
      ...s,
      courseName: course.name || '',
      credits: course.credits || 0,
      lecturerName: lecturer ? `${lecturer.degree}. ${lecturer.fullName}` : 'Chưa phân công',
      enrolled: counts[s.id] || 0,
    };
  });
}

/** filters.lecturerId = 'me' → lớp của giảng viên đang đăng nhập */
async function list(user, { semester = '', courseId = '', lecturerId = '', q = '' } = {}) {
  if (lecturerId === 'me') lecturerId = user.lecturerId || '__none__';
  const term = normalize(q);
  return (await enrich(await sectionRepository.search({ semester, courseId, lecturerId })))
    .filter((s) => !term || normalize(`${s.id} ${s.courseName} ${s.lecturerName}`).includes(term))
    .sort((a, b) => SEMESTERS.indexOf(b.semester) - SEMESTERS.indexOf(a.semester) || a.id.localeCompare(b.id));
}

async function findSection(id) {
  const s = await sectionRepository.findById(id);
  if (!s) throw AppError.notFound('Không tìm thấy lớp học phần');
  return s;
}

async function getDetail(id) {
  const [section] = await enrich([await findSection(id)]);
  const ids = await enrollmentRepository.studentIdsOf(id);
  const students = (await studentRepository.findAll({ id: ids }))
    .map((x) => ({ id: x.id, fullName: x.fullName, classId: x.classId, status: x.status }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return { ...section, students };
}

async function validate(body) {
  const data = new Validator(body)
    .string('courseId', 'Học phần', { required: true })
    .string('lecturerId', 'Giảng viên', { required: true })
    .oneOf('semester', 'Học kỳ', SEMESTERS)
    .string('room', 'Phòng học', { max: 20 })
    .string('schedule', 'Lịch học', { max: 60 })
    .number('capacity', 'Sĩ số tối đa', { required: true, min: 1, max: 300, integer: true })
    .done();
  if (!(await courseRepository.exists({ id: data.courseId }))) throw AppError.badRequest('Học phần không tồn tại', { courseId: 'Không tồn tại' });
  if (!(await lecturerRepository.exists({ id: data.lecturerId }))) throw AppError.badRequest('Giảng viên không tồn tại', { lecturerId: 'Không tồn tại' });
  return data;
}

/** Mã lớp học phần = mã học phần + số thứ tự: IT003-01, IT003-02... */
async function create(body) {
  const data = await validate(body);
  return transaction(async () => {
    const n = (await sectionRepository.maxSequence(`${data.courseId}-`)) + 1;
    const section = await sectionRepository.insert({ id: `${data.courseId}-${String(n).padStart(2, '0')}`, ...data });
    return (await enrich([section]))[0];
  });
}

async function update(id, body) {
  const s = await findSection(id);
  const data = await validate(body);
  if (data.courseId !== s.courseId) throw AppError.badRequest('Không thể đổi học phần của lớp đã mở', { courseId: 'Không thể đổi học phần' });
  const enrolled = await enrollmentRepository.count({ sectionId: id });
  if (data.capacity < enrolled) throw AppError.badRequest(`Sĩ số tối đa không được nhỏ hơn số SV đã đăng ký (${enrolled})`, { capacity: 'Nhỏ hơn số SV đã đăng ký' });
  return (await enrich([await sectionRepository.update(id, data)]))[0];
}

async function remove(id) {
  await findSection(id);
  if (await gradeRepository.exists({ sectionId: id })) {
    throw AppError.conflict('Lớp học phần đã có điểm, không thể xoá. Hãy xoá sinh viên khỏi lớp trước nếu cần.');
  }
  await transaction(async () => {
    await enrollmentRepository.deleteWhere({ sectionId: id });
    await attendanceRepository.deleteWhere({ sectionId: id });
    await sectionRepository.delete(id);
  });
}

/**
 * Đăng ký sinh viên vào lớp học phần. Quy tắc:
 *  - Bỏ qua SV đã có trong lớp hoặc không ở trạng thái "Đang học"
 *  - Không đăng ký trùng cùng học phần trong cùng học kỳ
 *  - Không vượt sĩ số tối đa
 */
async function enroll(id, studentIds) {
  const s = await findSection(id);
  const ids = Array.isArray(studentIds) ? [...new Set(studentIds)] : [];
  if (!ids.length) throw AppError.badRequest('Chưa chọn sinh viên nào');

  const current = new Set(await enrollmentRepository.studentIdsOf(id));
  const sameCourse = (await sectionRepository.findAll({ courseId: s.courseId, semester: s.semester })).filter((o) => o.id !== id);
  const toAdd = [];
  for (const sid of ids) {
    const st = await studentRepository.findById(sid);
    if (!st) throw AppError.notFound(`Không tìm thấy sinh viên ${sid}`);
    if (current.has(sid) || st.status !== 'Đang học') continue;
    for (const o of sameCourse) {
      if (await enrollmentRepository.exists({ sectionId: o.id, studentId: sid })) {
        throw AppError.conflict(`Sinh viên ${sid} đã đăng ký học phần này ở lớp ${o.id}`);
      }
    }
    toAdd.push(sid);
  }
  if (current.size + toAdd.length > s.capacity) {
    throw AppError.conflict(`Vượt sĩ số tối đa (${s.capacity}). Còn trống ${s.capacity - current.size} chỗ.`);
  }
  const now = new Date().toISOString();
  await enrollmentRepository.insertMany(toAdd.map((studentId) => ({ sectionId: id, studentId, enrolledAt: now })));
  return toAdd.length;
}

/** Huỷ đăng ký: xoá luôn điểm và điểm danh của SV trong lớp này. */
async function unenroll(id, studentId) {
  await findSection(id);
  if (!(await enrollmentRepository.exists({ sectionId: id, studentId }))) throw AppError.notFound('Sinh viên không có trong lớp học phần này');
  await transaction(async () => {
    await enrollmentRepository.deleteWhere({ sectionId: id, studentId });
    await gradeRepository.deleteWhere({ sectionId: id, studentId });
    await attendanceRepository.deleteWhere({ sectionId: id, studentId });
  });
}

module.exports = { list, getDetail, create, update, remove, enroll, unenroll };
