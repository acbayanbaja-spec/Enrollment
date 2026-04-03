/**
 * SEAIT dashboard — role navigation, multi-step enrollment wizard, modals, toasts, FAB AI chat.
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
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const headerUserName = document.getElementById('headerUserName');
  const headerUserRole = document.getElementById('headerUserRole');
  headerUserName.textContent = user.full_name;
  headerUserRole.textContent = role;

  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  function closeMenu() {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-visible');
  }
  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('is-open');
    overlay.classList.toggle('is-visible');
  });
  overlay.addEventListener('click', closeMenu);

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  /** Inline SVG icons (currentColor) */
  const ic = {
    home: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    form: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    pay: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    verify: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    bell: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    megaphone: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
    chart: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    queue: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    idcard: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  };

  function setPageHead(title, subtitle) {
    pageTitle.textContent = title;
    pageSubtitle.textContent = subtitle || '';
  }

  function showView(html) {
    main.innerHTML = html;
  }

  function cloneTpl(id) {
    return document.getElementById(id).content.cloneNode(true);
  }

  const WIZARD_HINTS = {
    1: 'Tip: Use your legal name as it appears on your school records.',
    2: 'Tip: Provide at least one parent or guardian contact for verification.',
    3: 'Tip: Include your SHS strand if you completed K–12 in the Philippines.',
    4: 'Tip: Emergency contact should be reachable during school hours.',
    5: 'Review all sections. After submit, Phase 2 routing depends on your category.',
  };

  function getWizardStepSequence() {
    const cat = document.getElementById('category') && document.getElementById('category').value;
    return cat === 'New' ? [1, 2, 3, 4, 5] : [1, 2, 4, 5];
  }

  function syncAcademicPanelVisibility() {
    const cat = document.getElementById('category') && document.getElementById('category').value;
    const panel = document.getElementById('wizardPanelAcademic');
    if (!panel) return;
    const isNew = cat === 'New';
    ['elem_school', 'jhs_school', 'shs_school'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.required = !!isNew;
    });
  }

  function initWizard() {
    let stepIndex = 0;
    const fill = document.getElementById('wizardFill');
    const label = document.getElementById('wizardStepLabel');
    const hint = document.getElementById('wizardSmartHint');
    const prev = document.getElementById('wizPrev');
    const next = document.getElementById('wizNext');
    const submitBtn = document.getElementById('submitForm');
    const catEl = document.getElementById('category');
    const panels = () => document.querySelectorAll('.wizard-panel');

    function showStep() {
      const seq = getWizardStepSequence();
      const total = seq.length;
      const panelNum = seq[stepIndex];
      panels().forEach((p) => {
        p.classList.toggle('is-active', parseInt(p.getAttribute('data-wizard-step'), 10) === panelNum);
      });
      const pct = ((stepIndex + 1) / total) * 100;
      fill.style.width = pct + '%';
      label.textContent = 'Step ' + (stepIndex + 1) + ' of ' + total;
      hint.innerHTML =
        '<span class="smart-hint" style="display:block;margin:0">' + WIZARD_HINTS[panelNum] + '</span>';
      prev.style.display = stepIndex > 0 ? 'inline-flex' : 'none';
      next.style.display = stepIndex < total - 1 ? 'inline-flex' : 'none';
      submitBtn.style.display = stepIndex === total - 1 ? 'inline-flex' : 'none';
      if (panelNum === 5) buildReview();
    }

    function validateCurrentStep() {
      const seq = getWizardStepSequence();
      const panelNum = seq[stepIndex];
      const sel = '[data-step-req="' + panelNum + '"]';
      const fields = document.querySelectorAll(sel);
      for (let i = 0; i < fields.length; i++) {
        const el = fields[i];
        if (!el.checkValidity()) {
          el.reportValidity();
          return false;
        }
      }
      if (panelNum === 1) {
        const course = document.getElementById('course_id');
        if (!course.value) {
          UI.toast('error', 'Please select a course.');
          return false;
        }
      }
      return true;
    }

    function buildReview() {
      const el = document.getElementById('reviewMount');
      const c = document.getElementById('course_id');
      const ctext = c.options[c.selectedIndex] ? c.options[c.selectedIndex].text : '';
      const isNew = document.getElementById('category').value === 'New';
      let academicBlock = '';
      if (isNew) {
        academicBlock =
          '<p><strong>Academic:</strong> ' +
          UI.escapeHtml(document.getElementById('shs_school').value) +
          ' (SHS) · ' +
          UI.escapeHtml(document.getElementById('jhs_school').value) +
          ' (JHS)</p>';
      } else {
        academicBlock = '<p><strong>Academic background:</strong> Not required for returning students.</p>';
      }
      el.innerHTML =
        '<p><strong>Program:</strong> ' +
        UI.escapeHtml(document.getElementById('category').value) +
        ' · ' +
        UI.escapeHtml(ctext) +
        '</p><p><strong>Term:</strong> ' +
        UI.escapeHtml(document.getElementById('academic_year').value) +
        ' — ' +
        UI.escapeHtml(document.getElementById('semester').value) +
        '</p><p><strong>Name:</strong> ' +
        UI.escapeHtml(document.getElementById('pfirst').value + ' ' + document.getElementById('plast').value) +
        '</p><p><strong>Contact:</strong> ' +
        UI.escapeHtml(document.getElementById('pcontact').value) +
        '</p>' +
        academicBlock +
        '<p><strong>Emergency:</strong> ' +
        UI.escapeHtml(document.getElementById('e_name').value) +
        ' (' +
        UI.escapeHtml(document.getElementById('e_rel').value) +
        ')</p>';
    }

    prev.addEventListener('click', () => {
      if (stepIndex > 0) {
        stepIndex--;
        showStep();
      }
    });
    next.addEventListener('click', () => {
      if (!validateCurrentStep()) return;
      const seq = getWizardStepSequence();
      if (stepIndex < seq.length - 1) {
        stepIndex++;
        showStep();
      }
    });
    if (catEl) {
      catEl.addEventListener('change', () => {
        syncAcademicPanelVisibility();
        const seq = getWizardStepSequence();
        if (stepIndex >= seq.length) stepIndex = Math.max(0, seq.length - 1);
        showStep();
      });
    }
    syncAcademicPanelVisibility();
    showStep();
  }

  function buildPayload(submit, enrollmentId) {
    const course_id = parseInt(document.getElementById('course_id').value, 10);
    const cat = document.getElementById('category').value;
    const academic =
      cat === 'New'
        ? {
            elem_school: document.getElementById('elem_school').value.trim(),
            elem_year: document.getElementById('elem_year').value.trim() || null,
            jhs_school: document.getElementById('jhs_school').value.trim(),
            jhs_year: document.getElementById('jhs_year').value.trim() || null,
            shs_school: document.getElementById('shs_school').value.trim(),
            shs_strand: document.getElementById('shs_strand').value.trim() || null,
            shs_year: document.getElementById('shs_year').value.trim() || null,
          }
        : null;
    return {
      submit,
      enrollment_id: enrollmentId || null,
      course_id,
      academic_year: document.getElementById('academic_year').value.trim(),
      semester: document.getElementById('semester').value,
      category: cat,
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
      academic: academic,
      emergency: {
        name: document.getElementById('e_name').value.trim(),
        contact: document.getElementById('e_contact').value.trim(),
        relationship: document.getElementById('e_rel').value.trim(),
        address: document.getElementById('e_addr').value.trim(),
      },
    };
  }

  function validateFullForm() {
    const form = document.getElementById('enrollmentForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }
    return true;
  }

  async function loadCourses() {
    const list = await api.get('/api/courses/');
    const sel = document.getElementById('course_id');
    if (!sel) return;
    sel.innerHTML = list.map((c) => '<option value="' + c.id + '">' + c.code + ' — ' + c.name + '</option>').join('');
  }

  function badgeClass(s) {
    if (s === 'Approved') return 'badge--ok';
    if (s === 'Rejected') return 'badge--reject';
    return 'badge--pending';
  }

  function renderPhaseDashboard(enrollments) {
    const el = document.getElementById('phaseDashboardMount');
    if (!el) return;
    if (!enrollments.length) {
      el.innerHTML =
        '<div class="phase-row">' +
        '<div class="phase-card">' +
        '<span class="phase-card__num">1</span>' +
        '<h3>Phase 1 — Application</h3>' +
        '<p>Complete the enrollment form. <strong>New students</strong> provide K–12 academic background; <strong>returning students</strong> skip that section.</p>' +
        '</div>' +
        '<div class="phase-card phase-card--locked">' +
        '<span class="phase-card__num">2</span>' +
        '<h3>Phase 2 — Verification &amp; payment</h3>' +
        '<p>New applicants: Registrar. Returning: pay online (GCash, bank) or at Accounting — approval required before you can proceed.</p>' +
        '<div class="phase-card__chips"><span class="pay-chip pay-chip--cash">GCash</span><span class="pay-chip">Online / bank</span><span class="pay-chip">Accounting office</span></div>' +
        '</div></div>' +
        '<div class="phase-row" style="margin-top:1rem">' +
        '<div class="phase-card phase-card--locked">' +
        '<span class="phase-card__num">3</span>' +
        '<h3>Phase 3 — Student Affairs</h3>' +
        '<p>ID validation and final clearance.</p>' +
        '</div></div>' +
        '<p style="margin:1rem 0 0;font-size:0.88rem;color:var(--color-text-muted)">Open <strong>Enrollment</strong> in the sidebar to begin your application.</p>';
      return;
    }
    const e = enrollments[0];
    const isNew = e.category === 'New';
    const p2Title = isNew ? 'Phase 2 — Registrar review' : 'Phase 2 — Payment &amp; Accounting';
    const p2Desc = isNew
      ? 'Registrar reviews your application. When this phase is approved, continue to Student Affairs (Phase 3).'
      : 'Pay via GCash, bank transfer, or in person at Accounting. Upload your receipt. You cannot complete enrollment until Accounting approves your payment.';
    const p2Note = isNew
      ? ''
      : '<div class="phase-card__chips" style="margin-top:0.75rem"><span class="pay-chip pay-chip--cash">GCash</span><span class="pay-chip">Bank / online</span><span class="pay-chip">Walk-in Accounting</span></div>';
    const p2Locked = e.phase1_status !== 'Approved';
    const p3Locked = e.phase2_status !== 'Approved';
    el.innerHTML =
      '<div class="phase-row">' +
      '<div class="phase-card">' +
      '<span class="phase-card__num">1</span>' +
      '<h3>Phase 1 — Application</h3>' +
      '<p>Form submitted and recorded. Status: <span class="badge ' +
      badgeClass(e.phase1_status) +
      '">' +
      UI.escapeHtml(e.phase1_status) +
      '</span></p></div>' +
      '<div class="phase-card' +
      (p2Locked ? ' phase-card--locked' : '') +
      '">' +
      '<span class="phase-card__num">2</span>' +
      '<h3>' +
      p2Title +
      '</h3>' +
      '<p>' +
      p2Desc +
      '</p>' +
      p2Note +
      '<p style="margin:0.75rem 0 0;font-size:0.82rem">Status: <span class="badge ' +
      badgeClass(e.phase2_status) +
      '">' +
      UI.escapeHtml(e.phase2_status) +
      '</span> · Office: <strong>' +
      UI.escapeHtml(e.phase2_assigned_role) +
      '</strong></p></div></div>' +
      '<div class="phase-row" style="margin-top:1rem">' +
      '<div class="phase-card' +
      (p3Locked ? ' phase-card--locked' : '') +
      '">' +
      '<span class="phase-card__num">3</span>' +
      '<h3>Phase 3 — Student Affairs</h3>' +
      '<p>ID validation and final clearance.</p>' +
      '<p style="margin:0.75rem 0 0;font-size:0.82rem">Status: <span class="badge ' +
      badgeClass(e.phase3_status) +
      '">' +
      UI.escapeHtml(e.phase3_status) +
      '</span></p></div></div>';
  }

  function renderTracker(enrollments) {
    const el = document.getElementById('trackerMount');
    if (!el) return;
    if (!enrollments.length) {
      el.innerHTML =
        '<div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line" style="width:70%"></div><p style="color:var(--color-text-muted);margin-top:0.75rem">No enrollments yet. Start the enrollment wizard.</p>';
      return;
    }
    el.innerHTML = enrollments
      .map((e) => {
        const phases = [
          { n: 1, label: 'Form submitted', s: e.phase1_status },
          { n: 2, label: 'Verification (Registrar / Accounting)', s: e.phase2_status },
          { n: 3, label: 'Student Affairs (ID)', s: e.phase3_status },
        ];
        const doneIdx = phases.findIndex((p) => p.s !== 'Approved');
        const current = doneIdx === -1 ? 2 : Math.max(0, doneIdx);
        return (
          '<div class="ds-card" style="margin-bottom:1rem;padding:1rem">' +
          '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;align-items:center">' +
          '<strong>#' +
          e.id +
          '</strong>' +
          '<span style="color:var(--color-text-muted);font-size:0.88rem">' +
          UI.escapeHtml(e.course_code || '') +
          ' · ' +
          UI.escapeHtml(e.academic_year) +
          ' ' +
          UI.escapeHtml(e.semester) +
          '</span></div>' +
          '<div class="timeline" style="margin-top:1rem">' +
          phases
            .map((p, i) => {
              let cls = '';
              if (p.s === 'Approved') cls = 'timeline-item--done';
              else if (i === current && p.s === 'Pending') cls = 'timeline-item--current';
              return (
                '<div class="timeline-item ' +
                cls +
                '"><div class="timeline-dot"></div><div class="timeline-body"><h4>Phase ' +
                p.n +
                ': ' +
                UI.escapeHtml(p.label) +
                '</h4><span class="badge ' +
                badgeClass(p.s) +
                '">' +
                UI.escapeHtml(p.s) +
                '</span></div></div>'
              );
            })
            .join('') +
          '</div>' +
          '<p style="font-size:0.82rem;color:var(--color-text-muted);margin:0.5rem 0 0">Next office: <strong>' +
          UI.escapeHtml(e.phase2_assigned_role) +
          '</strong> (when applicable)</p></div>'
        );
      })
      .join('');
  }

  async function refreshTracker() {
    try {
      const list = await api.get('/api/enrollment/mine');
      renderTracker(list);
      renderPhaseDashboard(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadHistory() {
    const el = document.getElementById('historyMount');
    if (!el) return;
    try {
      const list = await api.get('/api/enrollment/mine');
      if (!list.length) {
        el.innerHTML = '<p style="color:var(--color-text-muted)">No records yet.</p>';
        return;
      }
      el.innerHTML =
        '<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th>ID</th><th>Program</th><th>Term</th><th>P1</th><th>P2</th><th>P3</th></tr></thead><tbody>' +
        list
          .map(
            (e) =>
              '<tr><td>#' +
              e.id +
              '</td><td>' +
              UI.escapeHtml(e.course_code || '') +
              '</td><td>' +
              UI.escapeHtml(e.academic_year) +
              '</td><td><span class="badge ' +
              badgeClass(e.phase1_status) +
              '">' +
              e.phase1_status +
              '</span></td><td><span class="badge ' +
              badgeClass(e.phase2_status) +
              '">' +
              e.phase2_status +
              '</span></td><td><span class="badge ' +
              badgeClass(e.phase3_status) +
              '">' +
              e.phase3_status +
              '</span></td></tr>'
          )
          .join('') +
        '</tbody></table></div>';
    } catch (e) {
      el.textContent = e.message;
    }
  }

  async function loadAssistantSteps() {
    const el = document.getElementById('stepsMount');
    if (!el) return;
    try {
      const data = await api.get('/api/ai/assistant-steps');
      el.innerHTML =
        '<ol style="margin:0;padding-left:1.2rem;color:var(--color-text-muted);line-height:1.75">' +
        data.steps
          .map(
            (s) =>
              '<li><strong style="color:var(--color-text)">' +
              UI.escapeHtml(s.title) +
              '</strong> — ' +
              UI.escapeHtml(s.hint) +
              '</li>'
          )
          .join('') +
        '</ol>';
    } catch (e) {
      el.textContent = 'Could not load assistant steps.';
    }
  }

  function wireEnrollmentForm() {
    initWizard();
    const form = document.getElementById('enrollmentForm');
    document.getElementById('saveDraft').addEventListener('click', async () => {
      document.getElementById('formMsg').innerHTML = '';
      if (!validateFullForm()) {
        UI.toast('error', 'Complete all required fields before saving.');
        return;
      }
      try {
        const id = document.getElementById('enrollment_id').value;
        const payload = buildPayload(false, id ? parseInt(id, 10) : null);
        const res = await api.post('/api/enrollment/save', payload);
        document.getElementById('enrollment_id').value = res.id;
        UI.toast('success', 'Draft saved successfully.');
        refreshTracker();
      } catch (e) {
        UI.toast('error', e.message);
      }
    });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      document.getElementById('formMsg').innerHTML = '';
      if (!validateFullForm()) {
        UI.toast('error', 'Please fix validation errors.');
        return;
      }
      try {
        const id = document.getElementById('enrollment_id').value;
        const payload = buildPayload(true, id ? parseInt(id, 10) : null);
        const res = await api.post('/api/enrollment/save', payload);
        document.getElementById('enrollment_id').value = res.id;
        UI.toast('success', res.message || 'Submitted.');
        refreshTracker();
      } catch (e) {
        UI.toast('error', e.message);
      }
    });
  }

  function wirePayments() {
    const btn = document.getElementById('payUpload');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      document.getElementById('payMsg').innerHTML = '';
      const eid = document.getElementById('payEnrollId').value;
      const file = document.getElementById('payFile').files[0];
      if (!eid || !file) {
        UI.toast('error', 'Enrollment ID and file are required.');
        return;
      }
      const fd = new FormData();
      fd.append('enrollment_form_id', eid);
      fd.append('file', file);
      const amt = document.getElementById('payAmount').value;
      if (amt) fd.append('amount', amt);
      try {
        await api.uploadForm('/api/payments/upload', fd);
        UI.toast('success', 'Receipt uploaded successfully.');
      } catch (e) {
        UI.toast('error', e.message);
      }
    });
    const el = document.getElementById('payList');
    const eidIn = document.getElementById('payEnrollId');
    if (el && eidIn) {
      eidIn.addEventListener('change', async () => {
        if (!eidIn.value) return;
        try {
          const rows = await api.get('/api/payments/enrollment/' + eidIn.value);
          el.innerHTML =
            rows.length === 0
              ? '<p>No receipts yet.</p>'
              : '<ul style="margin:0;padding-left:1.2rem">' +
                rows.map((p) => '<li>#' + p.id + ' — ' + p.status + ' — ' + UI.escapeHtml(p.original_filename || '') + '</li>').join('') +
                '</ul>';
        } catch (err) {
          el.textContent = err.message;
        }
      });
    }
  }

  async function loadNotifications() {
    const el = document.getElementById('notifyList');
    if (!el) return;
    try {
      const rows = await api.get('/api/notifications/');
      el.innerHTML =
        rows.length === 0
          ? '<p style="color:var(--color-text-muted)">No notifications.</p>'
          : rows
              .map(
                (n) =>
                  '<div class="ds-card" style="padding:0.85rem;margin-bottom:0.5rem"><strong>' +
                  UI.escapeHtml(n.title) +
                  '</strong><div style="font-size:0.85rem;color:var(--color-text-muted)">' +
                  UI.escapeHtml(n.body || '') +
                  '</div><div style="font-size:0.72rem;margin-top:0.35rem;color:var(--color-text-muted)">' +
                  UI.escapeHtml(n.created_at) +
                  '</div></div>'
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
          '<div class="ds-card" style="padding:0.85rem;margin-bottom:0.5rem"><strong>' +
          UI.escapeHtml(a.title) +
          '</strong> <span class="badge badge--pending">' +
          UI.escapeHtml(a.priority) +
          '</span><div style="margin-top:0.5rem;color:var(--color-text-muted);white-space:pre-wrap">' +
          UI.escapeHtml(a.body) +
          '</div></div>'
      )
      .join('');
    if (role === 'Admin') {
      document.getElementById('adminAnnounce').classList.remove('hidden');
      document.getElementById('anPost').onclick = async () => {
        try {
          await api.post('/api/announcements/', {
            title: document.getElementById('anTitle').value,
            body: document.getElementById('anBody').value,
            priority: 'normal',
          });
          UI.toast('success', 'Announcement published.');
          await loadAnnouncements();
        } catch (e) {
          UI.toast('error', e.message);
        }
      };
    }
  }

  function mediaUrl(fname) {
    const base = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';
    return base + '/media/' + encodeURIComponent(fname);
  }

  async function loadPayVerify() {
    const mount = document.getElementById('payVerifyMount');
    if (!mount) return;
    mount.innerHTML = '<div class="skeleton skeleton-line"></div>';
    try {
      const rows = await api.get('/api/payments/pending');
      if (!rows.length) {
        mount.innerHTML = '<p style="color:var(--color-text-muted)">No pending receipts.</p>';
        return;
      }
      mount.innerHTML =
        '<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th>ID</th><th>Enrollment</th><th>File</th><th>Uploaded</th><th></th></tr></thead><tbody>' +
        rows
          .map((p) => {
            const enc = encodeURIComponent(p.receipt_file_path || '');
            return (
              '<tr><td>#' +
              p.id +
              '</td><td>#' +
              p.enrollment_form_id +
              '</td><td>' +
              UI.escapeHtml(p.original_filename || p.receipt_file_path) +
              '</td><td>' +
              UI.escapeHtml(String(p.uploaded_at)) +
              '</td><td><button type="button" class="ds-btn ds-btn--primary review-pay" data-id="' +
              p.id +
              '" data-file="' +
              enc +
              '" style="width:auto;padding:0.4rem 0.75rem;font-size:0.82rem">Review</button></td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div>';

      mount.querySelectorAll('.review-pay').forEach((b) => {
        b.addEventListener('click', async () => {
          const pid = b.getAttribute('data-id');
          const file = decodeURIComponent(b.getAttribute('data-file') || '');
          const ext = (file || '').toLowerCase().split('.').pop();
          const isImg = ['jpg', 'jpeg', 'png', 'webp'].indexOf(ext) >= 0;
          const preview = isImg
            ? '<img class="receipt-preview" src="' + mediaUrl(file) + '" alt="Receipt"/>'
            : '<p><a href="' +
              mediaUrl(file) +
              '" target="_blank" rel="noopener">Open PDF in new tab</a></p>';
          const body =
            '<p style="color:var(--color-text-muted);font-size:0.9rem">Payment #' +
            pid +
            '</p>' +
            preview +
            '<label style="display:block;margin-top:0.75rem;font-weight:600">Notes</label><textarea name="modal-notes" class="modal-notes" placeholder="Optional verification notes"></textarea>';
          const res = await UI.openModalDual({
            title: 'Verify receipt',
            bodyHtml: body,
          });
          if (!res || !res.action) return;
          const fd = new FormData();
          fd.append('status_value', res.action === 'approve' ? 'Approved' : 'Rejected');
          fd.append('notes', res.notes || '');
          try {
            await api.postFormData('/api/payments/' + pid + '/verify', fd);
            UI.toast('success', res.action === 'approve' ? 'Payment approved.' : 'Payment rejected.');
            await loadPayVerify();
          } catch (e) {
            UI.toast('error', e.message);
          }
        });
      });
    } catch (e) {
      mount.innerHTML = '<p class="alert-banner alert-banner--error">' + UI.escapeHtml(e.message) + '</p>';
    }
  }

  async function loadReportsCharts(containerStats, containerChart, preEl) {
    const r = await api.get('/api/reports/summary');
    if (preEl) preEl.textContent = JSON.stringify(r, null, 2);
    if (containerStats) {
      containerStats.innerHTML =
        '<div class="stat-tile"><div class="stat-tile__val">' +
        r.total_enrollments +
        '</div><div class="stat-tile__lbl">Total enrollments</div></div>' +
        '<div class="stat-tile"><div class="stat-tile__val">' +
        (r.by_status.phase3_approved || 0) +
        '</div><div class="stat-tile__lbl">Fully approved</div></div>' +
        '<div class="stat-tile"><div class="stat-tile__val">' +
        (r.by_status.rejected_any || 0) +
        '</div><div class="stat-tile__lbl">Rejected (any phase)</div></div>';
    }
    if (containerChart) {
      const max = Math.max(1, r.total_enrollments);
      const phases = r.by_phase || {};
      const h = (n) => Math.round((n / max) * 100) + '%';
      containerChart.innerHTML = ['1', '2', '3']
        .map(
          (k) =>
            '<div class="chart-bar-wrap"><div class="chart-bar" style="height:' +
            h(phases[k] || 0) +
            '"></div><span class="chart-label">Phase ' +
            k +
            '</span><strong>' +
            (phases[k] || 0) +
            '</strong></div>'
        )
        .join('');
    }
  }

  async function loadAdminHome() {
    await loadReportsCharts(
      document.getElementById('adminStatGrid'),
      document.getElementById('adminChartRow'),
      null
    );
  }

  async function loadReportsView() {
    await loadReportsCharts(
      document.getElementById('reportStatGrid'),
      document.getElementById('reportChartRow'),
      document.getElementById('reportOut')
    );
  }

  let queueReload = null;

  async function loadQueue(path, title, decideUrl, phase) {
    document.getElementById('queueTitle').textContent = title;
    const body = document.getElementById('queueBody');
    const search = document.getElementById('queueSearch');
    const rows = await api.get(path);
    queueReload = () => loadQueue(path, title, decideUrl, phase);

    function render(filter) {
      const q = (filter || '').toLowerCase();
      const filtered = rows.filter((e) => {
        if (!q) return true;
        const name = (e.personal && (e.personal.first_name || '') + ' ' + (e.personal.last_name || '')) || '';
        return (
          String(e.id).includes(q) ||
          (e.course_code && e.course_code.toLowerCase().includes(q)) ||
          name.toLowerCase().includes(q)
        );
      });
      if (!filtered.length) {
        body.innerHTML = '<p style="color:var(--color-text-muted)">No matching items.</p>';
        return;
      }
      body.innerHTML =
        '<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th>ID</th><th>Course</th><th>Student</th><th>Actions</th></tr></thead><tbody>' +
        filtered
          .map((e) => {
            const name =
              (e.personal && (e.personal.first_name || '') + ' ' + (e.personal.last_name || '')) || '—';
            return (
              '<tr><td>#' +
              e.id +
              '</td><td>' +
              UI.escapeHtml(e.course_code || '') +
              '</td><td>' +
              UI.escapeHtml(name) +
              '</td><td><button type="button" class="ds-btn ds-btn--primary q-appr" data-eid="' +
              e.id +
              '" style="width:auto;padding:0.35rem 0.65rem;font-size:0.8rem;margin-right:0.35rem">Approve</button><button type="button" class="ds-btn ds-btn--ghost q-rej" data-eid="' +
              e.id +
              '" style="width:auto;padding:0.35rem 0.65rem;font-size:0.8rem">Reject</button></td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div>';

      body.querySelectorAll('.q-appr').forEach((b) => b.addEventListener('click', () => queueDecision(b.getAttribute('data-eid'), 'approve', decideUrl, phase)));
      body.querySelectorAll('.q-rej').forEach((b) => b.addEventListener('click', () => queueDecision(b.getAttribute('data-eid'), 'reject', decideUrl, phase)));
    }

    search.oninput = () => render(search.value);
    render('');
  }

  async function queueDecision(id, act, decideUrl, phase) {
    const bodyHtml =
      '<p style="color:var(--color-text-muted)">Enrollment <strong>#' +
      id +
      '</strong></p><label style="font-weight:600">Notes (optional)</label><textarea name="modal-notes" class="modal-notes" placeholder="Add remarks for the student record"></textarea>';
    const res = await UI.openModal({
      title: act === 'approve' ? 'Approve request' : 'Reject request',
      bodyHtml: bodyHtml,
      confirmText: act === 'approve' ? 'Approve' : 'Reject',
      cancelText: 'Cancel',
      danger: act === 'reject',
    });
    if (!res || !res.confirm) return;
    const url =
      phase === 3 ? '/api/enrollment/' + id + '/phase3/decision' : decideUrl.replace('{id}', id);
    try {
      await api.post(url, {
        status: act === 'approve' ? 'Approved' : 'Rejected',
        notes: res.notes || '',
      });
      UI.toast('success', 'Record updated.');
      if (queueReload) await queueReload();
    } catch (e) {
      UI.toast('error', e.message);
    }
  }

  async function loadSaoQueue() {
    document.getElementById('queueTitle').textContent = 'Student Affairs — ID validation (Phase 3)';
    const body = document.getElementById('queueBody');
    const search = document.getElementById('queueSearch');
    const rows = await api.get('/api/enrollment/queue/sao');
    queueReload = () => loadSaoQueue();

    function render(filter) {
      const q = (filter || '').toLowerCase();
      const filtered = rows.filter((e) => {
        if (!q) return true;
        const name = (e.personal && (e.personal.first_name || '') + ' ' + (e.personal.last_name || '')) || '';
        return String(e.id).includes(q) || (e.course_code && e.course_code.toLowerCase().includes(q)) || name.toLowerCase().includes(q);
      });
      if (!filtered.length) {
        body.innerHTML = '<p style="color:var(--color-text-muted)">No pending items.</p>';
        return;
      }
      body.innerHTML =
        '<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th>ID</th><th>Course</th><th>Student</th><th>Actions</th></tr></thead><tbody>' +
        filtered
          .map(
            (e) =>
              '<tr><td>#' +
              e.id +
              '</td><td>' +
              UI.escapeHtml(e.course_code || '') +
              '</td><td>' +
              UI.escapeHtml((e.personal && e.personal.first_name + ' ' + e.personal.last_name) || '') +
              '</td><td><button type="button" class="ds-btn ds-btn--primary sao-ok" data-id="' +
              e.id +
              '" style="width:auto;padding:0.35rem 0.65rem;font-size:0.8rem;margin-right:0.35rem">Validate ID</button><button type="button" class="ds-btn ds-btn--ghost sao-no" data-id="' +
              e.id +
              '" style="width:auto;padding:0.35rem 0.65rem;font-size:0.8rem">Reject</button></td></tr>'
          )
          .join('') +
        '</tbody></table></div>';
      body.querySelectorAll('.sao-ok').forEach((b) =>
        b.addEventListener('click', () => queueDecision(b.getAttribute('data-id'), 'approve', '', 3))
      );
      body.querySelectorAll('.sao-no').forEach((b) =>
        b.addEventListener('click', () => queueDecision(b.getAttribute('data-id'), 'reject', '', 3))
      );
    }
    search.oninput = () => render(search.value);
    render('');
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
        UI.toast('success', 'Demo progress seeded.');
      } catch (e) {
        out.textContent = e.message;
      }
    });
  }

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
      if (draft.category === 'New' && draft.academic) {
        const a = draft.academic;
        document.getElementById('elem_school').value = a.elem_school || '';
        document.getElementById('elem_year').value = a.elem_year || '';
        document.getElementById('jhs_school').value = a.jhs_school || '';
        document.getElementById('jhs_year').value = a.jhs_year || '';
        document.getElementById('shs_school').value = a.shs_school || '';
        document.getElementById('shs_strand').value = a.shs_strand || '';
        document.getElementById('shs_year').value = a.shs_year || '';
      } else {
        ['elem_school', 'elem_year', 'jhs_school', 'jhs_year', 'shs_school', 'shs_strand', 'shs_year'].forEach(
          (id) => {
            const node = document.getElementById(id);
            if (node) node.value = '';
          }
        );
      }
      if (draft.emergency) {
        const x = draft.emergency;
        document.getElementById('e_name').value = x.name || '';
        document.getElementById('e_contact').value = x.contact || '';
        document.getElementById('e_rel').value = x.relationship || '';
        document.getElementById('e_addr').value = x.address || '';
      }
      const catEl = document.getElementById('category');
      if (catEl) catEl.dispatchEvent(new Event('change'));
    } catch (e) {
      console.warn(e);
    }
  }

  /* ---- FAB Chat ---- */
  const fab = document.getElementById('fabChat');
  const drawer = document.getElementById('chatDrawer');
  const chatLog = document.getElementById('chatDrawerLog');
  const chatIn = document.getElementById('chatDrawerInput');
  const chatSend = document.getElementById('chatDrawerSend');
  const aiWelcomeBackdrop = document.getElementById('aiWelcomeBackdrop');

  function openChatDrawer() {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (chatIn) chatIn.focus();
  }

  document.getElementById('chatClose').addEventListener('click', () => {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  });
  fab.addEventListener('click', () => {
    drawer.classList.toggle('is-open');
    drawer.setAttribute('aria-hidden', drawer.classList.contains('is-open') ? 'false' : 'true');
  });

  async function postChatMessage(m) {
    chatLog.innerHTML += '<div class="chat-msg chat-msg--user">' + UI.escapeHtml(m) + '</div>';
    chatLog.scrollTop = chatLog.scrollHeight;
    try {
      const r = await api.post('/api/ai/chat', { message: m });
      chatLog.innerHTML += '<div class="chat-msg chat-msg--bot">' + UI.escapeHtml(r.reply) + '</div>';
    } catch (e) {
      chatLog.innerHTML += '<div class="chat-msg chat-msg--bot">' + UI.escapeHtml(e.message) + '</div>';
    }
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  async function sendChat() {
    const m = chatIn.value.trim();
    if (!m) return;
    chatIn.value = '';
    await postChatMessage(m);
  }
  chatSend.addEventListener('click', sendChat);
  chatIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
  });

  document.querySelectorAll('.chat-quick__btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const p = btn.getAttribute('data-prompt');
      if (!p) return;
      openChatDrawer();
      await postChatMessage(p);
    });
  });

  if (role === 'Student') {
    if (aiWelcomeBackdrop && !sessionStorage.getItem('seait_ai_welcome_seen')) {
      aiWelcomeBackdrop.classList.remove('hidden');
      aiWelcomeBackdrop.setAttribute('aria-hidden', 'false');
    }
    const dismissAi = () => {
      sessionStorage.setItem('seait_ai_welcome_seen', '1');
      if (aiWelcomeBackdrop) {
        aiWelcomeBackdrop.classList.add('hidden');
        aiWelcomeBackdrop.setAttribute('aria-hidden', 'true');
      }
    };
    document.getElementById('aiWelcomeOpenChat')?.addEventListener('click', () => {
      dismissAi();
      openChatDrawer();
    });
    document.getElementById('aiWelcomeDismiss')?.addEventListener('click', dismissAi);
    aiWelcomeBackdrop?.addEventListener('click', (ev) => {
      if (ev.target === aiWelcomeBackdrop) dismissAi();
    });
  } else {
    fab.style.display = 'none';
    aiWelcomeBackdrop?.remove();
  }

  const views = {
    home: async () => {
      showView('');
      if (role === 'Student') {
        setPageHead('Dashboard', 'Phases, payments, and status — new applicants and returning students.');
        main.appendChild(cloneTpl('tpl-student-home'));
        await refreshTracker();
        await loadHistory();
        await loadAssistantSteps();
        wireIrregular();
      } else if (role === 'Admin') {
        setPageHead('Dashboard', 'System overview and analytics');
        main.appendChild(cloneTpl('tpl-admin-home'));
        await loadAdminHome();
      } else {
        setPageHead('Welcome', 'Choose a module from the sidebar to manage enrollments.');
        main.appendChild(cloneTpl('tpl-staff-home'));
      }
    },
    form: async () => {
      setPageHead('Enrollment application', 'Multi-step wizard — validate each section before continuing');
      showView('');
      main.appendChild(cloneTpl('tpl-form'));
      await loadCourses();
      wireEnrollmentForm();
      await prefillDraft();
    },
    payments: async () => {
      setPageHead('Payments', 'Online or in-person payment — Accounting must approve receipts');
      showView('');
      main.appendChild(cloneTpl('tpl-payments'));
      wirePayments();
      try {
        const list = await api.get('/api/enrollment/mine');
        const inp = document.getElementById('payEnrollId');
        if (inp && list.length && !inp.value) inp.value = String(list[0].id);
      } catch (e) {
        console.warn(e);
      }
    },
    payverify: async () => {
      setPageHead('Payment verification', 'Review and approve uploaded receipts');
      showView('');
      main.appendChild(cloneTpl('tpl-payverify'));
      await loadPayVerify();
    },
    notify: async () => {
      setPageHead('Notifications', 'Alerts from enrollment workflow');
      showView('');
      main.appendChild(cloneTpl('tpl-notify'));
      await loadNotifications();
    },
    announce: async () => {
      setPageHead('Announcements', 'Institutional updates');
      showView('');
      main.appendChild(cloneTpl('tpl-announce'));
      await loadAnnouncements();
    },
    reports: async () => {
      setPageHead('Analytics', 'Enrollment metrics and distribution');
      showView('');
      main.appendChild(cloneTpl('tpl-reports'));
      await loadReportsView();
    },
    qreg: async () => {
      setPageHead('Registrar queue', 'New student applications — Phase 2');
      showView('');
      main.appendChild(cloneTpl('tpl-queue'));
      await loadQueue(
        '/api/enrollment/queue/registrar',
        'Pending approvals',
        '/api/enrollment/{id}/phase2/decision',
        2
      );
    },
    qacc: async () => {
      setPageHead('Accounting queue', 'Returning students — confirm payment before approval');
      showView('');
      main.appendChild(cloneTpl('tpl-queue'));
      await loadQueue(
        '/api/enrollment/queue/accounting',
        'Pending verification',
        '/api/enrollment/{id}/phase2/decision',
        2
      );
    },
    qsao: async () => {
      setPageHead('ID validation', 'Student Affairs — Phase 3');
      showView('');
      main.appendChild(cloneTpl('tpl-queue'));
      await loadSaoQueue();
    },
  };

  const navDef = [];
  function addNav(id, label, iconHtml, fn) {
    navDef.push([id, label, iconHtml, fn]);
  }

  if (role === 'Student') {
    addNav('home', 'Dashboard', ic.home, () => views.home());
    addNav('form', 'Enrollment', ic.form, () => views.form());
    addNav('payments', 'Payments', ic.pay, () => views.payments());
    addNav('notify', 'Notifications', ic.bell, () => views.notify());
    addNav('announce', 'Announcements', ic.megaphone, () => views.announce());
  }
  if (role === 'Admin') {
    addNav('home', 'Overview', ic.home, () => views.home());
    addNav('reports', 'Analytics', ic.chart, () => views.reports());
    addNav('announce', 'Announcements', ic.megaphone, () => views.announce());
    addNav('qreg', 'Registrar queue', ic.queue, () => views.qreg());
    addNav('qacc', 'Accounting queue', ic.queue, () => views.qacc());
    addNav('payverify', 'Verify receipts', ic.verify, () => views.payverify());
    addNav('qsao', 'SAO queue', ic.idcard, () => views.qsao());
  }
  if (role === 'Registrar') {
    addNav('qreg', 'My queue', ic.queue, () => views.qreg());
    addNav('announce', 'Announcements', ic.megaphone, () => views.announce());
    addNav('notify', 'Notifications', ic.bell, () => views.notify());
  }
  if (role === 'Accounting') {
    addNav('qacc', 'Enrollment queue', ic.queue, () => views.qacc());
    addNav('payverify', 'Verify receipts', ic.verify, () => views.payverify());
    addNav('announce', 'Announcements', ic.megaphone, () => views.announce());
    addNav('notify', 'Notifications', ic.bell, () => views.notify());
  }
  if (role === 'Student Affairs Office') {
    addNav('qsao', 'ID validation', ic.idcard, () => views.qsao());
    addNav('announce', 'Announcements', ic.megaphone, () => views.announce());
    addNav('notify', 'Notifications', ic.bell, () => views.notify());
  }

  nav.innerHTML = navDef
    .map(
      ([id, label, iconHtml]) =>
        '<button type="button" class="nav-link" data-view="' +
        id +
        '">' +
        iconHtml +
        '<span>' +
        label +
        '</span></button>'
    )
    .join('');

  nav.querySelectorAll('.nav-link').forEach((a) => {
    a.addEventListener('click', () => {
      const id = a.getAttribute('data-view');
      nav.querySelectorAll('.nav-link').forEach((x) => x.classList.remove('active'));
      a.classList.add('active');
      const item = navDef.find((x) => x[0] === id);
      if (item) item[3]();
      closeMenu();
    });
  });

  if (navDef[0]) {
    nav.querySelector('.nav-link').classList.add('active');
    navDef[0][3]();
  }
})();
