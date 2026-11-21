/** LỚP 1 – PRESENTATION: header bảo mật cơ bản và chống CSRF cho API. */

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
  );
  next();
}

/**
 * Chống CSRF: các request thay đổi dữ liệu phải gửi header X-Requested-With
 * (trình duyệt không cho trang web khác tự gắn header này khi gửi cross-site)
 * kết hợp cookie SameSite=Lax.
 */
function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'Yêu cầu không hợp lệ (thiếu header bảo mật)' });
  }
  next();
}

module.exports = { securityHeaders, csrfGuard };
