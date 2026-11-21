/** lecturers.html – danh sách giảng viên, thêm / sửa / xoá. */
Layout.ready(async (ctx) => {
  const { $, esc, toast, confirmDialog, debounce } = UI;
  const body = $('#table-body');
  const filters = { q: '', facultyId: '' };
  let list = [];

  const meta = await Layout.meta();
  const facultyOptions = meta.faculties.map((f) => ({ value: f.id, label: f.name }));
  UI.fillSelect($('#filter-faculty'), facultyOptions);
  UI.fillSelect($('#facultyId'), facultyOptions);

  const formModal = UI.bindForm('lecturer-modal', {
    onSubmit: async (data) => {
      const id = formModal.editingId;
      const r = id ? await Api.put(`/api/lecturers/${id}`, data) : await Api.post('/api/lecturers', data);
      toast(r.message, 'success');
      await load();
    },
  });

  async function load() {
    list = await Api.get('/api/lecturers', filters);
    $('#count').textContent = `${list.length} giảng viên`;
    body.innerHTML = list.map((t) => `
      <tr>
        <td><b>${esc(t.id)}</b></td>
        <td>${esc(t.fullName)}</td>
        <td><span class="badge badge-blue">${esc(t.degree)}</span></td>
        <td>${esc(t.facultyName)}</td>
        <td>${esc(t.email)}</td>
        <td class="nowrap">${esc(t.phone)}</td>
        <td>${t.advisorOf.map((c) => `<span class="badge badge-green">${esc(c)}</span>`).join(' ') || '<span class="muted">—</span>'}</td>
        <td class="text-center">${t.currentSections}</td>
        <td class="actions">${ctx.isAdmin ? `<button class="icon-btn" title="Sửa" data-edit="${t.id}">✏️</button>
          <button class="icon-btn" title="Xoá" data-del="${t.id}">🗑️</button>` : ''}</td>
      </tr>`).join('') || '<tr><td colspan="9" class="empty">Không có giảng viên phù hợp</td></tr>';
  }

  $('#btn-add').addEventListener('click', () => {
    formModal.editingId = null;
    formModal.open({ title: 'Thêm giảng viên mới', submitText: 'Thêm mới', data: { degree: 'ThS', facultyId: filters.facultyId } });
  });

  body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const t = list.find((x) => x.id === (btn.dataset.edit || btn.dataset.del));
    if (btn.dataset.edit) {
      formModal.editingId = t.id;
      formModal.open({ title: `Sửa giảng viên ${t.id}`, submitText: 'Cập nhật', data: t });
    }
    if (btn.dataset.del) {
      if (!(await confirmDialog(`Xoá giảng viên "${t.fullName}"?`, { okText: 'Xoá' }))) return;
      try { toast((await Api.del(`/api/lecturers/${t.id}`)).message, 'success'); await load(); }
      catch (err) { toast(err.message, 'error'); }
    }
  });

  $('#filter-q').addEventListener('input', debounce((e) => { filters.q = e.target.value; load(); }));
  $('#filter-faculty').addEventListener('change', (e) => { filters.facultyId = e.target.value; load(); });
  await load();
});
