/**
 * LỚP 5 – DATABASE (tạm thời dùng file JSON, sẽ thay bằng Microsoft SQL Server).
 *
 * Mô phỏng một CSDL quan hệ: mỗi "bảng" là một mảng bản ghi trong data/db.json.
 *   users, faculties, lecturers, classes, students, courses, sections,
 *   enrollments, grades, attendance, auditLogs
 *
 * Chức năng:
 * - Nạp dữ liệu khi khởi động; ghi xuống đĩa an toàn (ghi file tạm rồi đổi tên).
 * - Snapshot/khôi phục trong bộ nhớ để hỗ trợ transaction ở lớp Repository.
 * - Sao lưu / khôi phục file; tự phục hồi từ bản sao lưu khi db.json bị hỏng (NFR03).
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { buildSeed, toRelational } = require('./seed');

const TABLES = ['users', 'faculties', 'lecturers', 'classes', 'students', 'courses', 'sections', 'enrollments', 'grades', 'attendance', 'auditLogs'];

class JsonStore {
  constructor({ file, backupDir, maxBackups = 10 }) {
    this.file = file;
    this.backupDir = backupDir;
    this.maxBackups = maxBackups;
    this.data = null;
    this.queue = Promise.resolve();
    this.inTransaction = false;
  }

  // ---------- Khởi tạo ----------
  load() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.mkdirSync(this.backupDir, { recursive: true });
    if (!fs.existsSync(this.file)) return this.reseed('Đã tạo dữ liệu mẫu');

    let data;
    try {
      data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch (err) {
      console.error('[database] File dữ liệu bị lỗi:', err.message);
      const latest = this.listBackups()[0];
      if (!latest) throw new Error('Không đọc được db.json và không có bản sao lưu để khôi phục');
      console.warn('[database] Khôi phục từ bản sao lưu', latest.name);
      fs.copyFileSync(this.file, this.file + '.corrupt-' + Date.now());
      data = JSON.parse(fs.readFileSync(path.join(this.backupDir, latest.name), 'utf8'));
    }
    this.data = this.migrate(data);
    if (!this.data) {
      fs.copyFileSync(this.file, this.file + '.old-' + Date.now());
      return this.reseed('Dữ liệu cũ không tương thích (đã giữ bản .old) – tạo dữ liệu mẫu mới');
    }
    this.writeSync();
  }

  reseed(message) {
    this.data = buildSeed();
    this.writeSync();
    console.log('[database]', message, 'tại', this.file);
  }

  /** Nâng cấp cấu trúc dữ liệu từ phiên bản cũ. Trả về null nếu không thể chuyển đổi. */
  migrate(data) {
    if (!data || !Array.isArray(data.faculties)) return null; // bản trường THPT cũ
    if (!data.meta || data.meta.version < 3) data = toRelational(data);
    for (const t of TABLES) if (!Array.isArray(data[t])) data[t] = [];
    return data;
  }

  // ---------- Truy cập bảng ----------
  table(name) {
    if (!TABLES.includes(name)) throw new Error(`Bảng không tồn tại: ${name}`);
    return this.data[name];
  }

  setTable(name, rows) {
    this.table(name);
    this.data[name] = rows;
  }

  get meta() {
    return this.data.meta;
  }

  // ---------- Ghi dữ liệu ----------
  writeSync() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  /** Ghi xuống đĩa (tuần tự hoá các lần ghi để không ghi chồng). */
  save() {
    const snapshot = JSON.stringify(this.data, null, 2);
    this.queue = this.queue
      .catch(() => {})
      .then(async () => {
        const tmp = this.file + '.tmp';
        await fsp.writeFile(tmp, snapshot);
        await fsp.rename(tmp, this.file);
      });
    return this.queue;
  }

  // ---------- Hỗ trợ transaction ----------
  snapshot() {
    return JSON.stringify(this.data);
  }

  rollbackTo(snapshot) {
    this.data = JSON.parse(snapshot);
  }

  // ---------- Sao lưu ----------
  async backup(reason = 'manual') {
    await this.queue.catch(() => {});
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `db-${stamp}-${reason}.json`;
    await fsp.copyFile(this.file, path.join(this.backupDir, name));
    for (const b of this.listBackups().slice(this.maxBackups)) {
      await fsp.unlink(path.join(this.backupDir, b.name)).catch(() => {});
    }
    return name;
  }

  listBackups() {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs
      .readdirSync(this.backupDir)
      .filter((f) => /^db-.*\.json$/.test(f))
      .map((name) => {
        const st = fs.statSync(path.join(this.backupDir, name));
        return { name, size: st.size, createdAt: st.mtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.name.localeCompare(a.name));
  }

  backupExists(name) {
    return fs.existsSync(path.join(this.backupDir, name));
  }

  /** Đọc nội dung một bản sao lưu (trả về null nếu file hỏng). */
  async readBackup(name) {
    try {
      return this.migrate(JSON.parse(await fsp.readFile(path.join(this.backupDir, name), 'utf8')));
    } catch {
      return null;
    }
  }

  async replaceAll(data) {
    this.data = data;
    await this.save();
  }
}

module.exports = JsonStore;
