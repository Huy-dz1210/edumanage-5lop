/** dashboard.html – số liệu tổng quan cho Phòng đào tạo và giảng viên. */
Layout.ready(async (ctx) => {
  const { $, esc, fmtDate, fmtDateTime, classifyBadge } = UI;
  const d = await Api.get('/api/dashboard');

  $('#current-semester').textContent = d.currentSemester;
  $('#stat-students').textContent = d.totals.activeStudents;
  $('#stat-students-label').textContent = `Sinh viên đang học (tổng ${d.totals.students})`;
  $('#stat-lecturers').textContent = d.totals.lecturers;
  $('#stat-courses').textContent = d.totals.courses;
  $('#stat-sections').textContent = d.totals.currentSections;
  $('#stat-sections-label').textContent = ctx.isLecturer ? 'Lớp học phần tôi dạy kỳ này' : 'Lớp học phần đang mở';

  const t = d.attendanceToday;
  $('#att-today').textContent = t.marked ? `· hôm nay ${Math.round(((t.present + t.late) / t.marked) * 100)}% đi học` : '· hôm nay chưa điểm danh';

  const max = Math.max(1, ...d.attendanceLast7Days.map((x) => x.present + x.late + x.absent));
  const h = (n) => (n / max) * 140;
  $('#chart-attendance').innerHTML = d.attendanceLast7Days.map((x) => `
    <div class="bar-col" title="${fmtDate(x.date)}: có mặt ${x.present}, muộn ${x.late}, vắng ${x.absent}">
      <div class="bar-stack">
        <span class="bar-present" style="height:${h(x.present)}px"></span>
        <span class="bar-late" style="height:${h(x.late)}px"></span>
        <span class="bar-absent" style="height:${h(x.absent)}px"></span>
      </div>
      <small>${fmtDate(x.date).slice(0, 5)}</small>
    </div>`).join('');

  const total = Object.values(d.classification).reduce((s, n) => s + n, 0) || 1;
  const colors = { 'Xuất sắc': '#16a34a', 'Giỏi': '#22c55e', 'Khá': '#3b82f6', 'Trung bình': '#f59e0b', 'Yếu': '#ef4444', 'Chưa có điểm': '#94a3b8' };
  $('#classification').innerHTML = Object.entries(d.classification).map(([k, n]) => `
    <div class="progress-row"><span>${esc(k)}</span>
      <div class="progress"><span style="width:${(n / total) * 100}%;background:${colors[k]}"></span></div>
      <b class="text-right">${n}</b></div>`).join('');
  $('#average-gpa').textContent = d.averageGpa ?? '—';

  $('#top-students').innerHTML = d.topStudents.map((s, i) => `
    <li><span>${i + 1}. <a href="transcript.html?id=${s.id}"><b>${esc(s.fullName)}</b></a> <span class="muted">– ${esc(s.id)} · ${esc(s.classId)}</span></span>
    <span><b>${s.gpa.toFixed(2)}</b> ${classifyBadge(s.classification)}</span></li>`).join('') || '<li class="muted">Chưa có dữ liệu</li>';

  $('#by-faculty').innerHTML = d.byFaculty.map((f) => `
    <tr><td>${esc(f.name)}</td><td class="text-center">${f.students}</td><td class="text-center">${f.lecturers}</td></tr>`).join('');

  if (ctx.isLecturer) {
    $('#my-sections').innerHTML = d.mySections.map((s) => `
      <tr>
        <td><b>${esc(s.id)}</b></td>
        <td>${esc(s.courseName)} <span class="muted">(${s.credits} TC)</span></td>
        <td>${esc(s.schedule)}</td><td>${esc(s.room)}</td>
        <td>${s.enrolled}/${s.capacity}</td>
        <td class="actions">
          <a class="btn btn-sm" href="attendance.html?sectionId=${s.id}">Điểm danh</a>
          <a class="btn btn-sm" href="grades.html?sectionId=${s.id}">Nhập điểm</a>
        </td>
      </tr>`).join('') || '<tr><td colspan="6" class="empty">Bạn chưa được phân công lớp học phần nào trong học kỳ này</td></tr>';
  }

  if (ctx.isAdmin) {
    $('#recent-activity').innerHTML = d.recentActivity.map((l) => `
      <li><span><b>${esc(l.user)}</b> · ${esc(l.action)} <span class="muted">${esc(l.detail)}</span></span>
      <span class="muted nowrap">${fmtDateTime(l.at)}</span></li>`).join('') || '<li class="muted">Chưa có hoạt động</li>';
  }
});
