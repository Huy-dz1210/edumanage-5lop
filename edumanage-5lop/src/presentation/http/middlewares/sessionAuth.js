/**
 * LỚP 1 – PRESENTATION: kiểm tra phiên đăng nhập (session).
 * Việc phân quyền chi tiết (ai được làm gì) do lớp Domain quyết định khi lớp Application gọi.
 */
const authService = require('../../../application/services/authService');
const asyncHandler = require('../asyncHandler');

module.exports = asyncHandler(async (req, res, next) => {
  const user = req.session && req.session.user ? await authService.currentUser(req.session.user) : null;
  if (!user) {
    const expired = !!(req.session && req.session.user);
    if (expired) req.session.destroy(() => {});
    return res.status(401).json({ error: expired ? 'Phiên đăng nhập không còn hiệu lực, vui lòng đăng nhập lại' : 'Vui lòng đăng nhập để tiếp tục' });
  }
  req.session.user = user;
  req.user = user;
  next();
});
