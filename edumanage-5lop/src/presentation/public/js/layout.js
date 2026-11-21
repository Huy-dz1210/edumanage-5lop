/**
 * Phần dùng chung cho mọi trang (trừ login.html):
 * - Kiểm tra đăng nhập, chưa đăng nhập thì chuyển về login.html
 * - Chặn trang không đúng vai trò (body[data-require-role])
 * - Hiện tên người dùng, ẩn/hiện mục theo vai trò ([data-roles]), menu mobile, đăng xuất
 * Mỗi trang gọi Layout.ready(async (ctx) => { ... }) để chạy sau khi đăng nhập hợp lệ.
 */
(function () {
  const { $, $$, toast } = UI;
  const ROLE_LABEL = { admin: 'Phòng đào tạo', lecturer: 'Giảng viên', student: 'Sinh viên' };
  const queue = [];
  let ctx = null;
  let metaPromise = null;

  async function run(fn) {
    try {
      await fn(ctx);
    } catch (err) {
      if (err.status !== 401) $('#page').insertAdjacentHTML('afterbegin', UI.errorBox(err));
    }
  }

  window.Layout = {
    ready(fn) { ctx ? run(fn) : queue.push(fn); },
    roleLabel: (r) => ROLE_LABEL[r] || r,
    /** Trang chủ theo vai trò: sinh viên → bảng điểm, còn lại → dashboard */
    homeOf: (user) => (user.role === 'student' ? 'transcript.html' : 'dashboard.html'),
    /** Danh mục dùng chung (khoa, học kỳ, thang điểm...) – chỉ tải 1 lần */
    meta: () => (metaPromise = metaPromise || Api.get('/api/meta')),
  };

  window.addEventListener('auth:expired', () => location.replace('login.html?expired=1'));

  async function init() {
    let user;
    try {
      user = (await Api.me()).user;
    } catch (e) {
      location.replace('login.html');
      return;
    }
    const required = document.body.dataset.requireRole;
    if (required && !required.split(',').includes(user.role)) {
      location.replace(Layout.homeOf(user) + '?denied=1');
      return;
    }

    $('#user-name').textContent = user.fullName;
    $('#user-full').textContent = `${user.fullName} (${user.username})`;
    $('#user-role').textContent = ROLE_LABEL[user.role] || user.role;
    $('#user-avatar').textContent = UI.initials(user.fullName);
    $$('[data-roles]').forEach((el) => el.classList.toggle('hidden', !el.dataset.roles.split(',').includes(user.role)));
    if (user.role === 'student') {
      const link = $('a[href="transcript.html"] [data-nav-label]');
      if (link) link.textContent = 'Kết quả học tập';
    }
    document.body.classList.remove('auth-pending');

    ctx = {
      user,
      isAdmin: user.role === 'admin',
      isLecturer: user.role === 'lecturer',
      isStudent: user.role === 'student',
      params: Object.fromEntries(new URLSearchParams(location.search)),
    };
    if (ctx.params.denied) toast('Bạn không có quyền truy cập chức năng đó', 'error');
    queue.splice(0).forEach(run);
  }

  // Menu người dùng
  const dropdown = $('#user-dropdown');
  $('#user-chip').addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); });
  document.addEventListener('click', () => dropdown.classList.add('hidden'));
  $('#btn-logout').addEventListener('click', async () => {
    try { await Api.logout(); } catch (e) { /* bỏ qua */ }
    location.replace('login.html?logout=1');
  });

  // Menu trên điện thoại
  $('#menu-btn').addEventListener('click', () => $('#app-view').classList.toggle('nav-open'));
  $('#nav-backdrop').addEventListener('click', () => $('#app-view').classList.remove('nav-open'));

  init();
})();
