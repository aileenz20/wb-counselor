# 研究生辅导员一体化工作台 · 架构说明

> 技术栈：纯前端单页应用（HTML + CSS + 原生 JS），数据层基于 IndexedDB（浏览器本地持久化，无需后端）。
> 运行方式：通过本地静态服务器打开 `index.html` 即可（已内置示例种子数据，首次打开自动注入）。

## 一、一级模块与页面菜单映射

| 菜单项 | 路由 | 对应数据表 | 说明 |
|---|---|---|---|
| 🏠 总览（首页） | `#/overview` | 聚合多表 | 工作台首页：关键指标卡 + 全部模块导航（深浅不一浅紫）+ 当日事件 + 近期待办/日程 |
| 🎓 学生信息 | `#/students` | `students` | 核心基础数据库（含政治面貌/工位/室友/家庭所在地） |
| 📊 日常管理 · 数据统计 | `#/daily/stats` | `attendance` | 出勤/考勤/班会/异动/宿舍台账 |
| 📊 日常管理 · 心理排查 | `#/daily/psych` | `psychology` | 心理状态/谈话/重点关注/随访 |
| 📊 日常管理 · 就业帮扶 | `#/daily/job` | `employment` | 意向/进度/简历辅导/签约/跟踪 |
| 📊 日常管理 · 在校情况 | `#/daily/campus` | `campus` | 请销假/校外居住/联合培养等在校状态台账 |
| 🏆 评奖评优 | `#/awards` | `awards` + 积分聚合 | 量化积分体系 + 奖项评定（学生上传文章自动打分） |
| 🚩 党员信息 | `#/party` | `party` | 全链条入党流程（申请书→积极分子→发展对象→预备党员→正式党员）+ 相关活动 + 外部链接 |
| 📁 文件汇总 | `#/files` | `files` | 通知/制度/模板/材料/政策，可关联学生 |
| 📝 年度考核 | `#/assessment` | `assessment` | 按辅导员九大职责建台账 |
| 🌱 自我提升 | `#/self` | `selfItems` | 培训/学习/课题/论文台账 |
| 🛠️ 工作辅助 | `#/assistant` | `notices`/`templates`/`schedule`/`todos` | 通知/模板/日程/待办/报表 |

## 二、数据表结构（17 个 object store）

以学生学号 `studentId` 作为跨模块关联主键；`students` 表以学号 `id` 为主键。

| 数据表 | 关键字段 | 关联 |
|---|---|---|
| students | id(学号,PK)、name、gender、major、tutor、grade、direction、length、phone、email、enrollDate、dorm、status、avatarColor、**politicalStatus(政治面貌)、workstation(工位位置)、roommate(寝室室友)、familyLocation(家庭所在地)** | 被所有模块关联 |
| attendance | uid、studentId、type、date、title、status、operator、detail | → students |
| psychology | uid、studentId、date、level、status、keyFocus、talk、followUp | → students |
| employment | uid、studentId、intention、progress、employed、resumeCoach、signed、company、position、tracking | → students |
| activities | uid、studentId、name、date、category、role、award、points | → students（积分来源①） |
| publications | uid、studentId、title、venue、date、authorOrder、level、points | → students（积分来源②） |
| competitions | uid、studentId、name、award、date、points | → students（积分来源③） |
| awards | uid、studentId、name、type、year、result、points | → students（积分来源④ + 评优） |
| files | uid、title、category、studentId(可空)、matter、date、tags、content | → students（可选） |
| assessment | uid、year、duty(九大职责)、title、content、material、studentId(可空) | → students（可选） |
| selfItems | uid、type、title、date、tags、content | 独立 |
| notices | uid、title、channel、date、audience、confirmed、content | 独立 |
| templates | uid、name、category、content | 独立 |
| schedule | uid、title、date、time、type、done、note | 独立 |
| todos | uid、title、due、priority、done、note | 独立 |
| campus | uid、studentId、type(请销假/校外居住/联合培养)、date、title、status、location、period、detail | → students |
| party | uid、studentId、stage(入党阶段)、date、activity、detail、links(外部链接，每行一个) | → students |

## 三、关联关系与联动规则（核心）

