/** LỚP 2 – APPLICATION / SERVICE: use case quản lý học phần (Xem · Thêm · Sửa · Xoá). */
const crudService = require('./crudService');
const courseBusiness = require('../../domain/business/courseBusiness');

module.exports = crudService(courseBusiness, { resource: 'course', action: 'COURSE', label: (c) => `${c.id} - ${c.name}` });
