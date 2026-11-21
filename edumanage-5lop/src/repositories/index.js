/**
 * LỚP 4 – REPOSITORY / DATA ACCESS: truy vấn, thêm, sửa, xoá dữ liệu cho từng bảng.
 * Chỉ lớp Domain được gọi các repository này.
 */
const BaseRepository = require('./BaseRepository');
const { matches } = BaseRepository;
const store = require('../database');
const { normalize } = require('../shared/helpers');
const { transaction } = require('./transaction');

const copy = (r) => ({ ...r });
const search = (q, ...fields) => {
  const term = normalize(q);
  return (row) => !term || normalize(fields.map((f) => row[f]).join(' ')).includes(term);
};

// ---------- Người dùng ----------
class UserRepository extends BaseRepository {
  constructor() { super('users'); }
  async findByUsername(username) {
    const u = String(username || '').toLowerCase();
    return this.findOneWhere((r) => r.username.toLowerCase() === u);
  }
  async findOneWhere(pred) {
    const r = this.rows().find(pred);
    return r ? copy(r) : null;
  }
}

// ---------- Khoa ----------
class FacultyRepository extends BaseRepository {
  constructor() { super('faculties'); }
}

// ---------- Giảng viên ----------
class LecturerRepository extends BaseRepository {
  constructor() { super('lecturers'); }
  /** SELECT * FROM lecturers WHERE facultyId = @facultyId AND (id/tên/email/sđt LIKE @q) */
  async search({ q = '', facultyId = '' } = {}) {
    return this.rows()
      .filter((r) => !facultyId || r.facultyId === facultyId)
      .filter(search(q, 'id', 'fullName', 'email', 'phone'))
      .map(copy);
  }
}

// ---------- Lớp sinh hoạt ----------
class ClassRepository extends BaseRepository {
  constructor() { super('classes'); }
  async search({ facultyId = '' } = {}) {
    return this.rows().filter((r) => !facultyId || r.facultyId === facultyId).map(copy).sort((a, b) => a.id.localeCompare(b.id));
  }
}

