/** transcript.html – bảng điểm cá nhân: sinh viên xem của mình; PĐT / giảng viên tra cứu theo MSSV. */
Layout.ready(async (ctx) => {
  const { $, esc, fmtDate, toast, score, classifyBadge } = UI;

  async function show(studentId) {
    const t = await Api.get(`/api/students/${encodeURIComponent(studentId)}/transcript`);
    const st = t.student;
    document.querySelectorAll('[data-info]').forEach((el) => {
      const k = el.dataset.info;
      el.textContent = (k === 'dob' ? fmtDate(st.dob) : st[k]) || '—';
    });
    $('#sum-gpa').textContent = t.summary.gpa === null ? '—' : t.summary.gpa.toFixed(2);
    $('#sum-class').innerHTML = classifyBadge(t.summary.classification);
    $('#sum-earned').textContent = `${t.summary.creditsEarned} tín chỉ`;
    $('#sum-attempted').textContent = `${t.summary.creditsAttempted} tín chỉ`;

    $('#semesters').innerHTML = t.semesters.slice().reverse().map((sem) => `
      <div class="card mt semester-card">
        <div class="card-title"><span>${esc(sem.semester)} <small class="muted">· ${sem.rows.length} học phần · ${sem.credits} tín chỉ</small></span>
          <span>GPA học kỳ: <b>${sem.gpa === null ? 'chưa có' : sem.gpa.toFixed(2)}</b></span></div>
        <div class="table-wrap"><table>
          <thead><tr>
            <th>Mã HP</th><th>Tên học phần</th><th class="num">TC</th><th>Giảng viên</th>
            <th class="num">CC</th><th class="num">GK</th><th class="num">CK</th><th class="num">Tổng kết</th><th class="num">Chữ</th><th class="num">Thang 4</th><th class="num">Vắng</th>
          </tr></thead>
          <tbody>${sem.rows.map((r) => `
            <tr>
              <td><b>${esc(r.courseId)}</b></td><td>${esc(r.courseName)}</td><td class="num">${r.credits}</td><td>${esc(r.lecturerName)}</td>
              <td class="num">${score(r.attendance)}</td><td class="num">${score(r.midterm)}</td><td class="num">${score(r.final)}</td>
              <td class="num"><b>${score(r.total)}</b></td>
              <td class="num"><span class="${r.letter === 'A' ? 'grade-A' : r.letter === 'F' ? 'grade-F' : ''}">${r.letter || '—'}</span></td>
              <td class="num">${r.gpa4 === null ? '—' : r.gpa4.toFixed(1)}</td>
              <td class="num">${r.absences ? `<span class="badge badge-amber">${r.absences}</span>` : '0'}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`).join('') || '<div class="card mt empty">Sinh viên chưa đăng ký học phần nào</div>';

    $('#transcript').classList.remove('hidden');
    const empty = $('#transcript-empty');
    if (empty) empty.classList.add('hidden');
    document.title = `Bảng điểm ${st.id} – ${st.fullName}`;
  }

  $('#btn-print-2').addEventListener('click', () => window.print());

  if (ctx.isStudent) {
    await show(ctx.user.studentId);
    return;
  }

  // Phòng đào tạo / giảng viên: tìm sinh viên
  const students = await Api.get('/api/students');
  $('#student-options').innerHTML = students.map((s) => `<option value="${esc(s.id)}">${esc(s.fullName)} – ${esc(s.classId)}</option>`).join('');
  const search = $('#student-search');
  const resolve = (text) => {
    const v = text.trim().toLowerCase();
    return students.find((s) => s.id === v) || students.find((s) => s.fullName.toLowerCase() === v) || students.find((s) => s.fullName.toLowerCase().includes(v));
  };
  async function view() {
    const s = search.value.trim() && resolve(search.value);
    if (!s) return toast('Không tìm thấy sinh viên phù hợp', 'warning');
    search.value = s.id;
    history.replaceState(null, '', `?id=${s.id}`);
    try { await show(s.id); } catch (err) { toast(err.message, 'error'); }
  }
  $('#btn-view').addEventListener('click', view);
  search.addEventListener('keydown', (e) => e.key === 'Enter' && view());
  search.addEventListener('change', () => students.some((s) => s.id === search.value.trim()) && view());
  $('#btn-print').addEventListener('click', () => ($('#transcript').classList.contains('hidden') ? toast('Hãy chọn sinh viên trước', 'warning') : window.print()));

  if (ctx.params.id) {
    search.value = ctx.params.id;
    await show(ctx.params.id);
  }
});
