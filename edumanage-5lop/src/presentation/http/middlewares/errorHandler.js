/**
 * LỚP 1 – PRESENTATION: chuyển lỗi thành phản hồi JSON với thông báo dễ hiểu (NFR03, NFR05).
 * Lỗi nghiệp vụ từ lớp Domain mang sẵn `status` và `message`.
 */
function notFoundApi(req, res) {
  res.status(404).json({ error: `Không tìm thấy API ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500 && !err.type) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Dữ liệu gửi lên không đúng định dạng JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Dữ liệu gửi lên quá lớn' });
  console.error('[error]', req.method, req.originalUrl, err);
  res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' });
}

module.exports = { notFoundApi, errorHandler };
