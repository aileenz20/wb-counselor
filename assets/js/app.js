/* =====================================================================
 * app.js — 应用外壳：导航 / 路由 / 全局搜索 / 视图注册中心
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB || (global.WB = {});
  WB.views = WB.views || {};

  /* 一级模块 + 二级子模块定义（决定菜单与数据互通骨架） */
  WB.NAV = [
    { key: 'overview', label: '总览', icon: '🏠', hash: '#/overview', desc: '全局概览 · 模块导航 · 当日事件' },
    { key: 'students', label: '学生信息', icon: '🎓', hash: '#/students', desc: '核心基础数据库 · 全体研究生档案' },
    { key: 'daily', label: '日常管理', icon: '📊', group: true, desc: '数据统计 / 心理排查 / 就业帮扶',
      children: [
        { key: 'daily-stats', label: '数据统计', icon: '📈', hash: '#/daily/stats', desc: '出勤考勤·班会·异动·宿舍台账' },
        { key: 'daily-psych', label: '心理排查', icon: '🧠', hash: '#/daily/psych', desc: '心理状态·谈心谈话·重点关注随访' },
        { key: 'daily-job', label: '就业帮扶', icon: '💼', hash: '#/daily/job', desc: '就业意向·求职进度·签约跟踪' },
        { key: 'daily-campus', label: '在校情况', icon: '🏫', hash: '#/daily/campus', desc: '请销假·校外居住·联合培养' }
      ] },
    { key: 'awards', label: '评奖评优', icon: '🏆', hash: '#/awards', desc: '量化积分体系 · 奖项评定' },
    { key: 'party', label: '党员信息', icon: '🚩', hash: '#/party', desc: '全链条入党流程·相关活动·外部链接' },
    { key: 'files', label: '文件汇总', icon: '📁', hash: '#/files', desc: '通知·制度·模板·材料·政策' },
    { key: 'assessment', label: '年度考核', icon: '📝', hash: '#/assessment', desc: '九大职责台账 · 述职考核' },
    { key: 'self', label: '自我提升', icon: '🌱', hash: '#/self', desc: '培训·学习·课题·论文' },
    { key: 'assistant', label: '工作辅助', icon: '🛠️', hash: '#/assistant', desc: '通知·模板·日程·待办·报表' }
  ];

  function buildNav() {
    const nav = document.getElementById('wb-nav');
    nav.innerHTML = '';
    WB.NAV.forEach(item => {
      if (item.group) {
        const grp = document.createElement('div');
        grp.className = 'wb-nav-group';
        grp.innerHTML = '<div class="wb-nav-group-title"><span class="wb-nav-ico">' + item.icon + '</span>' + WB.esc(item.label) + '</div>';
        const sub = document.createElement('div');
        sub.className = 'wb-nav-sub';
        item.children.forEach(ch => {
          const a = document.createElement('a');
          a.href = ch.hash; a.className = 'wb-nav-item wb-nav-subitem';
          a.dataset.hash = ch.hash;
          a.innerHTML = '<span class="wb-nav-ico">' + ch.icon + '</span>' + WB.esc(ch.label);
          sub.appendChild(a);
        });
        grp.appendChild(sub);
        nav.appendChild(grp);
      } else {
        const a = document.createElement('a');
        a.href = item.hash; a.className = 'wb-nav-item';
        a.dataset.hash = item.hash;
        a.innerHTML = '<span class="wb-nav-ico">' + item.icon + '</span><span>' + WB.esc(item.label) + '</span>';
        nav.appendChild(a);
      }
    });
  }

  function setActive(hash) {
    document.querySelectorAll('.wb-nav-item').forEach(a => {
      a.classList.toggle('active', a.dataset.hash === hash);
    });
  }

  /* 路由解析 */
  function parseHash() {
    const h = location.hash || '#/students';
    const parts = h.replace(/^#\//, '').split('/');
    if (parts[0] === 'profile') return { view: 'profile', param: decodeURIComponent(parts[1] || '') };
    return { view: parts[0] || 'students', sub: parts[1], param: parts[2] };
  }

  WB.navigate = function (hash) { location.hash = hash; };

  async function renderRoute() {
    const r = parseHash();
    const content = document.getElementById('wb-content');
    setActive('#/' + (r.sub ? r.view + '/' + r.sub : r.view) + (r.view === 'profile' ? '' : ''));
    // profile 路由高亮对应学生来源的模块不强求
    try {
      if (r.view === 'profile') {
        if (!r.param) { location.hash = '#/students'; return; }
        await WB.views.profile.render(content, r.param);
        return;
      }
      const view = WB.views[r.view];
      if (!view) { content.innerHTML = '<div class="wb-empty">模块未找到</div>'; return; }
      await view.render(content, r.sub);
    } catch (e) {
      console.error(e);
      content.innerHTML = '<div class="wb-empty">加载失败：' + WB.esc(e.message || e) + '</div>';
    }
  }

  function refreshMiniStat() {
    WB.getAll('students').then(stus => {
      const el = document.getElementById('wb-stat-mini');
      if (el) el.innerHTML = '在库学生 <b>' + stus.length + '</b> 人';
    });
  }
  WB.refreshMiniStat = refreshMiniStat;

  /* ---------- 全局搜索：联动学生全景档案 ---------- */
  function setupSearch() {
    const input = document.getElementById('wb-global-search');
    const box = document.getElementById('wb-search-results');
    const run = WB.debounce(function () {
      const q = input.value.trim();
      if (!q) { box.style.display = 'none'; box.innerHTML = ''; return; }
      WB.getAll('students').then(stus => {
        const matched = stus.filter(s =>
          (s.name && s.name.includes(q)) || (s.id && s.id.includes(q)) || (s.major && s.major.includes(q)) || (s.tutor && s.tutor.includes(q))
        ).slice(0, 8);
        if (!matched.length) { box.innerHTML = '<div class="wb-search-empty">未找到匹配学生</div>'; box.style.display = 'block'; return; }
        box.innerHTML = matched.map(s =>
          '<div class="wb-search-item" data-id="' + WB.esc(s.id) + '">' +
          '<span class="wb-avatar sm" style="background:' + (s.avatarColor || '#8b5cf6') + '">' + WB.esc(s.name.slice(0, 1)) + '</span>' +
          '<div><div class="wb-si-name">' + WB.esc(s.name) + ' <small>' + WB.esc(s.id) + '</small></div>' +
          '<div class="wb-si-sub">' + WB.esc(s.major) + ' · 导师 ' + WB.esc(s.tutor) + '</div></div></div>'
        ).join('');
        box.style.display = 'block';
      });
    }, 200);

    input.addEventListener('input', run);
    input.addEventListener('focus', run);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = box.querySelector('.wb-search-item');
        if (first) { openProfile(first.dataset.id); }
      }
    });
    box.addEventListener('click', e => {
      const item = e.target.closest('.wb-search-item');
      if (item) openProfile(item.dataset.id);
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.wb-search')) box.style.display = 'none';
    });
    document.getElementById('wb-btn-profile').onclick = () => {
      WB.getAll('students').then(stus => {
        if (!stus.length) { WB.toast('请先录入学生', 'error'); return; }
        openProfile(stus[0].id);
      });
    };
  }
  function openProfile(id) {
    document.getElementById('wb-search-results').style.display = 'none';
    document.getElementById('wb-global-search').value = '';
    location.hash = '#/profile/' + encodeURIComponent(id);
  }
  WB.openProfile = openProfile;

  /* ---------- 启动 ---------- */
  async function boot() {
    buildNav();
    setupSearch();
    // 隐私保护开关
    const pb = document.getElementById('wb-privacy');
    if (pb) {
      const syncLabel = () => { pb.textContent = WB.privacyOn ? '🔒 隐私保护：开' : '🔓 隐私保护：关'; };
      syncLabel();
      pb.onclick = function () { WB.togglePrivacy(); syncLabel(); };
    }
    await WB.openDB();
    await WB.seedIfEmpty();
    await WB.patchStudentFields(); // 补齐存量学生新增字段（政治面貌/工位/室友/家庭所在地）
    refreshMiniStat();
    window.addEventListener('hashchange', renderRoute);
    WB.rerender = renderRoute;
    const logo = document.querySelector('.wb-logo');
    if (logo) logo.onclick = () => { location.hash = '#/overview'; };
    if (!location.hash) location.hash = '#/overview';
    else await renderRoute();
  }

  WB.boot = boot;
  document.addEventListener('DOMContentLoaded', boot);
})(window);
