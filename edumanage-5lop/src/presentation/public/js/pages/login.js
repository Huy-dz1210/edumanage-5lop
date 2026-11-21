/** login.html – đăng nhập. Đã đăng nhập thì chuyển thẳng vào trang chủ theo vai trò. */
(function () {
  const { $, toast } = UI;
  const params = new URLSearchParams(location.search);
  const home = (user) => (user.role === 'student' ? 'transcript.html' : 'dashboard.html');
  if (params.get('expired')) toast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 'warning');
  if (params.get('logout')) toast('Đã đăng xuất', 'info');

  Api.me().then(({ user }) => location.replace(home(user))).catch(() => {});

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#login-submit');
    const errBox = $('#login-error');
    const username = $('#username').value.trim();
    const password = $('#password').value;
    const showError = (msg) => { errBox.textContent = msg; errBox.classList.remove('hidden'); };
    if (!username || !password) return showError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');

    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';
    try {
      const { user } = await Api.login(username, password);
      location.replace(home(user));
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.textContent = 'Đăng nhập';
    }
  });
})();
