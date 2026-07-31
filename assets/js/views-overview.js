/* =====================================================================
 * views-overview.js — 总览 / 工作台首页
 * 全局概览：关键指标 · 全部模块导航（深浅不一的浅紫）· 当日事件 · 近期待办
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB || (global.WB = {});
  WB.views = WB.views || {};

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function weekday() {
    return '星期' + ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()];
  }
  function greet() {
    const h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 11) return '早上好';
    if (h < 13) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  /* 浅紫色谱：同一紫色系、深浅不一，按模块循环使用 */
  const PALETTE = [
    { a: '#8b5cf6', s: '#f3e8ff' },
    { a: '#a855f7', s: '#f6e9ff' },
    { a: '#7c3aed', s: '#efe7ff' },
    { a: '#9333ea', s: '#f6edff' },
    { a: '#6d28d9', s: '#ece6fb' },
    { a: '#c084fc', s: '#f7e9ff' },
    { a: '#a78bfa', s: '#f1ecff' },
    { a: '#d946ef', s: '#fbe9ff' }
  ];

  /* 全部模块（与 NAV 一致，日常管理拆为 4 个子模块单独展示） */
  const MODULES = [
    { label: '学生信息', icon: '🎓', hash: '#/students', store: 'students', desc: '核心基础数据库 · 全体研究生档案' },
    { label: '日常管理·数据统计', icon: '📈', hash: '#/daily/stats', store: 'attendance', desc: '出勤考勤·班会·异动·宿舍台账' },
    { label: '日常管理·心理排查', icon: '🧠', hash: '#/daily/psych', store: 'psychology', desc: '心理状态·谈心谈话·重点关注随访' },
    { label: '日常管理·就业帮扶', icon: '💼', hash: '#/daily/job', store: 'employment', desc: '就业意向·求职进度·签约跟踪' },
    { label: '日常管理·在校情况', icon: '🏫', hash: '#/daily/campus', store: 'campus', desc: '请销假·校外居住·联合培养' },
    { label: '评奖评优', icon: '🏆', hash: '#/awards', store: 'publications', desc: '量化积分体系 · 奖项评定' },
    { label: '党员信息', icon: '🚩', hash: '#/party', store: 'party', desc: '全链条入党流程·相关活动·外部链接' },
    { label: '文件汇总', icon: '📁', hash: '#/files', store: 'files', desc: '通知·制度·模板·材料·政策' },
    { label: '年度考核', icon: '📝', hash: '#/assessment', store: 'assessment', desc: '九大职责台账 · 述职考核' },
    { label: '自我提升', icon: '🌱', hash: '#/self', store: 'selfItems', desc: '培训·学习·课题·论文' },
    { label: '工作辅助', icon: '🛠️', hash: '#/assistant', store: '_assistant', desc: '通知·模板·日程·待办·报表' }
  ];

  WB.views.overview = {
    render: async function (container) {
      container.innerHTML = '<div class="wb-loading">正在汇总工作台数据…</div>';

      const [
        students, attendance, psychology, employment, campus, party,
        files, assessment, selfItems, publications, todos, schedule, notices, templates
      ] = await Promise.all([
        WB.getAll('students'), WB.getAll('attendance'), WB.getAll('psychology'), WB.getAll('employment'),
        WB.getAll('campus'), WB.getAll('party'), WB.getAll('files'), WB.getAll('assessment'),
        WB.getAll('selfItems'), WB.getAll('publications'), WB.getAll('todos'), WB.getAll('schedule'),
        WB.getAll('notices'), WB.getAll('templates')
      ]);

      const today = todayStr();
      const inSchool = students.filter(s => s.status === '在读').length;

      /* —— 当日事件 —— */
      const events = [];
      function pushEv(title, meta, type, tag) { if (title) events.push({ title: title, meta: meta || '', type: type, tag: tag }); }
      campus.forEach(c => { if (c.date === today) pushEv(c.title || c.type, (c.type || '') + (c.location ? ' · ' + c.location : ''), 0, '在校情况'); });
      attendance.forEach(c => { if (c.date === today) pushEv(c.title || c.type, (c.type || '') + (c.status ? ' · ' + c.status : ''), 1, '日常管理'); });
      psychology.forEach(c => { if (c.date === today) pushEv(c.talk || '心理谈话', (c.level || '') + (c.status ? ' · ' + c.status : ''), 2, '心理排查'); });
      party.forEach(c => { if (c.date === today) pushEv(c.activity || c.stage, (c.stage || '') + (c.detail ? ' · ' + c.detail : ''), 6, '党员信息'); });
      notices.forEach(c => { if (c.date === today) pushEv(c.title, '通知 · ' + (c.channel || ''), 3, '文件汇总'); });
      schedule.forEach(c => { if (c.date === today) pushEv(c.title, '日程 · ' + (c.time || ''), 4, '工作辅助'); });

      /* —— 近期待办 & 日程 —— */
      const openTodos = todos.filter(t => !t.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).slice(0, 5);
      const upSched = schedule.filter(s => !s.done && s.date && s.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

      /* —— 党员发展进行中（按学生去重，未到「转为正式党员」） —— */
      const ongoingParty = {};
      party.forEach(p => { if (p.stage !== '转为正式党员') ongoingParty[p.studentId] = p.stage; });

      const psychFocus = psychology.filter(p => p.keyFocus).length;
      const assistantCount = notices.length + templates.length + schedule.length + todos.length;

      const countMap = {
        students: students.length, attendance: attendance.length, psychology: psychology.length,
        employment: employment.length, campus: campus.length, publications: publications.length,
        party: party.length, files: files.length, assessment: assessment.length,
        selfItems: selfItems.length, _assistant: assistantCount
      };

      /* —— 关键指标卡 —— */
      const stats = [
        { num: inSchool, label: '在校生人数', sub: '学籍状态：在读', icon: '🎓', accent: PALETTE[0] },
        { num: students.length, label: '在库学生', sub: '全部档案总数', icon: '📚', accent: PALETTE[2] },
        { num: events.length, label: '当日事件', sub: '今日新增 / 待办', icon: '📅', accent: PALETTE[3] },
        { num: psychFocus, label: '心理重点关注', sub: '需持续随访', icon: '🧠', accent: PALETTE[1] },
        { num: Object.keys(ongoingParty).length, label: '党员发展进行中', sub: '含积极分子 / 发展对象', icon: '🚩', accent: PALETTE[5] },
        { num: openTodos.length, label: '待办未完成', sub: '工作辅助待办', icon: '📌', accent: PALETTE[6] }
      ];
      const statsHtml = stats.map(s =>
        '<div class="ov-stat" style="--accent:' + s.accent.a + '">' +
          '<div class="ov-stat-ico">' + s.icon + '</div>' +
          '<div><div class="ov-stat-num">' + s.num + '</div>' +
          '<div class="ov-stat-label">' + s.label + '</div>' +
          '<div class="ov-stat-sub">' + s.sub + '</div></div>' +
        '</div>'
      ).join('');

      /* —— 模块导航卡 —— */
      const modsHtml = MODULES.map((m, i) => {
        const c = PALETTE[i % PALETTE.length];
        const n = countMap[m.store];
        return '<div class="ov-mod" data-hash="' + m.hash + '" style="--accent:' + c.a + ';--accent-soft:' + c.s + '">' +
          '<div class="ov-mod-top">' +
            '<div class="ov-mod-ico">' + m.icon + '</div>' +
            '<div class="ov-mod-name">' + WB.esc(m.label) + '</div>' +
          '</div>' +
          '<div class="ov-mod-desc">' + WB.esc(m.desc) + '</div>' +
          '<div class="ov-mod-count">' + (n !== undefined ? n : 0) + ' 条</div>' +
        '</div>';
      }).join('');

      /* —— 当日事件列表 —— */
      const eventsHtml = events.length ? events.map(e => {
        const c = PALETTE[e.type % PALETTE.length];
        return '<div class="ov-event" style="--accent:' + c.a + ';--accent-soft:' + c.s + '">' +
          '<div class="ov-event-dot"></div>' +
          '<div class="ov-event-body">' +
            '<div class="ov-event-title">' + WB.esc(e.title) + '<span class="ov-event-tag">' + WB.esc(e.tag) + '</span></div>' +
            (e.meta ? '<div class="ov-event-meta">' + WB.esc(e.meta) + '</div>' : '') +
          '</div></div>';
      }).join('') : '<div class="ov-empty">📭 今日暂无事件安排，一切平稳～</div>';

      /* —— 近期待办 / 日程 —— */
      const todoHtml = openTodos.length ? openTodos.map(t =>
        '<div class="ov-item"><div class="ov-item-ico">📌</div><div class="ov-item-body">' +
          '<div class="ov-item-title">' + WB.esc(t.title) +
          (t.due ? '<span class="ov-tag-due">截止 ' + WB.esc(t.due) + '</span>' : '') + '</div>' +
          (t.note ? '<div class="ov-item-meta">' + WB.esc(t.note) + '</div>' : '') +
        '</div></div>'
      ).join('') : '<div class="ov-empty">✅ 暂无未完成待办</div>';

      const schedHtml = upSched.length ? upSched.map(s =>
        '<div class="ov-item"><div class="ov-item-ico">📅</div><div class="ov-item-body">' +
          '<div class="ov-item-title">' + WB.esc(s.title) +
          '<span class="ov-tag-due">' + WB.esc(s.date) + (s.time ? ' ' + WB.esc(s.time) : '') + '</span></div>' +
          (s.note ? '<div class="ov-item-meta">' + WB.esc(s.note) + '</div>' : '') +
        '</div></div>'
      ).join('') : '<div class="ov-empty">🗓️ 近期暂无日程安排</div>';

      container.innerHTML =
        '<div class="ov-hero">' +
          '<div><h1>' + greet() + '，辅导员 👋</h1>' +
          '<p>研究生辅导员一体化工作台 · 一图掌握全部模块与当日动态</p></div>' +
          '<div class="ov-hero-date"><b>' + today + '</b>' + weekday() + '</div>' +
        '</div>' +
        '<div class="ov-stats">' + statsHtml + '</div>' +
        '<div class="ov-section-title">🧭 全部模块 <small>点击任意卡片进入对应工作台</small></div>' +
        '<div class="ov-modules">' + modsHtml + '</div>' +
        '<div class="ov-section-title">⏰ 当日与近期 <small>事件 · 待办 · 日程</small></div>' +
        '<div class="ov-cols">' +
          '<div class="ov-panel"><div class="ov-section-title" style="margin:0 0 10px">📅 当日事件</div>' + eventsHtml + '</div>' +
          '<div class="ov-panel"><div class="ov-section-title" style="margin:0 0 10px">📌 未完成待办</div>' + todoHtml +
            '<div class="ov-section-title" style="margin:14px 0 10px">🗓️ 近期日程</div>' + schedHtml + '</div>' +
        '</div>';

      container.querySelectorAll('[data-hash]').forEach(el => {
        el.onclick = () => { location.hash = el.dataset.hash; };
      });
    }
  };
})(window);
