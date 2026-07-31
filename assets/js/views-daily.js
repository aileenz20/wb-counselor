/* =====================================================================
 * views-daily.js — 日常管理（数据统计 / 心理排查 / 就业帮扶）
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB;

  const SUB_CFG = {
    stats: {
      store: 'attendance', title: '数据统计', desc: '研究生日常出勤、考勤、班会参与、异动信息、宿舍情况台账',
      types: ['出勤', '考勤', '班会参与', '异动信息', '宿舍情况'],
      statuses: ['正常', '迟到', '缺勤', '请假', '休学'],
      fields: (stuOpts) => ([
        { name: 'studentId', label: '关联学生', type: 'select', options: stuOpts, required: true },
        { name: 'type', label: '台账类型', type: 'select', options: ['出勤', '考勤', '班会参与', '异动信息', '宿舍情况'], required: true },
        { name: 'date', label: '日期', type: 'date', required: true },
        { name: 'title', label: '事项', type: 'text', required: true },
        { name: 'status', label: '状态', type: 'select', options: ['正常', '迟到', '缺勤', '请假', '休学'], required: true },
        { name: 'operator', label: '记录人', type: 'text' },
        { name: 'detail', label: '详情说明', type: 'textarea' }
      ]),
      columns: (nameOf) => ([
        { label: '学生', width: '120px', render: r => WB.esc(nameOf(r.studentId)) + ' <small>' + WB.esc(r.studentId) + '</small>' },
        { key: 'type', label: '类型', width: '90px' },
        { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
        { key: 'title', label: '事项' },
        { label: '状态', width: '80px', render: r => WB.badge(r.status, r.status === '正常' ? 'ok' : (r.status === '缺勤' || r.status === '休学' ? 'warn' : 'info')) },
        { key: 'operator', label: '记录人', width: '80px' }
      ]),
      filters: [{ key: 'type', label: '全部类型', options: ['出勤', '考勤', '班会参与', '异动信息', '宿舍情况'] }],
      searchKeys: ['studentName', 'title'],
      exportName: '日常管理-数据统计'
    },
    psych: {
      store: 'psychology', title: '心理排查', desc: '学生心理状态记录、谈心谈话、重点关注台账与随访记录',
      fields: (stuOpts) => ([
        { name: 'studentId', label: '关联学生', type: 'select', options: stuOpts, required: true },
        { name: 'date', label: '记录日期', type: 'date', required: true },
        { name: 'level', label: '心理等级', type: 'select', options: ['正常', '关注', '预警'], required: true },
        { name: 'status', label: '当前状态', type: 'select', options: ['正常', '关注', '预警'], required: true },
        { name: 'keyFocus', label: '是否重点关注', type: 'checkbox' },
        { name: 'talk', label: '谈心谈话记录', type: 'textarea', rows: 3 },
        { name: 'followUp', label: '随访记录', type: 'textarea', rows: 2 }
      ]),
      columns: (nameOf) => ([
        { label: '学生', width: '120px', render: r => WB.esc(nameOf(r.studentId)) + ' <small>' + WB.esc(r.studentId) + '</small>' },
        { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
        { label: '等级', width: '80px', render: r => WB.badge(r.level, r.level === '正常' ? 'ok' : (r.level === '关注' ? 'warn' : 'danger')) },
        { label: '重点', width: '70px', render: r => r.keyFocus ? WB.badge('重点', 'danger') : WB.badge('否', 'muted') },
        { key: 'talk', label: '谈话摘要', render: r => WB.esc((r.talk || '').slice(0, 40)) }
      ]),
      filters: [{ key: 'level', label: '全部等级', options: ['正常', '关注', '预警'] }],
      searchKeys: ['studentName', 'talk'],
      exportName: '日常管理-心理排查'
    },
    job: {
      store: 'employment', title: '就业帮扶', desc: '就业意向、求职进度、简历辅导、签约情况与未就业跟踪',
      progresses: ['准备中', '投递中', '面试中', '已签约', '未就业'],
      fields: (stuOpts) => ([
        { name: 'studentId', label: '关联学生', type: 'select', options: stuOpts, required: true },
        { name: 'intention', label: '就业意向', type: 'text', required: true, placeholder: '如 互联网·算法岗' },
        { name: 'progress', label: '求职进度', type: 'select', options: ['准备中', '投递中', '面试中', '已签约', '未就业'], required: true },
        { name: 'employed', label: '是否已就业', type: 'checkbox' },
        { name: 'company', label: '签约单位', type: 'text' },
        { name: 'position', label: '岗位', type: 'text' },
        { name: 'resumeCoach', label: '简历辅导记录', type: 'textarea', rows: 2 },
        { name: 'tracking', label: '未就业跟踪记录', type: 'textarea', rows: 2 }
      ]),
      columns: (nameOf) => ([
        { label: '学生', width: '120px', render: r => WB.esc(nameOf(r.studentId)) + ' <small>' + WB.esc(r.studentId) + '</small>' },
        { key: 'intention', label: '就业意向' },
        { label: '进度', width: '90px', render: r => WB.badge(r.progress, r.progress === '已签约' ? 'ok' : (r.progress === '未就业' ? 'danger' : 'info')) },
        { label: '就业', width: '70px', render: r => r.employed ? WB.badge('已就业', 'ok') : WB.badge('未就业', 'warn') },
        { key: 'company', label: '签约单位', render: r => WB.esc(r.company || '—') }
      ]),
      filters: [{ key: 'progress', label: '全部进度', options: ['准备中', '投递中', '面试中', '已签约', '未就业'] }],
      searchKeys: ['studentName', 'intention', 'company'],
      exportName: '日常管理-就业帮扶'
    },
    campus: {
      store: 'campus', title: '在校情况', desc: '请销假、校外居住、联合培养等在校状态台账',
      fields: (stuOpts) => ([
        { name: 'studentId', label: '关联学生', type: 'select', options: stuOpts, required: true },
        { name: 'type', label: '类型', type: 'select', options: ['请销假', '校外居住', '联合培养'], required: true },
        { name: 'date', label: '日期', type: 'date', required: true },
        { name: 'title', label: '事项', type: 'text', required: true },
        { name: 'status', label: '状态', type: 'select', options: ['待审批', '已批准', '已销假', '进行中'], required: true },
        { name: 'location', label: '地址/培养单位', type: 'text' },
        { name: 'period', label: '起止时间', type: 'text', placeholder: '如 2026-03-10 至 2026-03-13' },
        { name: 'detail', label: '说明', type: 'textarea', rows: 2 }
      ]),
      columns: (nameOf) => ([
        { label: '学生', width: '120px', render: r => WB.esc(nameOf(r.studentId)) + ' <small>' + WB.esc(r.studentId) + '</small>' },
        { label: '类型', width: '90px', render: r => WB.badge(r.type, r.type === '联合培养' ? 'info' : (r.type === '校外居住' ? 'warn' : 'muted')) },
        { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
        { key: 'title', label: '事项' },
        { label: '状态', width: '80px', render: r => WB.badge(r.status, r.status === '进行中' ? 'info' : (r.status === '已销假' ? 'ok' : 'warn')) },
        { key: 'location', label: '地址/单位', render: r => WB.esc(r.location || '—') }
      ]),
      filters: [{ key: 'type', label: '全部类型', options: ['请销假', '校外居住', '联合培养'] }],
      searchKeys: ['studentName', 'title', 'location'],
      exportName: '日常管理-在校情况'
    }
  };

  function studentOptions() {
    return WB.getAll('students').then(stus => {
      const opts = stus.map(s => s.id + ' · ' + s.name);
      const map = {};
      stus.forEach(s => map[s.id] = s.name);
      return { opts, map };
    });
  }

  WB.DAILY_SUB = SUB_CFG;

  WB.views.daily = {
    async render(container, sub) {
      const cfg = SUB_CFG[sub || 'stats'];
      if (!cfg) { container.innerHTML = '<div class="wb-empty">请选择左侧子模块</div>'; return; }
      const { opts, map } = await studentOptions();
      const nameOf = id => map[id] || id;
      WB.crudList(container, {
        store: cfg.store,
        title: '日常管理 · ' + cfg.title,
        desc: cfg.desc,
        fields: cfg.fields(opts),
        columns: cfg.columns(nameOf),
        searchKeys: cfg.searchKeys,
        filters: cfg.filters,
        getRows: () => WB.getAll(cfg.store).then(rows => rows.map(r => { r.studentName = nameOf(r.studentId); return r; })),
        rowActions: [{ label: '全景档案', cls: 'wb-link wb-primary', onClick: r => WB.openProfile(r.studentId) }],
        exportName: cfg.exportName,
        onChange: () => { if (location.hash.indexOf('#/profile/') === 0) location.reload(); }
      });
    }
  };
})(window);
