/**
 * REST client with JWT bearer token from localStorage.
 */
(function () {
  const cfg = window.APP_CONFIG || { API_BASE: '' };

  /** FastAPI/Pydantic returns detail as string or array of {msg, loc}; show readable text. */
  function formatErrorDetail(detail) {
    if (detail == null) return '';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map(function (item) {
          return item && typeof item.msg === 'string' ? item.msg : JSON.stringify(item);
        })
        .join(' ');
    }
    if (typeof detail === 'object' && detail.msg) return detail.msg;
    return String(detail);
  }

  function token() {
    return localStorage.getItem('access_token') || '';
  }

  async function request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    const t = token();
    if (t) headers.Authorization = 'Bearer ' + t;
    const res = await fetch(cfg.API_BASE + path, { ...options, headers });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const detailMsg = formatErrorDetail(data && data.detail);
      const fallback =
        detailMsg ||
        (text && text.length && text.length < 400 && !data ? text.trim().slice(0, 200) : '') ||
        (res.statusText ? res.statusText + ' (' + res.status + ')' : 'HTTP ' + res.status);

      if (res.status === 401 && !path.includes('/auth/login')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
      }

      const err = new Error(fallback || 'Request failed');
      err.status = res.status;
      throw err;
    }

    return data;
  }

  window.api = {
    get: (p) => request(p, { method: 'GET' }),
    post: (p, body) => request(p, { method: 'POST', body: JSON.stringify(body) }),
    patch: (p, body) => request(p, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (p) => request(p, { method: 'DELETE' }),
    uploadForm: async (path, formData) => {
      const headers = {};
      const t = token();
      if (t) headers.Authorization = 'Bearer ' + t;
      const res = await fetch(cfg.API_BASE + path, { method: 'POST', body: formData, headers });
      if (res.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatErrorDetail(data.detail) || res.statusText);
      return data;
    },
    /** Multipart POST without JSON (e.g. payment verify form fields). */
    postFormData: async (path, formData) => {
      const headers = {};
      const t = token();
      if (t) headers.Authorization = 'Bearer ' + t;
      const res = await fetch(cfg.API_BASE + path, { method: 'POST', body: formData, headers });
      if (res.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatErrorDetail(data.detail) || res.statusText);
      return data;
    },
  };
})();
