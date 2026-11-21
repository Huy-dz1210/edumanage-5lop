# EduManage University – Hệ thống quản lý sinh viên đại học

Website quản lý đào tạo cho trường đại học: **sinh viên, giảng viên, lớp sinh hoạt, học phần (tín chỉ), lớp học phần, điểm danh, nhập điểm, GPA và bảng điểm cá nhân**.

- **Frontend:** HTML + CSS + JavaScript thuần. Mỗi màn hình là một file `.html` riêng.
- **Backend:** Node.js + Express, lưu dữ liệu bằng file JSON (`data/db.json`).

## 1. Chạy project

**Yêu cầu:** Node.js 18 trở lên (bản LTS) – https://nodejs.org

**Cách 1 – bấm đúp `chay.bat`** (Windows): tự cài thư viện, chạy server và mở trình duyệt.

**Cách 2 – trong VS Code:** *File › Open Folder* → chọn thư mục project → mở Terminal (Ctrl + `):
```bash
npm install
npm start
```
Mở **http://localhost:3000**

| Tài khoản | Mật khẩu | Vai trò | Quyền |
|---|---|---|---|
| `admin` | `123456` | Phòng đào tạo | Toàn quyền |
| `gv01` | `123456` | Giảng viên (TS. Nguyễn Văn An) | Xem dữ liệu; điểm danh, nhập điểm **lớp mình dạy** |
| `sv01` | `123456` | Sinh viên (MSSV 2200001) | Chỉ xem kết quả học tập của mình |

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy và tự khởi động lại khi sửa code backend |
| `npm test` | Chạy 15 bài kiểm thử tự động (10 chức năng + 5 kiểm tra kiến trúc 5 lớp) |
| `npm run seed` | Tạo lại dữ liệu mẫu (dữ liệu cũ được sao lưu trước) |

## 2. Chức năng

| Màn hình | File | Chức năng |
|---|---|---|
| Đăng nhập | `login.html` | Đăng nhập, tự chuyển trang theo vai trò |
| Dashboard | `dashboard.html` | Thống kê SV/GV/học phần, điểm danh 7 ngày, xếp loại học lực theo GPA, top GPA, thống kê theo khoa; giảng viên thấy lớp mình dạy |
| Sinh viên | `students.html` | Thêm/sửa/xoá, **MSSV tự cấp theo khoá** (K22 → 22xxxxx), lọc theo khoa/lớp/tình trạng, hiển thị GPA & tín chỉ tích luỹ |
| Giảng viên | `lecturers.html` | Thêm/sửa/xoá, học hàm/học vị, khoa, lớp cố vấn, số lớp học phần |
| Lớp sinh hoạt | `classes.html` | Lớp hành chính theo khoá/ngành, phân công cố vấn học tập |
| Học phần | `courses.html` | Danh mục môn học, số tín chỉ, bắt buộc/tự chọn |
| Lớp học phần | `sections.html` | Mở lớp theo học kỳ, phân công giảng viên, lịch học, phòng, sĩ số; **đăng ký sinh viên** (thêm cả lớp sinh hoạt hoặc từng MSSV), chặn vượt sĩ số và đăng ký trùng |
| Điểm danh | `attendance.html` | Điểm danh theo buổi học của lớp học phần, xem lại các buổi đã điểm danh, đếm số buổi vắng |
| Nhập điểm | `grades.html` | Nhập điểm chuyên cần (10%), giữa kỳ (30%), cuối kỳ (60%); tự tính điểm tổng kết, điểm chữ, thang 4, Đạt/Không đạt |
| Bảng điểm sinh viên | `transcript.html` | Bảng điểm theo từng học kỳ, GPA học kỳ, GPA tích luỹ, xếp loại, **in bảng điểm** |
| Tài khoản | `users.html` | Tạo tài khoản admin/giảng viên/sinh viên, khoá/mở, đặt lại mật khẩu |
| Sao lưu & Nhật ký | `system.html` | Sao lưu, khôi phục dữ liệu, nhật ký thao tác |
| Tài khoản của tôi | `account.html` | Đổi mật khẩu |

**Quy đổi điểm:** A ≥ 8.5 (4.0) · B+ ≥ 8.0 (3.5) · B ≥ 7.0 (3.0) · C+ ≥ 6.5 (2.5) · C ≥ 5.5 (2.0) · D+ ≥ 5.0 (1.5) · D ≥ 4.0 (1.0) · F < 4.0 (0 – không đạt).
**GPA tích luỹ** = Σ(điểm thang 4 × số tín chỉ) / Σ tín chỉ. **Xếp loại:** Xuất sắc ≥ 3.6 · Giỏi ≥ 3.2 · Khá ≥ 2.5 · Trung bình ≥ 2.0 · Yếu < 2.0.
Trọng số, thang điểm, danh sách học kỳ được cấu hình trong `src/domain/constants.js`.

## 3. Kiến trúc 5 lớp

Mã nguồn được tổ chức theo **mô hình kiến trúc 5 lớp**. Mỗi lớp đảm nhận một trách nhiệm riêng và **chỉ gọi lớp ngay bên dưới nó**:

```
 ┌───────────────────────────────────────────────┐
 │ 1. PRESENTATION        src/presentation/       │  Giao diện người dùng · Hiển thị · Nhận dữ liệu
 └──────────────────────┬────────────────────────┘
 ┌──────────────────────▼────────────────────────┐
 │ 2. APPLICATION/SERVICE src/application/        │  Điều phối chức năng · Xử lý Use Case
 └──────────────────────┬────────────────────────┘
 ┌──────────────────────▼────────────────────────┐
 │ 3. DOMAIN/BUSINESS     src/domain/             │  Quy tắc nghiệp vụ · Xác thực · Phân quyền
 └──────────────────────┬────────────────────────┘
 ┌──────────────────────▼────────────────────────┐
 │ 4. REPOSITORY          src/repositories/       │  Truy vấn · Thêm · Sửa · Xoá · Transaction
 └──────────────────────┬────────────────────────┘
 ┌──────────────────────▼────────────────────────┐
 │ 5. DATABASE            src/database/           │  Lưu trữ dữ liệu (bảng, khoá)
 └───────────────────────────────────────────────┘
```

| Lớp | Thư mục | Thành phần | Trách nhiệm |
|---|---|---|---|
| **1. Presentation** | `src/presentation/public/` | 13 trang HTML, `css/style.css`, `js/` | Giao diện, hiển thị dữ liệu, form nhập liệu |
| | `src/presentation/http/` | `routes/`, `controllers/`, `middlewares/`, `app.js` | Nhận request HTTP, kiểm tra phiên đăng nhập, chống CSRF, trả JSON, chuyển lỗi thành thông báo dễ hiểu |
| **2. Application / Service** | `src/application/services/` | `studentService`, `sectionService`, `gradeService`, `authService`… | Mỗi hàm = 1 use case: kiểm tra quyền → gọi nghiệp vụ → ghi nhật ký |
| **3. Domain / Business** | `src/domain/business/` | `studentBusiness`, `gradeBusiness`, `sectionBusiness`… | Quy tắc nghiệp vụ: cấp MSSV, chặn vượt sĩ số, chặn đăng ký trùng, ràng buộc xoá… |
| | `src/domain/rules/` | `gradingRules.js` | Công thức điểm tổng kết, điểm chữ, thang 4, GPA, xếp loại |
| | `src/domain/validation/` | `Validator.js` | Xác thực dữ liệu đầu vào |
| | `src/domain/security/` | `passwordHasher.js`, `loginGuard.js` | Xác thực đăng nhập: băm mật khẩu bcrypt, khoá khi sai nhiều lần |
| | `src/domain/policies/` | `permissionPolicy.js` | Phân quyền: bảng quyền theo vai trò + quyền theo dữ liệu (GV chỉ lớp mình dạy, SV chỉ điểm của mình) |
| | `src/domain/` | `constants.js`, `errors/AppError.js` | Học kỳ, trọng số điểm, thang quy đổi; lỗi nghiệp vụ |
| **4. Repository / Data Access** | `src/repositories/` | `BaseRepository.js`, `index.js`, `transaction.js` | Truy vấn, thêm, sửa, xoá theo từng bảng; transaction (commit/rollback) |
| **5. Database** | `src/database/` | `jsonStore.js`, `seed.js`, `index.js` | Lưu trữ dữ liệu theo bảng, dữ liệu mẫu, sao lưu/khôi phục |
| Dùng chung | `src/config/`, `src/shared/` | cấu hình, hàm tiện ích | Lớp nào cũng được dùng |

Tính đúng kiến trúc được **kiểm tra tự động** bằng `tests/architecture.test.js`: nếu một file gọi vượt lớp (ví dụ controller gọi thẳng repository), `npm test` sẽ báo lỗi.

### Ví dụ luồng xử lý: Giảng viên lưu điểm

| Bước | Lớp | File | Việc làm |
|---|---|---|---|
| 1 | Presentation | `public/grades.html` + `js/pages/grades.js` | GV nhập điểm, bấm **Lưu** → gửi `PUT /api/grades/IT003-01` |
| 2 | Presentation | `http/routes/index.js` → `controllers/index.js` | Kiểm tra phiên đăng nhập, lấy dữ liệu từ request, gọi `gradeService.saveMany()` |
| 3 | Application | `services/gradeService.js` | Use case "Lưu điểm": kiểm tra quyền `grade.write` → gọi nghiệp vụ → ghi nhật ký `UPDATE_GRADE` |
| 4 | Domain | `business/gradeBusiness.js` | Kiểm tra GV phụ trách lớp (`permissionPolicy`), SV thuộc lớp, điểm 0–10 (`Validator`) |
| 5 | Repository | `repositories/index.js` | `transaction()` → `gradeRepository.upsert()` cho từng SV |
| 6 | Database | `database/jsonStore.js` | Ghi bảng `grades` xuống đĩa |

### Bảng dữ liệu (lớp Database)

Dữ liệu được tổ chức thành các bảng quan hệ, sẵn sàng chuyển sang SQL Server:

| Bảng | Khoá chính | Khoá ngoại |
|---|---|---|
| `faculties` (khoa) | id | |
| `lecturers` (giảng viên) | id | facultyId → faculties |
| `classes` (lớp sinh hoạt) | id | facultyId → faculties, advisorId → lecturers |
| `students` (sinh viên) | id (MSSV) | classId → classes |
| `courses` (học phần) | id | facultyId → faculties |
| `sections` (lớp học phần) | id | courseId → courses, lecturerId → lecturers |
| `enrollments` (đăng ký học phần) | (sectionId, studentId) | → sections, → students |
| `grades` (điểm) | (sectionId, studentId) | → sections, → students |
| `attendance` (điểm danh) | (sectionId, date, studentId) | → sections, → students |
| `users` (tài khoản) | id | lecturerId → lecturers, studentId → students |
| `auditLogs` (nhật ký) | | |

> **Hiện tại** lớp Database lưu bằng file `data/db.json`. **Khi chuyển sang Microsoft SQL Server** chỉ cần thay `src/database/` (tạo kết nối) và phần thân các hàm trong `src/repositories/` (viết câu lệnh SQL). Các hàm repository đều đã là `async` giống truy vấn SQL thật, nên **lớp 1, 2, 3 giữ nguyên không phải sửa**.

### Cấu trúc thư mục

```
edumanage/
├── src/
│   ├── server.js                  # Điểm khởi chạy – lắp ráp 5 lớp
│   ├── presentation/              # LỚP 1
│   │   ├── public/                #   13 trang HTML + css/ + js/ (chạy trên trình duyệt)
│   │   └── http/                  #   app.js, routes/, controllers/, middlewares/
│   ├── application/services/      # LỚP 2 – use case
│   ├── domain/                    # LỚP 3 – business/, rules/, validation/, security/, policies/
│   ├── repositories/              # LỚP 4 – BaseRepository, repository từng bảng, transaction
│   ├── database/                  # LỚP 5 – jsonStore, seed (dữ liệu mẫu)
│   ├── config/                    # cấu hình (.env)
│   └── shared/                    # hàm tiện ích dùng chung
├── data/                          # db.json + backups/ (tự tạo khi chạy)
├── tests/                         # api.test.js (chức năng), architecture.test.js (kiến trúc 5 lớp)
├── scripts/seed.js                # tạo lại dữ liệu mẫu
├── api.http                       # request mẫu cho extension REST Client
└── chay.bat                       # bấm đúp để chạy (Windows)
```

**Muốn sửa giao diện:** mở file `.html` trong `src/presentation/public/` (bố cục, bảng, form), màu sắc ở `css/style.css`.

## 4. API chính

Request thay đổi dữ liệu (POST/PUT/DELETE) phải có header `X-Requested-With: XMLHttpRequest`.

| Method | Endpoint | Quyền |
|---|---|---|
| POST | `/api/auth/login`, `/api/auth/logout`, `/api/auth/change-password` | – / đăng nhập |
| GET | `/api/auth/me`, `/api/meta` | Đăng nhập |
| GET | `/api/dashboard` | PĐT, GV |
| GET / POST / PUT / DELETE | `/api/students`, `/api/lecturers`, `/api/classes`, `/api/courses`, `/api/sections` | Xem: PĐT, GV · Sửa: PĐT |
| GET | `/api/students/:id/transcript` | PĐT, GV, SV (chỉ của mình) |
| POST / DELETE | `/api/sections/:id/enroll` · `/api/sections/:id/enroll/:studentId` | PĐT |
| GET / PUT | `/api/attendance?sectionId=&date=` · `/api/attendance/:sectionId/:date` | PĐT, GV phụ trách lớp |
| GET / PUT | `/api/grades?sectionId=` · `/api/grades/:sectionId` | PĐT, GV phụ trách lớp |
| CRUD | `/api/users` | PĐT |
| GET / POST | `/api/system/audit-logs`, `/api/system/backups`, `/api/system/backups/:name/restore` | PĐT |

## 5. Đáp ứng yêu cầu phi chức năng

| NFR | Cách đáp ứng |
|---|---|
| **NFR01 – Hiệu năng** | Dữ liệu nạp vào bộ nhớ, tra cứu phản hồi vài ms; log thời gian xử lý từng request. |
| **NFR02 – Bảo mật** | Mật khẩu băm bcrypt; phân quyền 3 vai trò **ở backend** (giảng viên chỉ thao tác lớp mình dạy, sinh viên chỉ xem điểm của mình); session HttpOnly/SameSite; chống CSRF; khoá 15 phút sau 5 lần đăng nhập sai; CSP; chống XSS; nhật ký thao tác. |
| **NFR03 – Khả dụng** | Xử lý lỗi tập trung; transaction (lỗi giữa chừng thì huỷ toàn bộ thay đổi); ghi file an toàn; sao lưu tự động + thủ công, khôi phục; tự phục hồi khi `db.json` hỏng. |
| **NFR04 – Bảo trì** | Kiến trúc 5 lớp (Presentation → Application → Domain → Repository → Database), có kiểm thử tự động bảo đảm không gọi vượt lớp; quy ước đặt tên thống nhất (`xxxController`, `xxxService`, `xxxBusiness`, `xxxRepository`); mỗi màn hình 1 file HTML + 1 file JS; chú thích đầu mỗi file ghi rõ thuộc lớp nào; README. |
| **NFR05 – Sử dụng** | Giao diện nhất quán; lỗi hiển thị dưới từng ô; xác nhận trước khi xoá; cảnh báo thay đổi chưa lưu; xem trước điểm tổng kết khi nhập. |
| **NFR06 – Tương thích** | Chrome, Edge, Firefox, Safari bản mới; responsive máy tính/tablet/điện thoại; hỗ trợ in bảng điểm. |

## 6. Lưu ý khi triển khai thật

- Tạo `.env` từ `.env.example`, đặt `SESSION_SECRET` ngẫu nhiên (bắt buộc khi `NODE_ENV=production`).
- Chạy sau HTTPS và đặt `COOKIE_SECURE=true`.
- Session đang lưu trong bộ nhớ – nên dùng Redis/CSDL khi triển khai thật.
- Lớp Database đang dùng file JSON – bước tiếp theo là chuyển sang Microsoft SQL Server (xem mục 3).
- Đổi mật khẩu các tài khoản mẫu.
