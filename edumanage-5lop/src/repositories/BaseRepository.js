/**
 * LỚP 4 – REPOSITORY / DATA ACCESS: các thao tác dữ liệu cơ bản trên một bảng.
 *
 * Mọi hàm đều là async (trả về Promise) giống hệt khi truy vấn SQL Server,
 * nên khi chuyển sang SQL chỉ cần viết lại phần thân hàm bằng câu lệnh SQL:
 *   findAll   → SELECT ... WHERE ...
 *   insert    → INSERT INTO ...
 *   update    → UPDATE ... SET ... WHERE id = @id
 *   delete    → DELETE FROM ... WHERE ...
 *
 * Điều kiện lọc (criteria) là object: { classId: 'DH22KT01', status: ['Đang học', 'Bảo lưu'] }
 * – giá trị mảng tương đương mệnh đề IN (...).
 * Dữ liệu trả về luôn là bản sao, lớp trên không sửa trực tiếp vào "bảng".
 */
const store = require('../database');

const copy = (row) => (row ? { ...row } : null);
const matches = (row, criteria = {}) =>
  Object.entries(criteria).every(([k, v]) => (Array.isArray(v) ? v.includes(row[k]) : row[k] === v));

class BaseRepository {
  /**
   * @param {string} table  tên bảng
   * @param {string|null} key  khoá chính (null nếu bảng dùng khoá ghép)
   */
  constructor(table, key = 'id') {
    this.table = table;
    this.key = key;
  }

  rows() {
    return store.table(this.table);
  }

  /** Ghi xuống CSDL (trong transaction thì để cuối transaction ghi một lần). */
  async commit() {
    if (!store.inTransaction) await store.save();
  }

  async findAll(criteria) {
    return this.rows().filter((r) => matches(r, criteria)).map(copy);
  }

  async findById(id) {
    return copy(this.rows().find((r) => r[this.key] === id));
  }

  async findOne(criteria) {
    return copy(this.rows().find((r) => matches(r, criteria)));
  }

  async exists(criteria) {
    return this.rows().some((r) => matches(r, criteria));
  }

  async count(criteria) {
    return this.rows().filter((r) => matches(r, criteria)).length;
  }

  async insert(entity) {
    this.rows().push({ ...entity });
    await this.commit();
    return copy(entity);
  }

  async insertMany(entities) {
    this.rows().push(...entities.map((e) => ({ ...e })));
    await this.commit();
    return entities.length;
  }

  async update(id, patch) {
    const row = this.rows().find((r) => r[this.key] === id);
    if (!row) return null;
    Object.assign(row, patch);
    await this.commit();
    return copy(row);
  }

  async updateWhere(criteria, patch) {
    const list = this.rows().filter((r) => matches(r, criteria));
    list.forEach((r) => Object.assign(r, patch));
    await this.commit();
    return list.length;
  }

  async delete(id) {
    return this.deleteWhere({ [this.key]: id });
  }

  async deleteWhere(criteria) {
    const before = this.rows().length;
    store.setTable(this.table, this.rows().filter((r) => !matches(r, criteria)));
    await this.commit();
    return before - this.rows().length;
  }

  /** Lấy số thứ tự lớn nhất trong mã có tiền tố, ví dụ 'GV' → GV008 → 8 (tương đương SELECT MAX(...)). */
  async maxSequence(prefix, field = this.key) {
    return this.rows().reduce((m, r) => {
      const v = String(r[field] || '');
      if (!v.startsWith(prefix)) return m;
      const n = Number(v.slice(prefix.length).replace(/^\D+/, ''));
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
  }
}

module.exports = BaseRepository;
module.exports.matches = matches;
