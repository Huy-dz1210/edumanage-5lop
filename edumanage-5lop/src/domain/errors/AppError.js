/**
 * LỚP 3 – DOMAIN: lỗi nghiệp vụ có mã trạng thái và thông báo thân thiện.
 * Lớp Presentation chỉ đọc thuộc tính `status`, `message`, `details` để trả về cho người dùng.
 */
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
  static badRequest(msg, details) { return new AppError(400, msg, details); }
  static unauthorized(msg = 'Vui lòng đăng nhập để tiếp tục') { return new AppError(401, msg); }
  static forbidden(msg = 'Bạn không có quyền thực hiện thao tác này') { return new AppError(403, msg); }
  static notFound(msg = 'Không tìm thấy dữ liệu') { return new AppError(404, msg); }
  static conflict(msg) { return new AppError(409, msg); }
  static tooMany(msg) { return new AppError(429, msg); }
}
module.exports = AppError;
