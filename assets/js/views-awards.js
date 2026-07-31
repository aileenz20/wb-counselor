/* =====================================================================
 * views-awards.js — 评奖评优 + 量化积分体系
 * 积分自动抓取：活动参与 / 学术文章 / 竞赛成果 / 评优 数据
 * 学术文章支持学生上传 + 按文章信息自动打分
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB;

  const TYPES = ['奖学金', '优秀研究生', '先进个人', '其他'];
  const RESULTS = ['拟推荐', '已获', '未获'];
  const LEVELS = ['SCI/SSCI', '核心期刊', 'EI/会议', '普通期刊'];
  const ORDERS = ['一作', '二作', '通讯', '参与'];

  async function studentOptions() {
    const stus = await WB.getAll('students');
    return { opts: stus.map(s => s.id + ' · ' + s.name), map: Object.fromEntries(stus.map(s => [s.id, s.name])) };
  }

  /* 积分排行榜（按积分筛选 / 排序，支撑评选） */
  async function renderRanking(container, map) {
    const ranking = await WB.pointsRanking();
    const card = document.createElement('div');
    card.className = 'wb-rank-card';
    let rows = ranking.map((it, i) => {
      const s = it.student;
      return '<tr data-id="' + WB.esc(s.id) + '" style="cursor:pointer">' +
        '<td class="wb-rank-no">' + (i + 1) + '</td>' +
        '<td><span class="wb-avatar sm" style="background:' + (s.avatarColor || '#4f6ef7') + '">' + WB.esc((s.name || '?').slice(0, 1)) + '</span> ' + WB.esc(s.name) + '</td>' +
        '<td>' + WB.esc(s.major) + '</td>' +
        '<td class="wb-points">' + it.total + '</td>' +
        '<td><small>活动 ' + it.counts.activities + ' · 论文 ' + it.counts.publications + ' · 竞赛 ' + it.counts.competitions + ' · 评优 ' + it.counts.awards + '</small></td>' +
        '</tr>';
    }).join('');
    card.innerHTML =
      '<div class="wb-rank-head"><div><strong>量化积分排行榜</strong><small>积分由活动参与 / 学术文章 / 竞赛成果 / 评优记录自动汇总，无需重复录入</small></div>' +
      '<button class="wb-btn wb-btn-ghost" id="wb-rank-export">⬇ 导出排名</button></div>' +
      '<div class="wb-table-wrap"><table class="wb-table"><thead><tr><th>排名</th><th>学生</th><th>专业</th><th>总积分</th><th>构成</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    card.querySelectorAll('tbody tr').forEach(tr => tr.onclick = () => WB.openProfile(tr.dataset.id));
    card.querySelector('#wb-rank-export').onclick = () => {
      WB.exportCSV('量化积分排名', [
        { label: '排名', value: (r, i) => i + 1 }, { key: 'name', label: '姓名' }, { key: 'major', label: '专业' },
        { key: 'total', label: '总积分' },
        { label: '活动数', value: r => r.counts.activities }, { label: '论文数', value: r => r.counts.publications },
        { label: '竞赛数', value: r => r.counts.competitions }, { label: '评优数', value: r => r.counts.awards }
      ], ranking.map(it => Object.assign({ name: it.student.name, major: it.student.major }, it)));
    };
    container.appendChild(card);
  }

  WB.views.awards = {
    async render(container) {
      const { opts, map } = await studentOptions();
      container.innerHTML = WB.pageHeader('评奖评优',
        '量化积分体系 · 自动统计学生学术成果与活动积分；支持学生上传文章并按文章信息自动打分，支撑奖学金 / 优秀研究生 / 先进个人评选', '');
      const tabBar = document.createElement('div');
      tabBar.className = 'wb-tabs';
      tabBar.innerHTML = [
        { k: 'rank', t: '积分排行榜' }, { k: 'pubs', t: '学术文章（上传/打分）' }, { k: 'awards', t: '评奖评优记录' }
      ].map((x, i) => '<button class="wb-tab' + (i === 0 ? ' active' : '') + '" data-k="' + x.k + '">' + x.t + '</button>').join('');
      container.appendChild(tabBar);
      const body = document.createElement('div');
      body.className = 'wb-tab-body';
      container.appendChild(body);

      function show(k) {
        body.innerHTML = '';
        if (k === 'rank') renderRanking(body, map);
        else if (k === 'pubs') showPubs(body, opts, map);
        else showAwards(body, opts, map);
      }
      tabBar.querySelectorAll('.wb-tab').forEach(b => b.onclick = () => {
        tabBar.querySelectorAll('.wb-tab').forEach(x => x.classList.remove('active'));
        b.classList.add('active'); show(b.dataset.k);
      });
      show('rank');
    }
  };

  function showPubs(body, opts, map) {
    const head = document.createElement('div');
    head.className = 'wb-sub-head';
    head.innerHTML = '<h2>学术文章</h2><small>学生上传文章信息，系统按「发表级别 + 作者位次」自动打分计入量化积分（评分标准可在 db.js 的 WB.POINT_RULES.publication 中调整）</small>';
    body.appendChild(head);
    WB.crudList(body, {
      store: 'publications',
      title: '学术文章',
      desc: '',
      fields: [
        { name: 'studentId', label: '关联学生', type: 'select', options: opts, required: true },
        { name: 'title', label: '文章标题', type: 'text', required: true },
        { name: 'venue', label: '期刊/会议', type: 'text' },
        { name: 'date', label: '发表日期', type: 'date' },
        { name: 'authorOrder', label: '作者位次', type: 'select', options: ORDERS, required: true },
        { name: 'level', label: '发表级别', type: 'select', options: LEVELS, required: true, hint: '评分依据：' + LEVELS.map(l => l + ' ' + JSON.stringify(WB.POINT_RULES.publication[l.includes('核心') ? '核心期刊 一作' : (l.includes('SCI') ? 'SCI/SSCI 一作' : (l.includes('EI') ? 'EI/会议 一作' : '普通期刊'))])).join('；') },
        { name: 'points', label: '积分', type: 'number', step: '0.5', hint: '留空将依据级别与位次自动计算' },
        { name: 'attachment', label: '文章附件', type: 'file', hint: '可上传 PDF / 图片等作为佐证' }
      ],
      columns: [
        { label: '学生', width: '110px', render: r => WB.esc(map[r.studentId] || r.studentId) },
        { key: 'title', label: '标题' },
        { key: 'venue', label: '期刊/会议', width: '140px' },
        { label: '级别', width: '100px', render: r => WB.badge(r.level, 'info') },
        { key: 'authorOrder', label: '位次', width: '70px' },
        { label: '积分', width: '70px', render: r => '<b>' + (r.points || 0) + '</b>' },
        { label: '附件', width: '60px', render: r => (r.attachment && r.attachment.name) ? '<a href="' + WB.esc(r.attachment.data) + '" target="_blank" download="' + WB.esc(r.attachment.name) + '" title="' + WB.esc(r.attachment.name) + '">📎</a>' : '<span class="wb-muted">—</span>' }
      ],
      searchKeys: ['studentName', 'title', 'venue'],
      getRows: () => WB.getAll('publications').then(rows => rows.map(r => { r.studentName = map[r.studentId] || r.studentId; return r; })),
      rowActions: [{ label: '全景档案', cls: 'wb-link wb-primary', onClick: r => WB.openProfile(r.studentId) }],
      exportName: '学术文章台账',
      onSubmit: function (obj) {
        if (obj.points === '' || obj.points === undefined || obj.points === null) {
          obj.points = WB.scorePublication(obj.level, obj.authorOrder);
        }
        return WB.put('publications', obj);
      }
    });
  }

  function showAwards(body, opts, map) {
    const head = document.createElement('div');
    head.className = 'wb-sub-head';
    head.innerHTML = '<h2>评奖评优记录</h2><small>每条评优绑定对应学生档案，并计入积分</small>';
    body.appendChild(head);
    WB.crudList(body, {
      store: 'awards',
      title: '评奖评优记录',
      desc: '',
      fields: [
        { name: 'studentId', label: '关联学生', type: 'select', options: opts, required: true },
        { name: 'name', label: '奖项名称', type: 'text', required: true, placeholder: '如 国家奖学金' },
        { name: 'type', label: '奖项类型', type: 'select', options: TYPES, required: true },
        { name: 'year', label: '年度', type: 'text', required: true, placeholder: '2025' },
        { name: 'result', label: '评定结果', type: 'select', options: RESULTS, required: true },
        { name: 'points', label: '积分', type: 'number', step: '0.5', hint: '计入量化积分（可与活动/论文积分叠加）' },
        { name: 'date', label: '评定日期', type: 'date' }
      ],
      columns: [
        { label: '学生', width: '120px', render: r => WB.esc(map[r.studentId] || r.studentId) },
        { key: 'name', label: '奖项名称' },
        { key: 'type', label: '类型', width: '90px' },
        { key: 'year', label: '年度', width: '70px' },
        { label: '结果', width: '90px', render: r => WB.badge(r.result, r.result === '已获' ? 'ok' : (r.result === '拟推荐' ? 'info' : 'muted')) },
        { label: '积分', width: '70px', render: r => '<b>' + WB.esc(r.points || 0) + '</b>' }
      ],
      searchKeys: ['studentName', 'name'],
      getRows: () => WB.getAll('awards').then(rows => rows.map(r => { r.studentName = map[r.studentId] || r.studentId; return r; })),
      rowActions: [{ label: '全景档案', cls: 'wb-link wb-primary', onClick: r => WB.openProfile(r.studentId) }],
      exportName: '评奖评优记录',
      onChange: () => { if (location.hash.indexOf('#/profile/') === 0) location.reload(); }
    });
  }
})(window);
