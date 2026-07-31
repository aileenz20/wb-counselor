/* =====================================================================
 * views-self.js — 自我提升（培训/学习/课题/论文台账）
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB;
  const TYPES = ['培训记录', '学习资料', '工作心得', '课题申报', '论文撰写'];

  WB.views.self = {
    render(container) {
      WB.crudList(container, {
        store: 'selfItems',
        title: '自我提升',
        desc: '存放培训记录、学习资料、工作心得、课题申报与论文撰写等能力提升台账',
        fields: [
          { name: 'type', label: '类型', type: 'select', options: TYPES, required: true },
          { name: 'title', label: '标题', type: 'text', required: true },
          { name: 'date', label: '日期', type: 'date' },
          { name: 'tags', label: '标签', type: 'text', placeholder: '逗号分隔' },
          { name: 'content', label: '内容', type: 'textarea', rows: 3 }
        ],
        columns: [
          { label: '类型', width: '90px', render: r => WB.badge(r.type, 'info') },
          { key: 'title', label: '标题' },
          { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
          { key: 'tags', label: '标签', render: r => WB.esc(r.tags || '') }
        ],
        searchKeys: ['type', 'title', 'tags', 'content'],
        filters: [{ key: 'type', label: '全部类型', options: TYPES }],
        exportName: '自我提升台账'
      });
    }
  };
})(window);
