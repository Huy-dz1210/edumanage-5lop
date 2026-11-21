/**
 * Lớp gọi API – mọi request đến backend đi qua đây.
 * Tự gắn header chống CSRF, chuẩn hoá lỗi, phát sự kiện khi phiên đăng nhập hết hạn.
 */
(function () {
  class ApiError extends Error {
    constructor(message, status, details) {
      super(message);
      this.status = status;
      this.details = details || {};
    }
  }

  async function request(method, url, body) {
    let res;
    try {
      res = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new ApiError('Không kết nối được tới máy chủ. Vui lòng kiểm tra server đã chạy chưa.', 0);
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* phản hồi không phải JSON */ }
    if (!res.ok) {
      const err = new ApiError((data && data.error) || `Lỗi ${res.status}`, res.status, data && data.details);
      if (res.status === 401 && !/\/auth\/(login|me)$/.test(url)) window.dispatchEvent(new CustomEvent('auth:expired'));
      throw err;
    }
    return data;
  }

  const qs = (params) => {
    const p = Object.entries(params || {}).filter(([, v]) => v !== '' && v != null);
    return p.length ? '?' + new URLSearchParams(p).toString() : '';
  };

  window.Api = {
    ApiError,
    get: (url, params) => request('GET', url + qs(params)),
    post: (url, body) => request('POST', url, body || {}),
    put: (url, body) => request('PUT', url, body || {}),
    del: (url) => request('DELETE', url),

    // Xác thực
    login: (username, password) => request('POST', '/api/auth/login', { username, password }),
    me: () => request('GET', '/api/auth/me'),
    logout: () => request('POST', '/api/auth/logout', {}),
    changePassword: (body) => request('POST', '/api/auth/change-password', body),
  };
})();