1. **以学生为核心**：所有业务记录通过 `studentId` 关联 `students`；任意模块记录均可点击「全景档案」跳转到该生完整档案。
2. **一键全景档案**：顶部全局搜索（姓名/学号/专业/导师）回车或点击 → `#/profile/{学号}`，自动聚合：
   学籍信息(含政治面貌/工位/室友/家庭所在地) + 日常管理(考勤/心理/就业/**在校情况**) + 成长记录(活动/学术/竞赛) + 评奖评优 + **党员发展** + 积分明细，形成单一学生电子成长档案（6 个标签页）。
3. **积分自动抓取**：`computePoints()` 自动汇总 `activities + publications + competitions + awards` 的积分为该生总积分，评奖评优模块按积分排名、筛选、导出，**无需重复录入**。
4. **数据同步**：任意模块新增/编辑/删除后，学生个人档案在下次打开时自动反映最新数据；在档案内可直接为某生新增各类记录并即时刷新。
5. **统一能力（上传 + 导出）**：所有台账（学生信息、日常管理各子模块、评奖评优、党员信息、文件、考核、自我提升、工作辅助）均基于通用 `crudList` 组件，统一支持关键字搜索、条件筛选、**CSV 导入（上传批量数据）**、**CSV 导出**、新增/编辑/删除。
6. **九大职责**：年度考核严格按辅导员九大工作职责分类（思想理论教育、党团班级建设、学风建设、日常事务管理、心理健康、网络思政、危机应对、就业创业指导、理论研究）。
7. **党员全链条**：`party` 表按 5 个阶段（提交入党申请书→确定为入党积极分子→确定为发展对象→接收为预备党员→转为正式党员）顺序记录，全景档案内以进度时间线展示当前所处环节；`links` 字段支持每行一个外部网址（后续可对接党建系统/学习平台等）。
8. **文章自动打分**：评奖评优·学术文章由学生上传（题目/期刊/级别/作者位次/附件），保存时按 `WB.scorePublication(level, authorOrder)` 依据 `WB.POINT_RULES.publication` 自动换算量化积分；评分标准集中管理，便于按辅导员后续提供的标准调整。
9. **隐私保护**：手机号/邮箱/家庭所在地默认脱敏（顶部「🔒 隐私保护」开关切换，状态持久化于 localStorage），脱敏后仅显示部分掩码，防止敏感信息泄露。

## 四、联动查询入口

- 顶部全局搜索框（🔍）：跨库检索学生，回车直达全景档案。
- 各列表「全景档案 / 学生档案」按钮：从任一业务记录跳转到对应学生档案。
- 评奖评优页「量化积分排行榜」：点击学生行直达档案。
- 工作辅助「报表快捷生成」：一键导出学生名册、重点关注、未就业、积分排名、积分明细、年度考核等报表。

## 五、目录结构

```
app/
├─ index.html
├─ assets/
│  ├─ css/style.css
│  └─ js/
│     ├─ db.js            # 数据层：schema / IndexedDB 封装 / 积分聚合 / 种子数据
│     ├─ ui.js            # 通用组件：表单/表格/弹窗/Toast/CSV导出 / crudList
│     ├─ app.js           # 外壳：侧边栏 / 路由 / 全局搜索
│     ├─ views-students.js
│     ├─ views-daily.js   # 日常管理（数据统计/心理排查/就业帮扶/在校情况）
│     ├─ views-awards.js  # 评奖评优 + 积分体系（文章上传自动打分）
│     ├─ views-files.js
│     ├─ views-assessment.js
│     ├─ views-self.js
│     ├─ views-assistant.js
│     ├─ views-party.js   # 党员信息（全链条入党流程 + 外部链接）
│     └─ views-profile.js # 学生一键全景档案（核心，6 标签页）
```

## 八、总览页与浅紫主题

- **总览页 `#/overview`（默认首页）**：`views-overview.js`。展示 6 张关键指标卡（在校生人数 / 在库学生 / 当日事件 / 心理重点关注 / 党员发展进行中 / 待办未完成）、全部 11 个模块导航卡（日常管理拆为 4 子模块单独展示，深浅不一的浅紫配色 `PALETTE`）、当日事件时间线（跨 `campus/attendance/psychology/party/notices/schedule` 取 `date===今日`）、近期待办与日程。点击任意模块卡即跳转对应工作台。
- **浅紫色主题**：`style.css` 的 `:root` 变量统一改为紫色系（`--primary:#8b5cf6`、`--primary-d:#7c3aed`、`--bg:#f5f3fc` 等）。模块卡通过 `--accent` / `--accent-soft` 行内变量实现同色系深浅不一，保证美观且清晰。
