/**
 * LỚP 2 – APPLICATION / SERVICE: khuôn mẫu use case Xem / Thêm / Sửa / Xoá cho một đối tượng.
 * Mỗi use case: (1) kiểm tra quyền → (2) gọi nghiệp vụ ở lớp Domain → (3) ghi nhật ký.
 */
const { authorize } = require('../../domain/policies/permissionPolicy');
const audit = require('../../domain/business/auditBusiness');

/**
 * @param business  module nghiệp vụ (lớp Domain) có list/create/update/remove (+ getById)
 * @param opts.resource  tên quyền, ví dụ 'student' → 'student.read' / 'student.write'
 * @param opts.action    tiền tố nhật ký, ví dụ 'STUDENT' → CREATE_STUDENT
 * @param opts.label     hàm tạo mô tả đối tượng để ghi nhật ký
 */
function crudService(business, { resource, action, label = (x) => x.id }) {
  const service = {
    async list(user, filters) {
      authorize(user, `${resource}.read`);
      return business.list(filters || {});
    },
    async create(user, body) {
      authorize(user, `${resource}.write`);
      const item = await business.create(body);
      await audit.record(user, `CREATE_${action}`, label(item));
      return item;
    },
    async update(user, id, body) {
      authorize(user, `${resource}.write`);
      const item = await business.update(id, body);
      await audit.record(user, `UPDATE_${action}`, label(item));
      return item;
    },
    async remove(user, id) {
      authorize(user, `${resource}.write`);
      const item = await business.remove(id);
      await audit.record(user, `DELETE_${action}`, item ? label(item) : id);
    },
  };
  if (business.getById) {
    service.getById = async (user, id) => {
      authorize(user, `${resource}.read`);
      return business.getById(id);
    };
  }
  return service;
}

module.exports = crudService;
