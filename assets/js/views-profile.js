/* =====================================================================
 * views-profile.js — 学生一键全景档案（核心联动）
 * 点击任意学生 → 自动聚合：学籍 / 日常管理 / 心理 / 就业 /
 *               活动 / 学术 / 获奖 / 积分明细，形成完整电子成长档案
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB;

  const TABS = [
    { key: 'base', label: '学籍信息' },
    { key: 'daily', label: '日常管理' },
    { key: 'growth', label: '成长记录' },
    { key: 'awards', label: '评奖评优' },
    { key: 'party', label: '党员发展' },
    { key: 'points', label: '积分明细' }
  ];
  const PARTY_STAGES = ['提交入党申请书', '确定为入党积极分子', '确定为发展对象', '接收为预备党员', '转为正式党员'];
  function partyIdx(s) { return PARTY_STAGES.indexOf(s); }

  /* 从全景档案内直接新增某类记录，保存后刷新档案（数据同步自动更新） */
  function addRecord(container, id, sub, student) {
    const cfg = WB.DAILY_SUB[sub];
    const opts = [student.id + ' · ' + student.name];
    const fields = cfg.fields(opts).map(f => f.name === 'studentId' ? Object.assign({}, f, { readonly: true }) : f);
    WB.formModal({
      title: '新增 · ' + cfg.title + '（' + student.name + '）',
      fields: fields,
      data: { studentId: student.id },
      onSubmit: obj => WB.put(cfg.store, obj),
      onSaved: () => WB.views.profile.render(container, id)
    });
  }

  function miniTable(columns, rows, empty) {
    return WB.table({ columns: columns, rows: rows, empty: empty || '暂无记录' });
  }

  WB.views.profile = {
    async render(container, id) {
      const p = await WB.studentProfile(id);
      if (!p.student) { container.innerHTML = '<div class="wb-empty">未找到该学生档案</div>'; return; }
      const s = p.student;

      container.innerHTML =
        '<div class="wb-crumb"><a href="#/students">← 返回学生列表</a></div>' +
        '<div class="wb-profile-head">' +
        '<div class="wb-avatar lg" style="background:' + (s.avatarColor || '#4f6ef7') + '">' + WB.esc((s.name || '?').slice(0, 1)) + '</div>' +
        '<div class="wb-profile-meta">' +
        '<div class="wb-profile-name">' + WB.esc(s.name) + ' <small>' + WB.esc(s.id) + '</small> ' + WB.badge(s.status, s.status === '在读' ? 'ok' : 'warn') + '</div>' +
        '<div class="wb-profile-sub">' + WB.esc(s.major) + ' · 导师 ' + WB.esc(s.tutor) + ' · ' + WB.esc(s.grade || '') + ' · 学制 ' + WB.esc(s.length || '') + '</div>' +
        '<div class="wb-profile-tags">' +
        (s.direction ? WB.badge('方向 ' + s.direction, 'info') : '') +
        (s.dorm ? WB.badge('宿舍 ' + s.dorm, 'muted') : '') +
        WB.badge('总积分 ' + p.points.total, 'primary') +
        '</div></div>' +
        '<div class="wb-profile-actions">' +
        '<button class="wb-btn wb-btn-primary" id="pf-edit">编辑学籍</button>' +
        '<button class="wb-btn wb-btn-ghost" id="pf-awards">去评优</button>' +
        '</div></div>';

      const tabBar = document.createElement('div');
      tabBar.className = 'wb-tabs';
      tabBar.innerHTML = TABS.map((t, i) => '<button class="wb-tab' + (i === 0 ? ' active' : '') + '" data-key="' + t.key + '">' + t.label + '</button>').join('');
      container.appendChild(tabBar);
      const body = document.createElement('div');
      body.className = 'wb-tab-body';
      container.appendChild(body);

      // 按钮事件
      container.querySelector('#pf-edit').onclick = () => WB.formModal({
        title: '编辑学籍 · ' + s.name,
        fieldsFor: undefined,
        fields: [
          { name: 'id', label: '学号', type: 'text', readonly: true },
          { name: 'name', label: '姓名', type: 'text', required: true },
          { name: 'gender', label: '性别', type: 'select', options: ['男', '女'] },
          { name: 'major', label: '专业', type: 'text', required: true },
          { name: 'tutor', label: '导师', type: 'text', required: true },
          { name: 'grade', label: '年级', type: 'text' },
          { name: 'direction', label: '研究方向', type: 'text' },
          { name: 'length', label: '学制', type: 'select', options: ['2年', '3年', '4年'] },
          { name: 'phone', label: '联系方式', type: 'text' },
          { name: 'email', label: '邮箱', type: 'text' },
          { name: 'enrollDate', label: '入学日期', type: 'date' },
          { name: 'dorm', label: '宿舍', type: 'text' },
          { name: 'politicalStatus', label: '政治面貌', type: 'select', options: ['中共党员', '中共预备党员', '共青团员', '群众', '民主党派'] },
          { name: 'workstation', label: '工位位置', type: 'text', placeholder: '如 实验室 305 / 工位 A-12' },
          { name: 'roommate', label: '寝室室友', type: 'text', placeholder: '同寝室同学姓名，多人用逗号分隔' },
          { name: 'familyLocation', label: '家庭所在地', type: 'text', placeholder: '省/市，如 山东济南' },
          { name: 'status', label: '学籍状态', type: 'select', options: ['在读', '休学', '退学', '毕业'] },
          { name: 'avatarColor', label: '头像色', type: 'text' }
        ],
        data: s,
        onSubmit: obj => WB.put('students', Object.assign({}, s, obj)),
        onSaved: () => WB.views.profile.render(container, id)
      });
      container.querySelector('#pf-awards').onclick = () => location.hash = '#/awards';

      function show(key) {
        body.innerHTML = '';
        if (key === 'base') showBase(body, s);
        else if (key === 'daily') showDaily(body, p, id, s, container);
        else if (key === 'growth') showGrowth(body, p);
        else if (key === 'awards') showAwards(body, p, id);
        else if (key === 'party') showParty(body, p, id);
        else if (key === 'points') showPoints(body, p, id);
      }

      tabBar.querySelectorAll('.wb-tab').forEach(btn => {
        btn.onclick = () => {
          tabBar.querySelectorAll('.wb-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          show(btn.dataset.key);
        };
      });
      show('base');
    }
  };

  function section(title, extra, node, container) {
    const wrap = document.createElement('div');
    wrap.className = 'wb-profile-section';
    const head = document.createElement('div');
    head.className = 'wb-section-head';
    head.innerHTML = '<h3>' + WB.esc(title) + '</h3>' + (extra || '');
    wrap.appendChild(head);
    wrap.appendChild(node);
    (container || document.body).appendChild ? container.appendChild(wrap) : null;
    return wrap;
  }

  function showBase(body, s) {
    const phone = WB.privacyOn ? (WB.maskPII(s.phone, 'phone') || '—') : WB.esc(s.phone || '—');
    const email = WB.privacyOn ? (WB.maskPII(s.email, 'email') || '—') : WB.esc(s.email || '—');
    const family = WB.privacyOn ? (WB.maskPII(s.familyLocation, 'family') || '—') : WB.esc(s.familyLocation || '—');
    const grid = document.createElement('div');
    grid.className = 'wb-info-grid';
    const items = [
      ['学号', s.id], ['姓名', s.name], ['性别', s.gender], ['政治面貌', s.politicalStatus || '—'],
      ['专业', s.major], ['导师', s.tutor], ['年级', s.grade], ['研究方向', s.direction],
      ['学制', s.length], ['联系方式', phone], ['邮箱', email], ['入学日期', WB.fmtDate(s.enrollDate)],
      ['宿舍', s.dorm || '—'], ['工位位置', s.workstation || '—'], ['寝室室友', s.roommate || '—'],
      ['家庭所在地', family], ['学籍状态', s.status], ['头像色', s.avatarColor || '—']
    ];
    grid.innerHTML = items.map(it => '<div class="wb-info-cell"><span>' + WB.esc(it[0]) + '</span><b>' + WB.esc(it[1]) + '</b></div>').join('');
    const card = document.createElement('div');
    card.className = 'wb-card';
    card.appendChild(grid);
    body.appendChild(card);
  }

  function showDaily(body, p, id, s, container) {
    // 数据统计
    const statsCard = document.createElement('div'); statsCard.className = 'wb-card';
    const statsHead = document.createElement('div'); statsHead.className = 'wb-section-head';
    statsHead.innerHTML = '<h3>数据统计（出勤/考勤/班会/异动/宿舍）</h3><button class="wb-btn wb-btn-ghost wb-sm" data-add="stats">+ 新增</button>';
    statsCard.appendChild(statsHead);
    statsCard.appendChild(miniTable([
      { key: 'type', label: '类型', width: '100px' },
      { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
      { key: 'title', label: '事项' },
      { label: '状态', width: '80px', render: r => WB.badge(r.status, r.status === '正常' ? 'ok' : 'warn') }
    ], p.attendance, '暂无考勤记录'));
    body.appendChild(statsCard);

    // 心理排查
    const psychCard = document.createElement('div'); psychCard.className = 'wb-card';
    const psychHead = document.createElement('div'); psychHead.className = 'wb-section-head';
    psychHead.innerHTML = '<h3>心理排查（状态/谈话/关注/随访）</h3><button class="wb-btn wb-btn-ghost wb-sm" data-add="psych">+ 新增</button>';
    psychCard.appendChild(psychHead);
    psychCard.appendChild(miniTable([
      { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
      { label: '等级', width: '80px', render: r => WB.badge(r.level, r.level === '正常' ? 'ok' : (r.level === '关注' ? 'warn' : 'danger')) },
      { label: '重点', width: '70px', render: r => r.keyFocus ? WB.badge('重点', 'danger') : WB.badge('否', 'muted') },
      { key: 'talk', label: '谈话摘要', render: r => WB.esc((r.talk || '').slice(0, 30)) }
    ], p.psychology, '暂无心理记录'));
    body.appendChild(psychCard);

    // 就业帮扶
    const jobCard = document.createElement('div'); jobCard.className = 'wb-card';
    const jobHead = document.createElement('div'); jobHead.className = 'wb-section-head';
    jobHead.innerHTML = '<h3>就业帮扶（意向/进度/签约/跟踪）</h3><button class="wb-btn wb-btn-ghost wb-sm" data-add="job">+ 新增</button>';
    jobCard.appendChild(jobHead);
    jobCard.appendChild(miniTable([
      { key: 'intention', label: '就业意向' },
      { label: '进度', width: '90px', render: r => WB.badge(r.progress, r.progress === '已签约' ? 'ok' : 'info') },
      { label: '就业', width: '70px', render: r => r.employed ? WB.badge('已就业', 'ok') : WB.badge('未就业', 'warn') },
      { key: 'company', label: '签约单位', render: r => WB.esc(r.company || '—') }
    ], p.employment, '暂无就业记录'));
    body.appendChild(jobCard);

    // 在校情况（请销假 / 校外居住 / 联合培养）
    const campusCard = document.createElement('div'); campusCard.className = 'wb-card';
    const campusHead = document.createElement('div'); campusHead.className = 'wb-section-head';
    campusHead.innerHTML = '<h3>在校情况（请销假 / 校外居住 / 联合培养）</h3><button class="wb-btn wb-btn-ghost wb-sm" data-add="campus">+ 新增</button>';
    campusCard.appendChild(campusHead);
    campusCard.appendChild(miniTable([
      { label: '类型', width: '100px', render: r => WB.badge(r.type, r.type === '请销假' ? 'warn' : (r.type === '校外居住' ? 'info' : 'muted')) },
      { key: 'title', label: '事项' },
      { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
      { label: '状态', width: '90px', render: r => WB.badge(r.status, r.status === '已销假' || r.status === '已批准' || r.status === '进行中' ? 'ok' : 'warn') },
      { key: 'location', label: '地点', width: '160px' },
      { key: 'period', label: '时间区间', width: '160px' }
    ], p.campus, '暂无在校情况记录'));
    body.appendChild(campusCard);

    body.querySelectorAll('button[data-add]').forEach(b => b.onclick = () => addRecord(container, id, b.dataset.add, s));
  }

  function showGrowth(body, p) {
    const actCard = document.createElement('div'); actCard.className = 'wb-card';
    const actHead = document.createElement('div'); actHead.className = 'wb-section-head';
    actHead.innerHTML = '<h3>活动参与（' + p.activities.length + '）</h3>';
    actCard.appendChild(actHead);
    actCard.appendChild(miniTable([
      { key: 'name', label: '活动' },
      { key: 'category', label: '类别', width: '100px', render: r => WB.badge(r.category, 'info') },
      { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
      { label: '积分', width: '70px', render: r => '<b>' + (r.points || 0) + '</b>' }
    ], p.activities, '暂无活动记录'));
    body.appendChild(actCard);

    const pubCard = document.createElement('div'); pubCard.className = 'wb-card';
    const pubHead = document.createElement('div'); pubHead.className = 'wb-section-head';
    pubHead.innerHTML = '<h3>学术成果（' + p.publications.length + '）</h3>';
    pubCard.appendChild(pubHead);
    pubCard.appendChild(miniTable([
      { key: 'title', label: '题目' },
      { key: 'venue', label: '期刊/会议', width: '160px' },
      { label: '级别', width: '120px', render: r => WB.badge(r.level, 'info') },
      { label: '积分', width: '70px', render: r => '<b>' + (r.points || 0) + '</b>' }
    ], p.publications, '暂无学术成果'));
    body.appendChild(pubCard);

    const compCard = document.createElement('div'); compCard.className = 'wb-card';
    const compHead = document.createElement('div'); compHead.className = 'wb-section-head';
    compHead.innerHTML = '<h3>竞赛成果（' + p.competitions.length + '）</h3>';
    compCard.appendChild(compHead);
    compCard.appendChild(miniTable([
      { key: 'name', label: '竞赛' },
      { label: '奖项', width: '140px', render: r => WB.badge(r.award, 'info') },
      { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
      { label: '积分', width: '70px', render: r => '<b>' + (r.points || 0) + '</b>' }
    ], p.competitions, '暂无竞赛记录'));
    body.appendChild(compCard);
  }

  function showAwards(body, p, id) {
    const card = document.createElement('div'); card.className = 'wb-card';
    const head = document.createElement('div'); head.className = 'wb-section-head';
    head.innerHTML = '<h3>评奖评优（' + p.awards.length + '）</h3><button class="wb-btn wb-btn-ghost wb-sm" id="pf-go-awards">去评优模块</button>';
    card.appendChild(head);
    card.appendChild(miniTable([
      { key: 'name', label: '奖项' },
      { key: 'type', label: '类型', width: '100px' },
      { key: 'year', label: '年度', width: '70px' },
      { label: '结果', width: '90px', render: r => WB.badge(r.result, r.result === '已获' ? 'ok' : 'info') },
      { label: '积分', width: '70px', render: r => '<b>' + (r.points || 0) + '</b>' }
    ], p.awards, '暂无评优记录'));
    body.appendChild(card);
    card.querySelector('#pf-go-awards').onclick = () => location.hash = '#/awards';
  }

  function showParty(body, p, id) {
    const party = p.party || [];
    // 入党流程进度（按 5 个阶段定位该生当前所处环节）
    const reached = PARTY_STAGES.map(function (st) {
      const rec = party.filter(r => r.stage === st).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
      return { stage: st, rec: rec, done: !!rec };
    });

    const tl = document.createElement('div'); tl.className = 'wb-card';
    const tlHead = document.createElement('div'); tlHead.className = 'wb-section-head';
    tlHead.innerHTML = '<h3>入党流程进度</h3><button class="wb-btn wb-btn-ghost wb-sm" id="pf-add-party">+ 新增</button>';
    tl.appendChild(tlHead);
    const tlBody = document.createElement('div'); tlBody.className = 'wb-party-timeline';
    tlBody.innerHTML = reached.map(function (s, i) {
      return '<div class="wb-party-step ' + (s.done ? 'done' : 'todo') + '">' +
        '<div class="wb-party-dot">' + (s.done ? '✓' : (i + 1)) + '</div>' +
        '<div class="wb-party-label">' + WB.esc(s.stage) +
        (s.rec ? ' <small>' + WB.fmtDate(s.rec.date) + '</small>' : '<small>未开始</small>') + '</div></div>';
    }).join('');
    tl.appendChild(tlBody);
    body.appendChild(tl);

    // 党员发展记录明细
    const card = document.createElement('div'); card.className = 'wb-card';
    const head = document.createElement('div'); head.className = 'wb-section-head';
    head.innerHTML = '<h3>党员发展记录（' + party.length + '）</h3><button class="wb-btn wb-btn-ghost wb-sm" id="pf-go-party">去党员模块</button>';
    card.appendChild(head);
    card.appendChild(miniTable([
      { label: '阶段', width: '150px', render: r => WB.badge(r.stage, r.stage === '转为正式党员' ? 'ok' : 'info') },
      { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
      { key: 'activity', label: '相关活动' },
      { key: 'detail', label: '说明', render: r => WB.esc((r.detail || '').slice(0, 40)) },
      { label: '外部链接', width: '120px', render: r => WB.renderLinks(r.links) }
    ], party, '暂无党员发展记录'));
    body.appendChild(card);
    card.querySelector('#pf-go-party').onclick = () => location.hash = '#/party';

    tl.querySelector('#pf-add-party').onclick = () => WB.formModal({
      title: '新增党员发展记录 · ' + (p.student.name || id),
      fields: [
        { name: 'studentId', label: '学号', type: 'text', readonly: true },
        { name: 'stage', label: '入党阶段', type: 'select', options: PARTY_STAGES, required: true },
        { name: 'date', label: '日期', type: 'date', required: true },
        { name: 'activity', label: '相关活动/培训', type: 'text', placeholder: '如 党课初级班、组织生活会' },
        { name: 'detail', label: '说明', type: 'textarea', rows: 2 },
        { name: 'links', label: '外部链接', type: 'textarea', rows: 2, placeholder: '每行一个网址，如 https://...' }
      ],
      data: { studentId: id },
      onSubmit: obj => WB.put('party', obj),
      onSaved: () => WB.views.profile.render(container, id)
    });
  }

  function showPoints(body, p, id) {
    const card = document.createElement('div'); card.className = 'wb-card';
    const head = document.createElement('div'); head.className = 'wb-section-head';
    head.innerHTML = '<h3>量化积分明细 · 总分 <span class="wb-points">' + p.points.total + '</span></h3><small>自动抓取活动/论文/竞赛/评优数据</small>';
    card.appendChild(head);
    const counts = p.points.counts;
    const sum = document.createElement('div');
    sum.className = 'wb-points-sum';
    sum.innerHTML = [
      ['活动参与', counts.activities], ['学术文章', counts.publications], ['竞赛成果', counts.competitions], ['评奖评优', counts.awards]
    ].map(c => '<div class="wb-ps-cell"><b>' + c[1] + '</b><span>' + c[0] + '</span></div>').join('');
    card.appendChild(sum);
    card.appendChild(miniTable([
      { label: '来源', width: '100px', render: r => WB.badge(r.source, 'info') },
      { key: 'name', label: '项目' },
      { key: 'category', label: '类别', width: '140px' },
      { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
      { label: '积分', width: '70px', render: r => '<b>' + r.points + '</b>' }
    ], p.points.detail, '暂无积分明细'));
    body.appendChild(card);
  }

})(window);
