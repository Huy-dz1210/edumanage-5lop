/**
 * Thành phần giao diện dùng chung: escape HTML, toast, modal, form, xác nhận.
 */
(function () {
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function toast(message, type = 'info', ms = 3500) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    $('#toast-root').appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  const fmtDate = (s) => {
    if (!s) return '';
    const [y, m, d] = String(s).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  };
  const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('vi-VN') : '');
  const today = () => new Date().toLocaleDateString('sv-SE');
  const debounce = (fn, ms = 250) => {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };
  const initials = (name) => String(name || '?').trim().split(/\s+/).pop().charAt(0).toUpperCase();

  /**
   * Sinh HTML cho một trường form.
   * f = { name, label, type, required, options:[{value,label}], full, placeholder, attrs }
   */
  function field(f, value) {
    const v = value ?? f.value ?? '';
    const req = f.required ? ' <span class="req">*</span>' : '';
    const id = 'f-' + f.name;
    let control;
    if (f.type === 'select') {
      control = `<select class="select" id="${id}" name="${f.name}">${(f.options || [])
        .map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.label)}</option>`)
        .join('')}</select>`;
    } else if (f.type === 'checkbox') {
      return `<div class="field ${f.full ? 'full' : ''}"><label class="checkbox"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}/> ${esc(f.label)}</label></div>`;
    } else if (f.type === 'textarea') {
      control = `<textarea class="input" id="${id}" name="${f.name}" rows="3">${esc(v)}</textarea>`;
    } else {
      control = `<input class="input" id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" ${f.attrs || ''}/>`;
    }
    return `<div class="field ${f.full ? 'full' : ''}"><label for="${id}">${esc(f.label)}${req}</label>${control}<div class="error" data-error-for="${f.name}"></div></div>`;
  }

  function formData(form) {
    const out = {};
    $$('input, select, textarea', form).forEach((el) => {
      if (!el.name) return;
      out[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return out;
  }

  function showErrors(form, err) {
    $$('.error', form).forEach((e) => (e.textContent = ''));
    $$('.invalid', form).forEach((e) => e.classList.remove('invalid'));
    const box = $('.form-error', form);
    const details = (err && err.details) || {};
    Object.entries(details).forEach(([k, msg]) => {
      const slot = $(`[data-error-for="${k}"]`, form);
      if (slot) slot.textContent = msg;
      const input = $(`[name="${k}"]`, form);
      if (input) input.classList.add('invalid');
    });
    if (box) {
      box.textContent = err ? err.message : '';
      box.classList.toggle('hidden', !err);
    }
  }

  /**
   * Mở modal chứa form. onSubmit(data) trả về Promise; lỗi validate được hiển thị tại chỗ.
   */
  function openModal({ title, body, submitText = 'Lưu', onSubmit, size = '', danger = false, hideSubmit = false }) {
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <form class="modal ${size}" novalidate>
        <div class="modal-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close aria-label="Đóng">✕</button></div>
        <div class="modal-body"><div class="form-error hidden"></div>${body}</div>
        <div class="modal-foot">
          <button type="button" class="btn" data-close>${hideSubmit ? 'Đóng' : 'Huỷ'}</button>
          ${hideSubmit ? '' : `<button type="submit" class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}">${esc(submitText)}</button>`}
        </div>
      </form>`;
    root.appendChild(wrap);
    const form = $('form', wrap);
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    $$('[data-close]', wrap).forEach((b) => b.addEventListener('click', close));
    wrap.addEventListener('mousedown', (e) => e.target === wrap && close());
    const first = $('input:not([type=hidden]), select, textarea', form);
    if (first) setTimeout(() => first.focus(), 30);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!onSubmit) return close();
      const btn = $('button[type=submit]', form);
      btn.disabled = true;
      const old = btn.textContent;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Đang xử lý...';
      try {
        const result = await onSubmit(formData(form), form);
        if (result !== false) close();
      } catch (err) {
        showErrors(form, err);
      } finally {
        btn.disabled = false;
        btn.textContent = old;
      }
    });
    return { form, close };
  }

  function confirmDialog(message, { title = 'Xác nhận', okText = 'Đồng ý', danger = true } = {}) {
    return new Promise((resolve) => {
      let ok = false;
      const m = openModal({
        title, size: 'sm', submitText: okText, danger,
        body: `<p style="margin:0">${esc(message)}</p>`,
        onSubmit: async () => { ok = true; },
      });
      const obs = new MutationObserver(() => {
        if (!document.body.contains(m.form)) { obs.disconnect(); resolve(ok); }
      });
      obs.observe($('#modal-root'), { childList: true });
    });
  }

  /**
   * Gắn xử lý cho một hộp thoại form viết sẵn trong HTML (div.modal-backdrop#id > form).
   * Trả về { open({title, submitText, data}), close() }.
   * onSubmit(data) trả Promise; lỗi kiểm tra dữ liệu từ server hiện ngay dưới từng ô.
   */
  function bindForm(id, { onSubmit }) {
    const wrap = document.getElementById(id);
    const form = $('form', wrap);
    const submitBtn = $('[data-submit]', wrap);
    const close = () => wrap.classList.add('hidden');
    $$('[data-close]', wrap).forEach((b) => b.addEventListener('click', close));
    wrap.addEventListener('mousedown', (e) => e.target === wrap && close());
    document.addEventListener('keydown', (e) => e.key === 'Escape' && !wrap.classList.contains('hidden') && close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const label = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang xử lý...';
      try {
        await onSubmit(formData(form));
        close();
      } catch (err) {
        showErrors(form, err);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = label;
      }
    });

    return {
      close,
      form,
      open({ title, submitText, data = {} } = {}) {
        form.reset();
        showErrors(form, null);
        if (title) $('[data-title]', wrap).textContent = title;
        if (submitText) submitBtn.textContent = submitText;
        Object.entries(data).forEach(([k, v]) => {
          const el = form.elements[k];
          if (!el) return;
          if (el.type === 'checkbox') el.checked = !!v;
          else el.value = v ?? '';
        });
        wrap.classList.remove('hidden');
        const first = $('input:not([type=hidden]):not([type=checkbox]), select', form);
        if (first) setTimeout(() => first.focus(), 30);
      },
    };
  }

  /** Mở hộp thoại chỉ xem (không có form), điền dữ liệu vào các phần tử [data-field]. */
  function bindView(id) {
    const wrap = document.getElementById(id);
    const close = () => wrap.classList.add('hidden');
    $$('[data-close]', wrap).forEach((b) => b.addEventListener('click', close));
    wrap.addEventListener('mousedown', (e) => e.target === wrap && close());
    return {
      open(data) {
        $$('[data-field]', wrap).forEach((el) => (el.textContent = data[el.dataset.field] || '—'));
        wrap.classList.remove('hidden');
      },
      close,
    };
  }

  /** Thêm các <option> vào một <select> có sẵn (giữ lại option đầu tiên như "Tất cả lớp"). */
  function fillSelect(select, items, { keepFirst = true, selected = '' } = {}) {
    const first = keepFirst && select.options[0] ? select.options[0].outerHTML : '';
    select.innerHTML = first + items.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
    select.value = selected;
  }

  /** Hiển thị điểm số: null → '—', còn lại giữ tối đa 2 chữ số thập phân. */
  const score = (v) => (v === null || v === undefined ? '—' : String(Math.round(v * 100) / 100));

  const loading = () => '<div class="loading"><span class="spinner"></span> Đang tải dữ liệu...</div>';
  const errorBox = (err) => `<div class="card"><div class="form-error">${esc(err.message || err)}</div></div>`;

  const statusBadge = (s) => {
    const map = { 'Đang học': 'green', 'Bảo lưu': 'amber', 'Thôi học': 'red', 'Đã tốt nghiệp': 'blue' };
    return `<span class="badge badge-${map[s] || 'gray'}">${esc(s)}</span>`;
  };
  const classifyBadge = (c) => {
    const map = { 'Xuất sắc': 'green', 'Giỏi': 'green', 'Khá': 'blue', 'Trung bình': 'amber', 'Yếu': 'red' };
    return `<span class="badge badge-${map[c] || 'gray'}">${esc(c)}</span>`;
  };

  window.UI = { score, bindForm, bindView, fillSelect, esc, $, $$, toast, fmtDate, fmtDateTime, today, debounce, initials, field, formData, showErrors, openModal, confirmDialog, loading, errorBox, statusBadge, classifyBadge };
})();
