/** grades.html – nhập điểm chuyên cần / giữa kỳ / cuối kỳ cho lớp học phần, tự tính tổng kết và điểm chữ. */
Layout.ready(async (ctx) => {
  const { $, esc, toast, confirmDialog, score } = UI;
  const PARTS = ['attendance', 'midterm', 'final'];
  const body = $('#table-body');
  const saveBtn = $('#btn-save');
  const meta = await Layout.meta();
  const state = { semester: meta.currentSemester, sectionId: ctx.params.sectionId || '', sections: [], rows: [], dirty: new Set() };

  // Tính điểm giống hệt backend để xem trước khi lưu
  const compute = (r) => {
    if (PARTS.some((k) => r[k] === null)) return { total: null, letter: null, gpa4: null, passed: null };
    const total = Math.round(PARTS.reduce((s, k) => s + r[k] * meta.weights[k], 0) * 10) / 10;
    const [, letter, gpa4] = meta.gradeScale.find(([min]) => total >= min);
    return { total, letter, gpa4, passed: total >= 4 };
  };
  const resultCells = (c) => `
    <td class="text-center"><b data-total>${score(c.total)}</b></td>
    <td class="text-center" data-letter><span class="${c.letter === 'A' ? 'grade-A' : c.letter === 'F' ? 'grade-F' : ''}">${c.letter || '—'}</span></td>
    <td class="text-center" data-gpa4>${c.gpa4 === null ? '—' : c.gpa4.toFixed(1)}</td>
    <td data-pass>${c.passed === null ? '<span class="muted">Chưa đủ điểm</span>' : c.passed ? '<span class="badge badge-green">Đạt</span>' : '<span class="badge badge-red">Không đạt</span>'}</td>`;

  UI.fillSelect($('#filter-semester'), meta.semesters.map((s) => ({ value: s, label: s })), { keepFirst: false, selected: state.semester });

  async function loadSections() {
    state.sections = await Api.get('/api/sections', { semester: state.semester, lecturerId: ctx.isLecturer ? 'me' : '' });
    const sel = $('#filter-section');
    UI.fillSelect(sel, state.sections.map((s) => ({ value: s.id, label: `${s.id} – ${s.courseName}` })), { keepFirst: false });
    if (!state.sections.some((s) => s.id === state.sectionId)) state.sectionId = state.sections[0] ? state.sections[0].id : '';
    sel.value = state.sectionId;
  }

  function updateStat() {
    const done = state.rows.map(compute).filter((c) => c.total !== null);
    const passed = done.filter((c) => c.passed).length;
    $('#grade-stat').textContent = state.rows.length ? `${done.length}/${state.rows.length} đã có điểm · ${passed} đạt` : '';
    saveBtn.disabled = !state.dirty.size;
    saveBtn.textContent = state.dirty.size ? `💾 Lưu (${state.dirty.size})` : '💾 Lưu bảng điểm';
  }

  function render() {
    body.innerHTML = state.rows.map((r) => `
      <tr class="${state.dirty.has(r.studentId) ? 'dirty' : ''}">
        <td><b>${esc(r.studentId)}</b></td>
        <td>${esc(r.fullName)}</td>
        <td>${esc(r.classId)}</td>
        ${PARTS.map((k) => `<td class="text-center"><input class="input score-input" type="number" min="0" max="10" step="0.1" data-sid="${r.studentId}" data-k="${k}" value="${r[k] ?? ''}" /></td>`).join('')}
        ${resultCells(compute(r))}
      </tr>`).join('') || `<tr><td colspan="10" class="empty">${state.sectionId ? 'Lớp học phần chưa có sinh viên' : 'Không có lớp học phần nào trong học kỳ này'}</td></tr>`;
    updateStat();
  }

  async function load() {
    state.dirty.clear();
    if (!state.sectionId) { state.rows = []; $('#section-info').textContent = ''; render(); return; }
    const d = await Api.get('/api/grades', { sectionId: state.sectionId });
    const s = state.sections.find((x) => x.id === state.sectionId);
    $('#section-info').innerHTML = `<b>${esc(d.section.courseName)}</b> (${d.section.credits} TC) · ${esc(s ? s.lecturerName : '')} · ${esc(d.section.semester)}`;
    state.rows = d.rows;
    render();
  }

  body.addEventListener('input', (e) => {
    const input = e.target.closest('input[data-sid]');
    if (!input) return;
    const row = state.rows.find((x) => x.studentId === input.dataset.sid);
    const raw = input.value.trim();
    const n = raw === '' ? null : Number(raw);
    const bad = n !== null && (!Number.isFinite(n) || n < 0 || n > 10);
    input.classList.toggle('invalid', bad);
    if (bad) return;
    row[input.dataset.k] = n;
    state.dirty.add(row.studentId);
    const tr = input.closest('tr');
    tr.classList.add('dirty');
    // cập nhật 4 ô kết quả
    const tmp = document.createElement('tbody');
    tmp.innerHTML = `<tr>${resultCells(compute(row))}</tr>`;
    const cells = tr.querySelectorAll('td');
    [...tmp.querySelectorAll('td')].forEach((td, i) => cells[6 + i].replaceWith(td));
    updateStat();
  });

  const okToDiscard = async () => !state.dirty.size || confirmDialog('Có điểm chưa lưu. Bỏ qua các thay đổi này?', { okText: 'Bỏ qua', danger: false });
  $('#filter-semester').addEventListener('change', async (e) => {
    if (!(await okToDiscard())) { e.target.value = state.semester; return; }
    state.semester = e.target.value;
    await loadSections();
    load().catch((err) => toast(err.message, 'error'));
  });
  $('#filter-section').addEventListener('change', async (e) => {
    if (!(await okToDiscard())) { e.target.value = state.sectionId; return; }
    state.sectionId = e.target.value;
    load().catch((err) => toast(err.message, 'error'));
  });

  saveBtn.addEventListener('click', async () => {
    if (body.querySelector('.invalid')) return toast('Có ô điểm không hợp lệ (phải từ 0 đến 10)', 'error');
    const items = state.rows.filter((r) => state.dirty.has(r.studentId))
      .map(({ studentId, attendance, midterm, final }) => ({ studentId, attendance, midterm, final }));
    saveBtn.disabled = true;
    try {
      toast((await Api.put(`/api/grades/${state.sectionId}`, { items })).message, 'success');
      await load();
    } catch (err) { toast(err.message, 'error'); updateStat(); }
  });

  // Mở thẳng một lớp từ đường link (?sectionId=...) → chọn đúng học kỳ của lớp đó
  if (ctx.params.sectionId) {
    const all = await Api.get('/api/sections', { lecturerId: ctx.isLecturer ? 'me' : '' });
    const found = all.find((s) => s.id === ctx.params.sectionId);
    if (found) { state.semester = found.semester; $('#filter-semester').value = found.semester; }
  }
  await loadSections();
  await load();
});
