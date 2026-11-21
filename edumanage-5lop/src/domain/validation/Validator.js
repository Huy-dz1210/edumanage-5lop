/**
 * LỚP 3 – DOMAIN: kiểm tra (xác thực) dữ liệu đầu vào theo quy tắc nghiệp vụ.
 * Bộ kiểm tra dữ liệu đầu vào đơn giản, trả về thông báo lỗi tiếng Việt theo từng trường.
 * Dùng: const data = new Validator(req.body).string('fullName','Họ tên',{required:true}).done();
 */
const AppError = require('../errors/AppError');

const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';

class Validator {
  constructor(body) {
    this.body = body && typeof body === 'object' ? body : {};
    this.errors = {};
    this.out = {};
  }

  string(key, label, { required = false, max = 200, min = 0, pattern, patternMsg } = {}) {
    const raw = this.body[key];
    if (isEmpty(raw)) {
      if (required) this.errors[key] = `${label} không được để trống`;
      else this.out[key] = '';
      return this;
    }
    const v = String(raw).trim();
    if (v.length > max) this.errors[key] = `${label} tối đa ${max} ký tự`;
    else if (v.length < min) this.errors[key] = `${label} tối thiểu ${min} ký tự`;
    else if (pattern && !pattern.test(v)) this.errors[key] = patternMsg || `${label} không hợp lệ`;
    else this.out[key] = v;
    return this;
  }

  oneOf(key, label, values, { required = true, defaultValue } = {}) {
    const raw = this.body[key];
    if (isEmpty(raw)) {
      if (defaultValue !== undefined) this.out[key] = defaultValue;
      else if (required) this.errors[key] = `Vui lòng chọn ${label.toLowerCase()}`;
      else this.out[key] = '';
      return this;
    }
    if (!values.includes(raw)) this.errors[key] = `${label} không hợp lệ`;
    else this.out[key] = raw;
    return this;
  }

  number(key, label, { required = false, min, max, integer = false } = {}) {
    const raw = this.body[key];
    if (isEmpty(raw)) {
      if (required) this.errors[key] = `${label} không được để trống`;
      else this.out[key] = null;
      return this;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) this.errors[key] = `${label} phải là số`;
    else if (integer && !Number.isInteger(n)) this.errors[key] = `${label} phải là số nguyên`;
    else if (min !== undefined && n < min) this.errors[key] = `${label} phải từ ${min} trở lên`;
    else if (max !== undefined && n > max) this.errors[key] = `${label} không được vượt quá ${max}`;
    else this.out[key] = n;
    return this;
  }

  date(key, label, { required = false } = {}) {
    const raw = this.body[key];
    if (isEmpty(raw)) {
      if (required) this.errors[key] = `${label} không được để trống`;
      else this.out[key] = '';
      return this;
    }
    if (!isValidDate(raw)) this.errors[key] = `${label} không hợp lệ (định dạng YYYY-MM-DD)`;
    else this.out[key] = raw;
    return this;
  }

  boolean(key, { defaultValue = true } = {}) {
    const raw = this.body[key];
    this.out[key] = raw === undefined ? defaultValue : raw === true || raw === 'true';
    return this;
  }

  custom(key, fn) {
    if (!this.errors[key]) {
      const msg = fn(this.out[key], this.out);
      if (msg) this.errors[key] = msg;
    }
    return this;
  }

  done() {
    if (Object.keys(this.errors).length) {
      throw AppError.badRequest('Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại', this.errors);
    }
    return this.out;
  }
}

function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

module.exports = { Validator, isValidDate };
