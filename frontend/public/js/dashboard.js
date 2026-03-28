/**
 * Role-based dashboard: navigation, enrollment form, queues, AI, reports.
 */
(function () {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user || !localStorage.getItem('access_token')) {
    window.location.href = 'login.html';
    return;
  }

  const role = user.role_name;
  const main = document.getElementById('main');
  const nav = document.getElementById('nav');
  const userLine = document.getElementById('userLine');
  userLine.textContent = user.full_name + ' · ' + role;

  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  function closeMenu() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }
  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });
  overlay.addEventListener('click', closeMenu);

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  /** Build enrollment payload from form DOM */
  function buildPayload(submit, enrollmentId) {
    const course_id = parseInt(document.getElementById('course_id').value, 10);
    return {
      submit,
      enrollment_id: enrollmentId || null,
      course_id,
      academic_year: document.getElementById('academic_year').value.trim(),
      semester: document.getElementById('semester').value,
      category: document.getElementById('category').value,
      personal: {
        last_name: document.getElementById('plast').value.trim(),
        first_name: document.getElementById('pfirst').value.trim(),
        middle_name: document.getElementById('pmid').value.trim() || null,
        extension: document.getElementById('pext').value.trim() || null,
        sex: document.getElementById('sex').value,
        date_of_birth: document.getElementById('dob').value,
        birthplace: document.getElementById('birthplace').value.trim(),
        civil_status: document.getElementById('civil').value.trim(),
        citizenship: document.getElementById('citizen').value.trim(),
        contact_number: document.getElementById('pcontact').value.trim(),
        email: document.getElementById('pemail').value.trim(),
        permanent_address: document.getElementById('perm').value.trim(),
        current_address: document.getElementById('curr').value.trim(),
      },
      family: {
        father_name: document.getElementById('father_name').value.trim() || null,
        father_occupation: document.getElementById('father_occ').value.trim() || null,
        father_contact: document.getElementById('father_contact').value.trim() || null,
        mother_name: document.getElementById('mother_name').value.trim() || null,
        mother_occupation: document.getElementById('mother_occ').value.trim() || null,
        mother_contact: document.getElementById('mother_contact').value.trim() || null,
        spouse_name: document.getElementById('spouse_name').value.trim() || null,
        spouse_occupation: document.getElementById('spouse_occ').value.trim() || null,
        spouse_contact: document.getElementById('spouse_contact').value.trim() || null,
      },
      academic: {
        elem_school: document.getElementById('elem_school').value.trim(),
        elem_year: document.getElementById('elem_year').value.trim() || null,
        jhs_school: document.getElementById('jhs_school').value.trim(),
        jhs_year: document.getElementById('jhs_year').value.trim() || null,
        shs_school: document.getElementById('shs_school').value.trim(),
        shs_strand: document.getElementById('shs_strand').value.trim() || null,
        shs_year: document.getElementById('shs_year').value.trim() || null,
      },
      emergency: {
        name: document.getElementById('e_name').value.trim(),
        contact: document.getElementById('e_contact').value.trim(),
        relationship: document.getElementById('e_rel').value.trim(),
        address: document.getElementById('e_addr').value.trim(),
      },
    };
  }

  function showView(html) {
    main.innerHTML = html;
  }

  function cloneTpl(id) {
    const t = document.getElementById(id);
    return t.content.cloneNode(true);
  }

  async function loadCourses() {
    const list = await api.get('/api/courses/');
    const sel = document.getElementById('course_id');
    if (!sel) return;
    sel.innerHTML = list.map((c) => `<option value="${c.id}">${c.code} — ${c.name}</option>`).join('');
  }

  function renderTracker(enrollments) {
    const el = document.getElementById('trackerMount');
    if (!el) return;
    if (!enrollments.length) {
      el.innerHTML = '<p style="color:var(--muted)">No enrollments yet. Complete the enrollment form.</p>';
      return;
    }
    el.innerHTML = enrollments
      .map((e) => {
        const phases = [
          { n: 1, s: e.phase1_status },
          { n: 2, s: e.phase2_status },
          { n: 3, s: e.phase3_status },
        ];
        const done = phases.filter((p) => p.s === 'Approved').length;
        const pct = (done / 3) * 100;
        const badge = (s) =>
          s === 'Approved'
            ? 'badge-ok'
            : s === 'Rejected'
              ? 'badge-reject'
              : 'badge-pending';
        return `
        <div style="margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--glass-border)">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
            <strong>#${e.id}</strong>
            <span style="color:var(--muted)">${e.course_code || ''} · ${e.academic_year} ${e.semester}</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem">
            ${phases.map((p) => `<span class="badge ${badge(p.s)}">Phase ${p.n}: ${p.s}</span>`).join('')}
          </div>
          <div style="font-size:0.85rem;color:var(--muted);margin-top:0.35rem">Current phase: ${e.current_phase} · Next: ${e.phase2_assigned_role} (Phase 2)</div>
        </div>`;
      })
      .join('');
  }

  async function refreshTracker() {
    try {
      const list = await api.get('/api/enrollment/mine');
      renderTracker(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadAssistantSteps() {
    const el = document.getElementById('stepsMount');
    if (!el) return;
    try {
      const data = await api.get('/api/ai/assistant-steps');
      el.innerHTML =
        '<ol style="margin:0;padding-left:1.2rem;color:var(--muted);line-height:1.7">' +
        data.steps.map((s) => `<li><strong style="color:var(--text)">${s.title}</strong> — ${s.hint}</li>`).join('') +
        '</ol>';
    } catch (e) {
      el.textContent = 'Could not load steps.';
    }
  }

  function wireEnrollmentForm() {
    const form = document.getElementById('enrollmentForm');
    if (!form) return;
    document.getElementById('saveDraft').addEventListener('click', async () => {
      const msg = document.getElementById('formMsg');
      msg.innerHTML = '';
      try {
        const id = document.getElementById('enrollment_id').value;
        const payload = buildPayload(false, id ? parseInt(id, 10) : null);
        const res = await api.post('/api/enrollment/save', payload);
        document.getElementById('enrollment_id').value = res.id;
        msg.innerHTML = '<div class="alert alert-success">Draft saved.</div>';
        refreshTracker();
      } catch (e) {
        msg.innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
      }
    });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const msg = document.getElementById('formMsg');
      msg.innerHTML = '';
      try {
        const id = document.getElementById('enrollment_id').value;
        const payload = buildPayload(true, id ? parseInt(id, 10) : null);
        const res = await api.post('/api/enrollment/save', payload);
        document.getElementById('enrollment_id').value = res.id;
        msg.innerHTML = '<div class="alert alert-success">' + res.message + '</div>';
        refreshTracker();
      } catch (e) {
        msg.innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
      }
    });
  }

  function wirePayments() {
    const btn = document.getElementById('payUpload');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const msg = document.getElementById('payMsg');
      msg.innerHTML = '';
      const eid = document.getElementById('payEnrollId').value;
      const file = document.getElementById('payFile').files[0];
      if (!eid || !file) {
        msg.innerHTML = '<div class="alert alert-error">Enrollment ID and file required.</div>';
        return;
      }
      const fd = new FormData();
      fd.append('enrollment_form_id', eid);
      fd.append('file', file);
      const amt = document.getElementById('payAmount').value;
      if (amt) fd.append('amount', amt);
      try {
        await api.uploadForm('/api/payments/upload', fd);
        msg.innerHTML = '<div class="alert alert-success">Receipt uploaded.</div>';
      } catch (e) {
        msg.innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
      }
    });
  }

  async function loadPaymentList() {
    const el = document.getElementById('payList');
    const eid = document.getElementById('payEnrollId');
    if (!el || !eid) return;
    eid.addEventListener('change', async () => {
      if (!eid.value) return;
      try {
        const rows = await api.get('/api/payments/enrollment/' + eid.value);
        el.innerHTML =
          rows.length === 0
            ? 'No receipts yet.'
            : '<ul>' +
              rows.map((p) => `<li>#${p.id} — ${p.status} — ${p.original_filename || ''}</li>`).join('') +
              '</ul>';
      } catch (err) {
        el.textContent = err.message;
      }
    });
  }

  async function loadNotifications() {
    const el = document.getElementById('notifyList');
    if (!el) return;
    try {
      const rows = await api.get('/api/notifications/');
      el.innerHTML =
        rows.length === 0
          ? '<p style="color:var(--muted)">No notifications.</p>'
          : rows
              .map(
                (n) =>
                  `<div class="card" style="padding:0.75rem;margin-bottom:0.5rem"><strong>${n.title}</strong><div style="font-size:0.85rem;color:var(--muted)">${n.body || ''}</div><div style="font-size:0.75rem;margin-top:0.35rem">${n.created_at}</div></div>`
              )
              .join('');
    } catch (e) {
      el.textContent = e.message;
    }
  }

  async function loadAnnouncements() {
    const el = document.getElementById('announceList');
    if (!el) return;
    const rows = await api.get('/api/announcements/');
    el.innerHTML = rows
      .map(
        (a) =>
          `<div class="card" style="padding:0.75rem;margin-bottom:0.5rem"><strong>${a.title}</strong> <span class="badge badge-pending">${a.priority}</span><div style="margin-top:0.5rem;color:var(--muted);white-space:pre-wrap">${a.body}</div></div>`
      )
      .join('');
    if (role === 'Admin') {
      document.getElementById('adminAnnounce').classList.remove('hidden');
      document.getElementById('anPost').onclick = async () => {
        await api.post('/api/announcements/', {
          title: document.getElementById('anTitle').value,
          body: document.getElementById('anBody').value,
          priority: 'normal',
        });
        await loadAnnouncements();
      };
    }
  }

  async function loadReports() {
    const el = document.getElementById('reportOut');
    if (!el) return;
    const r = await api.get('/api/reports/summary');
    el.textContent = JSON.stringify(r, null, 2);
  }

  async function loadQueue(path, title, decideUrl) {
    document.getElementById('queueTitle').textContent = title;
    const body = document.getElementById('queueBody');
    const rows = await api.get(path);
    if (!rows.length) {
      body.innerHTML = '<p style="color:var(--muted)">No pending items.</p>';
      return;
    }
    body.innerHTML = rows
      .map((e) => {
        const name =
          e.personal && (e.personal.first_name || '') + ' ' + (e.personal.last_name || '');
        return `<div class="card" style="padding:0.75rem;margin-bottom:0.5rem">
          <strong>Enrollment #${e.id}</strong> — ${e.course_code || ''} — ${name}
          <div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap">
            <button class="btn btn-primary" data-eid="${e.id}" data-act="approve">Approve</button>
            <button class="btn btn-ghost" data-eid="${e.id}" data-act="reject">Reject</button>
          </div>
        </div>`;
      })
      .join('');
    body.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-eid');
        const act = b.getAttribute('data-act');
        const notes = prompt('Notes (optional):') || '';
        try {
          await api.post(decideUrl.replace('{id}', id), {
            status: act === 'approve' ? 'Approved' : 'Rejected',
            notes,
          });
          await loadQueue(path, title, decideUrl);
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  function wireChat() {
    const log = document.getElementById('chatLog');
    const input = document.getElementById('chatInput');
    const send = document.getElementById('chatSend');
    if (!send) return;
    send.addEventListener('click', async () => {
      const m = input.value.trim();
      if (!m) return;
      log.innerHTML += `<div class="chat-msg user">${escapeHtml(m)}</div>`;
      input.value = '';
      try {
        const r = await api.post('/api/ai/chat', { message: m });
        log.innerHTML += `<div class="chat-msg bot">${escapeHtml(r.reply)}</div>`;
        log.scrollTop = log.scrollHeight;
      } catch (e) {
        log.innerHTML += `<div class="chat-msg bot">Error: ${escapeHtml(e.message)}</div>`;
      }
    });
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function wireIrregular() {
    const run = document.getElementById('irrRun');
    const seed = document.getElementById('irrSeed');
    if (!run) return;
    run.addEventListener('click', async () => {
      const cid = document.getElementById('irrCourse').value || '1';
      const out = document.getElementById('irrOut');
      try {
        const r = await api.get('/api/ai/irregular-check?course_id=' + cid + '&seed_demo=false');
        out.textContent = JSON.stringify(r, null, 2);
      } catch (e) {
        out.textContent = e.message;
      }
    });
    seed.addEventListener('click', async () => {
      const cid = document.getElementById('irrCourse').value || '1';
      const out = document.getElementById('irrOut');
      try {
        const r = await api.get('/api/ai/irregular-check?course_id=' + cid + '&seed_demo=true');
        out.textContent = JSON.stringify(r, null, 2);
      } catch (e) {
        out.textContent = e.message;
      }
    });
  }

  /** Prefill draft from latest enrollment */
  async function prefillDraft() {
    try {
      const list = await api.get('/api/enrollment/mine');
      const draft = list.find((x) => !x.submitted_at) || list[0];
      if (!draft || !draft.personal) return;
      document.getElementById('enrollment_id').value = draft.id || '';
      document.getElementById('category').value = draft.category;
      document.getElementById('course_id').value = draft.course_id;
      document.getElementById('academic_year').value = draft.academic_year;
      document.getElementById('semester').value = draft.semester;
      const p = draft.personal;
      document.getElementById('plast').value = p.last_name || '';
      document.getElementById('pfirst').value = p.first_name || '';
      document.getElementById('pmid').value = p.middle_name || '';
      document.getElementById('pext').value = p.extension || '';
      document.getElementById('sex').value = p.sex || 'Male';
      document.getElementById('dob').value = (p.date_of_birth || '').slice(0, 10);
      document.getElementById('birthplace').value = p.birthplace || '';
      document.getElementById('civil').value = p.civil_status || '';
      document.getElementById('citizen').value = p.citizenship || '';
      document.getElementById('pcontact').value = p.contact_number || '';
      document.getElementById('pemail').value = p.email || '';
      document.getElementById('perm').value = p.permanent_address || '';
      document.getElementById('curr').value = p.current_address || '';
      if (draft.family) {
        const f = draft.family;
        document.getElementById('father_name').value = f.father_name || '';
        document.getElementById('father_occ').value = f.father_occupation || '';
        document.getElementById('father_contact').value = f.father_contact || '';
        document.getElementById('mother_name').value = f.mother_name || '';
        document.getElementById('mother_occ').value = f.mother_occupation || '';
        document.getElementById('mother_contact').value = f.mother_contact || '';
        document.getElementById('spouse_name').value = f.spouse_name || '';
        document.getElementById('spouse_occ').value = f.spouse_occupation || '';
        document.getElementById('spouse_contact').value = f.spouse_contact || '';
      }
      if (draft.academic) {
        const a = draft.academic;
        document.getElementById('elem_school').value = a.elem_school || '';
        document.getElementById('elem_year').value = a.elem_year || '';
        document.getElementById('jhs_school').value = a.jhs_school || '';
        document.getElementById('jhs_year').value = a.jhs_year || '';
        document.getElementById('shs_school').value = a.shs_school || '';
        document.getElementById('shs_strand').value = a.shs_strand || '';
        document.getElementById('shs_year').value = a.shs_year || '';
      }
      if (draft.emergency) {
        const x = draft.emergency;
        document.getElementById('e_name').value = x.name || '';
        document.getElementById('e_contact').value = x.contact || '';
        document.getElementById('e_rel').value = x.relationship || '';
        document.getElementById('e_addr').value = x.address || '';
      }
    } catch (e) {
      console.warn(e);
    }
  }

  const views = {
    home: async () => {
      showView('');
      if (role === 'Student') {
        main.appendChild(cloneTpl('tpl-student-home'));
        await refreshTracker();
        await loadAssistantSteps();
        wireIrregular();
      } else if (role === 'Admin') {
        main.innerHTML =
          '<div class="card"><h2>Administration</h2><p style="color:var(--muted)">Use the sidebar for analytics and announcements.</p></div>';
      } else {
        main.innerHTML =
          '<div class="card"><h2>Dashboard</h2><p style="color:var(--muted)">Select a queue from the sidebar.</p></div>';
      }
    },
    form: async () => {
      showView('');
      main.appendChild(cloneTpl('tpl-form'));
      await loadCourses();
      wireEnrollmentForm();
      await prefillDraft();
    },
    payments: () => {
      showView('');
      main.appendChild(cloneTpl('tpl-payments'));
      wirePayments();
      loadPaymentList();
    },
    notify: async () => {
      showView('');
      main.appendChild(cloneTpl('tpl-notify'));
      await loadNotifications();
    },
    announce: async () => {
      showView('');
      main.appendChild(cloneTpl('tpl-announce'));
      await loadAnnouncements();
    },
    reports: async () => {
      showView('');
      main.appendChild(cloneTpl('tpl-reports'));
      await loadReports();
    },
    chat: () => {
      showView('');
      main.appendChild(cloneTpl('tpl-chat'));
      wireChat();
    },
    qreg: async () => {
      showView('');
      main.appendChild(cloneTpl('tpl-queue'));
      await loadQueue(
        '/api/enrollment/queue/registrar',
        'Registrar — new student approvals',
        '/api/enrollment/{id}/phase2/decision'
      );
    },
    qacc: async () => {
      showView('');
      main.appendChild(cloneTpl('tpl-queue'));
      await loadQueue(
        '/api/enrollment/queue/accounting',
        'Accounting — payment verification queue',
        '/api/enrollment/{id}/phase2/decision'
      );
    },
    qsao: async () => {
      showView('');
      main.appendChild(cloneTpl('tpl-queue'));
      const body = document.getElementById('queueBody');
      document.getElementById('queueTitle').textContent = 'Student Affairs — ID validation (Phase 3)';
      const rows = await api.get('/api/enrollment/queue/sao');
      if (!rows.length) {
        body.innerHTML = '<p style="color:var(--muted)">No pending items.</p>';
        return;
      }
      body.innerHTML = rows
        .map(
          (e) =>
            `<div class="card" style="padding:0.75rem;margin-bottom:0.5rem"><strong>#${e.id}</strong> ${e.course_code || ''}
          <div style="margin-top:0.5rem;display:flex;gap:0.5rem"><button class="btn btn-primary" data-id="${e.id}" data-a="ok">Approve</button><button class="btn btn-ghost" data-id="${e.id}" data-a="no">Reject</button></div></div>`
        )
        .join('');
      body.querySelectorAll('button').forEach((b) => {
        b.addEventListener('click', async () => {
          const id = b.getAttribute('data-id');
          const ok = b.getAttribute('data-a') === 'ok';
          const notes = prompt('Notes:') || '';
          await api.post('/api/enrollment/' + id + '/phase3/decision', {
            status: ok ? 'Approved' : 'Rejected',
            notes,
          });
          await views.qsao();
        });
      });
    },
  };

  const navDef = [];
  if (role === 'Student') {
    navDef.push(['home', 'Overview', () => views.home()]);
    navDef.push(['form', 'Enrollment form', () => views.form()]);
    navDef.push(['payments', 'Payments', () => views.payments()]);
    navDef.push(['notify', 'Notifications', () => views.notify()]);
    navDef.push(['announce', 'Announcements', () => views.announce()]);
    navDef.push(['chat', 'AI assistant', () => views.chat()]);
  }
  if (role === 'Admin') {
    navDef.push(['home', 'Overview', () => views.home()]);
    navDef.push(['reports', 'Reports', () => views.reports()]);
    navDef.push(['announce', 'Announcements', () => views.announce()]);
    navDef.push(['qreg', 'Registrar queue', () => views.qreg()]);
    navDef.push(['qacc', 'Accounting queue', () => views.qacc()]);
    navDef.push(['qsao', 'SAO queue', () => views.qsao()]);
    navDef.push(['chat', 'AI assistant', () => views.chat()]);
  }
  if (role === 'Registrar') {
    navDef.push(['qreg', 'My queue', () => views.qreg()]);
    navDef.push(['announce', 'Announcements', () => views.announce()]);
    navDef.push(['notify', 'Notifications', () => views.notify()]);
  }
  if (role === 'Accounting') {
    navDef.push(['qacc', 'Payment queue', () => views.qacc()]);
    navDef.push(['announce', 'Announcements', () => views.announce()]);
    navDef.push(['notify', 'Notifications', () => views.notify()]);
  }
  if (role === 'Student Affairs Office') {
    navDef.push(['qsao', 'ID validation', () => views.qsao()]);
    navDef.push(['announce', 'Announcements', () => views.announce()]);
    navDef.push(['notify', 'Notifications', () => views.notify()]);
  }

  let active = navDef[0] ? navDef[0][0] : 'home';
  nav.innerHTML = navDef
    .map(
      ([id, label]) =>
        `<a class="nav-link" data-view="${id}">${label}</a>`
    )
    .join('');

  nav.querySelectorAll('.nav-link').forEach((a) => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const id = a.getAttribute('data-view');
      active = id;
      nav.querySelectorAll('.nav-link').forEach((x) => x.classList.remove('active'));
      a.classList.add('active');
      const fn = navDef.find((x) => x[0] === id);
      if (fn) fn[2]();
      closeMenu();
    });
  });

  if (navDef[0]) {
    nav.querySelector('.nav-link').classList.add('active');
    navDef[0][2]();
  }
})();
