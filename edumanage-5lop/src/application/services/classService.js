/** LỚP 2 – APPLICATION / SERVICE: use case quản lý lớp sinh hoạt (Xem · Thêm · Sửa · Xoá). */
const crudService = require('./crudService');
const classBusiness = require('../../domain/business/classBusiness');

module.exports = crudService(classBusiness, { resource: 'class', action: 'CLASS', label: (c) => c.id });
