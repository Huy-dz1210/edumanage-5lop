/**
 * LỚP 3 – DOMAIN: phân quyền.
 * Bảng quyền: hành động → các vai trò được phép. Lớp Application gọi authorize() trước mỗi use case.
 *   admin    = Phòng đào tạo
 *   lecturer = Giảng viên (chỉ thao tác trên lớp học phần mình phụ trách)
 *   student  = Sinh viên (chỉ xem kết quả học tập của chính mình)
 */
const AppError = require('../errors/AppError');

const ALL = ['admin', 'lecturer', 'student'];
const STAFF = ['admin', 'lecturer'];
const ADMIN = ['admin'];

const PERMISSIONS = {
  'catalog.read': ALL,
  'dashboard.view': STAFF,
  'student.read': STAFF,
  'student.write': ADMIN,
  'lecturer.read': STAFF,
  'lecturer.write': ADMIN,
  'class.read': STAFF,
  'class.write': ADMIN,
  'course.read': STAFF,
  'course.write': ADMIN,
  'section.read': STAFF,
  'section.write': ADMIN,
  'enrollment.write': ADMIN,
  'attendance.read': STAFF,
  'attendance.write': STAFF,
  'grade.read': STAFF,
  'grade.write': STAFF,
  'transcript.read': ALL,
  'user.manage': ADMIN,
  'system.manage': ADMIN,
};

function can(user, action) {
  const roles = PERMISSIONS[action];
  if (!roles) throw new Error(`Chưa khai báo quyền cho hành động: ${action}`);
  return !!user && roles.includes(user.role);
}

function authorize(user, action) {
  if (!user) throw AppError.unauthorized();
  if (!can(user, action)) throw AppError.forbidden();
}

/** Quyền theo dữ liệu: giảng viên chỉ quản lý lớp học phần mình phụ trách. */
function canManageSection(user, section) {
  return user.role === 'admin' || (user.role === 'lecturer' && section.lecturerId === user.lecturerId);
}

function authorizeSection(user, section) {
  if (!canManageSection(user, section)) throw AppError.forbidden(`Bạn không phụ trách lớp học phần ${section.id}`);
}

/** Sinh viên chỉ được xem bảng điểm của chính mình. */
function authorizeTranscript(user, studentId) {
  authorize(user, 'transcript.read');
  if (user.role === 'student' && user.studentId !== studentId) {
    throw AppError.forbidden('Bạn chỉ được xem kết quả học tập của chính mình');
  }
}

module.exports = { PERMISSIONS, can, authorize, canManageSection, authorizeSection, authorizeTranscript };
