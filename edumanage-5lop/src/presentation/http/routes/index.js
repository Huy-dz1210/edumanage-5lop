/** LỚP 1 – PRESENTATION: bảng định tuyến – đường dẫn API → controller. */
const express = require('express');
const C = require('../controllers');
const sessionAuth = require('../middlewares/sessionAuth');

const api = express.Router();

// Xác thực
api.post('/auth/login', C.auth.login);
api.post('/auth/logout', C.auth.logout);
api.get('/auth/me', sessionAuth, C.auth.me);
api.post('/auth/change-password', sessionAuth, C.auth.changePassword);

api.use(sessionAuth); // Các API bên dưới yêu cầu đã đăng nhập

api.get('/meta', C.catalog.get);
api.get('/dashboard', C.dashboard.get);

/** Đăng ký 5 route Xem / Chi tiết / Thêm / Sửa / Xoá cho một tài nguyên. */
function resource(path, ctrl) {
  api.get(path, ctrl.list);
  if (ctrl.get) api.get(`${path}/:id`, ctrl.get);
  api.post(path, ctrl.create);
  api.put(`${path}/:id`, ctrl.update);
  api.delete(`${path}/:id`, ctrl.remove);
}

api.get('/students/:id/transcript', C.student.transcript);
resource('/students', C.student);
resource('/lecturers', C.lecturer);
resource('/classes', C.class);
resource('/courses', C.course);

api.post('/sections/:id/enroll', C.section.enroll);
api.delete('/sections/:id/enroll/:studentId', C.section.unenroll);
resource('/sections', C.section);

api.get('/attendance', C.attendance.get);
api.put('/attendance/:sectionId/:date', C.attendance.save);

api.get('/grades', C.grade.list);
api.put('/grades/:sectionId', C.grade.save);

resource('/users', C.user);

api.get('/system/audit-logs', C.system.auditLogs);
api.get('/system/backups', C.system.backups);
api.post('/system/backups', C.system.createBackup);
api.post('/system/backups/:name/restore', C.system.restore);

module.exports = api;
