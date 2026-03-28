/**
 * Reusable UI: toasts, modals, loading states, page transitions.
 * Depends on design-system.css classes.
 */
(function () {
  const TOAST_DURATION = 4200;

  function ensureToastRoot() {
    let el = document.getElementById('toast-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-root';
      el.className = 'toast-root';
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  /**
   * @param {'success'|'error'|'info'} type
   * @param {string} message
   */
  function toast(type, message) {
    const root = ensureToastRoot();
    const t = document.createElement('div');
    t.className = 'toast toast--' + type + ' toast-enter';
    t.innerHTML =
      '<span class="toast__icon">' +
      (type === 'success'
        ? '✓'
        : type === 'error'
          ? '!'
          : 'i') +
      '</span><span class="toast__msg">' +
      escapeHtml(message) +
      '</span>';
    root.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast-enter-active'));
    setTimeout(() => {
      t.classList.add('toast-leave');
      setTimeout(() => t.remove(), 280);
    }, TOAST_DURATION);
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /**
   * Open modal with HTML content; resolves { confirm: true, notes } or null when dismissed.
   */
  function openModal(options) {
    const { title, bodyHtml, confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = options;
    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
    root.innerHTML =
      '<div class="modal-backdrop modal-enter" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal-panel modal-panel-enter">' +
      '<div class="modal-head"><h2 id="modal-title" class="modal-title">' +
      escapeHtml(title) +
      '</h2><button type="button" class="modal-close" aria-label="Close">&times;</button></div>' +
      '<div class="modal-body">' +
      bodyHtml +
      '</div>' +
      '<div class="modal-foot">' +
      '<button type="button" class="ds-btn ds-btn--ghost modal-btn-cancel">' +
      escapeHtml(cancelText) +
      '</button>' +
      '<button type="button" class="ds-btn ds-btn--primary' +
      (danger ? ' ds-btn--danger' : '') +
      ' modal-btn-ok">' +
      escapeHtml(confirmText) +
      '</button></div></div></div>';

    const backdrop = root.querySelector('.modal-backdrop');
    const panel = root.querySelector('.modal-panel');

    return new Promise((resolve) => {
      const finish = (value) => {
        backdrop.classList.add('modal-leave');
        panel.classList.add('modal-panel-leave');
        setTimeout(() => {
          root.innerHTML = '';
          resolve(value);
        }, 200);
      };

      backdrop.querySelector('.modal-close').onclick = () => finish(null);
      backdrop.querySelector('.modal-btn-cancel').onclick = () => finish(null);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) finish(null);
      });
      backdrop.querySelector('.modal-btn-ok').onclick = () => {
        const notesEl = backdrop.querySelector('[name="modal-notes"]');
        finish({ confirm: true, notes: notesEl ? notesEl.value : '' });
      };
      requestAnimationFrame(() => {
        backdrop.classList.add('modal-enter-active');
        panel.classList.add('modal-panel-enter-active');
      });
    });
  }

  /** Button loading: disables and shows spinner */
  function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.dataset._label = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('ds-btn--loading');
      btn.innerHTML = '<span class="spinner spinner--sm"></span> Please wait…';
    } else {
      btn.disabled = false;
      btn.classList.remove('ds-btn--loading');
      if (btn.dataset._label) btn.innerHTML = btn.dataset._label;
    }
  }

  function skeletonLines(n) {
    let h = '';
    for (let i = 0; i < n; i++) h += '<div class="skeleton skeleton-line"></div>';
    return h;
  }

  /**
   * Modal with Approve + Reject + Cancel (for payment review).
   * Resolves { action: 'approve'|'reject', notes } or null.
   */
  function openModalDual(options) {
    const { title, bodyHtml } = options;
    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
    root.innerHTML =
      '<div class="modal-backdrop modal-enter" role="dialog" aria-modal="true">' +
      '<div class="modal-panel modal-panel-enter">' +
      '<div class="modal-head"><h2 class="modal-title">' +
      escapeHtml(title) +
      '</h2><button type="button" class="modal-close" aria-label="Close">&times;</button></div>' +
      '<div class="modal-body">' +
      bodyHtml +
      '</div>' +
      '<div class="modal-foot" style="flex-wrap:wrap;gap:0.5rem">' +
      '<button type="button" class="ds-btn ds-btn--ghost modal-btn-cancel">Cancel</button>' +
      '<button type="button" class="ds-btn ds-btn--ghost modal-btn-reject" style="border-color:rgba(198,40,40,0.35);color:var(--color-danger)">Reject</button>' +
      '<button type="button" class="ds-btn ds-btn--primary modal-btn-approve">Approve</button>' +
      '</div></div></div>';

    const backdrop = root.querySelector('.modal-backdrop');
    const panel = root.querySelector('.modal-panel');
    const notesEl = () => backdrop.querySelector('[name="modal-notes"]');

    return new Promise((resolve) => {
      const finish = (value) => {
        backdrop.classList.add('modal-leave');
        panel.classList.add('modal-panel-leave');
        setTimeout(() => {
          root.innerHTML = '';
          resolve(value);
        }, 200);
      };

      backdrop.querySelector('.modal-close').onclick = () => finish(null);
      backdrop.querySelector('.modal-btn-cancel').onclick = () => finish(null);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) finish(null);
      });
      backdrop.querySelector('.modal-btn-approve').onclick = () =>
        finish({ action: 'approve', notes: notesEl() ? notesEl().value : '' });
      backdrop.querySelector('.modal-btn-reject').onclick = () =>
        finish({ action: 'reject', notes: notesEl() ? notesEl().value : '' });
      requestAnimationFrame(() => {
        backdrop.classList.add('modal-enter-active');
        panel.classList.add('modal-panel-enter-active');
      });
    });
  }

  window.UI = {
    toast,
    openModal,
    openModalDual,
    setButtonLoading,
    skeletonLines,
    escapeHtml,
  };
})();
