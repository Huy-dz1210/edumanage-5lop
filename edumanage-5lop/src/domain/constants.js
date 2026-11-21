/** LỚP 3 – DOMAIN: hằng số nghiệp vụ của trường đại học (học kỳ, trọng số điểm, thang quy đổi, xếp loại). */
module.exports = {
  SEMESTERS: ['HK1 2025-2026', 'HK2 2025-2026', 'HK1 2026-2027'],
  CURRENT_SEMESTER: 'HK1 2026-2027',

  // Trọng số điểm học phần
  WEIGHTS: { attendance: 0.1, midterm: 0.3, final: 0.6 },

  // Quy đổi điểm: [điểm tối thiểu thang 10, điểm chữ, thang 4]
  GRADE_SCALE: [
    [8.5, 'A', 4.0],
    [8.0, 'B+', 3.5],
    [7.0, 'B', 3.0],
    [6.5, 'C+', 2.5],
    [5.5, 'C', 2.0],
    [5.0, 'D+', 1.5],
    [4.0, 'D', 1.0],
    [0, 'F', 0],
  ],
  PASS_MARK: 4.0,

  // Xếp loại học lực theo GPA tích lũy (thang 4)
  GPA_CLASSES: [
    [3.6, 'Xuất sắc'],
    [3.2, 'Giỏi'],
    [2.5, 'Khá'],
    [2.0, 'Trung bình'],
    [0, 'Yếu'],
  ],

  STUDENT_STATUSES: ['Đang học', 'Bảo lưu', 'Thôi học', 'Đã tốt nghiệp'],
  DEGREES: ['CN', 'ThS', 'TS', 'PGS.TS', 'GS.TS'],
  COURSE_TYPES: ['Bắt buộc', 'Tự chọn'],
  ROLES: ['admin', 'lecturer', 'student'],
};
