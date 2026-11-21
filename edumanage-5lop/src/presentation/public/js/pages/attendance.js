/** attendance.html – điểm danh theo buổi học của lớp học phần. */
Layout.ready(async (ctx) => {
  const { $, esc, toast, today, fmtDate, confirmDialog } = UI;
  const LABEL = { present: 'Có mặt', late: 'Muộn', absent: 'Vắng' };
  const body = $('#table-body');
  const saveBtn = $('#btn-save');
  const dateInput = $('#filter-date');

  const meta = await Layout.meta();
  // Giảng viên chỉ thấy lớp mình dạy; Phòng đào tạo thấy mọi lớp của học kỳ hiện tại
  const sections = await Api.get('/api/sections', { semester: meta.currentSemester, lecturerId: ctx.isLecturer ? 'me' : '' });
  const sectionSelect = $('#filter-section');
  if (!sections.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">Bạn chưa phụ trách lớp học phần nào trong học kỳ này</td></tr>';
    return;
  }
  UI.fillSelect(sectionSelect, sections.map((s) => ({ value: s.id, label: `${s.id} – ${s.courseName}` })), { keepFirst: false });
  const state = { sectionId: sections.some((s) => s.id === ctx.params.sectionId) ? ctx.params.sectionId : sections[0].id, date: today(), rows: [], changes: {} };
  sectionSelect.value = state.sectionId;
  dateInput.value = state.date;
  dateInput.max = today();

  const current = (r) => (r.studentId in state.changes ? state.changes[r.studentId] : r.status);
  const changeCount = () => Object.keys(state.changes).length;

  function summary() {
    const s = { present: 0, late: 0, absent: 0, unmarked: 0 };
    state.rows.forEach((r) => { const v = current(r); v ? s[v]++ : s.unmarked++; });
    ['present', 'late', 'absent', 'unmarked'].forEach((k) => ($('#sum-' + k).textContent = s[k]));
    $('#sum-total').textContent = state.rows.length;
    const n = changeCount();
    $('#sum-changes').textContent = `${n} thay đổi chưa lưu`;
    $('#sum-changes').classList.toggle('hidden', !n);
    saveBtn.disabled = !n;
  }

  function render() {
    body.innerHTML = state.rows.map((r) => {
      const v = current(r);
      const buttons = ['present', 'late', 'absent']
        .map((k) => `<button type="button" data-sid="${r.studentId}" data-st="${k}" class="${v === k ? 'on-' + k : ''}">${LABEL[k]}</button>`).join('');
      return `<tr>
        <td><b>${esc(r.studentId)}</b></td>
        <td>${esc(r.fullName)}</td>
        <td>${esc(r.classId)}</td>
        <td class="text-center">${r.totalAbsences ? `<span class="badge ${r.totalAbsences >= 3 ? 'badge-red' : 'badge-amber'}">${r.totalAbsences}</span>` : '0'}</td>
        <td><div class="seg">${buttons}</div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" class="empty">Lớp học phần chưa có sinh viên</td></tr>';
    summary();
  }

  async function load() {
    const d = await Api.get('/api/attendance', { sectionId: state.sectionId, date: state.date });
    const s = sections.find((x) => x.id === state.sectionId);
    $('#section-info').innerHTML = `<b>${esc(s.courseName)}</b> (${s.credits} TC) · ${esc(s.lecturerName)} · ${esc(s.schedule)} · Phòng ${esc(s.room)}`;
    $('#sessions').innerHTML = d.sessions.map((day) => `<button type="button" class="chip ${day === state.date ? 'active' : ''}" data-date="${day}">${fmtDate(day)}</button>`).join(' ') || '<span class="muted">chưa có</span>';
    state.rows = d.rows;
    state.changes = {};
    render();
  }

  const okToDiscard = async () => !changeCount() || confirmDialog('Có thay đổi chưa lưu. Bỏ qua các thay đổi này?', { okText: 'Bỏ qua', danger: false });
  async function setDate(value) {
    if (!value || !(await okToDiscard())) { dateInput.value = state.date; return; }
    state.date = value;
    dateInput.value = value;
    load().catch((err) => toast(err.message, 'error'));
  }

  body.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-sid]');
    if (!b) return;
    const row = state.rows.find((r) => r.studentId === b.dataset.sid);
    const value = current(row) === b.dataset.st ? null : b.dataset.st;
    if (value === row.status) delete state.changes[row.studentId];
    else state.changes[row.studentId] = value;
    render();
  });
  $('#sessions').addEventListener('click', (e) => { const c = e.target.closest('[data-date]'); if (c) setDate(c.dataset.date); });
  dateInput.addEventListener('change', () => setDate(dateInput.value));
  sectionSelect.addEventListener('change', async () => {
    if (!(await okToDiscard())) { sectionSelect.value = state.sectionId; return; }
    state.sectionId = sectionSelect.value;
    load().catch((err) => toast(err.message, 'error'));
  });
  $('#btn-all-present').addEventListener('click', () => {
    state.rows.forEach((r) => { if (r.status === 'present') delete state.changes[r.studentId]; else state.changes[r.studentId] = 'present'; });
    render();
  });
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    try {
      toast((await Api.put(`/api/attendance/${state.sectionId}/${state.date}`, { records: state.changes })).message, 'success');
      await load();
    } catch (err) { toast(err.message, 'error'); summary(); }
  });

  await load();
});
