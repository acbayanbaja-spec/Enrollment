/**
 * Premium login: validation, remember email, password toggle, loading state.
 */
(function () {
  const form = document.getElementById('loginForm');
  const emailIn = document.getElementById('email');
  const pwIn = document.getElementById('password');
  const togglePw = document.getElementById('togglePw');
  const remember = document.getElementById('remember');
  const errEl = document.getElementById('loginError');
  const okEl = document.getElementById('loginSuccess');
  const submitBtn = document.getElementById('loginSubmit');
  const forgot = document.getElementById('forgotLink');

  const REM_KEY = 'seait_remember_email';

  if (localStorage.getItem(REM_KEY)) {
    emailIn.value = localStorage.getItem(REM_KEY);
    remember.checked = true;
  }

  togglePw.addEventListener('click', () => {
    const isPw = pwIn.type === 'password';
    pwIn.type = isPw ? 'text' : 'password';
    togglePw.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
    togglePw.textContent = isPw ? '🙈' : '👁';
  });

  forgot.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.UI) UI.toast('info', 'Contact your IT administrator or Registrar office to reset your password.');
    else alert('Contact your IT administrator to reset your password.');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.classList.add('hidden');
    okEl.classList.add('hidden');

    const email = emailIn.value.trim();
    const password = pwIn.value;
    if (!email || !password) {
      errEl.textContent = 'Please enter your email and password.';
      errEl.classList.remove('hidden');
      return;
    }

    if (remember.checked) localStorage.setItem(REM_KEY, email);
    else localStorage.removeItem(REM_KEY);

    if (window.UI) UI.setButtonLoading(submitBtn, true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      okEl.textContent = 'Success. Redirecting…';
      okEl.classList.remove('hidden');
      if (window.UI) UI.toast('success', 'Welcome back, ' + (data.user.full_name || 'user') + '!');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 400);
    } catch (x) {
      errEl.textContent = x.message || 'Login failed. Check your credentials.';
      errEl.classList.remove('hidden');
      if (window.UI) UI.toast('error', errEl.textContent);
    } finally {
      if (window.UI) UI.setButtonLoading(submitBtn, false);
    }
  });
})();
