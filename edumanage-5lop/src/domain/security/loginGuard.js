/** LỚP 3 – DOMAIN: chống dò mật khẩu – khoá tạm thời sau nhiều lần đăng nhập sai. */
const AppError = require('../errors/AppError');

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const failures = new Map(); // key: ip|username → { count, until }

function assertNotLocked(key) {
  const f = failures.get(key);
  if (f && f.until > Date.now()) {
    const mins = Math.ceil((f.until - Date.now()) / 60000);
    throw AppError.tooMany(`Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${mins} phút.`);
  }
}

function recordFailure(key) {
  const f = failures.get(key) || { count: 0, until: 0 };
  f.count += 1;
  if (f.count >= MAX_ATTEMPTS) {
    f.until = Date.now() + LOCK_MINUTES * 60000;
    f.count = 0;
  }
  failures.set(key, f);
}

const reset = (key) => failures.delete(key);

module.exports = { assertNotLocked, recordFailure, reset, MAX_ATTEMPTS, LOCK_MINUTES };
