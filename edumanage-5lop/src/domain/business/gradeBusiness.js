/**
 * LỚP 3 – DOMAIN: nghiệp vụ điểm học phần, GPA và bảng điểm cá nhân.
 * Công thức tính điểm nằm ở rules/gradingRules.js.
 */
const {
  transaction, gradeRepository, sectionRepository, courseRepository, enrollmentRepository,
  studentRepository, classRepository, lecturerRepository, attendanceRepository,
} = require('../../repositories');
const AppError = require('../errors/AppError');
const { Validator } = require('../validation/Validator');
const { SEMESTERS } = require('../constants');
const { round2 } = require('../../shared/helpers');
const { PARTS, computeResult, computeGpa, classifyGpa } = require('../rules/gradingRules');
const { authorizeSection } = require('../policies/permissionPolicy');
const catalog = require('./catalogBusiness');

async function findSection(id) {
  const s = await sectionRepository.findById(id);
  if (!s) throw AppError.notFound('Không tìm thấy lớp học phần');
  return s;
}

/** Bảng điểm của một lớp học phần (giảng viên chỉ xem lớp mình dạy). */
async function listBySection(user, sectionId) {
  const section = await findSection(sectionId);
  authorizeSection(user, section);
  const [course, studentIds, grades] = await Promise.all([
    courseRepository.findById(section.courseId), enrollmentRepository.studentIdsOf(section.id), gradeRepository.findAll({ sectionId }),
  ]);
  const students = await studentRepository.findAll({ id: studentIds });
  const rows = students
    .map((s) => {
      const g = grades.find((x) => x.studentId === s.id) || {};
      const row = { studentId: s.id, fullName: s.fullName, classId: s.classId, attendance: g.attendance ?? null, midterm: g.midterm ?? null, final: g.final ?? null };
      return { ...row, ...computeResult(row) };
    })
    .sort((a, b) => a.studentId.localeCompare(b.studentId));
  return { section: { ...section, courseName: course ? course.name : '', credits: course ? course.credits : 0 }, rows };
}

function parseScores(item) {
  return new Validator(item)
    .number('attendance', 'Điểm chuyên cần', { min: 0, max: 10 })
    .number('midterm', 'Điểm giữa kỳ', { min: 0, max: 10 })
    .number('final', 'Điểm cuối kỳ', { min: 0, max: 10 })
    .done();
}

/** Lưu điểm hàng loạt: items = [{ studentId, attendance, midterm, final }]. Kiểm tra hết rồi mới ghi (transaction). */
async function saveMany(user, sectionId, items) {
  const section = await findSection(sectionId);
  authorizeSection(user, section);
  if (!Array.isArray(items)) throw AppError.badRequest('Thiếu danh sách điểm');
  const enrolled = new Set(await enrollmentRepository.studentIdsOf(section.id));
  const parsed = items.map((it) => {
    if (!enrolled.has(it.studentId)) throw AppError.badRequest(`Sinh viên ${it.studentId} không thuộc lớp học phần này`);
    try {
      return { studentId: it.studentId, scores: parseScores(it) };
    } catch (e) {
      throw AppError.badRequest(`Sinh viên ${it.studentId}: ${Object.values(e.details || {}).join('; ') || e.message}`);
    }
  });
  await transaction(async () => {
    for (const { studentId, scores } of parsed) {
      const clean = Object.fromEntries(PARTS.map((k) => [k, scores[k] === null ? null : round2(scores[k])]));
      await gradeRepository.upsert(section.id, studentId, clean);
    }
  });
  return { section, count: parsed.length };
}

/** Kết quả học tập đã quy đổi của các sinh viên: { studentId: [{ sectionId, credits, ...result }] } */
async function resultsByStudent(studentIds) {
  const [grades, sections, courses] = await Promise.all([
    gradeRepository.findAll(studentIds ? { studentId: studentIds } : undefined), sectionRepository.findAll(), courseRepository.findAll(),
  ]);
  const out = {};
  for (const g of grades) {
    const section = sections.find((s) => s.id === g.sectionId);
    const course = section && courses.find((c) => c.id === section.courseId);
    if (!course) continue;
    (out[g.studentId] = out[g.studentId] || []).push({ sectionId: g.sectionId, semester: section.semester, credits: course.credits, ...computeResult(g) });
  }
  return out;
}

/** Tổng hợp GPA tích lũy cho nhiều sinh viên: { studentId: { gpa, creditsAttempted, creditsEarned, classification } } */
async function summaries(studentIds) {
  const results = await resultsByStudent(studentIds);
  const out = {};
  for (const id of studentIds) {
    const done = (results[id] || []).filter((r) => r.total !== null);
    const gpa = computeGpa(done);
    out[id] = {
      gpa,
      creditsAttempted: done.reduce((s, r) => s + r.credits, 0),
      creditsEarned: done.filter((r) => r.passed).reduce((s, r) => s + r.credits, 0),
      classification: classifyGpa(gpa),
    };
  }
  return out;
}

/** Bảng điểm cá nhân theo từng học kỳ. */
async function transcript(studentId) {
  const student = await studentRepository.findById(studentId);
  if (!student) throw AppError.notFound('Không tìm thấy sinh viên');
  const cls = (await classRepository.findById(student.classId)) || {};
  const [advisor, faculty, sectionIds, grades, lecturers, courses] = await Promise.all([
    cls.advisorId ? lecturerRepository.findById(cls.advisorId) : null, catalog.facultyNames(),
    enrollmentRepository.sectionIdsOf(studentId), gradeRepository.findAll({ studentId }),
    lecturerRepository.findAll(), courseRepository.findAll(),
  ]);
  const sections = await sectionRepository.findAll({ id: sectionIds });
  const absences = await attendanceRepository.findAll({ studentId, status: 'absent' });

  const semesters = SEMESTERS.map((semester) => {
    const rows = sections
      .filter((s) => s.semester === semester)
      .map((s) => {
        const course = courses.find((c) => c.id === s.courseId) || { name: '', credits: 0 };
        const lecturer = lecturers.find((l) => l.id === s.lecturerId);
        const g = grades.find((x) => x.sectionId === s.id) || {};
        return {
          sectionId: s.id, courseId: s.courseId, courseName: course.name, credits: course.credits,
          lecturerName: lecturer ? `${lecturer.degree}. ${lecturer.fullName}` : '',
          attendance: g.attendance ?? null, midterm: g.midterm ?? null, final: g.final ?? null,
          absences: absences.filter((a) => a.sectionId === s.id).length,
          ...computeResult(g),
        };
      })
      .sort((a, b) => a.courseId.localeCompare(b.courseId));
    return {
      semester,
      rows,
      credits: rows.reduce((s, r) => s + r.credits, 0),
      gpa: computeGpa(rows.filter((r) => r.total !== null)),
    };
  }).filter((s) => s.rows.length);

  return {
    student: {
      ...student,
      facultyName: faculty[cls.facultyId] || '',
      major: cls.major || '',
      cohort: cls.cohort || '',
      advisorName: advisor ? `${advisor.degree}. ${advisor.fullName}` : '',
    },
    summary: (await summaries([studentId]))[studentId],
    semesters,
  };
}

module.exports = { listBySection, saveMany, summaries, transcript };
