/* =====================================================================
 * views-assistant.js — 工作辅助（通知 / 模板 / 日程 / 待办 / 报表）
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB;
  const TABS = [
    { key: 'notices', label: '通知下发台账' },
    { key: 'templates', label: '表单/谈话模板' },
    { key: 'schedule', label: '日程提醒' },
    { key: 'todos', label: '待办清单' },
    { key: 'reports', label: '报表快捷生成' }
  ];

  function tabConfig(key) {
    switch (key) {
      case 'notices':
        return {
          store: 'notices', title: '通知下发台账', desc: '通知发布渠道、对象与回执管理',
          fields: [
            { name: 'title', label: '通知标题', type: 'text', required: true },
            { name: 'channel', label: '下发渠道', type: 'select', options: ['微信群', '班会', '邮件', '系统'], required: true },
            { name: 'date', label: '下发日期', type: 'date', required: true },
            { name: 'audience', label: '通知对象', type: 'text', placeholder: '如 全体研究生' },
            { name: 'confirmed', label: '回执情况', type: 'text', placeholder: '如 已读98%' },
            { name: 'content', label: '通知内容', type: 'textarea', rows: 3 }
          ],
          columns: [
            { key: 'title', label: '标题' },
            { label: '渠道', width: '80px', render: r => WB.badge(r.channel, 'info') },
            { key: 'audience', label: '对象', width: '120px' },
            { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
            { key: 'confirmed', label: '回执', width: '90px' }
          ],
          searchKeys: ['title', 'audience', 'content'], filters: [{ key: 'channel', label: '全部渠道', options: ['微信群', '班会', '邮件', '系统'] }],
          exportName: '通知下发台账'
        };
      case 'templates':
        return {
          store: 'templates', title: '模板库', desc: '谈话记录模板与各类表单模板',
          fields: [
            { name: 'name', label: '模板名称', type: 'text', required: true },
            { name: 'category', label: '模板类型', type: 'select', options: ['谈话记录模板', '表单模板'], required: true },
            { name: 'content', label: '模板内容', type: 'textarea', rows: 4 }
          ],
          columns: [
            { key: 'name', label: '名称' },
            { label: '类型', width: '120px', render: r => WB.badge(r.category, 'info') },
            { key: 'content', label: '内容', render: r => WB.esc((r.content || '').slice(0, 30)) }
          ],
          searchKeys: ['name', 'content'], filters: [{ key: 'category', label: '全部类型', options: ['谈话记录模板', '表单模板'] }],
          exportName: '模板库'
        };
      case 'schedule':
        return {
          store: 'schedule', title: '日程提醒', desc: '会议、谈话、截止等日程安排',
          fields: [
            { name: 'title', label: '事项', type: 'text', required: true },
            { name: 'date', label: '日期', type: 'date', required: true },
            { name: 'time', label: '时间', type: 'text', placeholder: '14:00' },
            { name: 'type', label: '类型', type: 'select', options: ['会议', '谈话', '截止', '其他'], required: true },
            { name: 'done', label: '已完成', type: 'checkbox' },
            { name: 'note', label: '备注', type: 'textarea', rows: 2 }
          ],
          columns: [
            { key: 'title', label: '事项' },
            { label: '类型', width: '80px', render: r => WB.badge(r.type, 'info') },
            { key: 'date', label: '日期', width: '100px', render: r => WB.fmtDate(r.date) },
            { key: 'time', label: '时间', width: '70px' },
            { label: '状态', width: '80px', render: r => r.done ? WB.badge('已完成', 'ok') : WB.badge('待办', 'warn') }
          ],
          searchKeys: ['title', 'type', 'note'], filters: [{ key: 'done', label: '全部状态', options: [{ value: 'false', label: '待办' }, { value: 'true', label: '已完成' }] }],
          exportName: '日程提醒'
        };
      case 'todos':
        return {
          store: 'todos', title: '待办清单', desc: '工作待办与优先级管理',
          fields: [
            { name: 'title', label: '待办', type: 'text', required: true },
            { name: 'due', label: '截止日期', type: 'date' },
            { name: 'priority', label: '优先级', type: 'select', options: ['高', '中', '低'], required: true },
            { name: 'done', label: '已完成', type: 'checkbox' },
            { name: 'note', label: '备注', type: 'textarea', rows: 2 }
          ],
          columns: [
            { key: 'title', label: '待办' },
            { label: '优先级', width: '80px', render: r => WB.badge(r.priority, r.priority === '高' ? 'danger' : (r.priority === '中' ? 'warn' : 'muted')) },
            { key: 'due', label: '截止', width: '100px', render: r => WB.fmtDate(r.due) },
            { label: '状态', width: '80px', render: r => r.done ? WB.badge('已完成', 'ok') : WB.badge('进行中', 'warn') }
          ],
          searchKeys: ['title', 'priority', 'note'], filters: [{ key: 'priority', label: '全部优先级', options: ['高', '中', '低'] }],
          exportName: '待办清单'
        };
    }
  }

  /* 报表快捷生成 */
  function renderReports(container) {
    container.innerHTML = '<div class="wb-sub-head"><h2>报表快捷生成</h2><small>一键汇总各模块统计，导出上报材料</small></div>';
    const box = document.createElement('div');
    box.className = 'wb-report-grid';
    box.innerHTML = [
      { id: 'r-students', t: '学生名册报表', d: '导出全体学生基础档案', icon: '🎓' },
      { id: 'r-key', t: '重点关注学生报表', d: '导出心理重点关注/预警学生', icon: '🧠' },
      { id: 'r-job', t: '未就业跟踪报表', d: '导出未就业学生帮扶台账', icon: '💼' },
      { id: 'r-rank', t: '量化积分排名报表', d: '导出学生积分排行榜', icon: '🏆' },
      { id: 'r-points', t: '全景积分明细报表', d: '逐生积分来源明细', icon: '📊' },
      { id: 'r-duty', t: '年度考核汇总报表', d: '九大职责材料归集', icon: '📝' }
    ].map(r => '<button class="wb-report-card" id="' + r.id + '"><span class="wb-rc-icon">' + r.icon + '</span><span class="wb-rc-t">' + r.t + '</span><span class="wb-rc-d">' + r.d + '</span></button>').join('');
    container.appendChild(box);

    box.querySelector('#r-students').onclick = () => WB.getAll('students').then(rows => WB.exportCSV('学生名册报表', [
      { key: 'id', label: '学号' }, { key: 'name', label: '姓名' }, { key: 'gender', label: '性别' }, { key: 'major', label: '专业' }, { key: 'tutor', label: '导师' }, { key: 'grade', label: '年级' }, { key: 'status', label: '学籍状态' }, { key: 'phone', label: '联系方式' }
    ], rows));
    box.querySelector('#r-key').onclick = () => WB.getAll('psychology').then(rows => {
      const key = rows.filter(r => r.keyFocus || r.level === '预警' || r.level === '关注');
      WB.exportCSV('重点关注学生报表', [
        { key: 'studentId', label: '学号' }, { key: 'date', label: '记录日期', value: r => WB.fmtDate(r.date) }, { key: 'level', label: '等级' }, { key: 'talk', label: '谈话记录' }, { key: 'followUp', label: '随访记录' }
      ], key);
    });
    box.querySelector('#r-job').onclick = () => WB.getAll('employment').then(rows => {
      const un = rows.filter(r => !r.employed);
      WB.exportCSV('未就业跟踪报表', [
        { key: 'studentId', label: '学号' }, { key: 'intention', label: '就业意向' }, { key: 'progress', label: '进度' }, { key: 'resumeCoach', label: '简历辅导' }, { key: 'tracking', label: '跟踪记录' }
      ], un);
    });
    box.querySelector('#r-rank').onclick = () => WB.pointsRanking().then(rank => WB.exportCSV('量化积分排名报表', [
      { label: '排名', value: (r, i) => i + 1 }, { key: 'name', label: '姓名' }, { key: 'major', label: '专业' }, { key: 'total', label: '总积分' },
      { label: '活动', value: r => r.counts.activities }, { label: '论文', value: r => r.counts.publications }, { label: '竞赛', value: r => r.counts.competitions }, { label: '评优', value: r => r.counts.awards }
    ], rank.map(it => Object.assign({ name: it.student.name, major: it.student.major }, it))));
    box.querySelector('#r-points').onclick = function () {
      WB.getAll('students').then(function (stus) {
        return Promise.all(stus.map(function (s) {
          return WB.computePoints(s.id).then(function (pt) { return { s: s, pt: pt }; });
        }));
      }).then(function (list) {
        var rows = [];
        list.forEach(function (item) {
          item.pt.detail.forEach(function (d) {
            rows.push({ 学号: item.s.id, 姓名: item.s.name, 来源: d.source, 项目: d.name, 类别: d.category, 积分: d.points, 日期: WB.fmtDate(d.date) });
          });
        });
        WB.exportCSV('全景积分明细报表', [
          { key: '学号', label: '学号' }, { key: '姓名', label: '姓名' }, { key: '来源', label: '来源' },
          { key: '项目', label: '项目' }, { key: '类别', label: '类别' }, { key: '积分', label: '积分' }, { key: '日期', label: '日期' }
        ], rows);
      });
    };
    box.querySelector('#r-duty').onclick = () => WB.getAll('assessment').then(rows => WB.exportCSV('年度考核汇总报表', [
      { key: 'year', label: '年度' }, { key: 'duty', label: '职责' }, { key: 'title', label: '事项' }, { key: 'content', label: '内容' }, { key: 'material', label: '支撑材料' }
    ], rows));
  }

  WB.views.assistant = {
    render(container) {
      container.innerHTML = WB.pageHeader('工作辅助', '通用工具板块：通知下发、谈话/表单模板、日程提醒、待办清单与各类报表快捷生成', '');
      const tabBar = document.createElement('div');
      tabBar.className = 'wb-tabs';
      tabBar.innerHTML = TABS.map((t, i) => '<button class="wb-tab' + (i === 0 ? ' active' : '') + '" data-key="' + t.key + '">' + WB.esc(t.label) + '</button>').join('');
      container.appendChild(tabBar);
      const body = document.createElement('div');
      body.className = 'wb-tab-body';
      container.appendChild(body);

      function show(key) {
        body.innerHTML = '';
        if (key === 'reports') { renderReports(body); return; }
        const cfg = tabConfig(key);
        WB.crudList(body, Object.assign({}, cfg, {
          rowActions: [],
          onChange: () => {}
        }));
      }
      tabBar.querySelectorAll('.wb-tab').forEach(btn => {
        btn.onclick = () => {
          tabBar.querySelectorAll('.wb-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          show(btn.dataset.key);
        };
      });
      show('notices');
    }
  };
})(window);
