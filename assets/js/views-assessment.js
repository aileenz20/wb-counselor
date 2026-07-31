/* =====================================================================
 * views-assessment.js — 年度考核（辅导员九大工作职责台账）
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB;

  WB.views.assessment = {
    async render(container) {
      const stus = await WB.getAll('students');
      const stuOpts = [{ value: '', label: '（不关联）' }].concat(stus.map(s => ({ value: s.id, label: s.id + ' · ' + s.name })));
      const map = Object.fromEntries(stus.map(s => [s.id, s.name]));
      // 九大职责进度概览
      const items = await WB.getAll('assessment');
      const byDuty = {};
      WB.DUTIES.forEach(d => byDuty[d] = 0);
      items.forEach(it => { if (byDuty[it.duty] !== undefined) byDuty[it.duty]++; });

      const overview = document.createElement('div');
      overview.className = 'wb-duty-grid';
      overview.innerHTML = WB.DUTIES.map(d =>
        '<div class="wb-duty-cell"><span class="wb-duty-name">' + WB.esc(d) + '</span><span class="wb-duty-count">' + (byDuty[d] || 0) + ' 项</span></div>'
      ).join('');
      const ovHead = document.createElement('div');
      ovHead.className = 'wb-sub-head';
      ovHead.innerHTML = '<h2>九大工作职责台账概览</h2><small>点击左侧模块「年度考核」归集材料，一键支撑述职与考核</small>';
      container.innerHTML = WB.pageHeader('年度考核', '按辅导员九大工作职责分类归集工作资料，支持材料整理与年度述职考核一键汇总', '');
      container.appendChild(ovHead);
      container.appendChild(overview);

      const sub = document.createElement('div');
      sub.style.marginTop = '20px';
      container.appendChild(sub);
      const subHead = document.createElement('div');
      subHead.className = 'wb-sub-head';
      subHead.innerHTML = '<h2>考核材料台账</h2>';
      sub.appendChild(subHead);

      WB.crudList(sub, {
        store: 'assessment',
        title: '考核材料',
        desc: '',
        fields: [
          { name: 'year', label: '年度', type: 'text', required: true, placeholder: '2025' },
          { name: 'duty', label: '职责分类', type: 'select', options: WB.DUTIES, required: true },
          { name: 'title', label: '工作事项', type: 'text', required: true },
          { name: 'content', label: '内容说明', type: 'textarea', rows: 3 },
          { name: 'material', label: '支撑材料', type: 'textarea', rows: 2, placeholder: '如 签到表、照片、新闻稿' },
          { name: 'studentId', label: '关联学生', type: 'select', options: stuOpts }
        ],
        columns: [
          { key: 'year', label: '年度', width: '70px' },
          { label: '职责', width: '150px', render: r => WB.badge(r.duty, 'info') },
          { key: 'title', label: '事项' },
          { key: 'material', label: '支撑材料', render: r => WB.esc((r.material || '').slice(0, 30)) },
          { label: '关联学生', width: '100px', render: r => r.studentId ? WB.esc(map[r.studentId] || r.studentId) : '<span class="wb-muted">—</span>' }
        ],
        searchKeys: ['year', 'duty', 'title', 'content'],
        filters: [{ key: 'duty', label: '全部职责', options: WB.DUTIES }],
        getRows: () => WB.getAll('assessment').then(rows => rows.map(r => { r.studentName = map[r.studentId] || ''; return r; })),
        rowActions: [{ label: '学生档案', cls: 'wb-link wb-primary', onClick: r => { if (r.studentId) WB.openProfile(r.studentId); } }],
        exportName: '年度考核台账'
      });
    }
  };
})(window);
