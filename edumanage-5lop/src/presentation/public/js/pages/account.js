/** account.html – thông tin tài khoản đang đăng nhập và đổi mật khẩu. */
Layout.ready(async (ctx) => {
  const { $, toast, formData, showErrors } = UI;
  $('#info-fullName').textContent = ctx.user.fullName;
  $('#info-username').textContent = ctx.user.username;
  $('#info-role').textContent = Layout.roleLabel(ctx.user.role) + (ctx.user.studentId ? ` (MSSV ${ctx.user.studentId})` : '');

  const form = $('#password-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    const btn = form.querySelector('button[type=submit]');
    try {
      if (data.newPassword !== data.confirmPassword) {
        throw new Api.ApiError('Mật khẩu nhập lại không khớp', 400, { confirmPassword: 'Mật khẩu nhập lại không khớp' });
      }
      btn.disabled = true;
      const r = await Api.changePassword(data);
      showErrors(form, null);
      form.reset();
      toast(r.message, 'success');
    } catch (err) {
      showErrors(form, err);
    } finally {
      btn.disabled = false;
    }
  });
});
