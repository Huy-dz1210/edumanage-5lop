/** LỚP 3 – DOMAIN: băm và kiểm tra mật khẩu bằng bcrypt (mật khẩu không bao giờ lưu dạng rõ – NFR02). */
const bcrypt = require('bcryptjs');

const ROUNDS = 10;
const hash = (plain) => bcrypt.hash(plain, ROUNDS);
const verify = (plain, passwordHash) => bcrypt.compare(plain, passwordHash);

module.exports = { hash, verify };
