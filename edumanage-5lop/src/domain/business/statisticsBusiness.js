/** LỚP 3 – DOMAIN: số liệu thống kê cho Dashboard. */
const { sectionRepository, studentRepository, lecturerRepository, courseRepository, classRepository, facultyRepository, attendanceRepository, metaRepository } = require('../../repositories');
const { CURRENT_SEMESTER } = require('../constants');
const { today } = require('../../shared/helpers');
const gradeBusiness = require('./gradeBusiness');
const sectionBusiness = require('./sectionBusiness');

async function overview(user) {
  const isLecturer = user.role === 'lecturer';
  const [meta, students, lecturers, courseCount, classes, faculties, sectionsNow] = await Promise.all([
    metaRepository.get(), studentRepository.findAll(), lecturerRepository.findAll(), courseRepository.count(),
    classRepository.findAll(), facultyRepository.findAll(),
    sectionRepository.findAll(isLecturer ? { semester: CURRENT_SEMESTER, lecturerId: user.lecturerId } : { semester: CURRENT_SEMESTER }),
  ]);

  // Điểm danh 7 ngày gần nhất trên các lớp học phần đang mở
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(new Date(Date.now() - i * 86400000).toLocaleDateString('sv-SE'));
  const counts = await attendanceRepository.countByDateStatus(sectionsNow.map((s) => s.id), days);
  const last7 = days.map((date) => ({ date, present: 0, late: 0, absent: 0, ...counts[date] }));
  const t = last7[last7.length - 1];

  // Xếp loại học lực theo GPA tích lũy
  const active = students.filter((s) => s.status === 'Đang học');
  const sums = await gradeBusiness.summaries(active.map((s) => s.id));
  const classification = { 'Xuất sắc': 0, 'Giỏi': 0, 'Khá': 0, 'Trung bình': 0, 'Yếu': 0, 'Chưa có điểm': 0 };
  const ranked = active.map((s) => {
    classification[sums[s.id].classification]++;
    return { id: s.id, fullName: s.fullName, classId: s.classId, ...sums[s.id] };
  });
  const withGpa = ranked.filter((r) => r.gpa !== null);
  const facultyOf = (classId) => (classes.find((c) => c.id === classId) || {}).facultyId;

  return {
    schoolName: meta.schoolName,
    currentSemester: CURRENT_SEMESTER,
    date: today(),
    totals: {
      students: students.length,
      activeStudents: active.length,
      lecturers: lecturers.length,
      courses: courseCount,
      currentSections: sectionsNow.length,
    },
    attendanceToday: { ...t, marked: t.present + t.late + t.absent },
    attendanceLast7Days: last7,
    classification,
    averageGpa: withGpa.length ? Math.round((withGpa.reduce((s, r) => s + r.gpa, 0) / withGpa.length) * 100) / 100 : null,
    topStudents: withGpa.sort((a, b) => b.gpa - a.gpa).slice(0, 5),
    byFaculty: faculties.map((f) => ({
      id: f.id,
      name: f.name,
      students: active.filter((s) => facultyOf(s.classId) === f.id).length,
      lecturers: lecturers.filter((l) => l.facultyId === f.id).length,
    })),
    mySections: isLecturer ? await sectionBusiness.list(user, { semester: CURRENT_SEMESTER, lecturerId: 'me' }) : [],
  };
}

module.exports = { overview };
