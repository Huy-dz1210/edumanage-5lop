/** classes.html – lớp sinh hoạt (lớp hành chính) dạng thẻ, thêm / sửa / xoá, phân công cố vấn học tập. */
Layout.ready(async (ctx) => {
  const { $, esc, toast, confirmDialog } = UI;
  const cards = $('#class-cards');
  const filters = { facultyId: '' };
  let list = [];

  const [meta, lecturers] = await Promise.all([Layout.meta(), Api.get('/api/lecturers')]);
  const facultyOptions = meta.faculties.map((f) => ({ value: f.id, label: f.name }));
  UI.fillSelect($('#filter-faculty'), facultyOptions);
  UI.fillSelect($('#facultyId'), facultyOptions);
  UI.fillSelect($('#advisorId'), lecturers.map((l) => ({ value: l.id, label: `${l.degree}. ${l.fullName} – ${l.facultyName}` })));

  const formModal = UI.bindForm('class-modal', {
    onSubmit: async (data) => {
      const id = formModal.editingId;
      const r = id ? await Api.put(`/api/classes/${id}`, data) : await Api.post('/api/classes', data);
      toast(r.message, 'success');
      await load();
    },
  });

  async function load() {
    list = await Api.get('/api/classes', filters);
    $('#count').textContent = `${list.length} lớp`;
    cards.innerHTML = list.map((c) => `
      <div class="card class-card">
        <div class="card-title"><h3>${esc(c.id)}</h3><span class="badge badge-blue">${esc(c.cohort)}</span></div>
        <div class="row"><span class="muted">Khoa</span><b>${esc(c.facultyName)}</b></div>
        <div class="row"><span class="muted">Ngành</span><b>${esc(c.major)}</b></div>
        <div class="row"><span class="muted">Cố vấn học tập</span><b>${esc(c.advisorName || 'Chưa phân công')}</b></div>
        <div class="row"><span class="muted">Sĩ số</span><b>${c.studentCount} SV (${c.activeCount} đang học)</b></div>
        <div class="toolbar mt-sm">
          <a class="btn btn-sm" href="students.html?classId=${encodeURIComponent(c.id)}">Danh sách SV</a>
          <span class="spacer"></span>
          ${ctx.isAdmin ? `<button class="btn btn-sm" data-edit="${esc(c.id)}">Sửa</button>
          <button class="btn btn-sm btn-danger" data-del="${esc(c.id)}">Xoá</button>` : ''}
        </div>
      </div>`).join('') || '<div class="card empty">Chưa có lớp nào</div>';
  }

  $('#btn-add').addEventListener('click', () => {
    formModal.editingId = null;
    $('#id').disabled = false;
    formModal.open({ title: 'Thêm lớp sinh hoạt', submitText: 'Thêm mới', data: { facultyId: filters.facultyId } });
  });

  cards.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const c = list.find((x) => x.id === (btn.dataset.edit || btn.dataset.del));
    if (btn.dataset.edit) {
      formModal.editingId = c.id;
      formModal.open({ title: `Sửa lớp ${c.id}`, submitText: 'Cập nhật', data: c });
      $('#id').disabled = true; // không đổi mã lớp
    }
    if (btn.dataset.del) {
      if (!(await confirmDialog(`Xoá lớp "${c.id}"?`, { okText: 'Xoá' }))) return;
      try { toast((await Api.del(`/api/classes/${encodeURIComponent(c.id)}`)).message, 'success'); await load(); }
      catch (err) { toast(err.message, 'error'); }
    }
  });

  $('#filter-faculty').addEventListener('change', (e) => { filters.facultyId = e.target.value; load(); });
  await load();
});
