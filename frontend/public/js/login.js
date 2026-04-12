/**
 * Login + student self-registration tabs, validation, remember email.
 */
(function () {
  const tabSignIn = document.getElementById('tabSignIn');
  const tabRegister = document.getElementById('tabRegister');
  const panelSignIn = document.getElementById('panelSignIn');
  const panelRegister = document.getElementById('panelRegister');

  const form = document.getElementById('loginForm');
  const emailIn = document.getElementById('email');
  const pwIn = document.getElementById('password');
  const togglePw = document.getElementById('togglePw');
  const remember = document.getElementById('remember');
  const errEl = document.getElementById('loginError');
  const okEl = document.getElementById('loginSuccess');
  const submitBtn = document.getElementById('loginSubmit');
  const forgot = document.getElementById('forgotLink');

  const regForm = document.getElementById('registerForm');
  const regName = document.getElementById('regName');
  const regEmail = document.getElementById('regEmail');
  const regPw = document.getElementById('regPassword');
  const regPw2 = document.getElementById('regPassword2');
  const regErr = document.getElementById('regError');
  const regOk = document.getElementById('regSuccess');
  const regSubmit = document.getElementById('regSubmit');
  const toggleRegPw = document.getElementById('toggleRegPw');

  const REM_KEY = 'seait_remember_email';

  function setTab(which) {
    const isSignIn = which === 'signin';
    tabSignIn.classList.toggle('is-active', isSignIn);
    tabRegister.classList.toggle('is-active', !isSignIn);
    tabSignIn.setAttribute('aria-selected', isSignIn);
    tabRegister.setAttribute('aria-selected', !isSignIn);
    panelSignIn.classList.toggle('is-visible', isSignIn);
    panelSignIn.classList.toggle('hidden', !isSignIn);
    panelSignIn.hidden = !isSignIn;
    panelRegister.classList.toggle('is-visible', !isSignIn);
    panelRegister.classList.toggle('hidden', isSignIn);
    panelRegister.hidden = isSignIn;
  }

  tabSignIn.addEventListener('click', () => setTab('signin'));
  tabRegister.addEventListener('click', () => setTab('register'));

  if (sessionStorage.getItem('seait_open_register')) {
    sessionStorage.removeItem('seait_open_register');
    setTab('register');
  }

  if (localStorage.getItem(REM_KEY)) {
    emailIn.value = localStorage.getItem(REM_KEY);
    remember.checked = true;
  }

  function bindToggle(btn, input) {
    const label = btn.querySelector('.ds-toggle-pw__text');
    btn.addEventListener('click', () => {
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      btn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
      if (label) label.textContent = isPw ? 'Hide' : 'Show';
    });
  }
  bindToggle(togglePw, pwIn);
  bindToggle(toggleRegPw, regPw);

  document.querySelectorAll('.js-fill-demo').forEach((el) => {
    el.addEventListener('click', () => {
      const email = el.getAttribute('data-email');
      if (!email) return;
      emailIn.value = email;
      pwIn.value = '';
      pwIn.focus();
      const pwHint = email === 'admin@seait.edu.ph' ? 'Admin@2026!' : 'Staff@2026!';
      if (window.UI) UI.toast('info', 'Email filled — use password ' + pwHint);
    });
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

  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    regErr.classList.add('hidden');
    regOk.classList.add('hidden');

    const full_name = regName.value.trim();
    const email = regEmail.value.trim();
    const password = regPw.value;
    const password2 = regPw2.value;

    if (!full_name || !email || !password) {
      regErr.textContent = 'Please fill in all fields.';
      regErr.classList.remove('hidden');
      return;
    }
    if (password.length < 8) {
      regErr.textContent = 'Password must be at least 8 characters.';
      regErr.classList.remove('hidden');
      return;
    }
    if (password !== password2) {
      regErr.textContent = 'Passwords do not match.';
      regErr.classList.remove('hidden');
      return;
    }

    if (window.UI) UI.setButtonLoading(regSubmit, true);
    try {
      const data = await api.post('/api/auth/register-student', { email, password, full_name });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      regOk.textContent = 'Account created. Taking you to the portal…';
      regOk.classList.remove('hidden');
      if (window.UI) UI.toast('success', 'Welcome, ' + (data.user.full_name || '') + '!');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } catch (x) {
      regErr.textContent = x.message || 'Could not create account.';
      regErr.classList.remove('hidden');
      if (window.UI) UI.toast('error', regErr.textContent);
    } finally {
      if (window.UI) UI.setButtonLoading(regSubmit, false);
    }
  });
})();
