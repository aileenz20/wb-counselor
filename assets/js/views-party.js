/* =====================================================================
 * views-party.js — 党员信息（全链条入党流程 + 相关活动 + 外部链接）
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB;
  const STAGES = ['提交入党申请书', '确定为入党积极分子', '确定为发展对象', '接收为预备党员', '转为正式党员'];

  WB.views.party = {
    async render(container) {
      const stus = await WB.getAll('students');
      const stuOpts = stus.map(s => s.id + ' · ' + s.name);
      const map = Object.fromEntries(stus.map(s => [s.id, s.name]));
      const items = await WB.getAll('party');

      // 各阶段分布概览
      const byStage = {};
      STAGES.forEach(s => byStage[s] = 0);
      const byStudent = {};
      items.forEach(it => {
        if (byStage[it.stage] !== undefined) byStage[it.stage]++;
        byStudent[it.studentId] = Math.max(byStudent[it.studentId] || 0, STAGES.indexOf(it.stage) + 1);
      });

      container.innerHTML = WB.pageHeader('党员信息',
        '全链条记录学生入党流程（申请书→积极分子→发展对象→预备党员→正式党员）及相关活动，支持后续关联外部系统网址', '');

      const ov = document.createElement('div');
      ov.className = 'wb-duty-grid';
      ov.innerHTML = STAGES.map((s, i) =>
        '<div class="wb-duty-cell"><span class="wb-duty-name">' + (i + 1) + '. ' + WB.esc(s) + '</span><span class="wb-duty-count">' + (byStage[s] || 0) + ' 人</span></div>'
      ).join('');
      const ovHead = document.createElement('div');
      ovHead.className = 'wb-sub-head';
      ovHead.innerHTML = '<h2>入党流程各阶段分布</h2><small>累计记录 ' + items.length + ' 条，覆盖 ' + Object.keys(byStudent).length + ' 名学生</small>';
      container.appendChild(ovHead);
      container.appendChild(ov);

      const sub = document.createElement('div');
      sub.style.marginTop = '20px';
      container.appendChild(sub);
      const subHead = document.createElement('div');
      subHead.className = 'wb-sub-head';
      subHead.innerHTML = '<h2>党员发展台账</h2>';
      sub.appendChild(subHead);

      WB.crudList(sub, {
        store: 'party',
        title: '党员发展记录',
        desc: '',
        fields: [
          { name: 'studentId', label: '关联学生', type: 'select', options: stuOpts, required: true },
          { name: 'stage', label: '入党阶段', type: 'select', options: STAGES, required: true },
          { name: 'date', label: '日期', type: 'date', required: true },
          { name: 'activity', label: '相关活动/培训', type: 'text', placeholder: '如 党课初级班、组织生活会' },
          { name: 'detail', label: '说明', type: 'textarea', rows: 2 },
          { name: 'links', label: '外部链接', type: 'textarea', rows: 2, placeholder: '每行一个网址，如 https://...' }
        ],
        columns: [
          { label: '学生', width: '120px', render: r => WB.esc(map[r.studentId] || r.studentId) },
          { label: '阶段', width: '150px', render: r => WB.badge(r.stage, r.stage === '转为正式党员' ? 'ok' : 'info') },
          { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
          { key: 'activity', label: '相关活动' },
          { label: '外部链接', width: '120px', render: r => renderLinks(r.links) }
        ],
        searchKeys: ['studentName', 'stage', 'activity', 'links'],
        filters: [{ key: 'stage', label: '全部阶段', options: STAGES }],
        getRows: () => WB.getAll('party').then(rows => rows.map(r => { r.studentName = map[r.studentId] || ''; return r; })),
        rowActions: [{ label: '全景档案', cls: 'wb-link wb-primary', onClick: r => WB.openProfile(r.studentId) }],
        exportName: '党员信息台账'
      });
    }
  };

  function renderLinks(links) {
    if (!links) return '<span class="wb-muted">—</span>';
    const arr = String(links).split(/\n/).map(s => s.trim()).filter(Boolean);
    if (!arr.length) return '<span class="wb-muted">—</span>';
    return arr.map(u => '<a href="' + WB.esc(u) + '" target="_blank" rel="noopener" style="margin-right:6px">🔗 链接</a>').join('');
  }
  WB.renderLinks = renderLinks; // 供全景档案复用
})(window);
