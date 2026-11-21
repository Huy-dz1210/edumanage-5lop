/**
 * Kiểm thử kiến trúc 5 lớp: mỗi lớp chỉ được gọi (require) lớp ngay bên dưới nó.
 *   Presentation → Application → Domain → Repository → Database
 * (config và shared là phần dùng chung, lớp nào cũng được dùng)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const LAYERS = {
  presentation: ['presentation', 'application'],
  application: ['application', 'domain'],
  domain: ['domain', 'repositories'],
  repositories: ['repositories', 'database'],
  database: ['database'],
};
const SHARED = ['config', 'shared'];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'public' ? [] : walk(p); // public = HTML/JS chạy trên trình duyệt
    return p.endsWith('.js') ? [p] : [];
  });
}

const layerOf = (file) => path.relative(SRC, file).split(path.sep)[0];

for (const [layer, allowed] of Object.entries(LAYERS)) {
  test(`lớp ${layer} chỉ phụ thuộc vào: ${allowed.join(', ')}`, () => {
    for (const file of walk(path.join(SRC, layer))) {
      const code = fs.readFileSync(file, 'utf8');
      for (const [, mod] of code.matchAll(/require\(['"](\.{1,2}\/[^'"]+)['"]\)/g)) {
        const target = layerOf(path.resolve(path.dirname(file), mod));
        assert.ok(
          allowed.includes(target) || SHARED.includes(target),
          `${path.relative(SRC, file)} gọi sang lớp "${target}" – vi phạm kiến trúc 5 lớp`
        );
      }
    }
  });
}
