/** users.html – quản lý tài khoản (Phòng đào tạo, giảng viên, sinh viên). */
Layout.ready(async (ctx) => {
  const { $, $$, esc, toast, confirmDialog, fmtDateTime } = UI;
  const body = $('#table-body');
  const filters = { role: '' };
  let list = [];

  const [lecturers, students] = await Promise.all([Api.get('/api/lecturers'), Api.get('/api/students')]);
  UI.fillSelect($('#lecturerId'), lecturers.map((l) => ({ value: l.id, label: `${l.degree}. ${l.fullName} (${l.id})` })));
  $('#student-options').innerHTML = students.map((s) => `<option value="${esc(s.id)}">${esc(s.fullName)} – ${esc(s.classId)}</option>`).join('');

  const formModal = UI.bindForm('user-modal', {
    onSubmit: async (data) => {
      const id = formModal.editingId;
      const r = id ? await Api.put(`/api/users/${id}`, data) : await Api.post('/api/users', data);
      toast(r.message, 'success');
      await load();
    },
  });

  // Chỉ hiện ô liên kết phù hợp với vai trò
  const roleSelect = $('#role');
  const syncRole = () => $$('[data-show-role]').forEach((el) => el.classList.toggle('hidden', el.dataset.showRole !== roleSelect.value));
  roleSelect.addEventListener('change', syncRole);
  const setPasswordLabel = (text) => ($('[data-password-label]').textContent = text);

  const linkText = (u) => {
    if (u.role === 'lecturer') { const l = lecturers.find((x) => x.id === u.lecturerId); return l ? `GV: ${l.fullName}` : '—'; }
    if (u.role === 'student') { const s = students.find((x) => x.id === u.studentId); return s ? `SV: ${s.id} – ${s.fullName}` : u.studentId || '—'; }
    return '—';
  };
  const roleBadge = { admin: 'badge-red', lecturer: 'badge-blue', student: 'badge-green' };

  async function load() {
    list = (await Api.get('/api/users')).filter((u) => !filters.role || u.role === filters.role);
    $('#count').textContent = `${list.length} tài khoản`;
    body.innerHTML = list.map((u) => `
      <tr>
        <td><b>${esc(u.username)}</b>${u.id === ctx.user.id ? ' <span class="badge badge-gray">Bạn</span>' : ''}</td>
        <td>${esc(u.fullName)}</td>
        <td><span class="badge ${roleBadge[u.role]}">${Layout.roleLabel(u.role)}</span></td>
        <td>${esc(linkText(u))}</td>
        <td>${u.active ? '<span class="badge badge-green">Hoạt động</span>' : '<span class="badge badge-gray">Đã khoá</span>'}</td>
        <td class="nowrap muted">${u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Chưa đăng nhập'}</td>
        <td class="actions">
          <button class="icon-btn" title="Sửa" data-edit="${u.id}">✏️</button>
          ${u.id !== ctx.user.id ? `<button class="icon-btn" title="Xoá" data-del="${u.id}">🗑️</button>` : ''}
        </td>
      </tr>`).join('') || '<tr><td colspan="7" class="empty">Không có tài khoản</td></tr>';
  }

  $('#btn-add').addEventListener('click', () => {
    formModal.editingId = null;
    setPasswordLabel('Mật khẩu *');
    formModal.open({ title: 'Tạo tài khoản mới', submitText: 'Tạo tài khoản', data: { role: 'student', active: true } });
    syncRole();
  });

  body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const u = list.find((x) => x.id === (btn.dataset.edit || btn.dataset.del));
    if (btn.dataset.edit) {
      formModal.editingId = u.id;
      setPasswordLabel('Mật khẩu mới (để trống nếu giữ nguyên)');
      formModal.open({ title: `Sửa tài khoản ${u.username}`, submitText: 'Cập nhật', data: { ...u, password: '' } });
      syncRole();
    }
    if (btn.dataset.del) {
      if (!(await confirmDialog(`Xoá tài khoản "${u.username}"?`, { okText: 'Xoá' }))) return;
      try { toast((await Api.del(`/api/users/${u.id}`)).message, 'success'); await load(); }
      catch (err) { toast(err.message, 'error'); }
    }
  });

  $('#filter-role').addEventListener('change', (e) => { filters.role = e.target.value; load(); });
  await load();
});
