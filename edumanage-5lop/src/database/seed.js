/**
 * LỚP 5 – DATABASE: dữ liệu mẫu ban đầu (được tạo khi chưa có data/db.json).
 * Dữ liệu tổ chức theo dạng BẢNG quan hệ (mỗi mảng = 1 bảng) để sau này chuyển sang SQL Server dễ dàng.
 * Mật khẩu được băm bằng bcrypt – không lưu dạng rõ (NFR02).
 */
const bcrypt = require('bcryptjs');
// Học kỳ trong dữ liệu mẫu (khớp với cấu hình ở src/domain/constants.js)
const SEMESTERS = ['HK1 2025-2026', 'HK2 2025-2026', 'HK1 2026-2027'];
const CURRENT_SEMESTER = 'HK1 2026-2027';

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

function buildSeed() {
  const rand = rng(2026);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const hash = (p) => bcrypt.hashSync(p, 10);
  const now = new Date().toISOString();

  const faculties = [
    { id: 'CNTT', name: 'Công nghệ thông tin' },
    { id: 'KT', name: 'Kinh tế' },
    { id: 'NN', name: 'Ngoại ngữ' },
    { id: 'CB', name: 'Khoa học cơ bản' },
  ];

  const lecturers = [
    ['GV001', 'Nguyễn Văn An', 'Nam', 'TS', 'CNTT'],
    ['GV002', 'Trần Thị Bình', 'Nữ', 'ThS', 'CNTT'],
    ['GV003', 'Lê Hoàng Cường', 'Nam', 'ThS', 'CNTT'],
    ['GV004', 'Phạm Thu Dung', 'Nữ', 'TS', 'KT'],
    ['GV005', 'Hoàng Minh Đức', 'Nam', 'ThS', 'KT'],
    ['GV006', 'Vũ Ngọc Hà', 'Nữ', 'ThS', 'NN'],
    ['GV007', 'Đặng Quốc Huy', 'Nam', 'TS', 'NN'],
    ['GV008', 'Bùi Thị Lan', 'Nữ', 'PGS.TS', 'CB'],
  ].map(([id, fullName, gender, degree, facultyId], i) => ({
    id, fullName, gender, degree, facultyId,
    email: `${id.toLowerCase()}@edumanage.edu.vn`,
    phone: '090' + String(1234561 + i),
  }));

  const classes = [
    { id: 'DH22CNTT01', major: 'Kỹ thuật phần mềm', facultyId: 'CNTT', cohort: 'K22', advisorId: 'GV001' },
    { id: 'DH23CNTT01', major: 'Hệ thống thông tin', facultyId: 'CNTT', cohort: 'K23', advisorId: 'GV002' },
    { id: 'DH22KT01', major: 'Quản trị kinh doanh', facultyId: 'KT', cohort: 'K22', advisorId: 'GV004' },
    { id: 'DH23KT01', major: 'Kế toán', facultyId: 'KT', cohort: 'K23', advisorId: 'GV005' },
    { id: 'DH22NN01', major: 'Ngôn ngữ Anh', facultyId: 'NN', cohort: 'K22', advisorId: 'GV007' },
  ];

  const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ'];
  const demNam = ['Văn', 'Minh', 'Gia', 'Thanh', 'Quốc', 'Bảo', 'Hải', 'Đức'];
  const demNu = ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Bảo', 'Khánh', 'Mỹ', 'Phương'];
  const tenNam = ['Huy', 'Khoa', 'Long', 'Nam', 'Phúc', 'Quân', 'Sơn', 'Tuấn', 'Việt', 'Đạt', 'Hiếu', 'Thắng'];
  const tenNu = ['Anh', 'Chi', 'Hương', 'Linh', 'Mai', 'Ngân', 'Oanh', 'Trang', 'Vy', 'Yến', 'Thảo', 'Nhi'];
  const provinces = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương', 'Long An', 'Khánh Hòa', 'Nghệ An', 'Lâm Đồng'];

  const students = [];
  const ability = {};
  const seq = {};
  for (const cls of classes) {
    const yy = cls.cohort.slice(1);
    const birthYear = 2000 + Number(yy) - 18;
    for (let i = 0; i < 8; i++) {
      seq[yy] = (seq[yy] || 0) + 1;
      const male = rand() > 0.5;
      const last = pick(ho);
      const id = yy + String(seq[yy]).padStart(5, '0');
      students.push({
        id,
        fullName: `${last} ${pick(male ? demNam : demNu)} ${pick(male ? tenNam : tenNu)}`,
        gender: male ? 'Nam' : 'Nữ',
        dob: `${birthYear}-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
        classId: cls.id,
        email: `${id}@sv.edumanage.edu.vn`,
        phone: '09' + String(10000000 + Math.floor(rand() * 89999999)),
        hometown: pick(provinces),
        status: i === 7 && cls.cohort === 'K23' ? 'Bảo lưu' : 'Đang học',
        createdAt: now,
      });
      ability[id] = 4.5 + rand() * 5;
    }
  }

  const courses = [
    ['IT001', 'Nhập môn lập trình', 3, 'CNTT', 'Bắt buộc'],
    ['IT002', 'Cấu trúc dữ liệu và giải thuật', 3, 'CNTT', 'Bắt buộc'],
    ['IT003', 'Cơ sở dữ liệu', 3, 'CNTT', 'Bắt buộc'],
    ['IT004', 'Lập trình Web', 3, 'CNTT', 'Tự chọn'],
    ['IT005', 'Mạng máy tính', 3, 'CNTT', 'Bắt buộc'],
    ['EC001', 'Kinh tế vi mô', 3, 'KT', 'Bắt buộc'],
    ['EC002', 'Nguyên lý kế toán', 3, 'KT', 'Bắt buộc'],
    ['EC003', 'Marketing căn bản', 2, 'KT', 'Tự chọn'],
    ['EN001', 'Tiếng Anh 1', 3, 'NN', 'Bắt buộc'],
    ['EN002', 'Kỹ năng Nghe – Nói', 2, 'NN', 'Bắt buộc'],
    ['EN003', 'Ngữ pháp tiếng Anh nâng cao', 3, 'NN', 'Tự chọn'],
    ['GE001', 'Triết học Mác – Lênin', 3, 'CB', 'Bắt buộc'],
    ['GE002', 'Toán cao cấp', 2, 'CB', 'Bắt buộc'],
  ].map(([id, name, credits, facultyId, type]) => ({ id, name, credits, facultyId, type }));

  const lecturerOf = { IT001: 'GV002', IT002: 'GV001', IT003: 'GV001', IT004: 'GV003', IT005: 'GV003', EC001: 'GV004', EC002: 'GV005', EC003: 'GV004', EN001: 'GV006', EN002: 'GV007', EN003: 'GV007', GE001: 'GV008', GE002: 'GV008' };

  // Chương trình học theo khoa qua từng học kỳ
  const plan = {
    CNTT: [['GE001', 'IT001', 'EN001'], ['GE002', 'IT002', 'IT005'], ['IT003', 'IT004']],
    KT: [['GE001', 'EC001', 'EN001'], ['GE002', 'EC002'], ['EC003', 'EN002']],
    NN: [['GE001', 'EN001'], ['GE002', 'EN002'], ['EN003']],
  };
  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const periods = ['tiết 1–3', 'tiết 4–6', 'tiết 7–9', 'tiết 10–12'];

  const sections = [];
  const grades = [];
  const attendance = {};
  const clamp = (x) => Math.max(0, Math.min(10, Math.round(x * 2) / 2));

  SEMESTERS.forEach((semester, si) => {
    for (const facultyId of ['CNTT', 'KT', 'NN']) {
      for (const courseId of plan[facultyId][si]) {
        const n = sections.filter((s) => s.courseId === courseId).length + 1;
        const studentIds = students
          .filter((s) => classes.find((c) => c.id === s.classId).facultyId === facultyId && s.status === 'Đang học')
          .map((s) => s.id);
        const section = {
          id: `${courseId}-${String(n).padStart(2, '0')}`,
          courseId,
          lecturerId: lecturerOf[courseId],
          semester,
          room: `${pick(['A', 'B', 'C'])}${1 + Math.floor(rand() * 4)}0${1 + Math.floor(rand() * 8)}`,
          schedule: `${pick(days)}, ${pick(periods)}`,
          capacity: 60,
          studentIds,
        };
        sections.push(section);
        const current = semester === CURRENT_SEMESTER;
        for (const sid of studentIds) {
          const a = ability[sid];
          grades.push({
            sectionId: section.id,
            studentId: sid,
            attendance: clamp(a + 2 + rand() * 2),
            midterm: clamp(a + (rand() - 0.5) * 3),
            final: current ? null : clamp(a + (rand() - 0.5) * 3.5),
            updatedAt: now,
          });
        }
        // Điểm danh 4 buổi gần nhất cho học kỳ hiện tại
        if (current) {
          attendance[section.id] = {};
          for (let w = 4; w >= 1; w--) {
            const date = new Date(Date.now() - w * 86400000).toLocaleDateString('sv-SE');
            attendance[section.id][date] = {};
            for (const sid of studentIds) {
              const r = rand();
              attendance[section.id][date][sid] = r < 0.85 ? 'present' : r < 0.93 ? 'late' : 'absent';
            }
          }
        }
      }
    }
  });

  const users = [
    { id: 'U001', username: 'admin', passwordHash: hash('123456'), fullName: 'Phòng Đào tạo', role: 'admin', lecturerId: null, studentId: null, active: true, createdAt: now, lastLoginAt: null },
    { id: 'U002', username: 'gv01', passwordHash: hash('123456'), fullName: 'Nguyễn Văn An', role: 'lecturer', lecturerId: 'GV001', studentId: null, active: true, createdAt: now, lastLoginAt: null },
    { id: 'U003', username: 'sv01', passwordHash: hash('123456'), fullName: students[0].fullName, role: 'student', lecturerId: null, studentId: students[0].id, active: true, createdAt: now, lastLoginAt: null },
  ];

  return toRelational({
    meta: { version: 2, createdAt: now, schoolName: 'Trường Đại học EduManage' },
    users, faculties, lecturers, classes, students, courses, sections, grades, attendance,
    auditLogs: [],
  });
}

/**
 * Chuyển dữ liệu dạng lồng nhau (phiên bản 2) sang dạng bảng quan hệ (phiên bản 3):
 *  - sections[].studentIds  → bảng enrollments { sectionId, studentId }
 *  - attendance { sectionId: { date: { studentId: status } } } → bảng attendance { sectionId, date, studentId, status }
 */
function toRelational(data) {
  const enrollments = [];
  for (const s of data.sections) {
    for (const studentId of s.studentIds || []) enrollments.push({ sectionId: s.id, studentId, enrolledAt: data.meta.createdAt });
    delete s.studentIds;
  }
  const attendance = [];
  if (!Array.isArray(data.attendance)) {
    for (const [sectionId, days] of Object.entries(data.attendance || {})) {
      for (const [date, records] of Object.entries(days)) {
        for (const [studentId, status] of Object.entries(records)) attendance.push({ sectionId, date, studentId, status });
      }
    }
    data.attendance = attendance;
  }
  data.enrollments = data.enrollments || enrollments;
  data.meta.version = 3;
  return data;
}

module.exports = { buildSeed, toRelational };
