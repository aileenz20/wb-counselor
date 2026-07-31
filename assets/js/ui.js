/* =====================================================================
 * ui.js — 通用 UI 组件：toast / modal / schema 驱动表单 / 表格 / 徽章 / 导出
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB || (global.WB = {});

  WB.esc = function (s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };

  WB.fmtDate = function (d) {
    if (!d) return '';
    try { return new Date(d).toISOString().slice(0, 10); } catch (e) { return d; }
  };

  function readFileAsDataURL(file) {
    return new Promise(function (res, rej) {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
  }

  /* ---------- Toast ---------- */
  WB.toast = function (msg, type) {
    let box = document.getElementById('wb-toast');
    if (!box) { box = document.createElement('div'); box.id = 'wb-toast'; document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = 'wb-toast-item ' + (type || 'info');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('show'); }, 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2600);
  };

  /* ---------- Modal ---------- */
  WB.modal = function (opts) {
    // opts: {title, body(HTML or node), actions:[{label,cls,onClick(close)}], width}
    const overlay = document.createElement('div');
    overlay.className = 'wb-modal-overlay';
    const card = document.createElement('div');
    card.className = 'wb-modal';
    if (opts.width) card.style.maxWidth = opts.width;
    card.innerHTML = '<div class="wb-modal-head"><span>' + WB.esc(opts.title || '') + '</span><button class="wb-modal-x">×</button></div><div class="wb-modal-body"></div><div class="wb-modal-foot"></div>';
    const bodyEl = card.querySelector('.wb-modal-body');
    if (typeof opts.body === 'string') bodyEl.innerHTML = opts.body;
    else if (opts.body) bodyEl.appendChild(opts.body);
    const foot = card.querySelector('.wb-modal-foot');
    const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); };
    card.querySelector('.wb-modal-x').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    (opts.actions || []).forEach(a => {
      const b = document.createElement('button');
      b.className = 'wb-btn ' + (a.cls || '');
      b.textContent = a.label;
      b.onclick = () => { if (a.onClick) a.onClick(close); else close(); };
      foot.appendChild(b);
    });
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    return { close: close, body: bodyEl, card: card };
  };

  WB.confirm = function (msg, onYes) {
    return WB.modal({
      title: '确认操作',
      body: '<p style="margin:0;line-height:1.6">' + WB.esc(msg) + '</p>',
      actions: [
        { label: '取消', cls: 'wb-btn-ghost', onClick: c => c() },
        { label: '确定', cls: 'wb-btn-primary', onClick: c => { c(); onYes && onYes(); } }
      ]
    });
  };

  /* ---------- Schema 驱动表单弹窗 ---------- */
  // fields: [{name,label,type(text/number/textarea/select/date/checkbox, options[], required, placeholder, readonly, hint}]
  WB.formModal = function (opts) {
    const fields = opts.fields || [];
    const data = opts.data || {};
    const form = document.createElement('form');
    form.className = 'wb-form';
    fields.forEach(f => {
      const wrap = document.createElement('div');
      wrap.className = 'wb-field';
      const lbl = document.createElement('label');
      lbl.textContent = f.label + (f.required ? ' *' : '');
      const id = 'f_' + f.name;
      lbl.setAttribute('for', id);
      wrap.appendChild(lbl);
      let input;
      const val = data[f.name];
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = f.rows || 3;
        input.value = val || '';
      } else if (f.type === 'select') {
        input = document.createElement('select');
        (f.options || []).forEach(o => {
          const op = document.createElement('option');
          const v = (o && typeof o === 'object') ? o.value : o;
          const t = (o && typeof o === 'object') ? o.label : o;
          op.value = v; op.textContent = t;
          if (val === v) op.selected = true;
          input.appendChild(op);
        });
        if (val === undefined && f.options && f.options.length) {
          const first = (f.options[0] && typeof f.options[0] === 'object') ? f.options[0].value : f.options[0];
          input.value = first;
        }
      } else if (f.type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!val;
      } else if (f.type === 'date') {
        input = document.createElement('input');
        input.type = 'date';
        input.value = val || '';
      } else if (f.type === 'number') {
        input = document.createElement('input');
        input.type = 'number';
        input.step = f.step || 'any';
        input.value = (val === undefined || val === null || val === '') ? '' : val;
      } else if (f.type === 'file') {
        input = document.createElement('input');
        input.type = 'file';
        input.value = '';
        if (val && val.name) {
          const note = document.createElement('small');
          note.className = 'wb-hint';
          note.textContent = '当前附件：' + val.name + '（重新选择可替换）';
          wrap.appendChild(note);
        }
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = val || '';
      }
      input.id = id;
      input.name = f.name;
      if (f.readonly) input.readOnly = true;
      if (f.placeholder) input.placeholder = f.placeholder;
      wrap.appendChild(input);
      if (f.hint) { const h = document.createElement('small'); h.className = 'wb-hint'; h.textContent = f.hint; wrap.appendChild(h); }
      form.appendChild(wrap);
    });

    const m = WB.modal({
      title: opts.title || '编辑',
      width: opts.width || '560px',
      body: form,
      actions: [
        { label: '取消', cls: 'wb-btn-ghost', onClick: c => c() },
        { label: opts.submitLabel || '保存', cls: 'wb-btn-primary',         onClick: c => {
          const obj = Object.assign({}, data);
          let ok = true;
          const filePromises = [];
          fields.forEach(f => {
            const input = form.querySelector('#f_' + f.name);
            if (f.type === 'file') {
              if (input.files && input.files.length) {
                const file = input.files[0];
                filePromises.push(readFileAsDataURL(file).then(d => { obj[f.name] = { name: file.name, data: d }; }));
              }
              return; // 未重新选择则保留原附件（来自 data）
            }
            let v;
            if (f.type === 'checkbox') v = input.checked;
            else if (f.type === 'number') v = input.value === '' ? '' : parseFloat(input.value);
            else v = input.value;
            if (f.required && (v === '' || v === undefined || v === null)) {
              ok = false; input.style.borderColor = '#e5484d';
            }
            obj[f.name] = v;
          });
          if (!ok) { WB.toast('请填写必填项（标 *）', 'error'); return; }
          Promise.all(filePromises)
            .then(() => Promise.resolve(opts.onSubmit ? opts.onSubmit(obj) : null))
            .then(() => { c(); opts.onSaved && opts.onSaved(); })
            .catch(e => WB.toast('保存失败：' + e, 'error'));
        } }
      ]
    });
    return m;
  };

  /* ---------- 通用表格 ---------- */
  // opts: {columns:[{key,label,render(row),width}], rows, actions:[{label,cls,onClick(row)}], empty}
  WB.table = function (opts) {
    const wrap = document.createElement('div');
    wrap.className = 'wb-table-wrap';
    if (!opts.rows || !opts.rows.length) {
      wrap.innerHTML = '<div class="wb-empty">' + WB.esc(opts.empty || '暂无数据') + '</div>';
      return wrap;
    }
    const table = document.createElement('table');
    table.className = 'wb-table';
    const thead = document.createElement('thead');
    const htr = document.createElement('tr');
    opts.columns.forEach(c => { const th = document.createElement('th'); th.textContent = c.label; if (c.width) th.style.width = c.width; htr.appendChild(th); });
    if (opts.actions && opts.actions.length) { const th = document.createElement('th'); th.textContent = '操作'; th.style.width = '150px'; htr.appendChild(th); }
    thead.appendChild(htr); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    opts.rows.forEach(row => {
      const tr = document.createElement('tr');
      opts.columns.forEach(c => {
        const td = document.createElement('td');
        const v = c.render ? c.render(row) : WB.esc(row[c.key]);
        if (typeof v === 'string') td.innerHTML = v; else td.appendChild(v);
        tr.appendChild(td);
      });
      if (opts.actions && opts.actions.length) {
        const td = document.createElement('td');
        opts.actions.forEach(a => {
          const b = document.createElement('button');
          b.className = 'wb-link ' + (a.cls || '');
          b.textContent = a.label;
          b.onclick = (e) => { e.stopPropagation(); a.onClick(row); };
          td.appendChild(b);
        });
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  };

  /* ---------- 徽章 ---------- */
  WB.badge = function (text, cls) {
    return '<span class="wb-badge ' + (cls || '') + '">' + WB.esc(text) + '</span>';
  };

  /* ---------- CSV 导出 ---------- */
  WB.exportCSV = function (filename, columns, rows) {
    const head = columns.map(c => c.label).join(',');
    const lines = rows.map(r => columns.map(c => {
      let v = c.key ? r[c.key] : (c.value ? c.value(r) : '');
      v = (v === null || v === undefined) ? '' : String(v);
      if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
      return v;
    }).join(','));
    const csv = '﻿' + head + '\n' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    WB.toast('已导出 ' + filename + '.csv', 'success');
  };

  /* ---------- 工具：防抖 ---------- */
  WB.debounce = function (fn, ms) {
    let t; return function () { clearTimeout(t); const a = arguments, c = this; t = setTimeout(() => fn.apply(c, a), ms || 250); };
  };

  /* ---------- 通用 CRUD 列表视图（驱动全部模块） ----------
   * cfg: { store, title, desc, fields[], columns[], searchKeys[],
   *        filters:[{key,label,options[]}], rowActions:[{label,cls,onClick(row)}],
   *        exportName, defaultData(), getRows(), idKey, onChange(), onRowClick(row) }
   * ----------------------------------------------------------------- */
  WB.crudList = function (container, cfg) {
    let allRows = [];
    const state = { q: '', filters: {} };
    const idKey = cfg.idKey || (cfg.store === 'students' ? 'id' : 'uid');

    function load() {
      return (cfg.getRows ? cfg.getRows() : WB.getAll(cfg.store)).then(rows => { allRows = rows; paint(); });
    }
    function filtered() {
      return allRows.filter(r => {
        if (state.q) {
          const hit = (cfg.searchKeys || []).some(k => String(r[k] || '').toLowerCase().includes(state.q.toLowerCase()));
          if (!hit) return false;
        }
        for (const fk in state.filters) {
          const fv = state.filters[fk];
          if (fv && fv !== '__all__' && String(r[fk]) !== fv) return false;
        }
        return true;
      });
    }
    function paint() {
      container.innerHTML = WB.pageHeader(cfg.title, cfg.desc,
        '<button class="wb-btn wb-btn-primary" id="cl-add">+ 新增</button>');
      const toolbar = document.createElement('div');
      toolbar.className = 'wb-toolbar';
      let html = '<input class="wb-input wb-search-input" id="cl-search" placeholder="搜索…" value="' + WB.esc(state.q) + '">';
      (cfg.filters || []).forEach(f => {
        html += '<select class="wb-input" data-fkey="' + f.key + '">' +
          ['<option value="__all__">' + WB.esc(f.label) + '</option>']
            .concat((f.options || []).map(o => {
              const v = (o && typeof o === 'object') ? o.value : o;
              const t = (o && typeof o === 'object') ? o.label : o;
              return '<option value="' + WB.esc(v) + '"' + (state.filters[f.key] === v ? ' selected' : '') + '>' + WB.esc(t) + '</option>';
            }))
            .join('') + '</select>';
      });
      html += '<button class="wb-btn wb-btn-ghost" id="cl-export">⬇ 导出</button>';
      html += '<button class="wb-btn wb-btn-ghost" id="cl-import">⬆ 导入</button>';
      toolbar.innerHTML = html;
      container.appendChild(toolbar);

      const actions = (cfg.rowActions || []).concat([
        { label: '编辑', cls: 'wb-link', onClick: editRow },
        { label: '删除', cls: 'wb-link wb-danger', onClick: delRow }
      ]);
      const table = WB.table({ columns: cfg.columns, rows: filtered(), actions: actions, empty: '暂无数据，点击「新增」录入' });
      // 行点击联动
      if (cfg.onRowClick) {
        table.querySelectorAll('tbody tr').forEach((tr, i) => {
          tr.style.cursor = 'pointer';
          tr.onclick = () => cfg.onRowClick(filtered()[i]);
        });
      }
      container.appendChild(table);

      document.getElementById('cl-search').addEventListener('input', WB.debounce(e => { state.q = e.target.value; paint(); }, 200));
      document.getElementById('cl-add').onclick = addRow;
      document.getElementById('cl-export').onclick = exportRows;
      document.getElementById('cl-import').onclick = function () {
        WB.openImport(cfg, getFields('add'), load);
      };
      toolbar.querySelectorAll('select[data-fkey]').forEach(sel => {
        sel.onchange = () => { state.filters[sel.dataset.fkey] = sel.value; paint(); };
      });
    }
    function getFields(mode, row) { return (typeof cfg.fieldsFor === 'function') ? cfg.fieldsFor(mode, row) : cfg.fields; }
    function addRow() {
      WB.formModal({
        title: '新增 · ' + cfg.title, fields: getFields('add'), data: cfg.defaultData ? cfg.defaultData() : {},
        onSubmit: cfg.onSubmit ? (obj => Promise.resolve(cfg.onSubmit(obj))) : (obj => WB.put(cfg.store, obj)), onSaved: () => { load(); if (cfg.onChange) cfg.onChange(); }
      });
    }
    function editRow(row) {
      WB.formModal({
        title: '编辑 · ' + cfg.title, fields: getFields('edit', row), data: row,
        onSubmit: cfg.onSubmit ? (obj => Promise.resolve(cfg.onSubmit(Object.assign({}, row, obj)))) : (obj => WB.put(cfg.store, Object.assign({}, row, obj))), onSaved: () => { load(); if (cfg.onChange) cfg.onChange(); }
      });
    }
    function delRow(row) {
      WB.confirm('确定删除该条记录吗？此操作不可撤销。', () => {
        WB.del(cfg.store, row[idKey]).then(() => { WB.toast('已删除', 'success'); load(); if (cfg.onChange) cfg.onChange(); });
      });
    }
    function exportRows() {
      const rows = filtered();
      if (!rows.length) { WB.toast('无数据可导出', 'error'); return; }
      WB.exportCSV(cfg.exportName || cfg.title, cfg.columns, rows);
    }
    load();
  };

  /* ---------- 通用页面骨架 ---------- */
  WB.pageHeader = function (title, desc, actionsHTML) {
    return '<div class="wb-page-head"><div><h1>' + WB.esc(title) + '</h1>' +
      (desc ? '<p>' + WB.esc(desc) + '</p>' : '') + '</div>' +
      (actionsHTML ? '<div class="wb-page-actions">' + actionsHTML + '</div>' : '') + '</div>';
  };

  /* ---------- 通用工具栏（搜索 + 筛选 + 按钮） ---------- */
  WB.toolbar = function (inner) {
    return '<div class="wb-toolbar">' + inner + '</div>';
  };

  /* =====================================================================
   * 隐私保护 + CSV 导入（上传）
   * ===================================================================== */

  /* 隐私保护：默认脱敏手机号/邮箱/家庭所在地，可切换显示 */
  WB.privacyOn = (typeof localStorage !== 'undefined') && localStorage.getItem('wb_privacy') === '1';
  WB.togglePrivacy = function () {
    WB.privacyOn = !WB.privacyOn;
    try { localStorage.setItem('wb_privacy', WB.privacyOn ? '1' : '0'); } catch (e) {}
    WB.toast(WB.privacyOn ? '已开启隐私保护，敏感信息已脱敏' : '已关闭隐私保护，将显示完整信息', 'info');
    if (WB.rerender) WB.rerender();
  };
  WB.maskPII = function (v, type) {
    if (v === null || v === undefined || v === '') return '';
    v = String(v);
    if (type === 'phone') return v.length >= 7 ? v.slice(0, 3) + '****' + v.slice(-4) : v.slice(0, 1) + '***';
    if (type === 'email') {
      const i = v.indexOf('@');
      if (i <= 1) return '***' + (i >= 0 ? v.slice(i) : '');
      return v.slice(0, 1) + '***' + v.slice(i);
    }
    if (type === 'family') {
      const parts = v.split(/[省市区县\/]/).filter(Boolean);
      return parts.length ? parts[0] + '***' : '***';
    }
    return v;
  };

  /* CSV 解析（支持引号转义） */
  WB.csvParse = function (text) {
    const rows = [];
    let row = [], field = '', inQ = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c !== '\r') field += c;
      }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    const header = rows.shift().map(h => h.trim());
    return rows.filter(r => r.some(x => x !== '')).map(r => {
      const o = {};
      header.forEach((h, i) => o[h] = (r[i] !== undefined ? r[i] : ''));
      return o;
    });
  };

  /* 通用导入（上传 CSV）：字段映射 + 模板下载 + 批量写入 */
  WB.openImport = function (cfg, fields, onDone) {
    const body = document.createElement('div');
    body.innerHTML =
      '<p style="margin:0 0 10px;color:#8a93a6;font-size:13px">选择 CSV 文件导入。首行应为表头（字段名），与表单字段对应；学生字段填写学号即可（支持“学号 · 姓名”格式）。</p>' +
      '<input type="file" id="imp-file" accept=".csv,text/csv" class="wb-input" style="width:100%">' +
      '<div id="imp-preview" style="margin-top:10px;font-size:13px;color:#8a93a6"></div>';
    const m = WB.modal({
      title: '导入 · ' + cfg.title, width: '560px', body: body,
      actions: [
        { label: '下载模板', cls: 'wb-btn-ghost', onClick: function () {
          const header = (fields || []).map(f => f.label).join(',');
          const blob = new Blob(['﻿' + header + '\n'], { type: 'text/csv;charset=utf-8;' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (cfg.exportName || cfg.title) + '_模板.csv'; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        } },
        { label: '取消', cls: 'wb-btn-ghost', onClick: c => c() },
        { label: '确认导入', cls: 'wb-btn-primary', onClick: function (c) {
          const file = body.querySelector('#imp-file').files[0];
          if (!file) { WB.toast('请先选择 CSV 文件', 'error'); return; }
          const reader = new FileReader();
          reader.onload = function () {
            let parsed;
            try { parsed = WB.csvParse(reader.result); } catch (e) { WB.toast('解析失败：' + e, 'error'); return; }
            const labels = (fields || []).map(f => f.label);
            const names = (fields || []).map(f => f.name);
            const tasks = [];
            let okCount = 0;
            parsed.forEach(function (rowObj) {
              const obj = {};
              names.forEach(function (name, i) {
                const label = labels[i];
                let val = (rowObj[label] !== undefined && rowObj[label] !== '') ? rowObj[label] : (rowObj[name] !== undefined ? rowObj[name] : '');
                if (name === 'studentId' && val && String(val).indexOf(' · ') >= 0) val = String(val).split(' · ')[0];
                if ((fields[i].type === 'number') && val !== '') val = parseFloat(val);
                if (fields[i].type === 'checkbox') val = (val === 'true' || val === '是');
                obj[name] = val;
              });
              const has = names.some(n => obj[n] !== '' && obj[n] !== undefined && obj[n] !== null);
              if (!has) return;
              okCount++;
              tasks.push(WB.put(cfg.store, obj));
            });
            Promise.all(tasks).then(function () {
              WB.toast('成功导入 ' + okCount + ' 条记录', 'success');
              c();
              if (onDone) onDone(); else location.reload();
            }).catch(e => WB.toast('导入失败：' + e, 'error'));
          };
          reader.readAsText(file, 'utf-8');
        } }
      ]
    });
    body.querySelector('#imp-file').addEventListener('change', function (e) {
      const f = e.target.files[0];
      const prev = body.querySelector('#imp-preview');
      if (f) prev.textContent = '已选择：' + f.name + '（点击「确认导入」解析并写入）';
    });
  };

})(window);
