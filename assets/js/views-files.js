/* =====================================================================
 * views-files.js — 文件汇总（通知/制度/模板/材料/政策，可关联学生与事项）
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB;
  const CATS = ['通知', '规章制度', '申报模板', '上报材料', '政策文件'];

  WB.views.files = {
    async render(container) {
      const stus = await WB.getAll('students');
      const stuOpts = [{ value: '', label: '（不关联）' }].concat(stus.map(s => ({ value: s.id, label: s.id + ' · ' + s.name })));
      const map = Object.fromEntries(stus.map(s => [s.id, s.name]));
      WB.crudList(container, {
        store: 'files',
        title: '文件汇总',
        desc: '统一收纳工作通知、规章制度、申报模板、上报材料与政策文件，支持分类检索并关联学生/事项',
        fields: [
          { name: 'title', label: '标题', type: 'text', required: true },
          { name: 'category', label: '分类', type: 'select', options: CATS, required: true },
          { name: 'studentId', label: '关联学生', type: 'select', options: stuOpts },
          { name: 'matter', label: '关联事项', type: 'text', placeholder: '如 评奖评优 / 心理排查' },
          { name: 'date', label: '日期', type: 'date' },
          { name: 'tags', label: '标签', type: 'text', placeholder: '逗号分隔' },
          { name: 'content', label: '内容摘要', type: 'textarea', rows: 3 }
        ],
        columns: [
          { key: 'title', label: '标题', render: r => WB.esc(r.title) + (r.matter ? ' <small>· ' + WB.esc(r.matter) + '</small>' : '') },
          { label: '分类', width: '90px', render: r => WB.badge(r.category, 'info') },
          { label: '关联学生', width: '110px', render: r => r.studentId ? WB.esc(map[r.studentId] || r.studentId) : '<span class="wb-muted">—</span>' },
          { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
          { key: 'tags', label: '标签', render: r => WB.esc(r.tags || '') }
        ],
        searchKeys: ['title', 'matter', 'tags', 'content'],
        filters: [{ key: 'category', label: '全部分类', options: CATS }],
        getRows: () => WB.getAll('files').then(rows => rows.map(r => { r.studentName = map[r.studentId] || ''; return r; })),
        rowActions: [{ label: '学生档案', cls: 'wb-link wb-primary', onClick: r => { if (r.studentId) WB.openProfile(r.studentId); else WB.toast('该文件未关联学生', 'info'); } }],
        exportName: '文件汇总台账'
      });
    }
  };
})(window);
