/** LỚP 2 – APPLICATION / SERVICE: use case quản lý giảng viên (Xem · Thêm · Sửa · Xoá). */
const crudService = require('./crudService');
const lecturerBusiness = require('../../domain/business/lecturerBusiness');

module.exports = crudService(lecturerBusiness, { resource: 'lecturer', action: 'LECTURER', label: (t) => `${t.id} - ${t.fullName}` });
