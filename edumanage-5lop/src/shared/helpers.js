/** Hàm tiện ích dùng chung cho mọi lớp (không chứa nghiệp vụ). */

/** Ngày hiện tại theo giờ địa phương, dạng YYYY-MM-DD. */
const today = () => new Date().toLocaleDateString('sv-SE');

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

/** Bỏ dấu tiếng Việt, đưa về chữ thường – dùng cho tìm kiếm không dấu. */
const normalize = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

module.exports = { today, round1, round2, normalize };
