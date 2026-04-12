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
  if (role === 'Student') document.body.classList.add('portal-student');
  if (role === 'Admin') document.body.classList.add('portal-admin');
  if (['Registrar', 'Accounting', 'Student Affairs Office'].indexOf(role) >= 0) {
    document.body.classList.add('portal-staff');
  }
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
    3 xfer: 'Tip: List your previous institution and program accurately for credential evaluation.',
    4: 'Tip: Emergency contact should be reachable during school hours.',
    5: 'Review all sections. After submit, Phase 2 routing depends on your category.',
  };

  function getWizardStepSequence() {
    const cat = document.getElementById('category') && document.getElementById('category').value;
    if (cat === 'New' || cat === 'Transfer') return [1, 2, 3, 4, 5];
    return [1, 2, 4, 5];
  }

  function syncCategoryPanels() {
    const cat = document.getElementById('category') && document.getElementById('category').value;
    const isNew = cat === 'New';
    const isXfer = cat === 'Transfer';
    const af = document.getElementById('academicFields');
    const tf = document.getElementById('transferFields');
    const hintNew = document.getElementById('academicHintNew');
    const hintXfer = document.getElementById('academicHintXfer');
    if (af) af.classList.toggle('hidden', !isNew);
    if (tf) tf.classList.toggle('hidden', !isXfer);
    if (hintNew) hintNew.classList.toggle('hidden', !isNew);
    if (hintXfer) hintXfer.classList.toggle('hidden', !isXfer);
    ['elem_school', 'jhs_school', 'shs_school'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.required = !!isNew;
    });
    ['xfer_current_school', 'xfer_prev_program'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.required = !!isXfer;
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
      const cat = document.getElementById('category') && document.getElementById('category').value;
      let hintText = WIZARD_HINTS[panelNum];
      if (panelNum === 3 && cat === 'Transfer') hintText = WIZARD_HINTS['3 xfer'];
      hint.innerHTML = '<span class="smart-hint" style="display:block;margin:0">' + hintText + '</span>';
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
      if (panelNum === 3) {
        const c = document.getElementById('category').value;
        if (c === 'Transfer') {
          const s = document.getElementById('xfer_current_school').value.trim();
          const p = document.getElementById('xfer_prev_program').value.trim();
          if (s.length < 2 || p.length < 2) {
            UI.toast('error', 'Enter current/previous school and previous program.');
            return false;
          }
        }
      }
      return true;
    }

    function buildReview() {
      const el = document.getElementById('reviewMount');
      const c = document.getElementById('course_id');
      const ctext = c.options[c.selectedIndex] ? c.options[c.selectedIndex].text : '';
      const cat = document.getElementById('category').value;
      const isNew = cat === 'New';
      const isXfer = cat === 'Transfer';
      let academicBlock = '';
      if (isNew) {
        academicBlock =
          '<p><strong>Academic:</strong> ' +
          UI.escapeHtml(document.getElementById('shs_school').value) +
          ' (SHS) · ' +
          UI.escapeHtml(document.getElementById('jhs_school').value) +
          ' (JHS)</p>';
      } else if (isXfer) {
        academicBlock =
          '<p><strong>Transfer:</strong> ' +
          UI.escapeHtml(document.getElementById('xfer_current_school').value) +
          ' · previous: ' +
          UI.escapeHtml(document.getElementById('xfer_prev_program').value) +
          '</p>';
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
        syncCategoryPanels();
        const seq = getWizardStepSequence();
        if (stepIndex >= seq.length) stepIndex = Math.max(0, seq.length - 1);
        showStep();
      });
    }
    syncCategoryPanels();
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
    const transfer =
      cat === 'Transfer'
        ? {
            current_school: document.getElementById('xfer_current_school').value.trim(),
            current_program: document.getElementById('xfer_prev_program').value.trim(),
            last_semester_attended: document.getElementById('xfer_last_sem').value.trim() || null,
            previous_course_code: document.getElementById('xfer_prev_code').value.trim() || null,
            units_completed: document.getElementById('xfer_units').value.trim() || null,
            reason_for_transfer: document.getElementById('xfer_reason').value.trim() || null,
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
      transfer: transfer,
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

  const STEP_CHECK_SVG =
    '<svg class="es-node__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

  function renderPhaseDashboard(enrollments) {
    const el = document.getElementById('phaseDashboardMount');
    if (!el) return;

    const labels = [
      'Registrar form',
      'Evaluation',
      'Accounting',
      'Student Affairs',
      'Enrolled',
    ];
    const subs = ['', '', '', 'Optional', ''];

    let stepsDone = [false, false, false, false, false];
    let metaLine = '';
    let ctaHtml = '';
    let summaryStrip = '';

    if (!enrollments.length) {
      stepsDone = [false, false, false, false, false];
      metaLine = 'Start with the pre-enrollment form to begin your journey.';
      ctaHtml =
        '<button type="button" class="ds-btn ds-btn--primary es-cta" id="dashGoForm">Start enrollment form</button>';
    } else {
      const e = enrollments[0];
      const isNew = e.category === 'New';
      const p1 = e.phase1_status === 'Approved';
      const p2 = e.phase2_status === 'Approved';
      const p3 = e.phase3_status === 'Approved';
      stepsDone = [p1, isNew ? p2 : true, p2, p3, p1 && p2 && p3];
      summaryStrip =
        '<div class="enrollment-summary-strip">' +
        '<span class="enrollment-summary-strip__badge">#' +
        e.id +
        '</span>' +
        '<span>' +
        UI.escapeHtml(e.course_code || '—') +
        '</span>' +
        '<span class="enrollment-summary-strip__muted">' +
        UI.escapeHtml(e.academic_year) +
        ' · ' +
        UI.escapeHtml(e.semester) +
        '</span>' +
        '<span class="badge ' +
        badgeClass(e.phase2_status) +
        '">Phase 2 · ' +
        UI.escapeHtml(e.phase2_assigned_role) +
        '</span>' +
        '</div>';

      if (!p1) {
        metaLine = 'Submit your registrar form to unlock the next steps.';
        ctaHtml =
          '<button type="button" class="ds-btn ds-btn--primary es-cta" id="dashGoForm">Continue enrollment form</button>';
      } else if (!p2 && !isNew) {
        metaLine = 'Proceed to the payment section to upload your receipt or complete payment at Accounting.';
        ctaHtml =
          '<button type="button" class="ds-btn ds-btn--primary es-cta" id="dashGoPayment">Go to payment</button>';
      } else if (!p2 && isNew) {
        metaLine = 'Awaiting Registrar evaluation for your application.';
        ctaHtml = '';
      } else if (!p3) {
        metaLine = 'Student Affairs will validate your ID — stay tuned for clearance.';
        ctaHtml = '';
      } else {
        metaLine = 'You are fully cleared for this enrollment period.';
        ctaHtml = '';
      }

      if (e.phase1_status === 'Rejected' || e.phase2_status === 'Rejected' || e.phase3_status === 'Rejected') {
        metaLine = 'One or more phases need attention. Check notifications or contact the office.';
      }
    }

    function nodeClass(i) {
      const done = stepsDone[i];
      if (done) return 'es-node es-node--done';
      const prevOk = i === 0 || stepsDone[i - 1];
      if (prevOk && !done) return 'es-node es-node--current';
      return 'es-node es-node--upcoming';
    }

    function nodeInner(i) {
      const done = stepsDone[i];
      if (done) return STEP_CHECK_SVG;
      return '<span class="es-node__num">' + (i + 1) + '</span>';
    }

    const railPct =
      (stepsDone.slice(0, 4).filter(Boolean).length / 4) * 100;

    const stepsHtml = labels
      .map(
        (title, i) =>
          '<li class="' +
          nodeClass(i) +
          '" style="--es-i:' +
          i +
          '">' +
          '<div class="es-node__circle">' +
          nodeInner(i) +
          '</div>' +
          '<span class="es-node__title">' +
          UI.escapeHtml(title) +
          '</span>' +
          (subs[i]
            ? '<span class="es-node__sub">' + UI.escapeHtml(subs[i]) + '</span>'
            : '') +
          '</li>'
      )
      .join('');

    el.innerHTML =
      summaryStrip +
      '<div class="es-stepper" role="list" aria-label="Enrollment steps">' +
      '<div class="es-stepper__rail" aria-hidden="true"><div class="es-stepper__rail-fill" style="width:' +
      railPct +
      '%"></div></div>' +
      '<ol class="es-stepper__nodes">' +
      stepsHtml +
      '</ol></div>' +
      '<p class="es-stepper__hint">' +
      UI.escapeHtml(metaLine) +
      '</p>' +
      (ctaHtml ? '<div class="es-stepper__cta">' + ctaHtml + '</div>' : '');

    document.getElementById('dashGoForm')?.addEventListener('click', () => {
      const btn = nav.querySelector('[data-view="form"]');
      if (btn) btn.click();
    });
    document.getElementById('dashGoPayment')?.addEventListener('click', () => {
      const btn = nav.querySelector('[data-view="payments"]');
      if (btn) btn.click();
    });
  }

  async function refreshTracker() {
    try {
      const list = await api.get('/api/enrollment/mine');
      renderPhaseDashboard(list);
    } catch (e) {
      console.error(e);
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
    const root = main;
    const onlineBlock = root.querySelector('#payOnlineBlock');
    const onsiteBlock = root.querySelector('#payOnsiteBlock');
    const tiles = root.querySelectorAll('[data-pay-method]');
    if (!onlineBlock || !onsiteBlock || !tiles.length) return;

    let method = 'online';
    let lastOtp = null;

    function setMethod(m) {
      method = m;
      tiles.forEach((t) => t.classList.toggle('is-selected', t.getAttribute('data-pay-method') === m));
      onlineBlock.classList.toggle('hidden', m !== 'online');
      onsiteBlock.classList.toggle('hidden', m !== 'onsite');
    }

    tiles.forEach((t) => {
      t.addEventListener('click', () => setMethod(t.getAttribute('data-pay-method') || 'online'));
    });

    function payPageAlert(type, message) {
      const el = root.querySelector('#payPageAlert');
      if (!el) return;
      el.className = 'pay-page__alert';
      if (!message) {
        el.textContent = '';
        return;
      }
      if (type === 'error') el.classList.add('pay-page__alert--error');
      if (type === 'success') el.classList.add('pay-page__alert--success');
      el.textContent = message;
    }

    const paySendOtp = root.querySelector('#paySendOtp');
    if (paySendOtp) {
      paySendOtp.addEventListener('click', () => {
        const gc = root.querySelector('#payGcash');
        const mobile = (gc && gc.value.trim()) || '';
        if (!mobile || mobile.replace(/\D/g, '').length < 10) {
          UI.toast('error', 'Enter a valid GCash mobile number (at least 10 digits).');
          return;
        }
        lastOtp = String(Math.floor(100000 + Math.random() * 900000));
        const msg = 'OTP sent to ' + mobile + '. Code: ' + lastOtp;
        if (typeof UI.toastOtp === 'function') {
          UI.toastOtp(msg);
        } else {
          UI.toast('info', 'Demo OTP: ' + lastOtp);
        }
      });
    }

    async function doUpload(fileInputId, amountFieldId) {
      payPageAlert('', '');
      const eid = (root.querySelector('#payEnrollId') && root.querySelector('#payEnrollId').value) || '';
      const fileInput = root.querySelector('#' + fileInputId);
      const file = fileInput && fileInput.files[0];
      if (!eid) {
        const msg = 'No enrollment record found. Complete the enrollment form first.';
        payPageAlert('error', msg);
        UI.toast('error', msg);
        return;
      }
      if (!file) {
        const msg = 'Please attach your payment proof file.';
        payPageAlert('error', msg);
        UI.toast('error', msg);
        return;
      }
      if (method === 'online') {
        const amt = root.querySelector('#payAmountPhp') && root.querySelector('#payAmountPhp').value.trim();
        const gcash = root.querySelector('#payGcash') && root.querySelector('#payGcash').value.trim();
        const lrn = root.querySelector('#payLrn') && root.querySelector('#payLrn').value.trim();
        const otp = root.querySelector('#payOtp') && root.querySelector('#payOtp').value.trim();
        if (!amt || !gcash || !lrn) {
          const msg = 'Fill in amount, GCash number, and reference (LRN/ID).';
          payPageAlert('error', msg);
          UI.toast('error', msg);
          return;
        }
        if (!lastOtp || otp !== lastOtp) {
          const msg = 'Tap Send OTP and enter the 6-digit code shown in the notification (demo).';
          payPageAlert('error', msg);
          UI.toast('error', msg);
          return;
        }
      }
      const fd = new FormData();
      fd.append('enrollment_form_id', eid);
      fd.append('file', file);
      const amtEl = root.querySelector('#' + amountFieldId);
      if (amtEl && amtEl.value.trim()) fd.append('amount', amtEl.value.trim());
      try {
        await api.uploadForm('/api/payments/upload', fd);
        const ok = 'Payment proof submitted. Awaiting Accounting verification.';
        payPageAlert('success', ok);
        UI.toast('success', ok);
        const eidIn = root.querySelector('#payEnrollId');
        if (eidIn && eidIn.value) eidIn.dispatchEvent(new Event('change'));
      } catch (e) {
        payPageAlert('error', e.message);
        UI.toast('error', e.message);
      }
    }

    root.querySelector('#paySubmit')?.addEventListener('click', () => {
      setMethod('online');
      doUpload('payFile', 'payAmountPhp');
    });
    root.querySelector('#paySubmitOnsite')?.addEventListener('click', () => {
      setMethod('onsite');
      doUpload('payFileOnsite', 'payAmountOnsite');
    });

    const el = document.getElementById('payList');
    const eidIn = document.getElementById('payEnrollId');
    if (el && eidIn) {
      const refreshList = async () => {
        if (!eidIn.value) return;
        try {
          const rows = await api.get('/api/payments/enrollment/' + eidIn.value);
          el.innerHTML =
            rows.length === 0
              ? '<p class="pay-receipt-list__empty">No receipts on file yet.</p>'
              : '<ul class="pay-receipt-list__ul">' +
                rows.map((p) => '<li>#' + p.id + ' — ' + p.status + ' — ' + UI.escapeHtml(p.original_filename || '') + '</li>').join('') +
                '</ul>';
        } catch (err) {
          el.textContent = err.message;
        }
      };
      eidIn.addEventListener('change', refreshList);
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

  async function loadReportsCharts(statGrid, barRow, lineWrap, deptWrap, funnelWrap, pipelineViz) {
    const r = await api.get('/api/reports/summary');
    if (statGrid) {
      statGrid.innerHTML =
        '<div class="stat-tile stat-tile--rise"><div class="stat-tile__val">' +
        r.total_enrollments +
        '</div><div class="stat-tile__lbl">Total records</div></div>' +
        '<div class="stat-tile stat-tile--rise stat-tile--delay1"><div class="stat-tile__val">' +
        (r.by_status.phase3_approved || 0) +
        '</div><div class="stat-tile__lbl">Fully enrolled</div></div>' +
        '<div class="stat-tile stat-tile--rise stat-tile--delay2"><div class="stat-tile__val">' +
        (r.by_status.rejected_any || 0) +
        '</div><div class="stat-tile__lbl">Rejected (phase 2/3)</div></div>';
    }
    if (barRow) {
      const max = Math.max(1, r.total_enrollments, ...Object.values(r.by_phase || {}).map(Number));
      const phases = r.by_phase || {};
      const h = (n) => Math.round((Number(n) / max) * 100) + '%';
      barRow.innerHTML = ['1', '2', '3']
        .map(
          (k) =>
            '<div class="chart-bar-wrap chart-bar-wrap--nice"><div class="chart-bar chart-bar--nice" style="height:' +
            h(phases[k] || 0) +
            '"></div><span class="chart-label">Phase ' +
            k +
            '</span><strong>' +
            (phases[k] || 0) +
            '</strong></div>'
        )
        .join('');
    }
    if (pipelineViz && r.by_phase) {
      const max = Math.max(1, ...['1', '2', '3'].map((k) => Number(r.by_phase[k] || 0)));
      pipelineViz.innerHTML = ['1', '2', '3']
        .map((k) => {
          const n = Number(r.by_phase[k] || 0);
          const pct = Math.round((n / max) * 100);
          return (
            '<div class="pipe-phase"><span class="pipe-phase__n">Phase ' +
            k +
            '</span><div class="pipe-phase__track"><span class="pipe-phase__fill" style="width:' +
            pct +
            '%"></span></div><span class="pipe-phase__count">' +
            n +
            '</span></div>'
          );
        })
        .join('');
    }
    if (lineWrap && r.trend && r.trend.length) {
      const max = Math.max(1, ...r.trend.map((t) => t.count));
      const w = 480;
      const h = 140;
      const pts = r.trend
        .map((t, i) => {
          const x = (i / (r.trend.length - 1 || 1)) * (w - 24) + 12;
          const y = h - 16 - (t.count / max) * (h - 32);
          return x + ',' + y;
        })
        .join(' ');
      lineWrap.innerHTML =
        '<svg class="analytics-line-svg" viewBox="0 0 ' +
        w +
        ' ' +
        h +
        '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
        '<polyline fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="' +
        pts +
        '"/>' +
        '</svg><div class="analytics-trend-labels">' +
        r.trend.map((t) => '<span>' + UI.escapeHtml(t.label) + '</span>').join('') +
        '</div>';
    }
    if (deptWrap && r.by_department && r.by_department.length) {
      const max = Math.max(1, ...r.by_department.map((d) => d.count));
      deptWrap.innerHTML = r.by_department
        .map((d) => {
          const pct = Math.round((d.count / max) * 100);
          return (
            '<div class="dept-bar-row"><span class="dept-bar-row__name">' +
            UI.escapeHtml(d.name) +
            '</span><div class="dept-bar-row__track"><span style="width:' +
            pct +
            '%"></span></div><strong>' +
            d.count +
            '</strong></div>'
          );
        })
        .join('');
    } else if (deptWrap) {
      deptWrap.innerHTML = '<p class="empty-hint">No department data yet.</p>';
    }
    if (funnelWrap && r.funnel) {
      const f = r.funnel;
      funnelWrap.innerHTML =
        '<div class="funnel-steps">' +
        '<div class="funnel-step"><span>Submitted</span><strong>' +
        (f.applications_submitted || 0) +
        '</strong></div>' +
        '<div class="funnel-arrow">→</div>' +
        '<div class="funnel-step"><span>Phase 2 cleared</span><strong>' +
        (f.phase2_cleared || 0) +
        '</strong></div>' +
        '<div class="funnel-arrow">→</div>' +
        '<div class="funnel-step funnel-step--accent"><span>Fully enrolled</span><strong>' +
        (f.fully_enrolled || 0) +
        '</strong></div></div>';
    }
  }

  async function loadAdminHome() {
    await loadReportsCharts(
      document.getElementById('adminStatGrid'),
      document.getElementById('adminChartRow'),
      null,
      null,
      null,
      document.getElementById('adminPipelineViz')
    );
  }

  async function loadReportsView() {
    await loadReportsCharts(
      document.getElementById('reportStatGrid'),
      document.getElementById('reportChartRow'),
      document.getElementById('reportLineChart'),
      document.getElementById('reportDeptChart'),
      document.getElementById('reportFunnel'),
      null
    );
  }

  async function loadDepartmentEnrolled() {
    const el = document.getElementById('deptEnrollMount');
    if (!el) return;
    el.innerHTML = '<div class="skeleton skeleton-line"></div>';
    try {
      const rows = await api.get('/api/enrollment/department/enrolled');
      if (!rows.length) {
        el.innerHTML =
          '<p class="empty-hint">No fully enrolled students in your department scope yet. Records appear when all phases are approved.</p>';
        return;
      }
      el.innerHTML =
        '<div class="ds-table-wrap ds-table-wrap--elevated"><table class="ds-table"><thead><tr><th>ID</th><th>Student</th><th>Course</th><th>Term</th></tr></thead><tbody>' +
        rows
          .map((e) => {
            const name =
              (e.personal && (e.personal.first_name || '') + ' ' + (e.personal.last_name || '')) || '—';
            return (
              '<tr><td>#' +
              e.id +
              '</td><td>' +
              UI.escapeHtml(name.trim()) +
              '</td><td>' +
              UI.escapeHtml(e.course_code || '') +
              '<span class="dept-pill">' +
              UI.escapeHtml(e.course_department || '') +
              '</span></td><td>' +
              UI.escapeHtml(e.academic_year) +
              ' · ' +
              UI.escapeHtml(e.semester) +
              '</td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div>';
    } catch (e) {
      el.innerHTML = '<p class="alert-banner alert-banner--error">' + UI.escapeHtml(e.message) + '</p>';
    }
  }

  async function accountingApproveFlow(enrollmentId) {
    let payments;
    try {
      payments = await api.get('/api/payments/enrollment/' + enrollmentId);
    } catch (e) {
      UI.toast('error', e.message);
      return;
    }
    const pending = payments.filter((p) => p.status === 'Pending');
    if (!pending.length) {
      UI.toast(
        'error',
        'No pending receipt for this enrollment. The student must upload payment proof before you can approve Phase 2.'
      );
      return;
    }
    const radios = pending
      .map(
        (p, i) =>
          '<label class="pay-pick"><input type="radio" name="paypick" value="' +
          p.id +
          '" ' +
          (i === 0 ? 'checked' : '') +
          ' /> #' +
          p.id +
          ' · ' +
          UI.escapeHtml(p.original_filename || 'file') +
          '</label>'
      )
      .join('');
    const first = pending[0];
    const file = first.receipt_file_path || '';
    const ext = file.toLowerCase().split('.').pop();
    const isImg = ['jpg', 'jpeg', 'png', 'webp'].indexOf(ext) >= 0;
    const preview = isImg
      ? '<div class="acct-modal-preview"><img src="' +
        mediaUrl(file) +
        '" alt="Receipt preview"/></div>'
      : '<p><a href="' +
        mediaUrl(file) +
        '" target="_blank" rel="noopener" class="acct-modal-link">Open receipt file</a></p>';
    const body =
      '<p class="acct-modal-lead">Enrollment <strong>#' +
      enrollmentId +
      '</strong> — confirm the receipt matches your records, then approve.</p>' +
      preview +
      '<div class="pay-pick-list">' +
      radios +
      '</div>' +
      '<label class="acct-modal-notes-lbl">Notes (optional)</label><textarea name="modal-notes" class="modal-notes" placeholder="Verification notes"></textarea>';

    const modRes = await UI.openModal({
      title: 'Verify receipt & approve Phase 2',
      bodyHtml: body,
      confirmText: 'Verify & approve',
    });
    if (!modRes || !modRes.confirm) return;
    const pid = modRes.payment_id;
    if (!pid) {
      UI.toast('error', 'Select a receipt to verify.');
      return;
    }
    try {
      await api.post('/api/enrollment/' + enrollmentId + '/phase2/accounting-verify-and-approve', {
        payment_id: pid,
        notes: modRes.notes || '',
      });
      UI.toast('success', 'Receipt verified and Phase 2 approved.');
      if (queueReload) await queueReload();
    } catch (e) {
      UI.toast('error', e.message);
    }
  }

  let queueReload = null;

  async function loadQueue(path, title, decideUrl, phase, options) {
    options = options || {};
    const accountingQueue = !!options.accountingQueue;
    document.getElementById('queueTitle').textContent = title;
    const body = document.getElementById('queueBody');
    const search = document.getElementById('queueSearch');
    const rows = await api.get(path);
    queueReload = () => loadQueue(path, title, decideUrl, phase, options);

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
        '<div class="ds-table-wrap ds-table-wrap--queue"><table class="ds-table"><thead><tr><th>ID</th><th>Course</th><th>Student</th><th>Actions</th></tr></thead><tbody>' +
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

      body.querySelectorAll('.q-appr').forEach((b) =>
        b.addEventListener('click', () => {
          const id = b.getAttribute('data-eid');
          if (accountingQueue) accountingApproveFlow(id);
          else queueDecision(id, 'approve', decideUrl, phase);
        })
      );
      body.querySelectorAll('.q-rej').forEach((b) =>
        b.addEventListener('click', () => queueDecision(b.getAttribute('data-eid'), 'reject', decideUrl, phase))
      );
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
      if (draft.category === 'Transfer' && draft.transfer) {
        const t = draft.transfer;
        document.getElementById('xfer_current_school').value = t.current_school || '';
        document.getElementById('xfer_prev_program').value = t.current_program || '';
        document.getElementById('xfer_last_sem').value = t.last_semester_attended || '';
        document.getElementById('xfer_prev_code').value = t.previous_course_code || '';
        document.getElementById('xfer_units').value = t.units_completed || '';
        document.getElementById('xfer_reason').value = t.reason_for_transfer || '';
      } else {
        ['xfer_current_school', 'xfer_prev_program', 'xfer_last_sem', 'xfer_prev_code', 'xfer_units', 'xfer_reason'].forEach(
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
  const cloudAssistLayer = document.getElementById('cloudAssistLayer');
  const WELCOME_KEY = 'seait_ai_welcome_v4';

  try {
    if (/[?&]resetWelcome=1(?:&|$)/.test(window.location.search)) {
      sessionStorage.removeItem(WELCOME_KEY);
      sessionStorage.removeItem('seait_ai_welcome_seen');
    }
  } catch (err) {
    /* private mode */
  }

  function openChatDrawer() {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (chatIn) chatIn.focus();
  }

  document.getElementById('chatClose').addEventListener('click', () => {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  });
  fab?.addEventListener('click', () => {
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
    if (cloudAssistLayer && cloudAssistLayer.parentNode) {
      document.body.appendChild(cloudAssistLayer);
    }

    function setWelcomeOpen(open) {
      if (fab) fab.classList.toggle('fab-chat--welcome-open', !!open);
    }

    let welcomeOpen = false;
    try {
      welcomeOpen = !sessionStorage.getItem(WELCOME_KEY);
    } catch (err) {
      welcomeOpen = true;
    }

    if (cloudAssistLayer && welcomeOpen) {
      cloudAssistLayer.classList.remove('cloud-assistant-layer--hidden');
      cloudAssistLayer.setAttribute('aria-hidden', 'false');
      setWelcomeOpen(true);
    }

    const dismissCloud = () => {
      try {
        sessionStorage.setItem(WELCOME_KEY, '1');
      } catch (err) {
        /* ignore */
      }
      setWelcomeOpen(false);
      if (cloudAssistLayer) {
        cloudAssistLayer.classList.add('cloud-assistant-layer--hidden');
        cloudAssistLayer.setAttribute('aria-hidden', 'true');
      }
    };
    document.getElementById('cloudAssistBackdrop')?.addEventListener('click', dismissCloud);
    document.getElementById('cloudAssistChat')?.addEventListener('click', () => {
      dismissCloud();
      openChatDrawer();
    });
    document.getElementById('cloudAssistDiscard')?.addEventListener('click', dismissCloud);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && cloudAssistLayer && !cloudAssistLayer.classList.contains('cloud-assistant-layer--hidden')) {
        dismissCloud();
      }
    });
  } else {
    fab.style.display = 'none';
    cloudAssistLayer?.remove();
  }

  const views = {
    home: async () => {
      showView('');
      if (role === 'Student') {
        setPageHead('Dashboard', 'Phases, payments, and status — new applicants and returning students.');
        main.appendChild(cloneTpl('tpl-student-home'));
        await refreshTracker();
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
      setPageHead('Payment', 'Online GCash or onsite — submit proof for Accounting');
      showView('');
      main.appendChild(cloneTpl('tpl-payments'));
      wirePayments();
      try {
        const list = await api.get('/api/enrollment/mine');
        const inp = document.getElementById('payEnrollId');
        const chip = document.getElementById('payEnrollChip');
        if (inp && list.length) {
          inp.value = String(list[0].id);
          if (chip) {
            chip.innerHTML =
              '<span class="pay-enroll-chip__label">Enrollment</span> <strong>#' +
              list[0].id +
              '</strong> · ' +
              UI.escapeHtml(list[0].course_code || '') +
              ' · ' +
              UI.escapeHtml(list[0].academic_year || '');
          }
          inp.dispatchEvent(new Event('change'));
        } else if (chip) {
          chip.innerHTML =
            '<span class="pay-enroll-chip--warn">No enrollment found. Complete the enrollment form first.</span>';
        }
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
      setPageHead('Accounting queue', 'Verify receipt in the approval dialog, then Phase 2 completes.');
      showView('');
      main.appendChild(cloneTpl('tpl-queue'));
      await loadQueue(
        '/api/enrollment/queue/accounting',
        'Pending verification',
        '/api/enrollment/{id}/phase2/decision',
        2,
        { accountingQueue: true }
      );
    },
    dept: async () => {
      setPageHead('Department', 'Enrolled students in your department programs');
      showView('');
      main.appendChild(cloneTpl('tpl-department-home'));
      await loadDepartmentEnrolled();
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
  }
  if (role === 'Registrar') {
    addNav('qreg', 'My queue', ic.queue, () => views.qreg());
    addNav('announce', 'Announcements', ic.megaphone, () => views.announce());
    addNav('notify', 'Notifications', ic.bell, () => views.notify());
  }
  if (role === 'Accounting') {
    addNav('qacc', 'Enrollment queue', ic.queue, () => views.qacc());
    addNav('announce', 'Announcements', ic.megaphone, () => views.announce());
    addNav('notify', 'Notifications', ic.bell, () => views.notify());
  }
  if (role === 'Department') {
    document.body.classList.add('portal-department');
    addNav('dept', 'Department', ic.chart, () => views.dept());
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
