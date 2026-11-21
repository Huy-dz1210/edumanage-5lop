/**
 * LỚP 2 – APPLICATION / SERVICE: use case quản lý sinh viên.
 *  UC: Xem danh sách · Xem chi tiết · Thêm (cấp MSSV) · Sửa · Xoá · Xem bảng điểm cá nhân
 */
const crudService = require('./crudService');
const studentBusiness = require('../../domain/business/studentBusiness');
const gradeBusiness = require('../../domain/business/gradeBusiness');
const { authorizeTranscript } = require('../../domain/policies/permissionPolicy');

const base = crudService(studentBusiness, { resource: 'student', action: 'STUDENT', label: (s) => `${s.id} - ${s.fullName}` });

async function getTranscript(user, studentId) {
  authorizeTranscript(user, studentId);
  return gradeBusiness.transcript(studentId);
}

module.exports = { ...base, getTranscript };
