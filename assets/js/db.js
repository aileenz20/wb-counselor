/* =====================================================================
 * db.js — 研究生辅导员一体化工作台 · 数据层
 * 基于 IndexedDB 的 Promise 化封装 + 全平台 Schema + 积分聚合 + 种子数据
 * ===================================================================== */
(function (global) {
  'use strict';
  const WB = global.WB || (global.WB = {});

  WB.DB_NAME = 'counselor_workbench';
  WB.DB_VERSION = 2;

  /* ---------------------------------------------------------------
   * 全平台数据表（object stores）定义
   * 以学生学号 studentId 作为跨模块关联主键
   * ------------------------------------------------------------- */
  WB.STORES = [
    // 学生信息 —— 核心基础数据库，学号为主键
    { name: 'students', keyPath: 'id', indexes: ['name', 'major', 'tutor', 'grade', 'status'] },
    // 日常管理·数据统计（出勤/考勤/班会/异动/宿舍）
    { name: 'attendance', keyPath: 'uid', indexes: ['studentId', 'type', 'date'] },
    // 日常管理·心理排查
    { name: 'psychology', keyPath: 'uid', indexes: ['studentId', 'date', 'level'] },
    // 日常管理·就业帮扶
    { name: 'employment', keyPath: 'uid', indexes: ['studentId', 'progress', 'employed'] },
    // 活动参与（积分来源之一）
    { name: 'activities', keyPath: 'uid', indexes: ['studentId', 'date', 'category'] },
    // 学术文章（积分来源之一）
    { name: 'publications', keyPath: 'uid', indexes: ['studentId', 'date', 'level'] },
    // 竞赛成果（积分来源之一）
    { name: 'competitions', keyPath: 'uid', indexes: ['studentId', 'date'] },
    // 评奖评优（绑定学生 + 计入积分）
    { name: 'awards', keyPath: 'uid', indexes: ['studentId', 'year', 'type'] },
    // 文件汇总
    { name: 'files', keyPath: 'uid', indexes: ['category', 'studentId', 'date'] },
    // 年度考核（辅导员九大职责）
    { name: 'assessment', keyPath: 'uid', indexes: ['year', 'duty'] },
    // 自我提升
    { name: 'selfItems', keyPath: 'uid', indexes: ['type', 'date'] },
    // 工作辅助·通知下发
    { name: 'notices', keyPath: 'uid', indexes: ['date', 'channel'] },
    // 工作辅助·模板
    { name: 'templates', keyPath: 'uid', indexes: ['category'] },
    // 工作辅助·日程
    { name: 'schedule', keyPath: 'uid', indexes: ['date', 'done'] },
    // 工作辅助·待办
    { name: 'todos', keyPath: 'uid', indexes: ['due', 'done', 'priority'] },
    // 日常管理·在校情况（请销假/校外居住/联合培养）
    { name: 'campus', keyPath: 'uid', indexes: ['studentId', 'type', 'date'] },
    // 党员信息（全链条入党流程 + 相关活动 + 外部链接）
    { name: 'party', keyPath: 'uid', indexes: ['studentId', 'stage', 'date'] }
  ];

  /* 辅导员九大工作职责（年度考核分类） */
  WB.DUTIES = [
    '思想理论教育和价值引领',
    '党团和班级建设',
    '学风建设',
    '学生日常事务管理',
    '心理健康教育与咨询工作',
    '网络思想政治教育',
    '校园危机事件应对',
    '职业规划与就业创业指导',
    '理论和实践研究'
  ];

  /* 量化积分规则（用于自动换算/提示） */
  WB.POINT_RULES = {
    publication: {
      'SCI/SSCI 一作': 20, 'SCI/SSCI 非一作': 10,
      '核心期刊 一作': 12, '核心期刊 非一作': 6,
      'EI/会议 一作': 8, '普通期刊': 3
    },
    competition: {
      '国家级一等奖': 15, '国家级二等奖': 12, '国家级三等奖': 10,
      '省级一等奖': 10, '省级二等奖': 8, '省级三等奖': 6,
      '校级一等奖': 5, '校级二等奖': 3, '校级三等奖': 2,
      '院级': 1
    },
    activity: {
      '学术活动': 2, '校园活动': 1.5, '志愿服务': 2, '文体活动': 1
    }
  };

  WB.db = null;

  WB.openDB = function () {
    return new Promise(function (resolve, reject) {
      if (WB.db) return resolve(WB.db);
      const req = indexedDB.open(WB.DB_NAME, WB.DB_VERSION);
      req.onupgradeneeded = function (e) {
        const db = e.target.result;
        WB.STORES.forEach(function (s) {
          if (!db.objectStoreNames.contains(s.name)) {
            const os = db.createObjectStore(s.name, { keyPath: s.keyPath });
            (s.indexes || []).forEach(function (idx) {
              os.createIndex(idx, idx, { unique: false });
            });
          }
        });
      };
      req.onsuccess = function (e) { WB.db = e.target.result; resolve(WB.db); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  };

  function tx(store, mode) {
    return WB.db.transaction(store, mode).objectStore(store);
  }

  WB.getAll = function (store) {
    return WB.openDB().then(function () {
      return new Promise(function (res, rej) {
        const r = tx(store, 'readonly').getAll();
        r.onsuccess = () => res(r.result || []);
        r.onerror = () => rej(r.error);
      });
    });
  };

  WB.get = function (store, id) {
    return WB.openDB().then(function () {
      return new Promise(function (res, rej) {
        const r = tx(store, 'readonly').get(id);
        r.onsuccess = () => res(r.result || null);
        r.onerror = () => rej(r.error);
      });
    });
  };

  WB.put = function (store, obj) {
    return WB.openDB().then(function () {
      return new Promise(function (res, rej) {
        if (obj.uid === undefined && store !== 'students') {
          obj.uid = (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
        }
        if (obj.createdAt === undefined) obj.createdAt = new Date().toISOString();
        obj.updatedAt = new Date().toISOString();
        const r = tx(store, 'readwrite').put(obj);
        r.onsuccess = () => res(obj);
        r.onerror = () => rej(r.error);
      });
    });
  };

  WB.del = function (store, id) {
    return WB.openDB().then(function () {
      return new Promise(function (res, rej) {
        const r = tx(store, 'readwrite').delete(id);
        r.onsuccess = () => res(true);
        r.onerror = () => rej(r.error);
      });
    });
  };

  /* 按字段过滤 */
  WB.query = function (store, pred) {
    return WB.getAll(store).then(function (rows) {
      return pred ? rows.filter(pred) : rows;
    });
  };

  /* 按 studentId 取某 store 的全部记录 */
  WB.byStudent = function (store, studentId) {
    return WB.query(store, r => r.studentId === studentId);
  };

  /* ---------------------------------------------------------------
   * 量化积分聚合 —— 自动抓取活动/论文/竞赛/评优 数据，避免重复录入
   * ------------------------------------------------------------- */
  WB.computePoints = function (studentId) {
    return Promise.all([
      WB.byStudent('activities', studentId),
      WB.byStudent('publications', studentId),
      WB.byStudent('competitions', studentId),
      WB.byStudent('awards', studentId)
    ]).then(function (arr) {
      const activities = arr[0], publications = arr[1], competitions = arr[2], awards = arr[3];
      const detail = [];
      let total = 0;
      activities.forEach(a => { const p = num(a.points); total += p; detail.push({ source: '活动参与', name: a.name, category: a.category, points: p, date: a.date }); });
      publications.forEach(p => { const v = num(p.points); total += v; detail.push({ source: '学术文章', name: p.title, category: p.level, points: v, date: p.date }); });
      competitions.forEach(c => { const v = num(c.points); total += v; detail.push({ source: '竞赛成果', name: c.name, category: c.award, points: v, date: c.date }); });
      awards.forEach(a => { const v = num(a.points); total += v; detail.push({ source: '评奖评优', name: a.name, category: a.type, points: v, date: a.date }); });
      detail.sort((x, y) => (y.date || '').localeCompare(x.date || ''));
      return { total: Math.round(total * 100) / 100, detail: detail, counts: { activities: activities.length, publications: publications.length, competitions: competitions.length, awards: awards.length } };
    });
  };

  function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

  /* 全体学生积分排名（用于评奖评优筛选排序） */
  WB.pointsRanking = function () {
    return WB.getAll('students').then(function (students) {
      return Promise.all(students.map(s => WB.computePoints(s.id).then(pt => ({ student: s, total: pt.total, counts: pt.counts }))))
        .then(list => list.sort((a, b) => b.total - a.total));
    });
  };

  /* 文章自动打分（评分标准集中管理，后续可按用户提供的标准修改 POINT_RULES.publication）
   * 依据：发表级别(level) + 作者位次(authorOrder) → 量化积分
   * ----------------------------------------------------------------- */
  WB.scorePublication = function (level, authorOrder) {
    if (!level) return 0;
    const rules = WB.POINT_RULES.publication;
    let key = '';
    if (/SCI|SSCI/i.test(level)) key = 'SCI/SSCI ' + (/一作/.test(authorOrder || '') ? '一作' : '非一作');
    else if (/核心/.test(level)) key = '核心期刊 ' + (/一作/.test(authorOrder || '') ? '一作' : '非一作');
    else if (/EI|会议/.test(level)) key = 'EI/会议 一作';
    else if (/普通/.test(level)) key = '普通期刊';
    return rules[key] !== undefined ? rules[key] : 0;
  };

  /* 学生全景档案聚合（核心联动） */
  WB.studentProfile = function (studentId) {
    return Promise.all([
      WB.get('students', studentId),
      WB.byStudent('attendance', studentId),
      WB.byStudent('psychology', studentId),
      WB.byStudent('employment', studentId),
      WB.byStudent('activities', studentId),
      WB.byStudent('publications', studentId),
      WB.byStudent('competitions', studentId),
      WB.byStudent('awards', studentId),
      WB.byStudent('campus', studentId),
      WB.byStudent('party', studentId),
      WB.computePoints(studentId)
    ]).then(function (r) {
      return {
        student: r[0],
        attendance: r[1], psychology: r[2], employment: r[3],
        activities: r[4], publications: r[5], competitions: r[6],
        awards: r[7], campus: r[8], party: r[9], points: r[10]
      };
    });
  };

  /* ---------------------------------------------------------------
   * 种子数据 —— 首次启动注入示例，保证工作台立即可用
   * ------------------------------------------------------------- */
  WB.SEEDED_FLAG = 'wb_seeded_v2';

  WB.seedIfEmpty = function () {
    return WB.openDB().then(function () {
      if (localStorage.getItem(WB.SEEDED_FLAG)) return Promise.resolve(false);
      const groups = {};
      buildSeed().forEach(function (rec) {
        (groups[rec.store] = groups[rec.store] || []).push(rec.data);
      });
      const tasks = Object.keys(groups).map(function (store) {
        return WB.getAll(store).then(function (existing) {
          if (existing.length) return null;
          return Promise.all(groups[store].map(function (d) { return WB.put(store, d); }));
        });
      });
      return Promise.all(tasks).then(function () {
        localStorage.setItem(WB.SEEDED_FLAG, '1');
        return true;
      });
    });
  };

  function S(store, data) { return { store: store, data: data }; }
  function rid() { return (crypto.randomUUID ? crypto.randomUUID() : 's-' + Math.random().toString(16).slice(2)); }

  /* 字段回填迁移：为存量（已种子化）学生补齐新增字段
   * 仅当字段缺失时填充默认值，绝不覆盖用户已填写的数据 */
  WB.patchStudentFields = function () {
    const NEW_FIELDS = ['politicalStatus', 'workstation', 'roommate', 'familyLocation'];
    return WB.getAll('students').then(function (rows) {
      const need = rows.filter(function (s) {
        return NEW_FIELDS.some(function (k) { return s[k] === undefined; });
      });
      if (!need.length) return Promise.resolve(false);
      return Promise.all(need.map(function (s) {
        if (s.politicalStatus === undefined) s.politicalStatus = '共青团员';
        if (s.workstation === undefined) s.workstation = '';
        if (s.roommate === undefined) s.roommate = '';
        if (s.familyLocation === undefined) s.familyLocation = '';
        return WB.put('students', s);
      })).then(function () { return true; });
    });
  };

  function buildSeed() {
    const out = [];
    const students = [
      { id: '2023110001', name: '陈思远', gender: '男', major: '计算机科学与技术', tutor: '李建国', phone: '13800000001', email: 'chensy@stu.edu.cn', length: '3年', grade: '2023级', direction: '人工智能', enrollDate: '2023-09-01', dorm: 'A栋302', status: '在读', avatarColor: '#4f6ef7' },
      { id: '2023110002', name: '林婉清', gender: '女', major: '软件工程', tutor: '王敏', phone: '13800000002', email: 'linwq@stu.edu.cn', length: '3年', grade: '2023级', direction: '软件工程', enrollDate: '2023-09-01', dorm: 'B栋215', status: '在读', avatarColor: '#e056a0' },
      { id: '2023110003', name: '赵子轩', gender: '男', major: '电子信息', tutor: '张伟', phone: '13800000003', email: 'zhaozx@stu.edu.cn', length: '3年', grade: '2023级', direction: '信号处理', enrollDate: '2023-09-01', dorm: 'A栋305', status: '在读', avatarColor: '#2bb3a3' },
      { id: '2022110004', name: '孙若曦', gender: '女', major: '计算机科学与技术', tutor: '李建国', phone: '13800000004', email: 'sunrx@stu.edu.cn', length: '3年', grade: '2022级', direction: '数据科学', enrollDate: '2022-09-01', dorm: 'B栋118', status: '在读', avatarColor: '#f0992f' },
      { id: '2022110005', name: '周浩然', gender: '男', major: '控制工程', tutor: '陈强', phone: '13800000005', email: 'zhouhr@stu.edu.cn', length: '3年', grade: '2022级', direction: '机器人', enrollDate: '2022-09-01', dorm: 'C栋401', status: '休学', avatarColor: '#7a5af0' },
      { id: '2023110006', name: '吴雨桐', gender: '女', major: '软件工程', tutor: '王敏', phone: '13800000006', email: 'wuyt@stu.edu.cn', length: '3年', grade: '2023级', direction: '人机交互', enrollDate: '2023-09-01', dorm: 'B栋220', status: '在读', avatarColor: '#3aa0ff' }
    ];
    students.forEach(s => out.push(S('students', s)));

    // 数据统计
    out.push(S('attendance', { studentId: '2023110001', type: '出勤', date: '2026-03-02', title: '春季学期开学注册', status: '正常', detail: '按时报到', operator: '辅导员' }));
    out.push(S('attendance', { studentId: '2023110001', type: '班会参与', date: '2026-03-05', title: '三月主题班会', status: '正常', detail: '积极参与讨论', operator: '辅导员' }));
    out.push(S('attendance', { studentId: '2023110003', type: '异动信息', date: '2026-03-10', title: '请假离校', status: '请假', detail: '病假3天，已报备', operator: '辅导员' }));
    out.push(S('attendance', { studentId: '2022110005', type: '异动信息', date: '2025-11-01', title: '休学手续', status: '休学', detail: '因病办理休学一年', operator: '辅导员' }));
    out.push(S('attendance', { studentId: '2023110002', type: '宿舍情况', date: '2026-03-12', title: '宿舍卫生检查', status: '正常', detail: '整洁达标', operator: '生活委员' }));

    // 心理排查
    out.push(S('psychology', { studentId: '2022110005', date: '2026-02-20', level: '预警', status: '预警', talk: '因身体原因情绪低落，已进行疏导', keyFocus: true, followUp: '每周随访一次，联系家长' }));
    out.push(S('psychology', { studentId: '2023110001', date: '2026-03-01', level: '正常', status: '正常', talk: '入学适应良好', keyFocus: false, followUp: '' }));
    out.push(S('psychology', { studentId: '2023110006', date: '2026-03-08', level: '关注', status: '关注', talk: '学业压力较大，给予鼓励', keyFocus: true, followUp: '月度随访' }));

    // 就业帮扶
    out.push(S('employment', { studentId: '2022110004', intention: '互联网大厂·算法岗', progress: '面试中', resumeCoach: '已辅导简历2次，突出项目经历', employed: false, signed: '', company: '', position: '', tracking: '持续跟踪面试进展' }));
    out.push(S('employment', { studentId: '2022110005', intention: '暂未确定', progress: '未就业', resumeCoach: '', employed: false, signed: '', company: '', position: '', tracking: '休学中，复学后跟进' }));
    out.push(S('employment', { studentId: '2023110002', intention: '国企·产品岗', progress: '投递中', resumeCoach: '线上简历初评', employed: false, signed: '', company: '', position: '', tracking: '关注秋招信息' }));

    // 活动参与
    out.push(S('activities', { studentId: '2023110001', name: '学术科技节志愿服务', date: '2026-03-15', category: '志愿服务', role: '志愿者', award: '否', points: 2 }));
    out.push(S('activities', { studentId: '2023110001', name: '研究生学术论坛', date: '2026-04-02', category: '学术活动', role: '报告人', award: '是', points: 2 }));
    out.push(S('activities', { studentId: '2023110002', name: '迎新文艺汇演', date: '2026-03-20', category: '文体活动', role: '演员', award: '否', points: 1 }));
    out.push(S('activities', { studentId: '2022110004', name: '校园开放日引导', date: '2026-04-10', category: '志愿服务', role: '组长', award: '否', points: 2 }));

    // 学术文章
    out.push(S('publications', { studentId: '2023110001', title: '基于深度学习的图像分割方法研究', venue: '《计算机学报》', date: '2026-02-18', authorOrder: '一作', level: '核心期刊 一作', points: 12 }));
    out.push(S('publications', { studentId: '2022110004', title: 'A Survey on Graph Neural Networks', venue: 'IEEE TNNLS', date: '2025-12-01', authorOrder: '一作', level: 'SCI/SSCI 一作', points: 20 }));
    out.push(S('publications', { studentId: '2023110002', title: '人机交互评测框架', venue: '《软件学报》', date: '2026-01-10', authorOrder: '二作', level: '核心期刊 非一作', points: 6 }));

    // 竞赛成果
    out.push(S('competitions', { studentId: '2023110001', name: '中国研究生数学建模竞赛', award: '国家级二等奖', date: '2025-11-20', points: 12 }));
    out.push(S('competitions', { studentId: '2023110003', name: '电子设计竞赛', award: '省级一等奖', date: '2025-10-15', points: 10 }));
    out.push(S('competitions', { studentId: '2022110004', name: '互联网+创新创业大赛', award: '国家级三等奖', date: '2025-09-30', points: 10 }));

    // 评奖评优
    out.push(S('awards', { studentId: '2023110001', name: '国家奖学金', type: '奖学金', year: '2025', result: '拟推荐', points: 10 }));
    out.push(S('awards', { studentId: '2022110004', name: '优秀研究生', type: '先进个人', year: '2025', result: '已获', points: 8 }));
    out.push(S('awards', { studentId: '2023110002', name: '社会工作优秀奖', type: '先进个人', year: '2025', result: '已获', points: 5 }));

    // 文件汇总
    out.push(S('files', { title: '关于2026年研究生奖助学金评选工作的通知', category: '通知', studentId: '', matter: '评奖评优', date: '2026-03-01', content: '学校下发奖助学金评选工作安排', tags: '奖学金,通知' }));
    out.push(S('files', { title: '研究生日常管理规定（修订）', category: '规章制度', studentId: '', matter: '日常管理', date: '2026-01-15', content: '学籍、考勤、宿舍管理相关规定', tags: '制度' }));
    out.push(S('files', { title: '谈心谈话记录表模板', category: '申报模板', studentId: '', matter: '心理排查', date: '2026-02-01', content: '标准谈话记录表格', tags: '模板' }));
    out.push(S('files', { title: '陈思远同学心理关注报备', category: '上报材料', studentId: '2023110001', matter: '心理排查', date: '2026-03-02', content: '重点关注学生上报材料', tags: '心理' }));

    // 年度考核（九大职责抽样）
    out.push(S('assessment', { year: '2025', duty: '学风建设', title: '组织学术诚信教育', content: '开展学术规范讲座2场，覆盖全体学生', material: '讲座签到表、新闻稿', studentId: '' }));
    out.push(S('assessment', { year: '2025', duty: '心理健康教育与咨询工作', title: '心理排查与随访', content: '完成全员心理摸排，建立重点关注台账', material: '心理排查汇总表', studentId: '' }));
    out.push(S('assessment', { year: '2025', duty: '职业规划与就业创业指导', title: '就业帮扶台账', content: '建立毕业生就业跟踪机制', material: '就业帮扶记录', studentId: '' }));

    // 自我提升
    out.push(S('selfItems', { type: '培训记录', title: '全国高校辅导员能力提升培训班', date: '2026-02-10', content: '为期5天，获结业证书', tags: '培训' }));
    out.push(S('selfItems', { type: '工作心得', title: '谈心谈话的共情技巧', date: '2026-03-12', content: '记录与学生沟通中的体会', tags: '心得' }));
    out.push(S('selfItems', { type: '课题申报', title: '研究生思政教育数字化研究', date: '2026-03-01', content: '申报校级思政课题', tags: '课题' }));

    // 工作辅助
    out.push(S('notices', { title: '关于做好2026年清明节假期安全教育的通知', channel: '微信群', date: '2026-03-28', audience: '全体研究生', content: '假期安全注意事项', confirmed: '已读98%' }));
    out.push(S('templates', { name: '谈心谈话记录模板', category: '谈话记录模板', content: '时间/地点/谈话对象/谈话主题/主要内容/后续跟进' }));
    out.push(S('templates', { name: '请假申请表', category: '表单模板', content: '姓名/学号/事由/起止时间/导师意见' }));
    out.push(S('schedule', { title: '毕业生答辩协调会', date: '2026-04-15', time: '14:00', type: '会议', done: false, note: '与教务对接' }));
    out.push(S('todos', { title: '完成重点关注学生月报', due: '2026-04-05', priority: '高', done: false, note: '汇总6名关注学生随访情况' }));

    // 在校情况（请销假 / 校外居住 / 联合培养）
    out.push(S('campus', { studentId: '2023110003', type: '请销假', date: '2026-03-10', title: '病假回家', status: '已销假', location: '山东济南', period: '2026-03-10 至 2026-03-13', detail: '因病请假，已销假返校' }));
    out.push(S('campus', { studentId: '2022110004', type: '校外居住', date: '2026-02-01', title: '实习期间校外租房', status: '已批准', location: '高新区创智天地 3 栋 502', period: '2026-02-01 起', detail: '因企业实习申请校外居住，已备案' }));
    out.push(S('campus', { studentId: '2023110001', type: '联合培养', date: '2026-03-01', title: '赴兄弟高校联合培养', status: '进行中', location: '清华大学', period: '2026-03 至 2026-09', detail: '联合培养协议书已签' }));

    // 党员信息（全链条入党流程 + 相关活动）
    out.push(S('party', { studentId: '2023110001', stage: '提交入党申请书', date: '2023-10-08', activity: '递交入党申请书', detail: '入学后第一时间递交申请书', links: 'https://party.example.edu/apply/2023110001' }));
    out.push(S('party', { studentId: '2023110001', stage: '确定为入党积极分子', date: '2024-04-12', activity: '党课初级班', detail: '参加积极分子培训班并结业', links: 'https://party.example.edu/class/2023110001' }));
    out.push(S('party', { studentId: '2023110001', stage: '确定为发展对象', date: '2025-05-20', activity: '发展对象集中培训', detail: '通过发展对象考察', links: '' }));
    out.push(S('party', { studentId: '2023110002', stage: '确定为入党积极分子', date: '2025-03-15', activity: '党课初级班', detail: '确定为入党积极分子', links: '' }));

    return out;
  }

})(window);
