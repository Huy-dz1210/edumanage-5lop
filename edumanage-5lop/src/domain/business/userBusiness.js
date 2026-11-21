/** LỚP 3 – DOMAIN: quy tắc quản lý tài khoản (admin / giảng viên / sinh viên). */
const { userRepository, lecturerRepository, studentRepository } = require('../../repositories');
const AppError = require('../errors/AppError');
const { Validator } = require('../validation/Validator');
const { ROLES } = require('../constants');
const passwordHasher = require('../security/passwordHasher');

const publicUser = ({ passwordHash, ...u }) => u;

async function list() {
  return (await userRepository.findAll()).map(publicUser);
}

async function validate(body, { isNew }) {
  const data = new Validator(body)
    .string('username', 'Tên đăng nhập', { required: true, min: 3, max: 30, pattern: /^[a-zA-Z0-9_.]+$/, patternMsg: 'Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch dưới' })
    .string('fullName', 'Họ tên', { required: true, max: 100 })
    .oneOf('role', 'Vai trò', ROLES)
    .string('lecturerId', 'Giảng viên liên kết', { max: 10 })
    .string('studentId', 'Sinh viên liên kết', { max: 12 })
    .boolean('active')
    .string('password', 'Mật khẩu', { required: isNew, min: 6, max: 100 })
    .done();
  if (data.role === 'lecturer') {
    if (!data.lecturerId) throw AppError.badRequest('Tài khoản giảng viên phải liên kết với một giảng viên', { lecturerId: 'Vui lòng chọn giảng viên' });
    if (!(await lecturerRepository.exists({ id: data.lecturerId }))) throw AppError.badRequest('Giảng viên không tồn tại', { lecturerId: 'Không tồn tại' });
  }
  if (data.role === 'student') {
    if (!data.studentId) throw AppError.badRequest('Tài khoản sinh viên phải liên kết với một sinh viên', { studentId: 'Vui lòng nhập MSSV' });
    if (!(await studentRepository.exists({ id: data.studentId }))) throw AppError.badRequest('MSSV không tồn tại', { studentId: 'Không tìm thấy sinh viên' });
  }
  data.lecturerId = data.role === 'lecturer' ? data.lecturerId : null;
  data.studentId = data.role === 'student' ? data.studentId : null;
  return data;
}

async function assertUsernameFree(username, exceptId) {
  const existing = await userRepository.findByUsername(username);
  if (existing && existing.id !== exceptId) throw AppError.conflict('Tên đăng nhập đã tồn tại');
}

async function create(body) {
  const data = await validate(body, { isNew: true });
  await assertUsernameFree(data.username);
  const user = {
    id: 'U' + String((await userRepository.maxSequence('U')) + 1).padStart(3, '0'),
    username: data.username,
    passwordHash: await passwordHasher.hash(data.password),
    fullName: data.fullName,
    role: data.role,
    lecturerId: data.lecturerId,
    studentId: data.studentId,
    active: data.active,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  return publicUser(await userRepository.insert(user));
}

async function update(actorId, id, body) {
  if (!(await userRepository.exists({ id }))) throw AppError.notFound('Không tìm thấy tài khoản');
  const data = await validate(body, { isNew: false });
  await assertUsernameFree(data.username, id);
  if (id === actorId && (data.role !== 'admin' || !data.active)) {
    throw AppError.badRequest('Bạn không thể tự hạ quyền hoặc khoá tài khoản của chính mình');
  }
  const patch = {
    username: data.username, fullName: data.fullName, role: data.role,
    lecturerId: data.lecturerId, studentId: data.studentId, active: data.active,
  };
  if (data.password) patch.passwordHash = await passwordHasher.hash(data.password);
  const user = publicUser(await userRepository.update(id, patch));
  return { user, passwordReset: !!data.password };
}

async function remove(actorId, id) {
  if (id === actorId) throw AppError.badRequest('Bạn không thể xoá tài khoản đang đăng nhập');
  const u = await userRepository.findById(id);
  if (!u) throw AppError.notFound('Không tìm thấy tài khoản');
  await userRepository.delete(id);
  return publicUser(u);
}

module.exports = { list, create, update, remove };
