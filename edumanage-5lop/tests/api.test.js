/**
 * Kiểm thử API end-to-end: npm test
 * Chạy trên thư mục dữ liệu tạm, không ảnh hưởng data/db.json thật.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'edumanage-test-'));
process.env.DATA_DIR = tmp;
process.env.NODE_ENV = 'test';

const db = require('../src/database');
const createApp = require('../src/presentation/http/app');

let server, base;

function client() {
  let cookie = '';
  return async (method, url, body, { csrf = true } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-Requested-With'] = 'XMLHttpRequest';
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(base + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data };
  };
}

before(async () => {
  db.load();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('chưa đăng nhập thì bị chặn (401)', async () => {
  const c = client();
  assert.equal((await c('GET', '/api/students')).status, 401);
  assert.equal((await c('GET', '/api/auth/me')).status, 401);
});

test('mật khẩu được băm, không lưu dạng rõ', () => {
  for (const u of db.data.users) {
    assert.ok(u.passwordHash.startsWith('$2'));
    assert.ok(!JSON.stringify(u).includes('"123456"'));
  }
});

test('đăng nhập sai / đúng, API không trả về hash mật khẩu', async () => {
  const c = client();
  const bad = await c('POST', '/api/auth/login', { username: 'admin', password: 'sai' });
  assert.equal(bad.status, 401);
  const ok = await c('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.role, 'admin');
  const users = await c('GET', '/api/users');
  assert.equal(users.status, 200);
  assert.ok(users.data.every((u) => !('passwordHash' in u)));
});

test('thiếu header chống CSRF bị từ chối', async () => {
  const c = client();
  const r = await c('POST', '/api/auth/login', { username: 'admin', password: '123456' }, { csrf: false });
  assert.equal(r.status, 403);
});

test('CRUD sinh viên + MSSV tự sinh theo khoá + validate', async () => {
  const c = client();
  await c('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  const invalid = await c('POST', '/api/students', { fullName: '', dob: '2030-01-01', classId: 'X' });
  assert.equal(invalid.status, 400);
  assert.ok(invalid.data.details.fullName);

  const created = await c('POST', '/api/students', { fullName: 'Sinh Viên Test', gender: 'Nam', dob: '2004-05-05', classId: 'DH22CNTT01', phone: '0912345678' });
  assert.equal(created.status, 201);
  const id = created.data.item.id;
  assert.match(id, /^22\d{5}$/, 'MSSV bắt đầu bằng 22 cho khoá K22');

  const search = await c('GET', '/api/students?q=sinh vien test');
  assert.ok(search.data.some((s) => s.id === id), 'tìm kiếm không dấu');

  const upd = await c('PUT', `/api/students/${id}`, { ...created.data.item, fullName: 'Đã Sửa', classId: 'DH22KT01' });
  assert.equal(upd.data.item.facultyName, 'Kinh tế');

  assert.equal((await c('DELETE', `/api/students/${id}`)).status, 200);
  assert.equal((await c('GET', `/api/students/${id}`)).status, 404);
});

test('lớp học phần: mở lớp, đăng ký SV, chặn trùng & vượt sĩ số', async () => {
  const c = client();
  await c('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  const sec = await c('POST', '/api/sections', { courseId: 'IT005', lecturerId: 'GV003', semester: 'HK1 2026-2027', room: 'A101', schedule: 'Thứ 2, tiết 1–3', capacity: 2 });
  assert.equal(sec.status, 201);
  const id = sec.data.item.id;
  const en = await c('POST', `/api/sections/${id}/enroll`, { studentIds: ['2200001', '2200002'] });
  assert.equal(en.status, 200);
  const over = await c('POST', `/api/sections/${id}/enroll`, { studentIds: ['2200003'] });
  assert.equal(over.status, 409, 'vượt sĩ số');
  const detail = await c('GET', `/api/sections/${id}`);
  assert.equal(detail.data.students.length, 2);
  assert.equal((await c('DELETE', `/api/sections/${id}/enroll/2200002`)).status, 200);
  assert.equal((await c('DELETE', `/api/sections/${id}`)).status, 200);
});

test('giảng viên: chỉ điểm danh / nhập điểm lớp mình dạy', async () => {
  const c = client();
  const login = await c('POST', '/api/auth/login', { username: 'gv01', password: '123456' });
  assert.equal(login.data.user.role, 'lecturer');
  assert.equal((await c('POST', '/api/students', { fullName: 'X' })).status, 403);
  assert.equal((await c('GET', '/api/users')).status, 403);

  const mine = await c('GET', '/api/sections?semester=HK1 2026-2027&lecturerId=me');
  assert.ok(mine.data.length > 0 && mine.data.every((s) => s.lecturerId === 'GV001'));
  const sectionId = mine.data[0].id;
  const sid = (await c('GET', `/api/grades?sectionId=${sectionId}`)).data.rows[0].studentId;

  const today = new Date().toLocaleDateString('sv-SE');
  assert.equal((await c('PUT', `/api/attendance/${sectionId}/${today}`, { records: { [sid]: 'late' } })).status, 200);
  const day = await c('GET', `/api/attendance?sectionId=${sectionId}&date=${today}`);
  assert.equal(day.data.rows.find((r) => r.studentId === sid).status, 'late');

  const g = await c('PUT', `/api/grades/${sectionId}`, { items: [{ studentId: sid, attendance: 10, midterm: 8, final: 9 }] });
  assert.equal(g.status, 200);
  const row = (await c('GET', `/api/grades?sectionId=${sectionId}`)).data.rows.find((r) => r.studentId === sid);
  assert.equal(row.total, 8.8); // 10*0.1 + 8*0.3 + 9*0.6
  assert.equal(row.letter, 'A');
  assert.equal(row.gpa4, 4);
  assert.equal((await c('PUT', `/api/grades/${sectionId}`, { items: [{ studentId: sid, final: 11 }] })).status, 400);

  // Lớp không phụ trách
  assert.equal((await c('GET', '/api/grades?sectionId=EC003-01')).status, 403);
  assert.equal((await c('PUT', `/api/attendance/EC003-01/${today}`, { records: {} })).status, 403);
});

test('sinh viên: chỉ xem được bảng điểm của mình', async () => {
  const c = client();
  const login = await c('POST', '/api/auth/login', { username: 'sv01', password: '123456' });
  const me = login.data.user.studentId;
  const t = await c('GET', `/api/students/${me}/transcript`);
  assert.equal(t.status, 200);
  assert.ok(t.data.summary.creditsEarned > 0);
  assert.ok(t.data.semesters.length >= 2);
  assert.equal((await c('GET', '/api/students/2200002/transcript')).status, 403);
  assert.equal((await c('GET', '/api/students')).status, 403);
  assert.equal((await c('GET', '/api/dashboard')).status, 403);
});

test('dashboard, sao lưu và nhật ký', async () => {
  const c = client();
  await c('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  const d = await c('GET', '/api/dashboard');
  assert.equal(d.status, 200);
  assert.ok(d.data.totals.students > 0);
  assert.ok(d.data.averageGpa > 0);
  const b = await c('POST', '/api/system/backups');
  assert.equal(b.status, 201);
  const list = await c('GET', '/api/system/backups');
  assert.ok(list.data.some((x) => x.name === b.data.name));
  const logs = await c('GET', '/api/system/audit-logs');
  assert.ok(logs.data.some((l) => l.action === 'LOGIN'));
  const evil = await c('POST', '/api/system/backups/..%2Fdb.json/restore');
  assert.equal(evil.status, 400, 'chặn tên file sao lưu không hợp lệ');
});

test('khoá đăng nhập sau 5 lần sai', async () => {
  const c = client();
  for (let i = 0; i < 5; i++) await c('POST', '/api/auth/login', { username: 'gv01', password: 'wrong' + i });
  const r = await c('POST', '/api/auth/login', { username: 'gv01', password: '123456' });
  assert.equal(r.status, 429);
});
