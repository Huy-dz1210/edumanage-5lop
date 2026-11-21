/** students.html – danh sách sinh viên, thêm / sửa / xoá, xem bảng điểm. */
Layout.ready(async (ctx) => {
  const { $, esc, fmtDate, statusBadge, toast, confirmDialog, debounce } = UI;
  const body = $('#table-body');
  const filters = { q: '', facultyId: '', classId: ctx.params.classId || '', status: '' };
  let list = [];

  const [meta, classes] = await Promise.all([Layout.meta(), Api.get('/api/classes')]);
  UI.fillSelect($('#filter-faculty'), meta.faculties.map((f) => ({ value: f.id, label: f.name })));
  const classOptions = (facultyId) => classes.filter((c) => !facultyId || c.facultyId === facultyId).map((c) => ({ value: c.id, label: `${c.id} – ${c.major}` }));
  UI.fillSelect($('#filter-class'), classOptions(''), { selected: filters.classId });
  UI.fillSelect($('#classId'), classOptions(''));
  $('#dob').max = UI.today();

  const formModal = UI.bindForm('student-modal', {
    onSubmit: async (data) => {
      const id = formModal.editingId;
      const r = id ? await Api.put(`/api/students/${id}`, data) : await Api.post('/api/students', data);
      toast(id ? r.message : `${r.message} – MSSV: ${r.item.id}`, 'success');
      await load();
    },
  });

  async function load() {
    list = await Api.get('/api/students', filters);
    $('#count').textContent = `${list.length} sinh viên`;
    body.innerHTML = list.map((s) => `
      <tr>
        <td class="nowrap"><b>${esc(s.id)}</b></td>
        <td>${esc(s.fullName)}</td>
        <td>${esc(s.gender)}</td>
        <td class="nowrap">${fmtDate(s.dob)}</td>
        <td><span class="badge badge-blue">${esc(s.classId)}</span></td>
        <td>${esc(s.facultyName)}</td>
        <td class="text-center"><b>${s.gpa === null ? '—' : s.gpa.toFixed(2)}</b></td>
        <td class="text-center">${s.creditsEarned}</td>
        <td>${statusBadge(s.status)}</td>
        <td class="actions">
          <a class="icon-btn" title="Bảng điểm" href="transcript.html?id=${s.id}">📄</a>
          ${ctx.isAdmin ? `<button class="icon-btn" title="Sửa" data-edit="${s.id}">✏️</button>
          <button class="icon-btn" title="Xoá" data-del="${s.id}">🗑️</button>` : ''}
        </td>
      </tr>`).join('') || '<tr><td colspan="10" class="empty">Không tìm thấy sinh viên phù hợp</td></tr>';
  }

  $('#btn-add').addEventListener('click', () => {
    formModal.editingId = null;
    formModal.open({ title: 'Thêm sinh viên mới', submitText: 'Thêm mới', data: { classId: filters.classId } });
  });

  body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const s = list.find((x) => x.id === (btn.dataset.edit || btn.dataset.del));
    if (btn.dataset.edit) {
      formModal.editingId = s.id;
      formModal.open({ title: `Sửa thông tin sinh viên ${s.id}`, submitText: 'Cập nhật', data: s });
    }
    if (btn.dataset.del) {
      if (!(await confirmDialog(`Xoá sinh viên "${s.fullName}" (${s.id})? Toàn bộ đăng ký học phần, điểm và điểm danh của sinh viên này cũng sẽ bị xoá.`, { okText: 'Xoá' }))) return;
      try { toast((await Api.del(`/api/students/${s.id}`)).message, 'success'); await load(); }
      catch (err) { toast(err.message, 'error'); }
    }
  });

  $('#filter-q').addEventListener('input', debounce((e) => { filters.q = e.target.value; load(); }));
  $('#filter-faculty').addEventListener('change', (e) => {
    filters.facultyId = e.target.value;
    filters.classId = '';
    UI.fillSelect($('#filter-class'), classOptions(filters.facultyId));
    load();
  });
  $('#filter-class').addEventListener('change', (e) => { filters.classId = e.target.value; load(); });
  $('#filter-status').addEventListener('change', (e) => { filters.status = e.target.value; load(); });

  await load();
});