// ---------- Sinh viên ----------
class StudentRepository extends BaseRepository {
  constructor() { super('students'); }
  async search({ q = '', classId = '', classIds = null, status = '' } = {}) {
    return this.rows()
      .filter((r) => !classId || r.classId === classId)
      .filter((r) => !classIds || classIds.includes(r.classId))
      .filter((r) => !status || r.status === status)
      .filter(search(q, 'id', 'fullName', 'email', 'phone'))
      .map(copy)
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  /** MSSV lớn nhất của một khoá (7 ký tự, bắt đầu bằng yy) */
  async maxSequenceOfCohort(yy) {
    return this.rows()
      .filter((s) => s.id.length === 7 && s.id.startsWith(yy))
      .reduce((m, s) => Math.max(m, Number(s.id.slice(2)) || 0), 0);
  }
}

// ---------- Học phần ----------
class CourseRepository extends BaseRepository {
  constructor() { super('courses'); }
  async search({ q = '', facultyId = '' } = {}) {
    return this.rows()
      .filter((r) => !facultyId || r.facultyId === facultyId)
      .filter(search(q, 'id', 'name'))
      .map(copy)
      .sort((a, b) => a.id.localeCompare(b.id));
  }
}

// ---------- Lớp học phần ----------
class SectionRepository extends BaseRepository {
  constructor() { super('sections'); }
  async search({ semester = '', courseId = '', lecturerId = '' } = {}) {
    return this.rows()
      .filter((r) => !semester || r.semester === semester)
      .filter((r) => !courseId || r.courseId === courseId)
      .filter((r) => !lecturerId || r.lecturerId === lecturerId)
      .map(copy);
  }
}

// ---------- Đăng ký học phần (khoá ghép sectionId + studentId) ----------
class EnrollmentRepository extends BaseRepository {
  constructor() { super('enrollments', null); }
  async studentIdsOf(sectionId) {
    return this.rows().filter((r) => r.sectionId === sectionId).map((r) => r.studentId);
  }
  async sectionIdsOf(studentId) {
    return this.rows().filter((r) => r.studentId === studentId).map((r) => r.sectionId);
  }
  /** Số SV đăng ký theo từng lớp học phần: { sectionId: count } (GROUP BY sectionId) */
  async countBySection() {
    return this.rows().reduce((m, r) => ((m[r.sectionId] = (m[r.sectionId] || 0) + 1), m), {});
  }
}

// ---------- Điểm (khoá ghép sectionId + studentId) ----------
class GradeRepository extends BaseRepository {
  constructor() { super('grades', null); }
  /** Thêm mới hoặc cập nhật điểm (tương đương MERGE trong SQL Server) */
  async upsert(sectionId, studentId, scores) {
    let row = this.rows().find((r) => r.sectionId === sectionId && r.studentId === studentId);
    if (!row) this.rows().push((row = { sectionId, studentId }));
    Object.assign(row, scores, { updatedAt: new Date().toISOString() });
    await this.commit();
    return copy(row);
  }
}

// ---------- Điểm danh (khoá ghép sectionId + date + studentId) ----------
class AttendanceRepository extends BaseRepository {
  constructor() { super('attendance', null); }
  /** Danh sách ngày đã điểm danh của một lớp (SELECT DISTINCT date) */
  async datesOf(sectionId) {
    return [...new Set(this.rows().filter((r) => r.sectionId === sectionId).map((r) => r.date))].sort();
  }
  async upsert(sectionId, date, studentId, status) {
    const row = this.rows().find((r) => r.sectionId === sectionId && r.date === date && r.studentId === studentId);
    if (row) row.status = status;
    else this.rows().push({ sectionId, date, studentId, status });
    await this.commit();
  }
  /** Đếm theo trạng thái cho nhiều lớp và nhiều ngày (GROUP BY date, status) */
  async countByDateStatus(sectionIds, dates) {
    const out = {};
    for (const r of this.rows()) {
      if (!sectionIds.includes(r.sectionId) || !dates.includes(r.date)) continue;
      out[r.date] = out[r.date] || { present: 0, late: 0, absent: 0 };
      out[r.date][r.status]++;
    }
    return out;
  }
}

// ---------- Nhật ký thao tác ----------
class AuditLogRepository extends BaseRepository {
  constructor() { super('auditLogs', null); }
  static MAX = 1000;
  async add(entry) {
    const rows = this.rows();
    rows.unshift(entry);
    if (rows.length > AuditLogRepository.MAX) rows.length = AuditLogRepository.MAX;
    await this.commit();
  }
  async search({ q = '', limit = 200 } = {}) {
    const term = String(q).toLowerCase();
    return this.rows()
      .filter((l) => !term || `${l.user} ${l.action} ${l.detail}`.toLowerCase().includes(term))
      .slice(0, Math.min(Number(limit) || 200, AuditLogRepository.MAX))
      .map(copy);
  }
}

// ---------- Thông tin chung & sao lưu ----------
const metaRepository = {
  async get() {
    return { ...store.meta };
  },
};

const backupRepository = {
  list: async () => store.listBackups(),
  create: (reason) => store.backup(reason),
  exists: async (name) => store.backupExists(name),
  read: (name) => store.readBackup(name),
  replaceAll: (data) => store.replaceAll(data),
};

module.exports = {
  transaction,
  matches,
  userRepository: new UserRepository(),
  facultyRepository: new FacultyRepository(),
  lecturerRepository: new LecturerRepository(),
  classRepository: new ClassRepository(),
  studentRepository: new StudentRepository(),
  courseRepository: new CourseRepository(),
  sectionRepository: new SectionRepository(),
  enrollmentRepository: new EnrollmentRepository(),
  gradeRepository: new GradeRepository(),
  attendanceRepository: new AttendanceRepository(),
  auditLogRepository: new AuditLogRepository(),
  metaRepository,
  backupRepository,
};
