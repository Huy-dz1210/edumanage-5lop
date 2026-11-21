/**
 * LỚP 2 – APPLICATION / SERVICE: use case xác thực.
 *  UC: Đăng nhập · Đăng xuất · Xem phiên hiện tại · Đổi mật khẩu
 */
const authBusiness = require('../../domain/business/authBusiness');
const audit = require('../../domain/business/auditBusiness');

async function login(body, ip) {
  try {
    const user = await authBusiness.authenticate(body, ip);
    await audit.record(user, 'LOGIN', `IP ${ip}`);
    return user;
  } catch (err) {
    if (err.attemptedUsername) await audit.record({ username: err.attemptedUsername }, 'LOGIN_FAILED', `IP ${ip}`);
    throw err;
  }
}

async function logout(user) {
  if (user) await audit.record(user, 'LOGOUT');
}

/** Lấy người dùng hiện tại từ phiên đăng nhập (null nếu không còn hợp lệ). */
const currentUser = (sessionUser) => authBusiness.currentUser(sessionUser);

async function changePassword(user, body) {
  await authBusiness.changePassword(user.id, body);
  await audit.record(user, 'CHANGE_PASSWORD');
}

module.exports = { login, logout, currentUser, changePassword };
