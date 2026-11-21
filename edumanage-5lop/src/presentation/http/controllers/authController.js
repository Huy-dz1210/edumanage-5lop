/** LỚP 1 – PRESENTATION: nhận request đăng nhập / đăng xuất / đổi mật khẩu. */
const authService = require('../../../application/services/authService');
const asyncHandler = require('../asyncHandler');

const login = asyncHandler(async (req, res, next) => {
  const user = await authService.login(req.body, req.ip);
  req.session.regenerate((err) => { // tạo session mới – chống session fixation
    if (err) return next(err);
    req.session.user = user;
    res.json({ user });
  });
});

const me = (req, res) => res.json({ user: req.user });

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.session.user);
  req.session.destroy(() => {
    res.clearCookie('edumanage.sid');
    res.json({ message: 'Đã đăng xuất' });
  });
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user, req.body);
  res.json({ message: 'Đổi mật khẩu thành công' });
});

module.exports = { login, me, logout, changePassword };
