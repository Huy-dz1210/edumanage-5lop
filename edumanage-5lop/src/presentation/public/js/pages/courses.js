/** courses.html – danh mục học phần (môn học, số tín chỉ). */
Layout.ready(async (ctx) => {
  const { $, esc, toast, confirmDialog, debounce } = UI;
  const body = $('#table-body');
  const filters = { q: '', facultyId: '' };
  let list = [];

  const meta = await Layout.meta();
  const facultyOptions = meta.faculties.map((f) => ({ value: f.id, label: f.name }));
  UI.fillSelect($('#filter-faculty'), facultyOptions);
  UI.fillSelect($('#facultyId'), facultyOptions);

  const formModal = UI.bindForm('course-modal', {
    onSubmit: async (data) => {
      const id = formModal.editingId;
      const r = id ? await Api.put(`/api/courses/${id}`, data) : await Api.post('/api/courses', data);
      toast(r.message, 'success');
      await load();
    },
  });

  async function load() {
    list = await Api.get('/api/courses', filters);
    $('#count').textContent = `${list.length} học phần`;
    body.innerHTML = list.map((c) => `
      <tr>
        <td><b>${esc(c.id)}</b></td>
        <td>${esc(c.name)}</td>
        <td class="text-center">${c.credits}</td>
        <td><span class="badge ${c.type === 'Bắt buộc' ? 'badge-blue' : 'badge-gray'}">${esc(c.type)}</span></td>
        <td>${esc(c.facultyName)}</td>
        <td class="text-center"><a href="sections.html?q=${esc(c.id)}">${c.sectionCount}</a></td>
        <td class="actions">${ctx.isAdmin ? `<button class="icon-btn" title="Sửa" data-edit="${c.id}">✏️</button>
          <button class="icon-btn" title="Xoá" data-del="${c.id}">🗑️</button>` : ''}</td>
      </tr>`).join('') || '<tr><td colspan="7" class="empty">Không có học phần phù hợp</td></tr>';
  }

  $('#btn-add').addEventListener('click', () => {
    formModal.editingId = null;
    $('#id').disabled = false;
    formModal.open({ title: 'Thêm học phần mới', submitText: 'Thêm mới', data: { credits: 3, facultyId: filters.facultyId } });
  });

  body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const c = list.find((x) => x.id === (btn.dataset.edit || btn.dataset.del));
    if (btn.dataset.edit) {
      formModal.editingId = c.id;
      formModal.open({ title: `Sửa học phần ${c.id}`, submitText: 'Cập nhật', data: c });
      $('#id').disabled = true;
    }
    if (btn.dataset.del) {
      if (!(await confirmDialog(`Xoá học phần "${c.name}" (${c.id})?`, { okText: 'Xoá' }))) return;
      try { toast((await Api.del(`/api/courses/${c.id}`)).message, 'success'); await load(); }
      catch (err) { toast(err.message, 'error'); }
    }
  });

  $('#filter-q').addEventListener('input', debounce((e) => { filters.q = e.target.value; load(); }));
  $('#filter-faculty').addEventListener('change', (e) => { filters.facultyId = e.target.value; load(); });
  await load();
});
