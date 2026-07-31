/* =====================================================================
 * views-students.js — 学生信息（核心基础数据库）
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB;

  const STATUS_OPTS = ['在读', '休学', '退学', '毕业'];
  const GENDER_OPTS = ['男', '女'];
  const POLITICAL_OPTS = ['中共党员', '中共预备党员', '共青团员', '群众', '民主党派'];

  WB.views.students = {
    render(container) {
      const fieldsFor = (mode) => ([
        { name: 'id', label: '学号', type: 'text', required: true, readonly: mode === 'edit', placeholder: '如 2023110001' },
        { name: 'name', label: '姓名', type: 'text', required: true },
        { name: 'gender', label: '性别', type: 'select', options: GENDER_OPTS, required: true },
        { name: 'major', label: '专业', type: 'text', required: true },
        { name: 'tutor', label: '导师', type: 'text', required: true },
        { name: 'grade', label: '年级', type: 'text', placeholder: '如 2023级' },
        { name: 'direction', label: '研究方向', type: 'text' },
        { name: 'length', label: '学制', type: 'select', options: ['2年', '3年', '4年'], placeholder: '3年' },
        { name: 'phone', label: '联系方式', type: 'text' },
        { name: 'email', label: '邮箱', type: 'text' },
        { name: 'enrollDate', label: '入学日期', type: 'date' },
        { name: 'dorm', label: '宿舍', type: 'text' },
        { name: 'politicalStatus', label: '政治面貌', type: 'select', options: POLITICAL_OPTS },
        { name: 'workstation', label: '工位位置', type: 'text', placeholder: '如 实验楼 A-305' },
        { name: 'roommate', label: '寝室室友', type: 'text', placeholder: '同寝室同学姓名' },
        { name: 'familyLocation', label: '家庭所在地', type: 'text', placeholder: '如 山东省济南市' },
        { name: 'status', label: '学籍状态', type: 'select', options: STATUS_OPTS, required: true },
        { name: 'avatarColor', label: '头像色', type: 'text', placeholder: '#4f6ef7', hint: '用于全景档案头像底色' }
      ]);

      const columns = [
        { key: 'id', label: '学号', width: '110px' },
        { label: '姓名', width: '90px', render: r => '<span class="wb-avatar sm" style="background:' + (r.avatarColor || '#4f6ef7') + '">' + WB.esc((r.name || '?').slice(0, 1)) + '</span> ' + WB.esc(r.name) },
        { key: 'major', label: '专业' },
        { key: 'tutor', label: '导师', width: '90px' },
        { key: 'grade', label: '年级', width: '80px' },
        { label: '政治面貌', width: '90px', render: r => WB.esc(r.politicalStatus || '—') },
        { label: '学籍', width: '80px', render: r => WB.badge(r.status, r.status === '在读' ? 'ok' : (r.status === '毕业' ? 'info' : 'warn')) },
        { label: '联系方式', width: '120px', render: r => WB.privacyOn ? WB.maskPII(r.phone, 'phone') : WB.esc(r.phone || '—'), value: r => WB.privacyOn ? WB.maskPII(r.phone, 'phone') : (r.phone || '') }
      ];

      WB.crudList(container, {
        store: 'students',
        title: '学生信息',
        desc: '全体研究生基础档案 · 全工作台数据底层，其他模块均关联此库',
        fieldsFor: fieldsFor,
        columns: columns,
        searchKeys: ['id', 'name', 'major', 'tutor', 'grade'],
        filters: [{ key: 'status', label: '全部学籍', options: STATUS_OPTS }],
        rowActions: [
          { label: '全景档案', cls: 'wb-link wb-primary', onClick: r => WB.openProfile(r.id) }
        ],
        onRowClick: r => WB.openProfile(r.id),
        exportName: '学生信息台账',
        onChange: () => WB.refreshMiniStat()
      });
    }
  };
})(window);
