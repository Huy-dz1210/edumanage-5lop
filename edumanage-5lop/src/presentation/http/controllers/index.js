/** LỚP 1 – PRESENTATION: các controller nhận request HTTP và trả phản hồi JSON. */
const asyncHandler = require('../asyncHandler');
const crudController = require('./crudController');
const S = {
  catalog: require('../../../application/services/catalogService'),
  dashboard: require('../../../application/services/dashboardService'),
  student: require('../../../application/services/studentService'),
  lecturer: require('../../../application/services/lecturerService'),
  class: require('../../../application/services/classService'),
  course: require('../../../application/services/courseService'),
  section: require('../../../application/services/sectionService'),
  attendance: require('../../../application/services/attendanceService'),
  grade: require('../../../application/services/gradeService'),
  user: require('../../../application/services/userService'),
  system: require('../../../application/services/systemService'),
};

module.exports = {
  auth: require('./authController'),

  catalog: { get: asyncHandler(async (req, res) => res.json(await S.catalog.getCatalog(req.user))) },
  dashboard: { get: asyncHandler(async (req, res) => res.json(await S.dashboard.overview(req.user))) },

  student: {
    ...crudController(S.student, { created: 'Đã thêm sinh viên', updated: 'Đã cập nhật sinh viên', deleted: 'Đã xoá sinh viên' }),
    transcript: asyncHandler(async (req, res) => res.json(await S.student.getTranscript(req.user, req.params.id))),
  },
  lecturer: crudController(S.lecturer, { created: 'Đã thêm giảng viên', updated: 'Đã cập nhật giảng viên', deleted: 'Đã xoá giảng viên' }),
  class: crudController(S.class, { created: 'Đã thêm lớp sinh hoạt', updated: 'Đã cập nhật lớp', deleted: 'Đã xoá lớp' }),
  course: crudController(S.course, { created: 'Đã thêm học phần', updated: 'Đã cập nhật học phần', deleted: 'Đã xoá học phần' }),

  section: {
    ...crudController(S.section, { created: 'Đã mở lớp học phần', updated: 'Đã cập nhật lớp học phần', deleted: 'Đã xoá lớp học phần' }),
    enroll: asyncHandler(async (req, res) => {
      const n = await S.section.enroll(req.user, req.params.id, req.body && req.body.studentIds);
      res.json({ message: n ? `Đã thêm ${n} sinh viên vào lớp học phần` : 'Không có sinh viên mới nào được thêm (đã có trong lớp hoặc không ở trạng thái Đang học)' });
    }),
    unenroll: asyncHandler(async (req, res) => {
      await S.section.unenroll(req.user, req.params.id, req.params.studentId);
      res.json({ message: 'Đã xoá sinh viên khỏi lớp học phần' });
    }),
  },

  attendance: {
    get: asyncHandler(async (req, res) => res.json(await S.attendance.getSheet(req.user, req.query))),
    save: asyncHandler(async (req, res) => {
      const n = await S.attendance.save(req.user, req.params.sectionId, req.params.date, req.body);
      res.json({ message: `Đã lưu điểm danh cho ${n} sinh viên` });
    }),
  },

  grade: {
    list: asyncHandler(async (req, res) => res.json(await S.grade.listBySection(req.user, req.query.sectionId))),
    save: asyncHandler(async (req, res) => {
      const n = await S.grade.saveMany(req.user, req.params.sectionId, req.body);
      res.json({ message: `Đã lưu điểm cho ${n} sinh viên` });
    }),
  },

  user: crudController(S.user, { created: 'Đã tạo tài khoản', updated: 'Đã cập nhật tài khoản', deleted: 'Đã xoá tài khoản' }),

  system: {
    auditLogs: asyncHandler(async (req, res) => res.json(await S.system.auditLogs(req.user, req.query))),
    backups: asyncHandler(async (req, res) => res.json(await S.system.listBackups(req.user))),
    createBackup: asyncHandler(async (req, res) => res.status(201).json({ message: 'Đã tạo bản sao lưu', name: await S.system.createBackup(req.user) })),
    restore: asyncHandler(async (req, res) => {
      await S.system.restoreBackup(req.user, req.params.name);
      res.json({ message: 'Đã khôi phục dữ liệu từ bản sao lưu' });
    }),
  },
};
