/**
 * LỚP 3 – DOMAIN: quy tắc tính điểm (thuần nghiệp vụ, không truy cập dữ liệu).
 *  - Điểm tổng kết = CC × 10% + GK × 30% + CK × 60% (làm tròn 1 chữ số)
 *  - Quy đổi điểm chữ & thang 4 theo GRADE_SCALE
 *  - GPA = Σ(thang 4 × tín chỉ) / Σ tín chỉ; xếp loại theo GPA_CLASSES
 */
const { WEIGHTS, GRADE_SCALE, PASS_MARK, GPA_CLASSES } = require('../constants');
const { round1, round2 } = require('../../shared/helpers');

const PARTS = ['attendance', 'midterm', 'final'];

function computeResult(scores) {
  if (!scores || PARTS.some((k) => scores[k] === null || scores[k] === undefined)) {
    return { total: null, letter: null, gpa4: null, passed: null };
  }
  const total = round1(PARTS.reduce((s, k) => s + scores[k] * WEIGHTS[k], 0));
  const [, letter, gpa4] = GRADE_SCALE.find(([min]) => total >= min);
  return { total, letter, gpa4, passed: total >= PASS_MARK };
}

/** items: [{ gpa4, credits }] (chỉ những học phần đã có điểm tổng kết) */
function computeGpa(items) {
  const credits = items.reduce((s, i) => s + i.credits, 0);
  return credits ? round2(items.reduce((s, i) => s + i.gpa4 * i.credits, 0) / credits) : null;
}

function classifyGpa(gpa) {
  if (gpa === null || gpa === undefined) return 'Chưa có điểm';
  return GPA_CLASSES.find(([min]) => gpa >= min)[1];
}

module.exports = { PARTS, computeResult, computeGpa, classifyGpa };
