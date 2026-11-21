/** LỚP 3 – DOMAIN: xác thực người dùng (đăng nhập, đổi mật khẩu, kiểm tra phiên). */
const { userRepository } = require('../../repositories');
const AppError = require('../errors/AppError');
const { Validator } = require('../validation/Validator');
const passwordHasher = require('../security/passwordHasher');
const loginGuard = require('../security/loginGuard');

/** Thông tin người dùng lưu trong phiên đăng nhập (không chứa mật khẩu). */
const toSessionUser = (u) => ({
  id: u.id, username: u.username, fullName: u.fullName, role: u.role,
  lecturerId: u.lecturerId || null, studentId: u.studentId || null,
});

/** Trả về { user } nếu đúng; ném lỗi nếu sai/khoá. failedUsername để ghi nhật ký. */
async function authenticate(body, ip) {
  const { username, password } = new Validator(body)
    .string('username', 'Tên đăng nhập', { required: true, max: 50 })
    .string('password', 'Mật khẩu', { required: true, max: 100 })
    .done();
  const key = `${ip}|${username.toLowerCase()}`;
  loginGuard.assertNotLocked(key);

  const user = await userRepository.findByUsername(username);
  const ok = user ? await passwordHasher.verify(password, user.passwordHash) : false;
  if (!ok) {
    loginGuard.recordFailure(key);
    const err = AppError.unauthorized('Tên đăng nhập hoặc mật khẩu không đúng');
    err.attemptedUsername = username;
    throw err;
  }
  if (!user.active) throw AppError.forbidden('Tài khoản đã bị khoá. Vui lòng liên hệ Phòng đào tạo.');

  loginGuard.reset(key);
  await userRepository.update(user.id, { lastLoginAt: new Date().toISOString() });
  return toSessionUser(user);
}

/** Lấy lại thông tin mới nhất của người dùng trong phiên (null nếu bị xoá/khoá). */
async function currentUser(sessionUser) {
  if (!sessionUser) return null;
  const u = await userRepository.findById(sessionUser.id);
  return u && u.active ? toSessionUser(u) : null;
}

async function changePassword(userId, body) {
  const data = new Validator(body)
    .string('currentPassword', 'Mật khẩu hiện tại', { required: true })
    .string('newPassword', 'Mật khẩu mới', { required: true, min: 6, max: 100 })
    .done();
  const user = await userRepository.findById(userId);
  if (!user) throw AppError.notFound('Không tìm thấy tài khoản');
  if (!(await passwordHasher.verify(data.currentPassword, user.passwordHash))) {
    throw AppError.badRequest('Mật khẩu hiện tại không đúng', { currentPassword: 'Mật khẩu hiện tại không đúng' });
  }
  await userRepository.update(userId, { passwordHash: await passwordHasher.hash(data.newPassword) });
}

module.exports = { authenticate, currentUser, changePassword, toSessionUser };
