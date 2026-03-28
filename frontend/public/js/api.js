/**
 * REST client with JWT bearer token from localStorage.
 */
(function () {
  const cfg = window.APP_CONFIG || { API_BASE: '' };

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
    if (res.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      if (!path.includes('/auth/login')) window.location.href = 'login.html';
      throw new Error('Unauthorized');
    }
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const msg = (data && data.detail) || res.statusText || 'Request failed';
      const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
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
      if (!res.ok) throw new Error(data.detail || res.statusText);
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
      if (!res.ok) throw new Error(data.detail || res.statusText);
      return data;
    },
  };
})();
