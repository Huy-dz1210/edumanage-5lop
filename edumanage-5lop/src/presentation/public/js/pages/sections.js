/** sections.html – lớp học phần: mở lớp, phân công giảng viên, quản lý danh sách sinh viên đăng ký. */
Layout.ready(async (ctx) => {
  const { $, esc, toast, confirmDialog, debounce, statusBadge } = UI;
  const body = $('#table-body');
  let list = [];

  const meta = await Layout.meta();
  const filters = { semester: meta.currentSemester, q: ctx.params.q || '', lecturerId: ctx.isLecturer ? 'me' : '' };
  if (ctx.params.q) filters.semester = '';
  const semesterOptions = meta.semesters.map((s) => ({ value: s, label: s }));
  UI.fillSelect($('#filter-semester'), semesterOptions, { selected: filters.semester });
  $('#filter-q').value = filters.q;

  // Dữ liệu cho form (chỉ admin mới cần)
  let courses = [], lecturers = [], classes = [];
  if (ctx.isAdmin) {
    [courses, lecturers, classes] = await Promise.all([Api.get('/api/courses'), Api.get('/api/lecturers'), Api.get('/api/classes')]);
    UI.fillSelect($('#courseId'), courses.map((c) => ({ value: c.id, label: `${c.id} – ${c.name} (${c.credits} TC)` })));
    UI.fillSelect($('#lecturerId'), lecturers.map((l) => ({ value: l.id, label: `${l.degree}. ${l.fullName} – ${l.facultyName}` })));
    UI.fillSelect($('#semester'), semesterOptions, { keepFirst: false });
    UI.fillSelect($('#enroll-class'), classes.map((c) => ({ value: c.id, label: `${c.id} (${c.activeCount} SV)` })));
  }

  const formModal = UI.bindForm('section-modal', {
    onSubmit: async (data) => {
      const id = formModal.editingId;
      const r = id ? await Api.put(`/api/sections/${id}`, data) : await Api.post('/api/sections', data);
      toast(id ? r.message : `${r.message} ${r.item.id}`, 'success');
      await load();
    },
  });

  async function load() {
    list = await Api.get('/api/sections', filters);
    $('#count').textContent = `${list.length} lớp học phần`;
    body.innerHTML = list.map((s) => {
      const full = s.enrolled >= s.capacity;
      return `<tr>
        <td class="nowrap"><b>${esc(s.id)}</b></td>
        <td>${esc(s.courseName)}</td>
        <td class="text-center">${s.credits}</td>
        <td>${esc(s.lecturerName)}</td>
        <td class="nowrap">${esc(s.semester)}</td>
        <td>${esc(s.schedule)}</td>
        <td>${esc(s.room)}</td>
        <td class="text-center"><span class="badge ${full ? 'badge-red' : 'badge-green'}">${s.enrolled}/${s.capacity}</span></td>
        <td class="actions">
          <button class="icon-btn" title="Danh sách sinh viên" data-roster="${s.id}">👥</button>
          <a class="icon-btn" title="Điểm danh" href="attendance.html?sectionId=${s.id}">✅</a>
          <a class="icon-btn" title="Nhập điểm" href="grades.html?sectionId=${s.id}">📝</a>
          ${ctx.isAdmin ? `<button class="icon-btn" title="Sửa" data-edit="${s.id}">✏️</button>
          <button class="icon-btn" title="Xoá" data-del="${s.id}">🗑️</button>` : ''}
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="9" class="empty">Không có lớp học phần phù hợp</td></tr>';
  }

  // ----- Danh sách sinh viên của lớp học phần -----
  const roster = UI.bindView('roster-modal');
  let current = null;
  async function openRoster(id) {
    current = await Api.get(`/api/sections/${id}`);
    $('#roster-count').textContent = `${current.enrolled}/${current.capacity}`;
    $('#roster-body').innerHTML = current.students.map((st) => `
      <tr>
        <td><b>${esc(st.id)}</b></td>
        <td><a href="transcript.html?id=${st.id}">${esc(st.fullName)}</a></td>
        <td>${esc(st.classId)}</td>
        <td>${statusBadge(st.status)}</td>
        <td class="actions">${ctx.isAdmin ? `<button class="btn btn-sm btn-danger" data-unenroll="${st.id}">Xoá khỏi lớp</button>` : ''}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="empty">Chưa có sinh viên đăng ký</td></tr>';
    roster.open(current);
  }
  async function enroll(studentIds) {
    try {
      toast((await Api.post(`/api/sections/${current.id}/enroll`, { studentIds })).message, 'success');
      await Promise.all([openRoster(current.id), load()]);
    } catch (err) { toast(err.message, 'error'); }
  }
  if (ctx.isAdmin) {
    $('#btn-enroll-class').addEventListener('click', async () => {
      const classId = $('#enroll-class').value;
      if (!classId) return toast('Vui lòng chọn lớp sinh hoạt', 'warning');
      const students = await Api.get('/api/students', { classId, status: 'Đang học' });
      if (!students.length) return toast('Lớp này không có sinh viên đang học', 'warning');
      await enroll(students.map((s) => s.id));
    });
    $('#btn-enroll-one').addEventListener('click', async () => {
      const id = $('#enroll-id').value.trim();
      if (!id) return toast('Vui lòng nhập MSSV', 'warning');
      await enroll([id]);
      $('#enroll-id').value = '';
    });
    $('#roster-body').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-unenroll]');
      if (!btn) return;
      if (!(await confirmDialog(`Xoá sinh viên ${btn.dataset.unenroll} khỏi lớp ${current.id}? Điểm và điểm danh của sinh viên trong lớp này sẽ bị xoá.`, { okText: 'Xoá' }))) return;
      try {
        toast((await Api.del(`/api/sections/${current.id}/enroll/${btn.dataset.unenroll}`)).message, 'success');
        await Promise.all([openRoster(current.id), load()]);
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  $('#btn-add').addEventListener('click', () => {
    formModal.editingId = null;
    $('#courseId').disabled = false;
    formModal.open({ title: 'Mở lớp học phần', submitText: 'Mở lớp', data: { semester: meta.currentSemester, capacity: 60 } });
  });

  body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.roster || btn.dataset.edit || btn.dataset.del;
    const s = list.find((x) => x.id === id);
    if (btn.dataset.roster) openRoster(id).catch((err) => toast(err.message, 'error'));
    if (btn.dataset.edit) {
      formModal.editingId = s.id;
      formModal.open({ title: `Sửa lớp học phần ${s.id}`, submitText: 'Cập nhật', data: s });
      $('#courseId').disabled = true;
    }
    if (btn.dataset.del) {
      if (!(await confirmDialog(`Xoá lớp học phần "${s.id}"?`, { okText: 'Xoá' }))) return;
      try { toast((await Api.del(`/api/sections/${s.id}`)).message, 'success'); await load(); }
      catch (err) { toast(err.message, 'error'); }
    }
  });

  $('#filter-semester').addEventListener('change', (e) => { filters.semester = e.target.value; load(); });
  $('#filter-q').addEventListener('input', debounce((e) => { filters.q = e.target.value; load(); }));
  if (ctx.isLecturer) $('#filter-mine').addEventListener('change', (e) => { filters.lecturerId = e.target.checked ? 'me' : ''; load(); });

  await load();
});
