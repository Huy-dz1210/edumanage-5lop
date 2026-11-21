/** LỚP 1 – PRESENTATION: bọc controller async để lỗi được chuyển tới middleware xử lý lỗi. */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
