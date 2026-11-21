/**
 * LỚP 1 – PRESENTATION: controller chuẩn cho Xem / Thêm / Sửa / Xoá.
 * Chỉ làm 3 việc: đọc dữ liệu từ request → gọi lớp Application → trả JSON cho giao diện.
 */
const asyncHandler = require('../asyncHandler');

module.exports = function crudController(service, messages = {}) {
  const c = {
    list: asyncHandler(async (req, res) => res.json(await service.list(req.user, req.query))),
    create: asyncHandler(async (req, res) => {
      const item = await service.create(req.user, req.body);
      res.status(201).json({ message: messages.created || 'Thêm mới thành công', item });
    }),
    update: asyncHandler(async (req, res) => {
      const item = await service.update(req.user, req.params.id, req.body);
      res.json({ message: messages.updated || 'Cập nhật thành công', item });
    }),
    remove: asyncHandler(async (req, res) => {
      await service.remove(req.user, req.params.id);
      res.json({ message: messages.deleted || 'Đã xoá thành công' });
    }),
  };
  if (service.getById) c.get = asyncHandler(async (req, res) => res.json(await service.getById(req.user, req.params.id)));
  return c;
};
