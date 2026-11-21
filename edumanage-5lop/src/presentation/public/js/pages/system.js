/** system.html – nhật ký thao tác, sao lưu và khôi phục dữ liệu (chỉ Phòng đào tạo). */
Layout.ready(async () => {
  const { $, esc, toast, fmtDateTime, confirmDialog, debounce } = UI;

  async function loadLogs(q = '') {
    const logs = await Api.get('/api/system/audit-logs', { q, limit: 300 });
    const color = (a) => (/FAILED|DELETE|UNENROLL/.test(a) ? 'badge-red' : /CREATE|LOGIN$|ENROLL/.test(a) ? 'badge-green' : 'badge-blue');
    $('#log-body').innerHTML = logs.map((l) => `
      <tr>
        <td class="nowrap muted">${fmtDateTime(l.at)}</td>
        <td><b>${esc(l.user)}</b></td>
        <td><span class="badge ${color(l.action)}">${esc(l.action)}</span></td>
        <td>${esc(l.detail)}</td>
      </tr>`).join('') || '<tr><td colspan="4" class="empty">Chưa có nhật ký</td></tr>';
  }

  async function loadBackups() {
    const list = await Api.get('/api/system/backups');
    $('#backup-list').innerHTML = list.map((b) => `
      <li>
        <span><b class="small-break">${esc(b.name)}</b><br /><small class="muted">${fmtDateTime(b.createdAt)} · ${(b.size / 1024).toFixed(1)} KB</small></span>
        <button class="btn btn-sm" data-restore="${esc(b.name)}">Khôi phục</button>
      </li>`).join('') || '<li class="muted">Chưa có bản sao lưu</li>';
  }

  $('#btn-backup').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      toast((await Api.post('/api/system/backups')).message, 'success');
      await Promise.all([loadBackups(), loadLogs()]);
    } catch (err) { toast(err.message, 'error'); }
    finally { e.target.disabled = false; }
  });

  $('#backup-list').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-restore]');
    if (!b) return;
    const name = b.dataset.restore;
    if (!(await confirmDialog(`Khôi phục dữ liệu từ "${name}"? Dữ liệu hiện tại sẽ được tự động sao lưu trước khi khôi phục.`, { okText: 'Khôi phục' }))) return;
    try {
      toast((await Api.post(`/api/system/backups/${encodeURIComponent(name)}/restore`)).message, 'success');
      await Promise.all([loadBackups(), loadLogs()]);
    } catch (err) { toast(err.message, 'error'); }
  });

  $('#filter-q').addEventListener('input', debounce((e) => loadLogs(e.target.value)));
  await Promise.all([loadLogs(), loadBackups()]);
});
