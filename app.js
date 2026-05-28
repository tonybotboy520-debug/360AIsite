const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const params = new URLSearchParams(location.search);

const navItems = [
  { id: "geo", label: "GEO工作台" },
  { id: "knowledge", label: "企业知识库" },
  { id: "site", label: "生成官网" },
  { id: "publish", label: "发布与域名" },
  { id: "analytics", label: "数据分析" }
];

const savedSection = localStorage.getItem("clone_section");
const requestedSection = params.get("section");
const availableSections = new Set([...navItems.map(item => item.id), "editor"]);
const normalizedSavedSection = savedSection === "knowledge" ? "geo" : savedSection;
const initialSection = availableSections.has(requestedSection)
  ? requestedSection
  : availableSections.has(normalizedSavedSection)
    ? normalizedSavedSection
    : "geo";

const state = {
  loggedIn: params.get("demo") === "1" || localStorage.getItem("clone_auth") === "1",
  phone: localStorage.getItem("clone_phone") || "13300000748",
  section: initialSection,
  kbTab: "company",
  kbManagePage: params.get("kbManage") || null,
  urlHelper: false,
  navMenuOpen: false,
  analyticsTab: "traffic",
  trafficAnalyticsTab: "overview",
  analyticsTrendMetric: "pv",
  analyticsTrendCompare: "previous",
  analyticsPageReportTab: "overview",
  analyticsVisitorRegionMode: "province",
  analyticsVisitorEnvDimension: "browser",
  selectedPublishStep: 3,
  generationPhase: 0,
  generationSubphase: "pause",
  generationCountdown: 15,
  generationCountdownTotal: 15,
  generationScheduleToken: 0,
  generationActionReady: false,
  generationActionPhaseKey: "",
  selectedBuildStyle: "precision",
  styleSelectionTouched: false,
  returnToGenerationFromKnowledge: false,
  editorMessages: [
    { role: "user", text: "请为「深圳市东星制冷机电有限公司」生成完整企业官网，行业方向：制冷机电。参考「工业自动化」的风格和栏目，但可以自由调整页面结构、布局和交互，以页面美观和资料准确为优先。页面内容使用企业知识库中的企业信息、产品资料、图片、案例、资讯、资质和联系方式。" },
    { role: "ai", text: "Agent 已创建官网记录，正在解析需求并生成首页与子页面源码..." },
    { role: "ai", text: "官网已生成完毕。解析建站需求 → 整理页面输入 → 读取企业知识库 → 重新调用模型生成页面 → 按 GEO Prompt 生成自由页面 → 校准知识库事实 → 使用知识库图片资源 → 保存官网内容到数据库。" }
  ]
};

let generationTimer = null;
let generationTick = null;
let generationDeadline = 0;
let scheduledGenerationKey = "";

const analyticsTrendLabels = ["05/21", "05/22", "05/23", "05/24", "05/25", "05/26", "05/27"];

const analyticsTrendSeries = {
  pv: {
    label: "浏览量(PV)",
    shortLabel: "PV",
    max: 2400,
    current: [1420, 1586, 1732, 1806, 1886, 1974, 2076],
    compare: [1200, 1340, 1510, 1560, 1610, 1668, 1688]
  },
  uv: {
    label: "访客数(UV)",
    shortLabel: "UV",
    max: 1000,
    current: [584, 642, 708, 721, 739, 773, 695],
    compare: [520, 570, 632, 646, 666, 694, 652]
  },
  ip: {
    label: "IP 数",
    shortLabel: "IP",
    max: 800,
    current: [492, 516, 572, 591, 604, 628, 513],
    compare: [462, 488, 540, 562, 570, 590, 482]
  },
  bounce: {
    label: "跳出率",
    shortLabel: "跳出率",
    max: 70,
    unit: "%",
    current: [52, 49, 47, 46, 48, 45, 47],
    compare: [55, 53, 51, 49, 50, 48, 49]
  }
};

const analyticsPageReportTabs = [
  {
    id: "overview",
    label: "指标概览",
    title: "受访页面",
    tableTitle: "页面 URL 明细",
    desc: "按页面 URL 查看访问规模、下游贡献、退出表现和停留时长。",
    tableDesc: "指标分为网站基础指标和流量质量指标，便于判断页面是否承接住了访问。",
    tip: "贡献下游浏览量高的页面，适合作为监测页面继续查看上下游路径；退出页次数高的页面，需要结合来源和访客类型判断是自然结束还是承接失败。"
  },
  {
    id: "value",
    label: "页面价值分析",
    title: "页面价值分析",
    tableTitle: "页面价值明细",
    desc: "重点看页面带来的后续浏览和停留质量，筛出真正能继续承接访问的页面。",
    tableDesc: "按贡献下游浏览量、停留时长和退出表现评估页面价值。",
    tip: "下游贡献高且停留长的页面适合强化 CTA；浏览量高但下游贡献低的页面，需要检查推荐入口和下一步路径。"
  },
  {
    id: "entry",
    label: "入口页分析",
    title: "入口页分析",
    tableTitle: "入口页明细",
    desc: "识别用户最常进入网站的页面，判断首屏承接、来源匹配和后续路径是否顺畅。",
    tableDesc: "入口页需要同时看 UV、下游贡献和退出页次数，避免只按访问量排序。",
    tip: "入口量高的页面要优先保证首屏信息、加载速度和咨询入口；新访客入口页可以单独对比来源质量。"
  },
  {
    id: "exit",
    label: "退出页分析",
    title: "退出页分析",
    tableTitle: "退出页明细",
    desc: "观察访问在哪些页面结束，区分正常任务完成和异常流失。",
    tableDesc: "结合退出页次数、平均停留时长和下游贡献，判断页面是否需要优化承接。",
    tip: "退出次数高不一定代表问题。联系页、支付页等任务完成页可接受较高退出；产品页、方案页退出高则需要重点排查。"
  }
];

const generationSteps = [
  {
    title: "加载企业知识库",
    tag: "读取字段",
    desc: "先把企业资料、产品、案例、资质、联系方式和素材全部拉进来。",
    wait: "加载完成后等待补充，15 秒后自动继续",
    logs: ["企业基础信息已读取", "产品分类与核心型号已读取", "行业案例与应用场景已读取", "资质、荣誉、备案字段已读取", "联系方式与品牌素材已读取"]
  },
  {
    title: "生成结构与风格",
    tag: "模板建站",
    desc: "先生成黑白线框和页面结构，再注入 CSS 样式与首版内容。",
    wait: "默认选中第一种风格，15 秒后自动继续",
    logs: ["首页 / 产品中心 / 解决方案结构已生成", "导航、首屏、产品卡、场景模块已排版", "CSS 主题变量与响应式规则已注入", "已生成 3 种网站风格，请选择"]
  },
  {
    title: "GEO 内容优化",
    tag: "改写扩写",
    desc: "把官网内容改写成更容易被 AI 搜索理解、引用和摘要的表达。",
    wait: "正在写入 GEO 友好的页面内容",
    logs: ["补充企业实体与业务边界", "扩写产品适用场景和客户问题", "生成 FAQ 与问答式摘要", "校准知识库事实与页面表达"]
  },
  {
    title: "SEO 优化与最终检查",
    tag: "完成",
    desc: "SEO 在后台处理，同时做页面一致性、移动端和内容完整度检查。",
    wait: "官网已生成完成",
    logs: ["Title / Description 已生成", "图片 alt 与链接语义已补齐", "sitemap 与 robots 已准备", "企业知识库事实校验通过", "移动端展示检查通过", "官网预览已生成"]
  }
];

const generationTimers = {
  processing: 15,
  phase0: 15,
  structure: 15,
  style: 15,
  phase2: 15
};

const kbImportFields = [
  ["企业名称", "深圳市东星制冷机电有限公司", "基础信息"],
  ["成立时间", "2007 年", "基础信息"],
  ["总部位置", "深圳，服务覆盖华南及全国工业客户", "基础信息"],
  ["主营业务", "工业制冷恒温设备研发、制造、服务", "企业定位"],
  ["品牌简称", "东星制冷 / EAST STAR", "品牌字段"],
  ["企业类型", "制冷机电设备源头制造商", "企业定位"],
  ["核心产品", "水冷箱式冷水机组、螺杆式冷水机组", "产品中心"],
  ["产品系列", "开放式、风冷式、低温式、冷热双用、磁悬浮、气悬浮", "产品中心"],
  ["选型参数", "制冷量、温控范围、介质、现场环境、连续运行时间", "产品字段"],
  ["工艺能力", "冷却、恒温、热管理、节能改造、非标定制", "能力字段"],
  ["应用行业", "注塑、吹塑、电镀、新能源锂电池、化工反应釜", "场景识别"],
  ["典型场景", "模具控温、槽液降温、产线冷却、反应过程恒温", "场景识别"],
  ["服务流程", "需求评估、方案选型、图纸确认、生产调试、现场交付", "服务字段"],
  ["研发专利", "58 项研发专利", "荣誉资质"],
  ["认证资质", "ISO / CE 多项国际认证", "荣誉资质"],
  ["企业荣誉", "高新技术及专精特新能力背书", "荣誉资质"],
  ["制造基地", "惠州东星产业园及多地研发制造协同", "制造能力"],
  ["服务能力", "选型、制造、交付、售后闭环", "服务字段"],
  ["响应方式", "支持售前选型、报价咨询、售后维护与备件支持", "服务字段"],
  ["内容素材", "产品图、工况图、资质图、企业介绍与案例素材", "素材资源"],
  ["FAQ 主题", "选型、定制、报价、交期、售后、节能维护", "GEO 字段"],
  ["AI 摘要实体", "公司、产品、行业、应用场景、可信证据、联系方式", "GEO 字段"],
  ["SEO 关键词", "工业冷水机、冷水机组、工艺温控、工业制冷设备", "SEO 字段"],
  ["页面结构", "首页、产品中心、解决方案、行业应用、FAQ、关于我们、联系我们", "页面字段"],
  ["联系方式", "13923464030 / szwj1688@163.com", "联系方式"],
  ["咨询入口", "提交型号、参数、应用场景以获取选型建议", "转化字段"],
  ["备案信息", "粤ICP备09046816号-8", "可信字段"]
];

const buildStyles = [
  { id: "precision", label: "风格一", name: "工业精密红黑", tone: "默认", desc: "重工质感，适合制造业官网" },
  { id: "clean", label: "风格二", name: "白底科技蓝", tone: "清爽", desc: "更适合产品和参数展示" },
  { id: "trust", label: "风格三", name: "深灰金属绿", tone: "稳重", desc: "突出方案能力和服务可信度" }
];

const publishSteps = [
  {
    title: "上线方式确认",
    tag: "路径选择",
    desc: "先判断客户是否需要中国大陆可访问、是否接受备案周期，以及是否有海外访问诉求。这个选择会直接决定后续是否需要 ICP 备案、选择哪个云资源和 DNS 策略。",
    chip: "建议：大陆客户优先大陆部署",
    status: "完成",
    tone: "done",
    tasks: ["确认目标访问区域：大陆 / 港澳台 / 海外", "确认网站类型：企业展示站 / 营销站 / 交易站", "确认是否涉及前置审批行业", "生成对应上线路径和预计周期"],
    fields: ["访问区域", "网站类型", "行业类型", "预计上线时间"],
    guides: ["用决策树告诉客户为什么大陆部署通常需要备案", "标注不同路径的预计周期、成本和风险"],
    links: [["工信部备案系统", "https://beian.miit.gov.cn/"], ["阿里云备案概述", "https://help.aliyun.com/zh/icp-filing/basic-icp-service/user-guide/icp-filing-application-overview"]],
    examples: ["B2B 企业展示站：大陆云服务器 + ICP 备案 + 公安备案"],
    checks: [["pass", "网站类型已确认", "企业展示站", "通过"], ["pass", "目标区域已确认", "主要面向中国大陆客户", "通过"], ["warn", "前置审批判断", "需客户确认是否涉及新闻、出版等内容", "待确认"]],
    preview: "上线方式确认后，系统会生成一条主流程，不同流程下隐藏不相关步骤，降低客户理解成本。"
  },
  {
    title: "域名准备与实名",
    tag: "域名资产",
    desc: "客户需要拥有可用于企业官网的域名，并完成域名实名认证。系统需要提示域名所有者最好与备案主体一致，避免后续备案被退回。",
    chip: "当前状态：域名实名已通过",
    status: "完成",
    tone: "done",
    tasks: ["录入主域名和备用域名", "校验域名实名状态", "比对域名所有者与企业主体", "确认是否需要购买或转入域名"],
    fields: ["主域名", "域名注册商", "实名主体", "到期时间"],
    guides: ["说明域名实名、备案主体、网站负责人之间的关系", "提醒域名有效期和所有权风险"],
    links: [["工信部备案系统", "https://beian.miit.gov.cn/"], ["腾讯云备案文档", "https://cloud.tencent.com/document/product/243/97673"]],
    examples: ["www.zhizao-demo.cn 已实名，主体为智造科技有限公司"],
    checks: [["pass", "域名格式", "www.zhizao-demo.cn", "通过"], ["pass", "实名状态", "企业实名已完成", "通过"], ["pass", "到期时间", "剩余 296 天", "通过"]],
    preview: "域名准备完成后，后续备案、DNS 解析和 SSL 证书都将围绕主域名展开。"
  },
  {
    title: "服务器 / 托管资源",
    tag: "接入资源",
    desc: "如果使用中国大陆节点上线，通常需要准备可备案的云服务器或托管资源。页面要把资源类型、地域、公网 IP、接入商备案要求展示清楚。",
    chip: "当前状态：大陆资源已绑定",
    status: "完成",
    tone: "done",
    tasks: ["选择接入商与大陆地域资源", "确认资源是否满足备案条件", "记录公网 IP 或托管 CNAME", "生成接入商备案入口"],
    fields: ["云服务商", "地域", "资源类型", "公网 IP / CNAME"],
    guides: ["解释为什么境外服务器不能办理大陆备案", "说明后续新增接入场景"],
    links: [["阿里云备案前准备", "https://help.aliyun.com/zh/icp-filing/basic-icp-service/support/for-the-record-process-faq"], ["华为云备案准备", "https://support.huaweicloud.com/prepare-icp/"]],
    examples: ["阿里云华东节点 ECS，具备备案服务号和公网 IP"],
    checks: [["pass", "资源地域", "中国大陆节点", "通过"], ["pass", "公网访问能力", "已配置公网 IP", "通过"], ["warn", "备案服务号", "等待接入商确认", "待确认"]],
    preview: "资源准备完成后，系统可以把服务器信息自动带入 ICP 备案资料清单。"
  },
  {
    title: "ICP备案",
    tag: "管局审核",
    desc: "确认域名、主体和大陆托管资源后，进入接入商备案系统提交 ICP 备案。这个阶段要把需要客户提供和系统可自动读取的资料拆清楚，避免企业客户不知道下一步要做什么。",
    chip: "当前卡点：等待短信核验",
    status: "进行中",
    tone: "active",
    tasks: ["选择首次备案 / 新增网站 / 新增接入", "填写主体负责人和网站负责人信息", "上传营业执照、负责人证件和核验材料", "完成工信部短信核验并等待管局审核"],
    fields: ["备案类型", "主体名称", "网站名称", "负责人手机号"],
    guides: ["分步骤展示接入商初审、短信核验、管局审核", "提醒备案期间网站访问策略和资料一致性"],
    links: [["工信部备案系统", "https://beian.miit.gov.cn/"], ["阿里云 ICP 备案流程", "https://help.aliyun.com/zh/icp-filing/basic-icp-service/user-guide/icp-filing-application-overview"], ["腾讯云首次备案", "https://cloud.tencent.com/document/product/243/97673"]],
    examples: ["企业官网备案信息填写样例", "网站底部 ICP 备案号展示样式"],
    checks: [["pass", "备案资料", "主体资料已补齐", "通过"], ["warn", "短信核验", "负责人尚未完成短信确认", "待处理"], ["warn", "管局审核", "短信核验后进入审核", "等待"], ["pass", "网站名称", "与企业展示站内容匹配", "通过"]],
    preview: "ICP备案未完成前，大陆服务器绑定域名后仍不建议开放正式访问。系统会保留预览地址和生产版本，待备案通过后再开启发布。"
  },
  {
    title: "公安联网备案",
    tag: "公网安备",
    desc: "网站正式联通后，需要根据要求完成公安联网备案。页面应提示客户备案入口、资料项、备案编号图标下载和网站底部展示位置。",
    chip: "当前状态：待 ICP 通过后办理",
    status: "待办",
    tone: "pending",
    tasks: ["进入全国互联网安全管理服务平台", "新增主体和网站备案信息", "提交网站负责人、域名、服务器信息", "审核通过后下载备案编号图标并展示"],
    fields: ["公安备案账号", "网站开通日期", "接入服务商", "备案编号"],
    guides: ["说明网站正式联通后 30 日内办理的要求", "展示备案编号图标放置在页脚的位置"],
    links: [["公安备案入口", "https://beian.mps.gov.cn/"], ["公安备案说明", "https://gaj.cngy.gov.cn/info/1328/11620.htm"]],
    examples: ["页脚展示公网安备编号和跳转链接"],
    checks: [["warn", "ICP 前置状态", "待 ICP 备案通过", "等待"], ["warn", "公安账号", "客户尚未授权", "待处理"], ["warn", "页脚展示", "待获取备案编号", "待处理"]],
    preview: "公安联网备案完成后，网站页脚会展示对应编号和链接，状态校验会检查是否正确跳转。"
  },
  {
    title: "网站部署与发布",
    tag: "生产版本",
    desc: "将已生成的官网内容发布为生产版本，配置 SSL、回滚点、静态资源和表单收件能力。",
    chip: "当前状态：待备案通过",
    status: "待办",
    tone: "pending",
    tasks: ["生成生产版本 v1.0", "配置 SSL 证书和 HTTPS 强制跳转", "检查表单、留资、地图、下载文件", "生成回滚点和发布记录"],
    fields: ["发布版本", "SSL 类型", "回滚版本", "表单接收人"],
    guides: ["展示发布前检查清单", "说明发布失败时如何回滚到上一版本"],
    links: [["SSL 证书说明", "https://help.aliyun.com/zh/ssl-certificate/"], ["DNSPod 文档", "https://docs.dnspod.cn/"]],
    examples: ["v1.0 生产发布记录和回滚按钮"],
    checks: [["warn", "生产版本", "尚未生成", "待处理"], ["warn", "SSL 证书", "待域名绑定后签发", "等待"], ["pass", "表单配置", "留资接收邮箱已配置", "通过"]],
    preview: "发布完成后，会得到一个带版本号的生产站点，并保留上一版用于紧急回滚。"
  },
  {
    title: "DNS 解析与绑定",
    tag: "域名切换",
    desc: "将客户域名解析到平台发布地址，并校验 CNAME、A 记录、TXT 验证和 HTTPS 访问是否生效。",
    chip: "当前状态：等待生产地址",
    status: "待办",
    tone: "pending",
    tasks: ["生成 CNAME / A / TXT 记录", "引导客户到域名注册商控制台配置", "轮询 DNS 生效状态", "绑定主域名并设置 www / 裸域跳转"],
    fields: ["CNAME 记录", "TXT 校验值", "TTL", "裸域策略"],
    guides: ["展示不同注册商的 DNS 配置教程", "解释 DNS 生效通常需要等待"],
    links: [["DNSPod 文档", "https://docs.dnspod.cn/"], ["阿里云云解析 DNS", "https://help.aliyun.com/zh/dns/"]],
    examples: ["CNAME www publish.360zhiwang.com", "TXT @ 360zw-verify=82ca19"],
    checks: [["warn", "CNAME", "记录未检测到", "待配置"], ["warn", "TXT 校验", "记录未检测到", "待配置"], ["warn", "HTTPS", "待 DNS 生效后签发", "等待"]],
    preview: "DNS 生效后，系统会自动把预览站点切换为正式域名访问。"
  },
  {
    title: "上线体检",
    tag: "验收报告",
    desc: "最终检查外网可访问、备案号展示、HTTPS、移动端、SEO、sitemap、robots、表单留资和 GEO 内容是否正常。",
    chip: "最终目标：公网访问成功",
    status: "待办",
    tone: "pending",
    tasks: ["从外网访问主域名并截图留档", "检查 ICP 与公安备案号页脚展示", "校验 sitemap、robots、TDK 和结构化数据", "提交百度、360、搜狗等搜索资源平台"],
    fields: ["主域名状态", "HTTPS 状态", "备案号展示", "搜索提交状态"],
    guides: ["用体检报告告诉客户哪些项已通过", "把未通过项拆成可直接处理的任务"],
    links: [["百度搜索资源平台", "https://ziyuan.baidu.com/"], ["360 搜索资源平台", "https://zhanzhang.so.com/"], ["搜狗资源平台", "https://zhanzhang.sogou.com/"]],
    examples: ["上线验收报告 PDF", "搜索引擎提交记录"],
    checks: [["warn", "外网访问", "待 DNS 生效", "等待"], ["warn", "备案展示", "待备案号返回", "等待"], ["pass", "GEO 内容", "结构化摘要已生成", "通过"], ["pass", "移动端", "页面布局检查通过", "通过"]],
    preview: "所有体检项通过后，页面会显示“公网访问成功”，并生成给客户确认的上线验收报告。"
  }
];

const kbTabs = [
  { id: "company", title: "企业信息", status: "已填写" },
  { id: "products", title: "产品信息", status: "待完善", warn: true },
  { id: "cases", title: "行业案例", status: "已填写" },
  { id: "honors", title: "荣誉资质", status: "已填写" }
];

const ownedSites = [
  {
    name: "深圳市东星制冷机电有限公司官网",
    type: "企业官网",
    status: "编辑中",
    updated: "2026-05-25",
    pages: 8,
    leads: 0,
    desc: "工业制冷恒温设备源头制造商，覆盖首页、产品中心、案例与联系页面。"
  },
  {
    name: "深圳市东星制冷机电有限公司官网新版",
    type: "企业官网",
    status: "草稿",
    updated: "2026-05-22",
    pages: 5,
    leads: 3,
    desc: "企业官网新版草稿，正在调整首页、产品中心、案例和联系方式。"
  }
];

function icon(id, cls = "icon") {
  return `<svg class="${cls}"><use href="#${id}"></use></svg>`;
}

function renderTopNav() {
  const activeNavItem = navItems.find(item => item.id === state.section);
  const primaryIds = ["geo", "knowledge", "site"];
  const compactIds = activeNavItem && !primaryIds.includes(activeNavItem.id)
    ? [...primaryIds.slice(0, 2), activeNavItem.id]
    : primaryIds;
  const compactVisible = navItems.filter(item => compactIds.includes(item.id));
  const compactHidden = navItems.filter(item => !compactIds.includes(item.id));
  const navButton = item => `<button class="${state.section === item.id ? "active" : ""}" data-section="${item.id}" type="button">${item.label}</button>`;

  return `
    <nav class="top-nav ${state.navMenuOpen ? "menu-open" : ""}" aria-label="主导航">
      <div class="nav-full">${navItems.map(navButton).join("")}</div>
      <div class="nav-compact">
        <div class="nav-visible">${compactVisible.map(navButton).join("")}</div>
        <button class="nav-menu-toggle" data-nav-menu type="button" aria-label="展开更多导航" aria-expanded="${state.navMenuOpen}">
          ${icon("i-chevron-down")}
        </button>
        <div class="nav-dropdown" role="menu">
          ${compactHidden.map(item => `<button class="${state.section === item.id ? "active" : ""}" data-section="${item.id}" type="button" role="menuitem">${item.label}</button>`).join("")}
        </div>
      </div>
    </nav>
  `;
}

function render() {
  $("#app").innerHTML = state.loggedIn ? renderAuthed() : renderLogin();
  bindEvents();
  scheduleGenerationFlow();
}

function startGenerationFlow() {
  state.generationPhase = 0;
  state.generationSubphase = "pause";
  state.generationScheduleToken += 1;
  state.generationCountdown = generationTimers.phase0;
  state.generationCountdownTotal = generationTimers.phase0;
  state.generationActionReady = false;
  state.generationActionPhaseKey = "";
  state.selectedBuildStyle = "precision";
  state.styleSelectionTouched = false;
  state.section = "editor";
  render();
}

function scheduleGenerationFlow() {
  if (!state.loggedIn || state.section !== "editor") {
    clearGenerationSchedule();
    return;
  }
  const schedule = getGenerationSchedule();
  if (!schedule) {
    clearGenerationSchedule();
    updateGenerationLogProgress();
    return;
  }
  const key = `${schedule.key}:${state.generationScheduleToken}`;
  if (scheduledGenerationKey === key) {
    updateGenerationLogProgress();
    return;
  }
  clearGenerationSchedule();
  scheduledGenerationKey = key;
  state.generationCountdown = schedule.seconds;
  state.generationCountdownTotal = schedule.seconds;
  generationDeadline = Date.now() + schedule.seconds * 1000;
  generationTimer = setTimeout(
    schedule.kind === "processing" ? completeGenerationProcessing : advanceGenerationFlow,
    schedule.seconds * 1000
  );
  updateGenerationLogProgress();
  generationTick = setInterval(() => {
    const nextCountdown = Math.max(0, Math.ceil((generationDeadline - Date.now()) / 1000));
    if (nextCountdown !== state.generationCountdown) {
      state.generationCountdown = nextCountdown;
      updateCountdownDisplays(nextCountdown);
    }
    updateGenerationLogProgress();
  }, 250);
}

function clearGenerationSchedule() {
  clearTimeout(generationTimer);
  clearInterval(generationTick);
  generationTimer = null;
  generationTick = null;
  scheduledGenerationKey = "";
}

function getGenerationSchedule() {
  const phaseKey = getGenerationStepKey();
  if (!isGenerationActionReady()) {
    return { key: `processing-${phaseKey}`, seconds: generationTimers.processing, kind: "processing" };
  }
  if (state.generationPhase === 0) return { key: "decision-phase0", seconds: generationTimers.phase0, kind: "decision" };
  if (state.generationPhase === 1 && state.generationSubphase === "structure") return { key: "decision-structure", seconds: generationTimers.structure, kind: "decision" };
  if (state.generationPhase === 1 && state.generationSubphase === "style" && !state.styleSelectionTouched) return { key: "decision-style", seconds: generationTimers.style, kind: "decision" };
  if (state.generationPhase === 2) return { key: "decision-phase2", seconds: generationTimers.phase2, kind: "decision" };
  return null;
}

function getGenerationStepKey() {
  return state.generationPhase === 1 ? `${state.generationPhase}-${state.generationSubphase}` : `${state.generationPhase}`;
}

function isGenerationActionReady() {
  return state.generationActionReady && state.generationActionPhaseKey === getGenerationStepKey();
}

function updateCountdownDisplays(value = state.generationCountdown) {
  $$("[data-countdown-value]").forEach(node => {
    node.textContent = `${value}S`;
  });
}

function updateGenerationLogProgress() {
  const list = $("[data-generation-log-list]");
  if (!list) return;
  const items = $$("[data-generation-log-item]", list);
  if (!items.length) return;
  const current = $("[data-current-log]", list);
  const currentText = $("[data-current-log-text]", list);
  const history = $("[data-log-history]", list);
  const historyTitle = $("[data-log-history-title]", list);

  const schedule = getGenerationSchedule();
  let doneCount = 0;
  let currentIndex = 0;

  if (isGenerationActionReady()) {
    doneCount = items.length;
    currentIndex = -1;
  } else if (!schedule) {
    doneCount = 0;
    currentIndex = 0;
  } else {
    const totalMs = schedule.seconds * 1000;
    const remainingMs = Math.max(0, generationDeadline - Date.now());
    const elapsedMs = Math.max(0, Math.min(totalMs, totalMs - remainingMs));
    const slotMs = totalMs / items.length;
    doneCount = Math.min(items.length, Math.floor(elapsedMs / slotMs));
    currentIndex = doneCount >= items.length ? -1 : doneCount;
  }

  items.forEach((item, index) => {
    const isDone = index < doneCount;
    item.classList.toggle("history-visible", isDone);
    item.classList.toggle("done", isDone);
    item.classList.toggle("processing", false);
    item.classList.toggle("pending", !isDone);
  });

  if (current && currentText) {
    const activeText = currentIndex >= 0
      ? items[currentIndex]?.dataset.logText || items[currentIndex]?.textContent?.trim() || "正在处理当前任务"
      : "当前步骤处理完成，准备进入下一步";
    currentText.textContent = activeText;
    current.classList.toggle("processing", currentIndex >= 0);
    current.classList.toggle("done", currentIndex < 0);
  }
  if (history && historyTitle) {
    history.classList.toggle("has-items", doneCount > 0);
    historyTitle.textContent = doneCount > 0 ? `已完成 ${doneCount} 项处理` : "暂无已完成处理";
  }
}

function completeGenerationProcessing() {
  if (state.section !== "editor") return clearGenerationSchedule();
  state.generationActionReady = true;
  state.generationActionPhaseKey = getGenerationStepKey();
  state.generationScheduleToken += 1;
  const schedule = getGenerationSchedule();
  state.generationCountdown = schedule?.seconds || 0;
  state.generationCountdownTotal = schedule?.seconds || 0;
  render();
}

function advanceGenerationFlow() {
  if (state.section !== "editor") return clearGenerationSchedule();
  if (state.generationPhase === 0) return enterGenerationPhase(1, "structure");
  if (state.generationPhase === 1 && state.generationSubphase === "structure") return enterGenerationPhase(1, "style");
  if (state.generationPhase === 1 && state.generationSubphase === "style") return enterGenerationPhase(2);
  if (state.generationPhase === 2) return enterGenerationPhase(3);
}

function enterGenerationPhase(phase, subphase = "pause") {
  state.generationPhase = phase;
  state.generationSubphase = phase === 1 ? subphase : "pause";
  state.styleSelectionTouched = phase === 1 && subphase === "style" ? false : state.styleSelectionTouched;
  state.generationActionReady = false;
  state.generationActionPhaseKey = "";
  state.generationScheduleToken += 1;
  const schedule = getGenerationSchedule();
  state.generationCountdown = schedule?.seconds || 0;
  state.generationCountdownTotal = schedule?.seconds || 0;
  render();
}

function renderLogin() {
  return `
    <main class="login-shell">
      <section class="login-card-wrap">
        <div class="brand-head">
          <div class="logo-box logo-box-wide"><img src="assets/360-zhiwang-logo.png" alt="360智网" /></div>
          <h1>AI 智能建站</h1>
          <p>上传企业资料，AI 为您生成专业企业官网</p>
        </div>
        <div class="login-panel">
          <div class="form-block">
            <label class="label" for="phone">手机号</label>
            <div class="field-line"><span class="prefix">${icon("i-phone")} +86</span><input id="phone" inputmode="numeric" maxlength="11" placeholder="请输入手机号" value="${state.phone}" /></div>
          </div>
          <div class="form-block">
            <label class="label" for="sms">验证码</label>
            <div class="code-row"><div class="field-line"><span class="prefix">${icon("i-shield")}</span><input id="sms" inputmode="numeric" maxlength="6" placeholder="请输入验证码" /></div><button id="getCode" class="ghost-btn" type="button">获取验证码</button></div>
          </div>
          <button id="loginBtn" class="primary-btn" type="button">登录 ${icon("i-arrow")}</button>
          <p id="loginError" class="error"></p>
        </div>
      </section>
      ${renderCaptchaModal()}
    </main>
  `;
}

function renderAuthed() {
  if (state.section === "editor") return renderEditor();
  return `
    <header class="app-header">
      <button class="brand-chip" data-section="geo" type="button" aria-label="返回 360智网 首页">
        <img src="assets/360-zhiwang-logo.png" alt="360智网" />
      </button>
      ${renderTopNav()}
      <span class="phone-mask">${maskPhone(state.phone)}</span>
      <button class="logout-icon" id="logout" type="button" aria-label="退出登录">${icon("i-log-out")}</button>
    </header>
    <main class="app-main">${renderSection()}</main>
  `;
}

function renderSection() {
  return {
    knowledge: renderKnowledgePage,
    site: renderSitePage,
    geo: renderGeoWorkbench,
    publish: renderPublishPage,
    analytics: renderAnalyticsPage,
    settings: renderSettingsPage
  }[state.section]();
}

function pageHead(title, desc, right = "") {
  return `<div class="page-head"><div><h1>${title}</h1><p>${desc}</p></div>${right}</div>`;
}

function renderKnowledgePage() {
  if (state.kbManagePage) return renderKbManagePage(state.kbManagePage);
  const headActions = state.returnToGenerationFromKnowledge
    ? `<div class="head-actions"><span class="done-pill">补充中</span><button class="primary slim" data-return-generation type="button">确认补充完成</button></div>`
    : `<div class="head-actions"><span class="done-pill">字段 42 项</span><span class="doc-count">· 来源 21</span><button class="primary slim" data-section="site" type="button">生成官网</button></div>`;
  return `
    ${pageHead("企业知识库", "统一沉淀企业事实、产品、案例与资质，后续可同时服务 360智见 GEO 项目和官网生成项目。", headActions)}
    ${renderKnowledgeReturnBar()}
    ${renderKnowledgeIntake()}
    <section class="kb-workspace">
      <div class="workspace-head">
        <div><span>识别结果</span><h2>AI识别后的企业资料</h2><p>基础字段与专属字段统一维护，客户可以随时修改并保存。</p></div>
        <button class="ghost slim" type="button">批量校准字段</button>
      </div>
      <section class="kb-layout">
        <aside class="kb-side">
          ${kbTabs.map(tab => `
            <button class="${state.kbTab === tab.id ? "active" : ""}" data-kb-tab="${tab.id}" type="button">
              <span>${tab.title}</span>${tab.warn ? `<em>待完善</em>` : ""}<small>${tab.status}</small>
            </button>
          `).join("")}
        </aside>
        <div class="kb-content">${renderKbContent()}</div>
      </section>
    </section>
  `;
}

function renderKnowledgeReturnBar() {
  if (!state.returnToGenerationFromKnowledge) return "";
  return `
    <section class="knowledge-return-bar">
      <div>
        <b>正在为官网生成补充企业知识库</b>
        <span>补充或校准字段后，点击确认即可回到 AI 建站助手继续生成。</span>
      </div>
      <button class="primary slim" data-return-generation type="button">确认补充完成，返回生成官网</button>
    </section>
  `;
}

function renderKnowledgeIntake() {
  return `
    <section class="source-intake" aria-label="企业知识库信息导入">
      <div class="source-card url-source">
        <div class="source-top">
          <div class="source-head">
            <b>01</b>
            <div><h2>输入域名 / URL</h2><p>每次输入一个官网或官媒域名，AI 自动抓取全部可用 URL。</p></div>
          </div>
          <button class="manage-link" data-kb-manage="domains" type="button">管理已抓取域名</button>
        </div>
        <div class="compact-source-row">
          <label class="source-field"><span>输入域名</span><input value="https://www.dongxing-sz.com/" aria-label="输入域名" /></label>
          <button class="primary source-cta" type="button">AI抓取并识别</button>
        </div>
      </div>
      <div class="source-card doc-source">
        <div class="source-top">
          <div class="source-head">
            <b>02</b>
            <div><h2>上传文档</h2><p>上传企业资料，AI 解析字段并生成内容草稿。</p></div>
          </div>
          <button class="manage-link" data-kb-manage="docs" type="button">管理全部文档</button>
        </div>
        <div class="compact-source-row">
          <button class="document-drop" type="button">
            <strong>上传资料文档</strong>
            <span>PDF / Word / Excel / PPT / Markdown</span>
          </button>
          <button class="primary source-cta" type="button">AI解析</button>
        </div>
      </div>
    </section>
  `;
}

function renderKbManagePage(type) {
  const isDomains = type === "domains";
  const rows = isDomains
    ? [
      ["https://www.dongxing-sz.com/", "官网", "已识别 128 个 URL", "2026-05-26 15:42"],
      ["https://www.xiaohongshu.com/user/profile/dongxing", "小红书官媒", "已识别 18 条内容", "2026-05-25 18:10"],
      ["https://mp.weixin.qq.com/s/dongxing-cooling", "公众号文章", "已识别 1 篇文章", "2026-05-25 17:58"]
    ]
    : [
      ["客户信息提报表.xlsx", "Excel", "已解析 26 个字段", "2026-05-26 15:35"],
      ["产品画册.pdf", "PDF", "已解析 14 个产品", "2026-05-26 15:12"],
      ["资质证书合集.zip", "压缩包", "待解析", "2026-05-25 19:20"]
    ];
  return `
    ${pageHead(isDomains ? "已抓取域名管理" : "已上传文档管理", isDomains ? "管理已经输入和识别过的官网、官媒、渠道页等来源。" : "管理企业资料、产品手册、案例材料和资质文件。", `<div class="head-actions"><button class="ghost slim" data-kb-manage-back type="button">返回企业知识库</button>${state.returnToGenerationFromKnowledge ? `<button class="primary slim" data-return-generation type="button">确认补充完成</button>` : ""}</div>`)}
    ${renderKnowledgeReturnBar()}
    <section class="manage-page">
      <div class="manage-tools">
        <button class="primary slim" type="button">${isDomains ? "新增域名" : "上传文档"}</button>
        <button class="ghost slim" type="button">${isDomains ? "重新抓取选中项" : "重新解析选中项"}</button>
        <button class="ghost slim danger" type="button">删除选中项</button>
      </div>
      <div class="manage-table">
        <div class="manage-row head"><span>${isDomains ? "来源地址" : "文件名称"}</span><span>类型</span><span>识别状态</span><span>更新时间</span><span>操作</span></div>
        ${rows.map(row => `
          <div class="manage-row">
            <strong>${row[0]}</strong><span>${row[1]}</span><span>${row[2]}</span><span>${row[3]}</span>
            <button class="ghost slim" type="button">查看</button>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderUploadStrip(title) {
  return `
    <div class="extract-row">
      <button class="primary slim" type="button">AI 提取资料</button>
      <span>可上传「${title}」资料（PDF / Word / Excel / PPT / TXT / Markdown），解析完成后自动提取到表单</span>
      <button class="ghost slim" type="button">选择文件</button>
    </div>
    <div class="doc-strip">
      ${[1,2,3,4].map(i => `<div><b>website-www.dongxing-sz.com-20260525022044-part0${i}.md</b><span>· 05-25 10:20</span><button type="button">删除</button></div>`).join("")}
      <p>还有 15 个资料文档已上传</p>
    </div>
  `;
}

function renderKbContent() {
  if (state.kbTab === "products") return renderProductsKb();
  if (state.kbTab === "cases") return renderCasesKb();
  if (state.kbTab === "honors") return renderHonorsKb();
  return renderCompanyKb();
}

function sectionTitle(title, note) {
  return `<div class="content-title"><div><h2>${title}</h2><p>${note}</p></div><button class="ghost slim" type="button">新增字段</button></div>`;
}

function inputGroup(label, value = "", placeholder = "", wide = false, source = "") {
  return `<label class="field ${wide ? "wide" : ""}"><span>${label}${source ? `<em>${source}</em>` : ""}</span><textarea placeholder="${placeholder}">${value}</textarea></label>`;
}

function fieldBlock(title, note, type, fields) {
  return `
    <div class="form-section ${type}">
      <div class="field-block-head">
        <div><h3>${title}</h3><p>${note}</p></div>
        <span>${type === "custom" ? "大模型识别字段" : "默认必备字段"}</span>
      </div>
      <div class="form-grid">${fields.join("")}</div>
    </div>
  `;
}

function renderCompanyKb() {
  return `
    ${sectionTitle("企业信息", "用于识别企业主体、行业定位、可信背书和 GEO 品牌实体。")}
    ${fieldBlock("基础字段", "每个企业知识库默认都有这些字段，客户可以直接修改。", "base", [
      inputGroup("公司名称*", "深圳市东星制冷机电有限公司", "例如：鑫达精密制造有限公司"),
      inputGroup("品牌名称", "东星制冷 / EAST STAR", "例如：东星制冷 / EAST STAR"),
      inputGroup("所属行业*", "制冷机电", "例如：工业制冷 / 智能制造"),
      inputGroup("所在地", "深圳", "例如：深圳市 / 中国深圳"),
      inputGroup("企业定位", "工业制冷恒温设备源头制造商", "例如：工业制冷恒温设备源头制造商", true),
      inputGroup("公司简介*", "精密加工，品质交付", "一段话介绍公司定位、规模、愿景...", true)
    ])}
    ${fieldBlock("专属字段", "从官网、官媒 URL 与客户文档中识别出的企业差异化信息。", "custom", [
      inputGroup("研发制造能力", "EAST STAR 东星集团创立于 2007 年，总部位于中国深圳，主要研发、设计、制造、服务工农业制冷恒温设备。", "研发中心、工厂基地、检测能力、生产规模...", true, "官网抓取"),
      inputGroup("核心优势", "经验积累：数十年冷水机、冷冻机、制冷机研发经验。", "技术、规模、服务、资质等差异化优势...", true, "AI 补充"),
      inputGroup("目标愿景", "拥有 20 多年的生产经验和雄厚技术力量，致力成为全球领先的制冷系统集成商和服务商。", "使命、愿景、长期目标...", true, "文档识别"),
      inputGroup("企业实力数据", "58 项研发专利\\n高新技术企业\\n专精特新企业", "每行一条，例如：成立时间：2007年", true, "AI 结构化")
    ])}
    <div class="form-section"><h3>品牌素材 <small>· 上传后将自动用于官网展示</small></h3>${imageManager("Banner / 首屏图", 3, "Banner 图片", "Banner")}${imageManager("公司图片", 4, "企业实拍图片", "企业图片")}</div>
    <div class="form-section"><h3>联系方式</h3><div class="form-grid">${inputGroup("联系人", "", "例如：张经理 / 销售负责人")}${inputGroup("联系方式", "电话：13923464030\\n邮箱：szwj1688@163.com\\n地址：深圳市东星制冷机电有限公司\\n官网：https://www.dongxing-sz.com/", "电话 / 邮箱 / 地址 / 官网")}</div></div>
    ${formFooter()}
  `;
}

function renderProductsKb() {
  const products = ["水冷箱式工业冷水机组", "开放式工业冷水机组", "冷水机组", "磁悬浮冷水机", "气悬浮冷水机", "工业冷水机", "螺杆式", "风冷式", "低温", "水冷式冷水机", "风冷螺杆式冷水机组", "水冷螺杆式冷水机组"];
  return `
    ${sectionTitle("产品信息", "沉淀产品基础资料，同时补充型号、工况、选型逻辑等专属字段。")}
    <div class="edit-layout">
      <aside class="item-list"><button class="primary slim" type="button">新增产品</button>${products.map((p, i) => `<button class="${i === 0 ? "active" : ""}" type="button"><b>${i + 1}</b><span>${p}</span><em>删除产品</em></button>`).join("")}</aside>
      <div class="item-editor">
        <span class="editing">正在编辑</span><h3>水冷箱式工业冷水机组</h3><p>每个产品独立保存</p>
        ${fieldBlock("基础字段", "所有产品默认具备的名称、分类、卖点和图文信息。", "base", [
          inputGroup("产品名称", "水冷箱式工业冷水机组"),
          inputGroup("产品分类", "产品展示"),
          inputGroup("产品卖点", "满足各类工业需求，适用于多场景制冷恒温控制。", "", true),
          inputGroup("产品介绍", "适用于连续生产环境下的稳定制冷与工艺温控。", "", true)
        ])}
        ${fieldBlock("专属字段", "由产品手册和产品页识别出的工况、参数、选型与适配场景。", "custom", [
          inputGroup("应用场景", "吹塑、注塑、电镀、阳极氧化、新能源锂电池、化工反应釜。", "", true, "官网抓取"),
          inputGroup("技术参数", "支持按型号、温度范围、制冷量、工艺需求定制选型。", "", true, "手册识别"),
          inputGroup("选型依据", "根据制冷量、控温范围、介质、现场环境、连续运行时长推荐型号。", "", true, "AI 生成"),
          inputGroup("常见采购问题", "是否支持非标定制？如何确认报价？交付周期多久？", "", true, "GEO 补充")
        ])}
        ${imageManager("产品图", 3, "水冷箱式工业冷水机组", "产品图片")}
        ${formFooter()}
      </div>
    </div>
  `;
}

function renderCasesKb() {
  const cases = ["应用于吹塑、注塑行业", "应用于电镀、阳极氧化行业", "应用于新能源锂电池行业", "应用于化工反应釜行业", "应用于汽车新能源行业", "应用于新能源喷涂行业", "应用于：化工、医药", "应用于环保、化工行业"];
  return `
    ${sectionTitle("行业案例", "把客户应用场景、解决问题、方案成果结构化，用于官网案例和 GEO 场景问答。")}
    <div class="edit-layout">
      <aside class="item-list"><button class="primary slim" type="button">新增案例</button>${cases.map((c, i) => `<button class="${i === 0 ? "active" : ""}" type="button"><b>${i + 1}</b><span>${c}</span><em>删除案例</em></button>`).join("")}</aside>
      <div class="item-editor">
        <span class="editing">正在编辑</span><h3>应用于吹塑、注塑行业</h3><p>每个案例独立保存</p>
        ${fieldBlock("基础字段", "所有案例默认具备的行业、场景、产品和结果信息。", "base", [
          inputGroup("应用行业", "应用于吹塑、注塑行业"),
          inputGroup("使用场景", "应用于吹塑、注塑行业"),
          inputGroup("推荐产品", "水冷箱式工业冷水机组"),
          inputGroup("案例摘要", "面向注塑吹塑设备连续生产中的温度控制需求。", "", true)
        ])}
        ${fieldBlock("专属字段", "从页面、文档或访谈资料中补充的痛点、工况和成果。", "custom", [
          inputGroup("解决问题", "模具温度波动影响成型稳定性，设备连续运行需要稳定冷源。", "客户痛点与挑战...", true, "AI 补充"),
          inputGroup("解决方案", "配置工业冷水机组进行循环冷却，按产线负荷调整制冷量。", "方案设计、实施过程、最终成果...", true, "官网抓取"),
          inputGroup("关键工况", "连续生产、温度稳定、设备降温、模具控温。", "", true, "场景识别")
        ])}
        ${imageManager("案例图", 1, "应用于吹塑、注塑行业", "案例/方案图片")}
        ${formFooter()}
      </div>
    </div>
  `;
}

function renderHonorsKb() {
  return `
    ${sectionTitle("荣誉资质", "集中维护资质认证、专利、客户、市场和网站备案等可信字段。")}
    ${fieldBlock("基础字段", "所有企业都应维护的基础可信字段。", "base", [
      inputGroup("企业资质", "高新技术企业、专精特新企业"),
      inputGroup("荣誉证书", "荣誉资质"),
      inputGroup("合作客户", "官网存在“荣誉客户”栏目，但抓取内容未提供具体客户名称。"),
      inputGroup("售后服务", "官网出现“在线客服”入口。")
    ])}
    ${fieldBlock("专属字段", "从资质图片、官网栏目和文档中识别出的专有背书。", "custom", [
      inputGroup("专利&知识产权", "58 项研发专利，已获得 ISO、CE 多项国际认证。", "", true, "文档识别"),
      inputGroup("品牌背书", "具备制冷系统集成商与服务商定位。", "", true, "AI 补充"),
      inputGroup("出口市场", "", "例如：东南亚 / 欧洲 / 北美", false, "待补充")
    ])}
    <div class="form-section"><h3>资质素材</h3>${uploadTile("上传资质证书图片", "支持 JPG / PNG，建议 ≤ 5MB")}</div>
    <div class="form-section"><h3>网站备案 <small>· 官网上线必填，将展示在页面底部</small></h3><div class="form-grid">${inputGroup("ICP 备案", "粤ICP备09046816号-8")}${inputGroup("公安备案", "")}</div></div>
    ${formFooter()}
  `;
}

function imageManager(title, count, alt, tag) {
  return `<div class="image-manager"><div class="image-title"><span>${title}</span><button class="ghost slim" type="button">继续添加图片</button></div><div class="image-grid">${Array.from({ length: count }, (_, i) => `<figure><div class="fake-img">${i + 1}</div><figcaption><b>${alt}</b><span>${tag}</span></figcaption><button type="button">删除</button></figure>`).join("")}</div></div>`;
}

function uploadTile(title, note) {
  return `<button class="upload-tile" type="button"><b>${title}</b><span>${note}</span></button>`;
}

function formFooter() {
  return `<div class="form-footer"><button class="ghost slim" type="button">取消</button><button class="primary slim" type="button">保存资料</button></div>`;
}

function renderSitePage() {
  return `
    <section class="site-workbench">
      <div class="site-list-head">
        <div>
          <span>官网资产</span>
          <h1>我的官网 <small>(${ownedSites.length})</small></h1>
          <p>通过卡片创建新官网，也可以进入已有官网继续修改页面、内容和发布配置。</p>
        </div>
        <button class="ghost slim" data-section="knowledge" type="button">企业知识库 (19)</button>
      </div>
      <div class="site-grid">
        ${ownedSites.map(site => `
          <button class="site-item owned-site-card" data-open-editor type="button">
            <div class="site-card-top"><span>${site.status}</span><small>${site.type}</small></div>
            <h3>${site.name}</h3>
            <p>${site.desc}</p>
            <div class="site-card-meta"><b>${site.pages}</b><small>页面</small><b>${site.leads}</b><small>留资</small><em>${site.updated}</em></div>
          </button>
        `).join("")}
        <button class="site-item site-create-card" data-create-site type="button">
          <b>${icon("i-plus")}</b>
          <h3>添加官网</h3>
          <p>基于企业知识库创建一个新的企业官网。</p>
          <span>使用当前官网结构</span>
        </button>
      </div>
    </section>
  `;
}

function renderEditor() {
  return `
    <header class="editor-header">
      <button class="back-btn" data-section="site" type="button">${icon("i-arrow")} </button>
      <strong>深圳市东星制冷机电有限公司官网</strong>
      <div><button class="ghost slim" type="button">预览</button><button class="primary slim" type="button">发布上线</button><span class="phone-mask">${maskPhone(state.phone)}</span><button class="logout-icon" id="logout" type="button" aria-label="退出登录">${icon("i-log-out")}</button></div>
    </header>
    <main class="editor-main">
      ${renderGenerationAssistant()}
      <section class="preview-pane">${renderGenerationPreview()}</section>
    </main>
  `;
}

function renderGenerationAssistant() {
  const active = state.generationPhase;
  return `
    <section class="assistant-pane generation-assistant">
      <div class="generation-head">
        <span>首次生成流程</span>
        <h2>AI 建站助手</h2>
        <p>${active >= generationSteps.length - 1 ? "官网已生成完成，可以继续人工修改或发布上线。" : "正在按知识库、模板、GEO、SEO 的顺序生成官网。"}</p>
      </div>
      <div class="generation-steps">
        ${generationSteps.map((step, index) => {
          const status = active > index ? "done" : active === index ? "active" : "waiting";
          const canOpen = index <= active;
          return `
            <article class="generation-step ${status}">
              <button class="generation-step-main" ${canOpen ? `data-generation-step="${index}"` : "disabled"} type="button">
                <b>${active > index ? "✓" : index + 1}</b>
                <span><strong>${step.title}</strong><small>${step.tag}</small></span>
                <em>${status === "done" ? "已完成" : status === "active" ? "进行中" : `第 ${index + 1} 步 · 待执行`}</em>
              </button>
              ${active === index ? renderGenerationStepBody(step, index) : ""}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderGenerationStepBody(step, index) {
  const logs = getVisibleGenerationLogs(step, index);
  const actionReady = isGenerationActionReady();
  return `
    <div class="generation-step-body">
      <p>${step.desc}</p>
      <div class="generation-log" data-generation-log-list>
        <div class="generation-current-log processing" data-current-log>
          <i></i>
          <span data-current-log-text>${logs[0] || "正在处理当前任务"}</span>
          <em></em>
        </div>
        <details class="generation-log-history" data-log-history>
          <summary><b data-log-history-title>暂无已完成处理</b><span>展开查看思考过程</span></summary>
          <div class="generation-history-list">
            ${logs.map((log, logIndex) => `
          <div class="generation-log-item pending" data-generation-log-item data-log-index="${logIndex}" data-log-text="${log}">
            <i></i>
            <span>${log}</span>
            <em></em>
          </div>
        `).join("")}
          </div>
        </details>
      </div>
      ${index === 0 && actionReady ? `
        <div class="generation-choice">
          <button class="ghost slim" data-supplement-knowledge type="button">补充资料</button>
          ${renderCountdownButton("无需补充，继续生成", "data-generation-next")}
        </div>
      ` : ""}
      ${index === 1 && actionReady ? renderStructureAndStyleControls() : ""}
      ${index === 2 && actionReady ? renderCountdownButton("继续 SEO 优化与最终检查", "data-generation-next", "wide") : ""}
      ${index === 3 && actionReady ? `<div class="generation-complete">官网已经完成生成，右侧为最终预览。</div>` : ""}
    </div>
  `;
}

function getVisibleGenerationLogs(step, index) {
  if (index !== 1) return step.logs;
  return state.generationSubphase === "structure" ? step.logs.slice(0, 2) : step.logs;
}

function renderStructureAndStyleControls() {
  if (state.generationSubphase === "structure") {
    return renderCountdownButton("继续注入风格", "data-generation-next", "wide");
  }
  return renderStyleChooser();
}

function renderStyleChooser() {
  return `
    <div class="style-choice-row">
      ${buildStyles.map(style => `
        <div class="style-choice-card ${state.selectedBuildStyle === style.id ? "active" : ""}">
          <button class="style-select-button" data-build-style="${style.id}" type="button">
            <b>${style.label}</b><span>${style.name} · ${style.tone}</span><small>${style.desc}</small>
          </button>
          ${state.selectedBuildStyle === style.id
            ? state.styleSelectionTouched
              ? `<button class="style-adopt active" data-adopt-style="${style.id}" type="button">采用</button>`
              : renderCountdownButton("采用", `data-adopt-style="${style.id}"`, "style-adopt active")
            : `<button class="style-adopt" data-adopt-style="${style.id}" type="button">采用</button>`}
        </div>
      `).join("")}
    </div>
  `;
}

function renderCountdownButton(label, actionAttribute, extraClass = "") {
  const total = state.generationCountdownTotal || 1;
  const remaining = Math.max(0, state.generationCountdown || 0);
  const progress = Math.max(0, Math.min(1, remaining / total));
  const duration = Math.max(remaining, .1);
  const disabled = actionAttribute === "disabled" ? "disabled" : "";
  const attr = actionAttribute === "disabled" ? "" : actionAttribute;
  return `<button class="countdown-action ${extraClass}" ${attr} ${disabled} type="button" style="--progress:${progress};--duration:${duration}s"><span>${label}</span><b data-countdown-value>${remaining}S</b></button>`;
}

function renderGenerationPreview() {
  if (state.generationPhase === 0) return renderKnowledgeBuildPreview();
  if (state.generationPhase === 1) return renderStructureBuildPreview();
  if (state.generationPhase === 2) return renderGeoRewritePreview();
  return renderFinalGeneratedSite();
}

function renderKnowledgeBuildPreview() {
  const ready = isGenerationActionReady();
  return `
    <article class="generation-preview kb-build-preview ${ready ? "ready" : ""}" style="--kb-duration:${generationTimers.phase0}s">
      <div class="preview-stage-head">
        <span>Knowledge Base Loading</span>
        <h1>企业知识库字段正在进入建站上下文</h1>
        <p>字段会被逐个加载、去重、归类，并准备写入后续页面结构与文案。</p>
      </div>
      <div class="kb-loading-rail"><b></b><span>正在加载 ${kbImportFields.length} 个知识库字段：企业实体 → 产品能力 → 行业场景 → 页面模块</span></div>
      <div class="kb-field-board">
        ${kbImportFields.map(([label, value, source], index) => `
          <div class="kb-field-token" style="--delay:${index * 420}ms">
            <small>${source}</small>
            <b>${label}</b>
            <span>${value}</span>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function renderStructureBuildPreview() {
  const style = buildStyles.find(item => item.id === state.selectedBuildStyle) || buildStyles[0];
  const isStyleStage = state.generationSubphase === "style";
  if (!isStyleStage) {
    return `
      <article class="generation-preview structure-build-preview structure-stage">
        <div class="wireframe-scroll">
          ${renderWireframeCanvas()}
        </div>
      </article>
    `;
  }
  return `
    <article class="generation-preview structure-build-preview style-${style.id} style-stage">
      <div class="preview-stage-head compact style-preview-head">
        <span>Template + CSS</span>
        <h1>正在预览「${style.label} · ${style.name}」</h1>
        <p>${style.desc}。左侧横向风格按钮可切换右侧真实网站内容与视觉，点击采用后继续。</p>
      </div>
      <div class="style-stage-shell">
        <div class="style-injection-panel">
          <div><b>结构</b><span>导航 / 首屏 / 产品 / 场景 / 询盘</span></div>
          <div><b>CSS</b><span>颜色变量 / 字号层级 / 卡片阴影 / 响应式</span></div>
          <div><b>内容</b><span>企业简介 / 产品摘要 / 行业应用</span></div>
        </div>
        ${renderStyleSite(style)}
      </div>
    </article>
  `;
}

function renderWireframeCanvas() {
  return `
    <div class="wireframe-canvas full-wireframe">
      <div class="wire-nav"><i></i><span></span><span></span><span></span><span></span><span></span></div>
      <div class="wire-hero"><div><b></b><strong></strong><strong></strong><p></p><button></button><button></button></div><aside></aside></div>
      <div class="wire-band"><b></b><span></span><span></span><span></span><span></span></div>
      <div class="wire-grid feature">${Array.from({ length: 4 }, () => `<span></span>`).join("")}</div>
      <div class="wire-split"><aside></aside><div><b></b><p></p><p></p><p></p></div></div>
      <div class="wire-grid products">${Array.from({ length: 8 }, () => `<span></span>`).join("")}</div>
      <div class="wire-columns">${Array.from({ length: 3 }, () => `<section><b></b><p></p><p></p></section>`).join("")}</div>
      <div class="wire-faq">${Array.from({ length: 5 }, () => `<p><b></b><span></span></p>`).join("")}</div>
      <div class="wire-cta"><b></b><span></span><button></button></div>
      <div class="wire-footer"><span></span><span></span><span></span><span></span></div>
    </div>
  `;
}

function renderStyleSite(style) {
  const heroTitle = {
    precision: "工业制冷恒温设备源头制造商，为复杂工艺提供稳定冷源",
    clean: "清晰呈现冷水机组产品、参数与选型路径",
    trust: "稳定冷源方案，让注塑、电镀与新能源产线持续可控"
  }[style.id];
  const eyebrow = {
    precision: "INDUSTRIAL COOLING SOLUTION",
    clean: "COOLING TECHNOLOGY",
    trust: "RELIABLE COOLING PARTNER"
  }[style.id];
  return `
    <div class="real-style-site style-${style.id}">
      <nav>
        <b>深圳市东星制冷</b>
        <span>首页</span><span>产品中心</span><span>解决方案</span><span>行业应用</span><span>FAQ</span>
        <em>13923464030</em>
      </nav>
      <section class="style-hero">
        <div>
          <small>${eyebrow}</small>
          <h2>${heroTitle}</h2>
          <p>面向注塑、吹塑、电镀、新能源锂电池与化工反应釜场景，提供冷水机组选型、制造、交付和售后服务。</p>
          <button>获取选型建议</button>
        </div>
        <aside>
          <i></i><i></i><i></i>
          <strong>58 项研发专利</strong>
          <span>ISO / CE 认证 · 2007 年创立</span>
        </aside>
      </section>
      <section class="style-metrics">
        ${["2007 年创立", "58 项研发专利", "多行业工况", "售前售后一体"].map(item => `<div><b>${item}</b><span>知识库已绑定</span></div>`).join("")}
      </section>
      <section class="style-products">
        <h3>核心产品</h3>
        <div>
          ${["水冷箱式工业冷水机组", "开放式工业冷水机组", "螺杆式冷水机组"].map((name, index) => `<article><i>${index + 1}</i><b>${name}</b><span>适配连续生产、稳定控温与节能改造需求。</span></article>`).join("")}
        </div>
      </section>
      <section class="style-scenarios">
        ${["注塑吹塑", "电镀阳极氧化", "新能源锂电池", "化工反应釜"].map(item => `<p><b>${item}</b><span>推荐产品与方案入口</span></p>`).join("")}
      </section>
      <section class="style-cta"><b>提交型号 / 参数 / 应用场景</b><span>获取专业选型建议</span><button>提交需求</button></section>
    </div>
  `;
}

function renderGeoRewritePreview() {
  return `
    <article class="generation-preview geo-build-preview">
      <div class="geo-rewrite-strip">
        <span>GEO Rewrite</span>
        <b>已把产品、场景和可信证据改写成 AI 更容易引用的表达</b>
        <small>${state.generationPhase === 3 ? "SEO 优化正在后台执行，页面展示保持 GEO 改写结果。" : "正在写入问答式摘要、场景问题和实体关系。"}</small>
      </div>
      <div class="geo-site-frame">
        <nav><b>D 深圳市东</b><span>首页</span><span>产品中心</span><span>行业应用</span><span>FAQ</span><em>全国热线 13923464030</em></nav>
        <section class="geo-hero"><small>工业制冷恒温设备解决方案</small><h1>深圳市东星制冷机电有限公司：面向注塑、电镀、新能源锂电池与化工工艺的冷水机组选型制造商</h1><p>系统补充了企业实体、适用行业、产品能力和可信证据，让 AI 问答能更准确地摘要“这家公司是谁、解决什么问题、适合哪些工况”。</p></section>
        <section class="geo-evidence-grid">
          ${["2007 年创立", "58 项研发专利", "ISO / CE 认证", "注塑与新能源场景覆盖"].map(text => `<div><b>${text}</b><span>已绑定知识库证据</span></div>`).join("")}
        </section>
        <section class="geo-faq-block">
          <h2>AI 可引用问答摘要</h2>
          ${["工业冷水机组选型需要看哪些参数？", "注塑和吹塑产线为什么需要稳定冷源？", "东星制冷能服务哪些行业工况？"].map(q => `<p><b>${q}</b><span>已扩写答案，并关联产品、场景和咨询入口。</span></p>`).join("")}
        </section>
      </div>
    </article>
  `;
}

function renderFinalGeneratedSite() {
  return `
    <article class="web-preview">
      <nav><b>D<br />深圳市东</b><span>首页</span><span>产品中心</span><span>解决方案</span><span>行业应用</span><span>案例中心</span><span>FAQ</span><span>关于我们</span><span>联系我们</span><em>全国热线 13923464030</em></nav>
      <section class="red-hero"><small>INDUSTRIAL COOLING SOLUTION</small><h1>工业制冷恒温设备源头制造商，为复杂工艺提供稳定冷源</h1><p>面向注塑、吹塑、电镀、新能源锂电池与化工反应釜场景，提供冷水机组选型、制造、交付和售后服务。</p><div><button>获取方案建议</button><button>咨询产品详情</button></div></section>
      <section class="preview-section"><small>WHY CHOOSE US</small><h2>核心优势</h2><div class="adv-grid">${["2007 年创立", "58 项研发专利", "工艺温控经验", "售前售后一体"].map((v, i) => `<div><b>0${i + 1}</b><h3>${v}</h3><p>${i === 0 ? "长期服务工业制冷恒温设备领域。" : "围绕客户工况提供稳定、可信、可落地的解决方案。"}</p></div>`).join("")}</div></section>
      <section class="preview-section dark"><small>CORE PRODUCTS</small><h2>核心产品</h2><div class="product-preview-grid">${["水冷箱式工业冷水机组", "开放式工业冷水机组", "冷水机组", "磁悬浮冷水机", "气悬浮冷水机"].map(name => `<div><span>产品展示</span><h3>${name}</h3><p>${name}，满足各类工业需求</p><b>了解详情 →</b></div>`).join("")}</div></section>
      <section class="preview-section"><small>COMMON SCENARIOS</small><h2>常见需求场景</h2><div class="scenario-grid">${["应用于吹塑、注塑行业", "应用于电镀、阳极氧化行业", "应用于新能源锂电池行业", "应用于化工反应釜行业"].map(text => `<div><h3>${text}</h3><p>${text}服务</p></div>`).join("")}</div></section>
      <section class="quote"><h2>提交型号 / 参数 / 应用场景<br />获取专业选型建议</h2><b>13923464030</b><button>提交需求</button></section>
    </article>
  `;
}

function stat(label, value, note, tone = "") {
  return `<div class="stat ${tone}"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
}

function progress(label, value, tone = "") {
  return `<div class="progress-row"><span>${label}</span><b>${value}%</b><div class="bar"><i class="${tone}" style="width:${value}%"></i></div></div>`;
}

function renderGeoWorkbench() {
  return `${pageHead("GEO 工作台", "诊断、改写、结构化、AI 可抓取效果闭环")}
    <section class="stats-grid">${stat("GEO 总评分", "82", "较上次 +13 分", "good")}${stat("AI 问答覆盖", "47 / 68", "仍缺 21 个高频问题")}${stat("结构化模块", "9", "Schema、FAQ、产品参数")}${stat("待采纳改写", "18", "涉及 6 个页面", "warn")}</section>
    <section class="grid-2"><div class="panel"><h2>页面诊断</h2>${progress("品牌实体一致性", 88, "ok")}${progress("问答式内容覆盖", 69, "mid")}${progress("结构化数据完整度", 76, "mid")}${progress("页面摘要可抓取性", 58, "bad")}</div><div class="panel"><h2>AI 改写队列</h2>${["首页首屏标题", "产品服务段落", "关于我们简介", "FAQ 模块"].map((v, i) => `<div class="queue ${i === 0 ? "selected" : ""}"><b>${v}</b><span>${i === 0 ? "补充工业视觉检测 / 自动化产线 / 数据采集实体" : "提升 AI 引用概率并补齐事实"}</span></div>`).join("")}</div></section>`;
}

function renderPublishPage() {
  const current = publishSteps[state.selectedPublishStep] || publishSteps[3];
  const completed = publishSteps.filter(step => step.tone === "done").length;
  return `
    <section class="publish-page">
      <section class="publish-hero">
        <div class="publish-hero-main">
          <span>发布与域名 / 中国大陆上线向导</span>
          <h1>把已生成的网站，从“可预览”推进到“公网可访问”</h1>
          <p>页面按国内企业官网真实上线链路组织：先确认上线方式，再处理域名实名、托管资源、ICP备案、公安联网备案、部署发布、DNS 绑定和最终外网体检。每一步都提供任务指引、官方入口、教程材料、示例参考和右侧状态校验。</p>
          <div class="publish-hero-actions">
            <button class="primary slim" type="button">继续当前步骤</button>
            <button class="ghost slim" type="button">生成上线清单</button>
            <button class="ghost slim" type="button">查看客户示例</button>
          </div>
        </div>
        <aside class="launch-meter">
          <div class="meter-head">
            <div><span>上线完成度</span><strong>63%</strong></div>
            <div class="meter-ring"><b>${completed + 2}/8</b></div>
          </div>
          <div class="meter-bars">
            ${renderMeterRow("资料准备", 100, "ok")}
            ${renderMeterRow("备案流程", 58, "mid")}
            ${renderMeterRow("技术发布", 42, "")}
          </div>
        </aside>
      </section>

      <section class="launch-board">
        <aside class="launch-steps">
          <div class="launch-side-title"><h2>上线步骤</h2><span>8 个环节</span></div>
          <div class="launch-step-list">
            ${publishSteps.map((step, index) => `
              <button class="launch-step ${step.tone} ${state.selectedPublishStep === index ? "active" : ""}" data-publish-step="${index}" type="button">
                <b>${index + 1}</b>
                <span><strong>${step.title}</strong><small>${step.tag}</small></span>
                <em>${step.status}</em>
              </button>
            `).join("")}
          </div>
        </aside>

        <section class="launch-work">
          <div class="launch-work-head">
            <div>
              <span>Step ${String(state.selectedPublishStep + 1).padStart(2, "0")}</span>
              <h2>${current.title}</h2>
              <p>${current.desc}</p>
            </div>
            <b>${current.chip}</b>
          </div>
          <div class="launch-task-grid">
            <div>
              <div class="launch-block-head"><h3>明确任务指引</h3><small>${current.tasks.length} 项任务</small></div>
              <div class="launch-task-list">${current.tasks.map(task => `<div class="launch-task"><i>✓</i><span><strong>${task}</strong><small>系统记录责任人、预计时间和是否需要客户提供资料。</small></span></div>`).join("")}</div>
              <div class="launch-block-head field-head"><h3>需要填写的信息</h3><small>可做表单化</small></div>
              <div class="launch-fields">${current.fields.map(field => `<div><b>${field}</b><span>支持录入、读取、校验和附件上传。</span></div>`).join("")}</div>
            </div>
            <div>
              <div class="launch-block-head"><h3>教程、链接与示例</h3><small>可跳转</small></div>
              <div class="launch-guide-list">${current.guides.map(guide => `<div><b>${guide}</b><span>教程内容以右侧状态为上下文，只展示当前真正需要看的信息。</span></div>`).join("")}</div>
              <div class="launch-link-list">${current.links.map(([label, url]) => `<div><span><b>${label}</b><small>${url}</small></span><a href="${url}" target="_blank" rel="noreferrer">打开</a></div>`).join("")}</div>
              <div class="launch-example-list">${current.examples.map(example => `<div><b>${example}</b><span>点击后打开示例抽屉，展示填写方式或客户验收样张。</span></div>`).join("")}</div>
            </div>
          </div>
        </section>

        <aside class="launch-status">
          <div class="status-head">
            <div><h2>状态校验</h2><p>右侧固定展示当前步骤的系统检测结果和客户待处理项。</p></div>
            <button class="primary slim" type="button">重新校验</button>
          </div>
          <div class="status-stack">${current.checks.map(([tone, title, desc, tag]) => `<div class="status-row ${tone}"><i>${tone === "pass" ? "✓" : tone === "error" ? "!" : "…"}</i><span><b>${title}</b><small>${desc}</small></span><em>${tag}</em></div>`).join("")}</div>
          <div class="external-preview">
            <div><span>外网访问预览</span><b>https://www.zhizao-demo.cn</b></div>
            <strong>当前还不能正式访问</strong>
            <p>${current.preview}</p>
          </div>
        </aside>
      </section>

      <p class="launch-note">下一步可把右侧状态接入域名 Whois、DNS、证书、备案号、HTTP 可达性和页面合规检查，完成后生成客户可确认的上线验收报告。</p>
    </section>
  `;
}

function renderMeterRow(label, value, tone = "") {
  return `<div class="meter-row"><span>${label}</span><div class="bar"><i class="${tone}" style="width:${value}%"></i></div><b>${value}%</b></div>`;
}

function miniTrend(tone = "up") {
  const heights = tone === "down" ? [70, 62, 54, 42] : tone === "flat" ? [48, 52, 50, 54] : [34, 48, 62, 78];
  return `<span class="mini-trend ${tone}" aria-label="${tone === "down" ? "下降趋势" : tone === "flat" ? "平稳趋势" : "上升趋势"}">${heights.map(height => `<i style="height:${height}%"></i>`).join("")}</span>`;
}

function trendPill(label, tone = "up") {
  return `<span class="analytics-trend-pill ${tone}">${label}</span>`;
}

function formatCompactNumber(value) {
  return value >= 10000 ? `${(value / 10000).toFixed(value % 10000 === 0 ? 0 : 1)}万` : value.toLocaleString("zh-CN");
}

function formatAnalyticsValue(series, value) {
  return series.unit ? `${value}${series.unit}` : formatCompactNumber(value);
}

function renderTrendPath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function renderOverviewTrendChart() {
  const metric = analyticsTrendSeries[state.analyticsTrendMetric] ? state.analyticsTrendMetric : "pv";
  const series = analyticsTrendSeries[metric];
  const left = 64;
  const right = 34;
  const top = 22;
  const bottom = 44;
  const chartWidth = 760 - left - right;
  const chartHeight = 260 - top - bottom;
  const baseline = top + chartHeight;
  const step = chartWidth / (analyticsTrendLabels.length - 1);
  const pointFor = (value, index) => ({
    x: left + step * index,
    y: baseline - (value / series.max) * chartHeight
  });
  const currentPoints = series.current.map(pointFor);
  const comparePoints = series.compare.map(pointFor);
  const currentPath = renderTrendPath(currentPoints);
  const comparePath = renderTrendPath(comparePoints);
  const areaPath = `${currentPath} L ${currentPoints[currentPoints.length - 1].x.toFixed(1)} ${baseline} L ${currentPoints[0].x.toFixed(1)} ${baseline} Z`;
  const ticks = [series.max, series.max * 0.75, series.max * 0.5, series.max * 0.25, 0];

  return `<div class="analytics-line-chart overview baidu-like" data-analytics-trend-chart data-metric="${metric}">
    <svg viewBox="0 0 760 260" role="img" aria-label="近 7 天${series.label}趋势">
      <g class="analytics-chart-grid">
        ${ticks.map(value => {
          const y = baseline - (value / series.max) * chartHeight;
          return `<line x1="${left}" y1="${y.toFixed(1)}" x2="${(760 - right).toFixed(1)}" y2="${y.toFixed(1)}"></line><text x="${left - 12}" y="${(y + 4).toFixed(1)}">${formatAnalyticsValue(series, value)}</text>`;
        }).join("")}
      </g>
      <g class="analytics-chart-axis-lines">
        <line x1="${left}" y1="${top}" x2="${left}" y2="${baseline}"></line>
        <line x1="${left}" y1="${baseline}" x2="${760 - right}" y2="${baseline}"></line>
      </g>
      <path class="analytics-chart-area" d="${areaPath}"></path>
      <path class="analytics-chart-line compare" d="${comparePath}"></path>
      <path class="analytics-chart-line current" d="${currentPath}"></path>
      <g class="analytics-chart-dots">
        ${currentPoints.map((point, index) => `<circle class="current" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.5" data-point-index="${index}" data-value="${series.current[index]}"></circle>`).join("")}
        ${comparePoints.map((point, index) => `<circle class="compare" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3" data-point-index="${index}" data-value="${series.compare[index]}"></circle>`).join("")}
      </g>
      <g class="analytics-chart-x-axis">
        ${analyticsTrendLabels.map((label, index) => {
          const x = left + step * index;
          return `<text x="${x.toFixed(1)}" y="246">${label}</text>`;
        }).join("")}
      </g>
      <g class="analytics-chart-hover is-hidden" data-chart-hover-svg>
        <line data-hover-line x1="${left}" y1="${top}" x2="${left}" y2="${baseline}"></line>
        <circle class="current" data-hover-current cx="${left}" cy="${baseline}" r="5"></circle>
        <circle class="compare" data-hover-compare cx="${left}" cy="${baseline}" r="4"></circle>
      </g>
    </svg>
    <div class="analytics-chart-tooltip is-hidden" data-chart-tooltip></div>
  </div>
  <div class="analytics-chart-legend baidu-like">
    <span><i></i> 2026/05/21 - 2026/05/27 ${series.label}</span>
    <span><i></i> 上一周期 ${series.label}</span>
  </div>
  <div class="analytics-chart-note">
    <span>说明：横轴按日展示当前筛选周期，纵轴随当前指标自动换算。</span>
    <span>鼠标移到折线区域可查看当天数值；默认与上一周期对比。</span>
  </div>`;
}

function renderAnalyticsPage() {
  const tabs = [
    { id: "traffic", label: "访问统计" },
    { id: "geo", label: "GEO 统计" },
    { id: "seo", label: "SEO 统计" }
  ];
  const activeTab = tabs.some(tab => tab.id === state.analyticsTab) ? state.analyticsTab : "traffic";
  return `<section class="analytics-page">
    <nav class="analytics-tabs compact" aria-label="数据分析二级导航">
      ${tabs.map(tab => `<button class="${activeTab === tab.id ? "active" : ""}" data-analytics-tab="${tab.id}" type="button">${tab.label}</button>`).join("")}
    </nav>
    ${activeTab === "geo" ? renderAnalyticsGeoStats() : activeTab === "seo" ? renderAnalyticsSeoStats() : renderAnalyticsTrafficStats()}
  </section>`;
}

function renderAnalyticsTrafficStats() {
  const tabs = [
    { id: "overview", label: "概况" },
    { id: "trend", label: "趋势分析" },
    { id: "source", label: "来源分析" },
    { id: "pages", label: "页面分析" },
    { id: "visitor", label: "访客分析" }
  ];
  const activeTab = tabs.some(tab => tab.id === state.trafficAnalyticsTab) ? state.trafficAnalyticsTab : "overview";
  const content = {
    overview: renderTrafficOverview(),
    trend: renderTrafficTrendPage(),
    source: renderTrafficSourcePage(),
    pages: renderTrafficPagesPage(),
    visitor: renderTrafficVisitorPage()
  }[activeTab];
  return `
    <nav class="analytics-subtabs" aria-label="访问统计三级导航">
      ${tabs.map(tab => `<button class="${activeTab === tab.id ? "active" : ""}" data-traffic-tab="${tab.id}" type="button">${tab.label}</button>`).join("")}
    </nav>
    ${renderAnalyticsTimeFilter(activeTab)}
    ${content}`;
}

function renderAnalyticsTimeFilter(activeTab = "overview") {
  if (activeTab === "overview") return renderAnalyticsTrendFilter();
  if (activeTab === "trend") return renderAnalyticsTrendFilter();
  if (activeTab === "source") return renderAnalyticsSourceFilter();
  if (activeTab === "pages") return renderAnalyticsPagesFilter();
  if (activeTab === "visitor") return renderAnalyticsVisitorFilter();
  return `<section class="analytics-filter-panel">
    <div class="analytics-time-group">
      <span>统计时间</span>
      <button class="active" type="button">近 7 天</button>
      <button type="button">近 30 天</button>
      <button type="button">自定义</button>
      <label><input type="date" value="2026-05-21" /> 至 <input type="date" value="2026-05-27" /></label>
    </div>
  </section>`;
}

function renderAnalyticsVisitorFilter() {
  return `<section class="analytics-filter-panel visitor-filter">
    <div class="analytics-time-group">
      <span>时间</span>
      <button class="active" type="button">今天</button>
      <button type="button">昨天</button>
      <button type="button">最近7天</button>
      <button type="button">最近30天</button>
      <label><input type="date" value="2026-05-28" /></label>
    </div>
    <div class="analytics-time-group">
      <span>地域</span>
      <button class="active" type="button">全部地域</button>
      <span>来源</span>
      <button class="active" type="button">全部来源</button>
      <span>访客</span>
      <button class="active" type="button">全部</button>
      <button type="button">新访客</button>
      <button type="button">老访客</button>
    </div>
  </section>`;
}

function renderAnalyticsPagesFilter() {
  return `<section class="analytics-filter-panel pages-filter">
    <div class="analytics-time-group">
      <span>时间</span>
      <button class="active" type="button">今天</button>
      <button type="button">昨天</button>
      <button type="button">最近7天</button>
      <button type="button">最近30天</button>
      <label><input type="date" value="2026-05-28" /></label>
    </div>
    <div class="analytics-time-group">
      <span>来源</span>
      <button class="active" type="button">全部来源</button>
      <span>访客</span>
      <button class="active" type="button">全部</button>
      <button type="button">新访客</button>
      <button type="button">老访客</button>
      <span>智能屏蔽数据</span>
      <button class="active" type="button">包含</button>
      <button type="button">不包含</button>
    </div>
  </section>`;
}

function renderAnalyticsSourceFilter() {
  return `<section class="analytics-filter-panel source-filter">
    <div class="analytics-time-group">
      <span>时间</span>
      <button class="active" type="button">今天</button>
      <button type="button">昨天</button>
      <button type="button">最近7天</button>
      <button type="button">最近30天</button>
      <label><input type="date" value="2026-05-28" /></label>
    </div>
    <div class="analytics-time-group">
      <span>设备</span>
      <button class="active" type="button">全部</button>
      <button type="button">计算机</button>
      <button type="button">移动设备</button>
      <span>访客</span>
      <button class="active" type="button">全部</button>
      <button type="button">新访客</button>
      <button type="button">老访客</button>
      <span>智能屏蔽数据</span>
      <button class="active" type="button">包含</button>
      <button type="button">不包含</button>
    </div>
  </section>`;
}

function renderAnalyticsTrendFilter() {
  return `<section class="analytics-filter-panel trend-filter">
    <div class="analytics-time-group trend-time-row">
      <span>时间</span>
      <button type="button">今天</button>
      <button type="button">昨天</button>
      <button class="active" type="button">最近7天</button>
      <button type="button">最近30天</button>
      <label><input type="date" value="2026-05-21" /> 至 <input type="date" value="2026-05-27" /></label>
      <span class="analytics-filter-spacer"></span>
      <button type="button">按时</button>
      <button class="active" type="button">按日</button>
      <button type="button">按周</button>
      <button type="button">按月</button>
    </div>
    <div class="analytics-time-group trend-filter-row">
      <span>来源</span>
      <button class="active" type="button">全部来源</button>
      <span>设备</span>
      <button class="active" type="button">全部</button>
      <button type="button">计算机</button>
      <button type="button">移动设备</button>
      <span>地域</span>
      <button class="active" type="button">全部地域</button>
      <span>访客</span>
      <button class="active" type="button">全部</button>
      <button type="button">新访客</button>
      <button type="button">老访客</button>
    </div>
  </section>`;
}

function renderTrafficKpis() {
  return `<section class="analytics-kpi-grid six analytics-jump-target" id="analytics-overview">
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>PV</span>${trendPill("+18%", "up")}</div><strong>12,480</strong><small>页面浏览量，衡量内容被打开次数。</small></article>
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>UV</span>${trendPill("+11%", "up")}</div><strong>4,862</strong><small>独立访客，衡量实际访问人数。</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>IP</span>${trendPill("+6%", "up")}</div><strong>3,916</strong><small>独立 IP，辅助识别访问覆盖。</small></article>
      <article class="analytics-kpi warn"><div class="analytics-kpi-head"><span>访问次数</span>${trendPill("持平", "flat")}</div><strong>6,438</strong><small>Session 数，衡量访问频次。</small></article>
      <article class="analytics-kpi risk"><div class="analytics-kpi-head"><span>跳出率</span>${trendPill("偏高", "down")}</div><strong>48%</strong><small>产品页偏高，需要优化首屏承接。</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>平均停留</span>${trendPill("+12秒", "up")}</div><strong>1分26秒</strong><small>内容阅读质量较上周期提升。</small></article>
    </section>`;
}

function renderTrafficTrendKpis() {
  return `<section class="analytics-kpi-grid five">
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>PV</span>${trendPill("+18%", "up")}</div><strong>12,480</strong><small>页面浏览量，衡量内容被打开次数。</small></article>
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>UV</span>${trendPill("+11%", "up")}</div><strong>4,862</strong><small>独立访客，衡量真实访问人数。</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>IP</span>${trendPill("+6%", "up")}</div><strong>3,916</strong><small>独立 IP，辅助识别访问覆盖。</small></article>
      <article class="analytics-kpi risk"><div class="analytics-kpi-head"><span>跳出率</span>${trendPill("+4%", "down")}</div><strong>48%</strong><small>单页访问占比升高，需要关注入口页质量。</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>平均停留</span>${trendPill("持平", "flat")}</div><strong>1分26秒</strong><small>较上周期 +12 秒，内容阅读稳定。</small></article>
    </section>`;
}

function renderTrafficSourceKpis() {
  return `<section class="analytics-source-quality">
      <article class="analytics-quality-card"><span>搜索引擎访客</span><strong>2,146</strong>${trendPill("转化 48", "up")}</article>
      <article class="analytics-quality-card"><span>外链推荐访客</span><strong>936</strong>${trendPill("跳出 44%", "flat")}</article>
      <article class="analytics-quality-card"><span>AI 推荐入口</span><strong>418</strong>${trendPill("新增来源", "up")}</article>
    </section>`;
}

function renderTrafficPagesKpis() {
  return `<section class="analytics-kpi-grid five">
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>受访页面数</span>${trendPill("+12%", "up")}</div><strong>86</strong><small>当前周期产生访问的页面。</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>首页入口占比</span>${trendPill("56%", "flat")}</div><strong>2,103</strong><small>首页仍是主要入口。</small></article>
      <article class="analytics-kpi warn"><div class="analytics-kpi-head"><span>产品页退出率</span>${trendPill("偏高", "down")}</div><strong>61%</strong><small>/products 需要重点看来源质量。</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>咨询转化</span>${trendPill("+9", "up")}</div><strong>42</strong><small>/contact 转化效率最佳。</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>平均停留</span>${trendPill("+12秒", "up")}</div><strong>1分21秒</strong><small>内容阅读表现稳定。</small></article>
    </section>`;
}

function renderTrafficVisitorKpis() {
  return `<section class="analytics-kpi-grid five">
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>在线访客</span>${trendPill("实时", "up")}</div><strong>28</strong><small>最近 5 分钟仍在访问。</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>新访客</span>${trendPill("+13%", "up")}</div><strong>3,218</strong><small>本周期首次访问用户。</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>回访客</span>${trendPill("+7%", "up")}</div><strong>1,644</strong><small>品牌关注度保持增长。</small></article>
      <article class="analytics-kpi warn"><div class="analytics-kpi-head"><span>移动端占比</span>${trendPill("36%", "flat")}</div><strong>1,749</strong><small>移动端体验需要持续关注。</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>广东访客</span>${trendPill("31%", "up")}</div><strong>1,506</strong><small>核心地域流量集中。</small></article>
    </section>`;
}

function renderTrendMetricStrip() {
  return `<div class="analytics-trend-summary-strip">
    <div><span>浏览量(PV)</span><strong>12,480</strong><small>页面浏览量</small></div>
    <div><span>访客数(UV)</span><strong>4,862</strong><small>独立访客</small></div>
    <div><span>IP数</span><strong>3,916</strong><small>访问覆盖</small></div>
    <div><span>跳出率</span><strong>48%</strong><small>单页访问占比</small></div>
    <div><span>平均访问时长</span><strong>00:01:26</strong><small>本周期均值</small></div>
  </div>`;
}

function renderTrendMetricSelect(activeTrendMetric) {
  return `<label class="analytics-trend-select-wrap">指标：
    <select data-trend-select>
      ${Object.entries(analyticsTrendSeries).map(([id, item]) => `<option value="${id}" ${activeTrendMetric === id ? "selected" : ""}>${item.label}</option>`).join("")}
    </select>
  </label>`;
}

function renderSourceMetricStrip() {
  return `<div class="analytics-trend-summary-strip source-summary">
    <div><span>浏览量(PV)</span><strong>943,461</strong><small>全部来源访问量</small></div>
    <div><span>访客数(UV)</span><strong>464,875</strong><small>独立访客</small></div>
    <div><span>IP数</span><strong>455,316</strong><small>访问覆盖</small></div>
    <div><span>跳出率</span><strong>72.22%</strong><small>当前汇总</small></div>
    <div><span>平均访问时长</span><strong>00:02:58</strong><small>本周期均值</small></div>
  </div>`;
}

function renderPageMetricStrip() {
  return `<div class="analytics-trend-summary-strip page-summary">
    <div><span>浏览量(PV)</span><strong>952,359</strong><small>页面总浏览次数</small></div>
    <div><span>访客数(UV)</span><strong>750,259</strong><small>访问这些页面的人数</small></div>
    <div><span>贡献下游浏览量</span><strong>198,070</strong><small>继续访问其他页面次数</small></div>
    <div><span>退出页次数</span><strong>545,169</strong><small>访问在该页结束次数</small></div>
    <div><span>平均停留时长</span><strong>00:01:40</strong><small>页面阅读质量</small></div>
  </div>`;
}

function renderSourceChartPanel() {
  return `<div class="analytics-source-chart-panel">
    <div class="analytics-chart-primary-control">
      <label class="analytics-trend-select-wrap">指标：
        <select>
          <option>浏览量(PV)</option>
          <option>访客数(UV)</option>
          <option>IP数</option>
          <option>跳出率</option>
          <option>平均访问时长</option>
        </select>
      </label>
    </div>
    <div class="analytics-source-visual-grid">
      <div class="analytics-source-donut-card">
        <div class="analytics-source-donut"></div>
        <div class="analytics-source-donut-labels">
          <span class="direct">直接访问</span>
          <span class="search">搜索引擎</span>
          <span class="referral">外部链接</span>
          <span class="custom">自定义来源</span>
        </div>
      </div>
      <div class="analytics-source-multi-chart">
        <svg viewBox="0 0 720 310" role="img" aria-label="全部来源趋势图">
          <g class="analytics-chart-grid">
            <line x1="42" y1="36" x2="690" y2="36"></line>
            <line x1="42" y1="82" x2="690" y2="82"></line>
            <line x1="42" y1="128" x2="690" y2="128"></line>
            <line x1="42" y1="174" x2="690" y2="174"></line>
            <line x1="42" y1="220" x2="690" y2="220"></line>
            <line x1="42" y1="266" x2="690" y2="266"></line>
            <text x="34" y="40">60k</text>
            <text x="34" y="86">48k</text>
            <text x="34" y="132">36k</text>
            <text x="34" y="178">24k</text>
            <text x="34" y="224">12k</text>
            <text x="34" y="270">0</text>
          </g>
          <path class="source-line direct" d="M42,56 L78,104 L114,144 L150,164 L186,172 L222,166 L258,154 L294,128 L330,106 L366,108 L402,118 L438,108 L474,78 L510,68 L546,78 L582,96 L618,110 L654,256 L690,266"></path>
          <path class="source-line search" d="M42,130 L78,168 L114,190 L150,206 L186,210 L222,206 L258,202 L294,194 L330,182 L366,174 L402,178 L438,164 L474,132 L510,120 L546,130 L582,154 L618,178 L654,250 L690,266"></path>
          <path class="source-line referral" d="M42,206 L78,224 L114,238 L150,244 L186,246 L222,244 L258,242 L294,238 L330,228 L366,220 L402,224 L438,216 L474,204 L510,198 L546,198 L582,210 L618,230 L654,260 L690,266"></path>
          <path class="source-line custom" d="M42,260 L78,262 L114,263 L150,263 L186,262 L222,262 L258,261 L294,260 L330,259 L366,259 L402,260 L438,259 L474,258 L510,257 L546,257 L582,258 L618,260 L654,264 L690,266"></path>
          <g class="analytics-chart-x-axis">
            <text x="42" y="292">0</text>
            <text x="150" y="292">3</text>
            <text x="258" y="292">6</text>
            <text x="366" y="292">9</text>
            <text x="474" y="292">12</text>
            <text x="582" y="292">15</text>
            <text x="690" y="292">18</text>
          </g>
        </svg>
      </div>
    </div>
    <div class="analytics-source-legend">
      <span><i class="direct"></i>直接访问</span>
      <span><i class="search"></i>搜索引擎</span>
      <span><i class="referral"></i>外部链接</span>
      <span><i class="custom"></i>自定义来源</span>
    </div>
    <div class="analytics-custom-metric-row"><button type="button">自定义指标</button></div>
  </div>`;
}

function renderChartAxis() {
  return `<div class="analytics-chart-axis"><span>05/21</span><span>05/22</span><span>05/23</span><span>05/24</span><span>05/25</span><span>05/26</span><span>05/27</span></div>`;
}

function renderTrafficOverview() {
  const activeTrendMetric = analyticsTrendSeries[state.analyticsTrendMetric] ? state.analyticsTrendMetric : "pv";
  return `
    ${renderTrafficKpis()}
    <section class="analytics-overview-hero-grid">
      <article class="panel analytics-trend-panel analytics-jump-target" id="analytics-trend">
        <div class="analytics-panel-head">
          <div>
            <h2>PV / UV 趋势</h2>
            <p>保留趋势分析里的核心趋势图，默认按日展示近 7 天访问变化。</p>
          </div>
          <div class="analytics-panel-actions">
            ${Object.entries(analyticsTrendSeries).map(([id, item]) => `<button class="${activeTrendMetric === id ? "active" : ""}" data-trend-metric="${id}" type="button">${item.shortLabel}</button>`).join("")}
          </div>
        </div>
        <div class="analytics-chart-toolbar">
          <b>趋势图</b>
          <span>对比：</span>
          <button class="active" type="button">前一周期</button>
          <button type="button">上周同期</button>
        </div>
        ${renderOverviewTrendChart()}
      </article>

      ${renderOverviewInsightPanel()}
    </section>

    <section class="analytics-overview-module-grid">
      ${renderOverviewSourcePanel()}
      ${renderOverviewPagePanel()}
    </section>
    ${renderOverviewVisitorPanel()}`;
}

function renderOverviewInsightPanel() {
  return `<article class="panel analytics-overview-insight-panel">
    <div class="analytics-panel-head">
      <div>
        <h2>今日重点</h2>
        <p>从四个分析页抽取需要马上看的信号。</p>
      </div>
    </div>
    <div class="analytics-overview-alert-list">
      <div class="good"><b>趋势</b><span>PV 连续 7 天抬升，近 7 天环比 +18%。</span></div>
      <div><b>来源</b><span>直接访问贡献 60.5%，搜索引擎贡献 29.6%。</span></div>
      <div class="warn"><b>页面</b><span>/products 退出偏高，需检查首屏承接与 CTA。</span></div>
      <div><b>访客</b><span>移动端访问占 72%，但平均访问时长低于 PC。</span></div>
    </div>
    <div class="analytics-overview-mini-grid">
      <div><span>贡献下游浏览量</span><strong>198,070</strong><small>页面承接质量</small></div>
      <div><span>新访客占比</span><strong>50.08%</strong><small>拉新稳定</small></div>
    </div>
  </article>`;
}

function renderOverviewSourcePanel() {
  return `<article class="panel analytics-source-panel analytics-jump-target" id="analytics-source">
    <div class="analytics-panel-head">
      <div>
        <h2>来源概况</h2>
        <p>摘取来源分析里的来源类型占比和访问质量，只保留能判断渠道结构的指标。</p>
      </div>
      <div class="analytics-panel-actions"><button type="button">来源分析</button></div>
    </div>
    <div class="analytics-overview-source-body">
      <div class="analytics-source-list compact">
        <div><b>直接访问</b><span>输入网址、收藏夹、未知来源</span><i style="width: 88%"></i><strong>60.5%</strong></div>
        <div><b>搜索引擎</b><span>百度、360、Bing 等自然搜索</span><i style="width: 58%"></i><strong>29.6%</strong></div>
        <div><b>外部链接</b><span>合作站、媒体报道、行业目录</span><i style="width: 24%"></i><strong>9.7%</strong></div>
        <div><b>自定义来源</b><span>投放活动与私域渠道</span><i style="width: 8%"></i><strong>0.3%</strong></div>
      </div>
      <div class="analytics-overview-keywords">
        <span>搜索词 Top</span>
        <b>工业视觉检测系统</b>
        <b>自动化产线改造</b>
        <b>设备数据采集网关</b>
      </div>
    </div>
  </article>`;
}

function renderOverviewPagePanel() {
  return `<article class="panel analytics-pages-panel analytics-jump-target" id="analytics-pages">
    <div class="analytics-panel-head">
      <div>
        <h2>页面承接</h2>
        <p>摘取页面分析里的受访页面、入口页和退出异常，判断内容是否接住流量。</p>
      </div>
      <div class="analytics-panel-actions"><button type="button">页面分析</button></div>
    </div>
    <div class="analytics-page-rank-list">
      ${renderPageRankRow("1", "首页", "/", "受访 / 入口", "92%", ["PV", "17,589", "UV", "8,444", "下游", "18,156"], trendPill("+18%", "up"))}
      ${renderPageRankRow("2", "产品服务", "/products", "受访 / 转化", "58%", ["PV", "16,387", "UV", "12,344", "退出", "5,698"], trendPill("偏高", "down"), "watch")}
      ${renderPageRankRow("3", "解决方案", "/solutions", "受访 / 入口", "36%", ["PV", "12,459", "UV", "5,842", "停留", "03:59"], trendPill("优", "up"))}
    </div>
  </article>`;
}

function renderOverviewVisitorPanel() {
  return `<section class="panel analytics-overview-visitor-panel analytics-jump-target" id="analytics-visitor">
    <div class="analytics-panel-head">
      <div>
        <h2>访客画像</h2>
        <p>从访客分析里抽取地域、系统环境、新老访客三项核心信息。</p>
      </div>
      <div class="analytics-panel-actions"><button type="button">访客分析</button></div>
    </div>
    <div class="analytics-overview-visitor-grid">
      <div class="analytics-overview-visitor-block">
        <b>地域 Top</b>
        <div class="analytics-region-row"><b>广东</b><span>106,547 PV</span><i><u style="width:100%"></u></i><strong>11.29%</strong></div>
        <div class="analytics-region-row"><b>山东</b><span>62,827 PV</span><i><u style="width:59%"></u></i><strong>6.65%</strong></div>
        <div class="analytics-region-row"><b>北京</b><span>62,228 PV</span><i><u style="width:58%"></u></i><strong>6.59%</strong></div>
      </div>
      <div class="analytics-overview-visitor-block device">
        <b>设备环境</b>
        <div class="analytics-env-row"><div><b>移动端浏览器</b><span>691,266 PV · 74.44% 跳出</span></div><i><u style="width:72%"></u></i><strong>72%</strong></div>
        <div class="analytics-env-row"><div><b>计算机端浏览器</b><span>267,585 PV · 62.46% 跳出</span></div><i><u style="width:28%"></u></i><strong>28%</strong></div>
      </div>
      <div class="analytics-overview-visitor-block split">
        <b>新老访客</b>
        <div class="analytics-overview-split">
          <span><strong>50.08%</strong><small>新访客</small></span>
          <span><strong>49.92%</strong><small>老访客</small></span>
        </div>
        <p>老访客平均访问时长 00:03:46，高于新访客 00:02:04。</p>
      </div>
    </div>
  </section>`;
}

function renderPageRankRow(rank, title, path, type, width, metrics, pill, tone = "") {
  return `<div class="analytics-page-rank-row ${tone}">
    <em>${rank}</em>
    <div class="analytics-page-rank-main">
      <b>${title}</b>
      <span>${path} · ${type}</span>
      <i><u style="width:${width}"></u></i>
    </div>
    <dl><dt>${metrics[0]}</dt><dd>${metrics[1]}</dd><dt>${metrics[2]}</dt><dd>${metrics[3]}</dd><dt>${metrics[4]}</dt><dd>${metrics[5]}</dd></dl>
    ${pill}
  </div>`;
}

function renderTrafficTrendPage() {
  const activeTrendMetric = analyticsTrendSeries[state.analyticsTrendMetric] ? state.analyticsTrendMetric : "pv";
  return `
    <section class="panel analytics-trend-workbench">
      <div class="analytics-panel-head">
        <div>
          <h2>趋势分析 <small>(2026/05/21 - 2026/05/27)</small></h2>
          <p>按时间、来源、设备、地域和访客类型查看核心指标趋势。</p>
        </div>
        <div class="analytics-panel-actions"><button type="button">下载</button><button type="button">收起筛选</button></div>
      </div>
      ${renderTrendMetricStrip()}
      <div class="analytics-trend-chart-shell">
        <div class="analytics-panel-head">
          <div class="analytics-chart-primary-control">
            ${renderTrendMetricSelect(activeTrendMetric)}
          </div>
          <div class="analytics-panel-actions">
            ${Object.entries(analyticsTrendSeries).map(([id, item]) => `<button class="${activeTrendMetric === id ? "active" : ""}" data-trend-metric="${id}" type="button">${item.shortLabel}</button>`).join("")}
          </div>
        </div>
        ${renderOverviewTrendChart()}
        <div class="analytics-chart-compare-row">
          <span>对比：</span>
          <label><input type="checkbox" checked /> 前一日</label>
          <label><input type="checkbox" /> 上周同期</label>
        </div>
        <div class="analytics-custom-metric-row">
          <button type="button">自定义指标</button>
        </div>
      </div>
    </section>
    <section class="panel analytics-table-panel">
      <div class="analytics-panel-head">
        <div>
          <h2>详细数据</h2>
          <p>按日展示明细，不展开到每小时。</p>
        </div>
        <div class="analytics-panel-actions"><button type="button">导出 CSV</button><button type="button">列设置</button></div>
      </div>
      ${renderTrafficDailyTable()}
    </section>`;
}

function renderTrafficDailyTable() {
  return `<table class="analytics-table">
    <thead>
      <tr><th rowspan="2">序号</th><th rowspan="2">日期</th><th colspan="3">网站基础指标</th><th colspan="2">流量质量指标</th></tr>
      <tr><th>浏览量(PV)</th><th>访客数(UV)</th><th>IP数</th><th>跳出率</th><th>平均访问时长</th></tr>
    </thead>
    <tbody>
      <tr><td>1</td><td>2026/05/21</td><td>1,420</td><td>584</td><td>492</td><td>52%</td><td>00:01:09</td></tr>
      <tr><td>2</td><td>2026/05/22</td><td>1,586</td><td>642</td><td>516</td><td>49%</td><td>00:01:18</td></tr>
      <tr><td>3</td><td>2026/05/23</td><td>1,732</td><td>708</td><td>572</td><td>47%</td><td>00:01:23</td></tr>
      <tr><td>4</td><td>2026/05/24</td><td>1,806</td><td>721</td><td>591</td><td>46%</td><td>00:01:26</td></tr>
      <tr><td>5</td><td>2026/05/25</td><td>1,886</td><td>739</td><td>604</td><td>48%</td><td>00:01:25</td></tr>
      <tr><td>6</td><td>2026/05/26</td><td>1,974</td><td>773</td><td>628</td><td>45%</td><td>00:01:31</td></tr>
      <tr><td>7</td><td>2026/05/27</td><td>2,076</td><td>695</td><td>513</td><td>47%</td><td>00:01:29</td></tr>
      <tr class="analytics-summary-row"><td></td><td>当前汇总</td><td>12,480</td><td>4,862</td><td>3,916</td><td>48%</td><td>00:01:26</td></tr>
    </tbody>
  </table>`;
}

function renderTrafficSourcePage() {
  return `
    <section class="panel analytics-source-workbench">
      <div class="analytics-panel-head">
        <div>
          <h2>全部来源 <small>(2026/05/28)</small></h2>
          <p>按来源类型和来源网站查看访问贡献、流量质量和趋势变化。</p>
        </div>
        <div class="analytics-panel-actions"><button type="button">下载</button><button type="button">收起筛选</button></div>
      </div>
      <div class="analytics-source-warning">
        <b>提示</b>
        <span>因浏览器隐私策略升级，第三方统计工具可能无法获取完整上游地址。若需要排除“已屏蔽”数据，可在上方“智能屏蔽数据”中选择“不包含”。</span>
      </div>
      <div class="analytics-source-tabs">
        <button class="active" type="button">来源类型</button>
        <button type="button">来源网站</button>
      </div>
      ${renderSourceMetricStrip()}
      ${renderSourceChartPanel()}
    </section>
    <section class="panel analytics-table-panel">
      <div class="analytics-panel-head">
        <div>
          <h2>来源明细</h2>
          <p>按来源类型汇总，指标分为网站基础指标和流量质量指标。</p>
        </div>
        <div class="analytics-panel-actions"><button type="button">导出 CSV</button><button type="button">列设置</button></div>
      </div>
      <table class="analytics-table analytics-source-type-table">
        <thead>
          <tr><th rowspan="2"></th><th rowspan="2">序号</th><th rowspan="2">来源类型</th><th colspan="3">网站基础指标</th><th colspan="2">流量质量指标</th></tr>
          <tr><th>浏览量(PV)</th><th>访客数(UV)</th><th>IP数</th><th>跳出率</th><th>平均访问时长</th></tr>
        </thead>
        <tbody>
          <tr><td><button class="analytics-row-toggle" type="button">+</button></td><td>1</td><td><b>直接访问</b></td><td>570,416</td><td>252,210</td><td>247,195</td><td>64.52%</td><td>00:03:52</td></tr>
          <tr><td><button class="analytics-row-toggle" type="button">+</button></td><td>2</td><td><b class="analytics-link-text">搜索引擎</b></td><td>278,844</td><td>165,408</td><td>160,566</td><td>82.32%</td><td>00:01:55</td></tr>
          <tr><td><button class="analytics-row-toggle" type="button">+</button></td><td>3</td><td><b class="analytics-link-text">外部链接</b></td><td>91,187</td><td>45,236</td><td>45,537</td><td>72.67%</td><td>00:02:21</td></tr>
          <tr><td></td><td>4</td><td><b>自定义来源</b></td><td>3,014</td><td>2,021</td><td>2,018</td><td>82.12%</td><td>00:02:13</td></tr>
          <tr class="analytics-summary-row"><td></td><td></td><td>当前汇总</td><td>943,461</td><td>464,875</td><td>455,316</td><td>72.22%</td><td>00:02:58</td></tr>
        </tbody>
      </table>
    </section>`;
}

function renderPageUrlRows() {
  const rows = [
    ["1", "https://demo.geo-studio.cn/", "17,589", "8,444", "18,156", "1,769", "00:01:01"],
    ["2", "https://demo.geo-studio.cn/products", "16,387", "12,344", "2,823", "5,698", "00:00:57"],
    ["3", "https://demo.geo-studio.cn/solutions", "12,459", "5,842", "2,563", "5,826", "00:03:59"],
    ["4", "https://demo.geo-studio.cn/cases", "12,065", "6,794", "3,480", "5,923", "00:03:22"],
    ["5", "https://demo.geo-studio.cn/contact", "11,446", "9,249", "0", "6,343", "00:00:43"],
    ["6", "https://demo.geo-studio.cn/geo", "11,171", "6,160", "3,047", "4,953", "00:02:26"],
    ["7", "https://demo.geo-studio.cn/blog/ai-search", "10,744", "10,050", "364", "9,399", "00:01:39"],
    ["8", "https://demo.geo-studio.cn/pricing", "10,116", "8,424", "2,009", "6,056", "00:01:16"],
    ["9", "https://demo.geo-studio.cn/about", "10,105", "8,877", "510", "6,985", "00:01:13"],
    ["10", "https://demo.geo-studio.cn/help", "7,792", "6,434", "864", "5,903", "00:01:34"],
    ["11", "https://demo.geo-studio.cn/news/industry-report", "7,530", "4,388", "2,787", "2,896", "00:03:02"],
    ["12", "https://demo.geo-studio.cn/source/partner", "6,915", "5,032", "2,592", "1,295", "00:01:25"]
  ];
  return rows.map(([rank, url, pv, uv, downstream, exits, stay]) => `<tr>
    <td>${rank}</td>
    <td><b class="analytics-page-url">${url}</b></td>
    <td>${pv}</td>
    <td>${uv}</td>
    <td>${downstream}</td>
    <td>${exits}</td>
    <td>${stay}</td>
  </tr>`).join("");
}

function renderTrafficPagesPage() {
  const activePageReport = analyticsPageReportTabs.find(tab => tab.id === state.analyticsPageReportTab) || analyticsPageReportTabs[0];
  return `
    <section class="panel analytics-page-workbench">
      <div class="analytics-panel-head">
        <div>
          <h2>${activePageReport.title} <small>(2026/05/28)</small></h2>
          <p>${activePageReport.desc}</p>
        </div>
        <div class="analytics-panel-actions"><button type="button">下载</button><button type="button">收起筛选</button></div>
      </div>
      <div class="analytics-source-warning">
        <b>提示</b>
        <span>智能屏蔽数据会影响当前汇总。选择“不包含”后，疑似异常访问、机器流量和黑灰产访问会从本报告中排除。</span>
      </div>
      <div class="analytics-source-tabs analytics-page-analysis-tabs">
        ${analyticsPageReportTabs.map(tab => `<button class="${activePageReport.id === tab.id ? "active" : ""}" data-page-report-tab="${tab.id}" type="button">${tab.label}</button>`).join("")}
      </div>
      ${renderPageMetricStrip()}
      <div class="analytics-custom-metric-row">
        <button type="button">自定义指标</button>
      </div>
    </section>
    <section class="panel analytics-table-panel analytics-page-table-panel">
      <div class="analytics-panel-head">
        <div>
          <h2>${activePageReport.tableTitle}</h2>
          <p>${activePageReport.tableDesc}</p>
        </div>
        <div class="analytics-panel-actions"><button type="button">导出 CSV</button><button type="button">列设置</button></div>
      </div>
      <div class="analytics-table-scroll">
        <table class="analytics-table analytics-page-url-table">
          <thead>
            <tr><th rowspan="2">序号</th><th rowspan="2">页面URL</th><th colspan="2">网站基础指标</th><th colspan="3">流量质量指标</th></tr>
            <tr><th>浏览量(PV)</th><th>访客数(UV)</th><th>贡献下游浏览量</th><th>退出页次数</th><th>平均停留时长</th></tr>
          </thead>
          <tbody>
            ${renderPageUrlRows()}
            <tr class="analytics-summary-row"><td></td><td>当前汇总</td><td>174,787</td><td>121,057</td><td>43,321</td><td>88,702</td><td>00:01:52</td></tr>
          </tbody>
        </table>
      </div>
      <div class="analytics-pagination">
        <label>显示行数：<select><option>20</option><option>50</option><option>100</option></select></label>
        <button class="active" type="button">1</button><button type="button">2</button><button type="button">3</button><button type="button">4</button><button type="button">5</button>
        <span>...</span><button type="button">500</button>
        <label>跳转至第 <input type="text" value="" aria-label="页码" /> 页</label><button type="button">确定</button>
      </div>
      <div class="analytics-page-tips">
        <b>小贴士</b>
        <span>${activePageReport.tip}</span>
      </div>
    </section>`;
}

function renderVisitorMetricStrip() {
  return `<div class="analytics-trend-summary-strip visitor-summary">
    <div><span>浏览量(PV)</span><strong>960,760</strong><small>全部访客访问量</small></div>
    <div><span>访客数(UV)</span><strong>457,532</strong><small>独立访客人数</small></div>
    <div><span>IP数</span><strong>445,586</strong><small>访问覆盖</small></div>
    <div><span>跳出率</span><strong>72.14%</strong><small>当前汇总</small></div>
    <div><span>平均访问时长</span><strong>00:02:59</strong><small>访客平均停留</small></div>
  </div>`;
}

function getVisitorRegionRows() {
  const provinceRows = [
    ["1", "广东", "106,547", "51,960", "48,660", "71%", "00:03:04", "11.29%"],
    ["2", "山东", "62,827", "33,727", "31,656", "74.64%", "00:02:43", "6.65%"],
    ["3", "北京", "62,228", "28,988", "27,727", "69.96%", "00:03:20", "6.59%"],
    ["4", "江苏", "61,923", "31,518", "28,960", "73.36%", "00:03:03", "6.56%"],
    ["5", "浙江", "52,843", "26,300", "26,126", "70.95%", "00:03:03", "5.6%"],
    ["6", "安徽", "47,773", "17,488", "16,259", "73.97%", "00:03:03", "5.06%"],
    ["7", "河南", "47,189", "26,166", "25,794", "74.59%", "00:02:39", "5%"],
    ["8", "河北", "44,363", "24,184", "23,981", "74.26%", "00:02:33", "4.7%"],
    ["9", "四川", "39,269", "20,147", "19,842", "72.06%", "00:02:59", "4.16%"],
    ["10", "福建", "34,442", "16,480", "16,355", "70.3%", "00:03:08", "3.65%"]
  ];
  const countryRows = [
    ["1", "中国", "811,286", "404,930", "392,844", "72.24%", "00:02:57", "84.44%"],
    ["2", "美国", "36,122", "16,450", "15,906", "68.32%", "00:03:22", "3.76%"],
    ["3", "新加坡", "18,684", "8,913", "8,704", "66.18%", "00:03:46", "1.94%"],
    ["4", "中国香港", "14,206", "6,912", "6,704", "70.22%", "00:02:48", "1.48%"],
    ["5", "日本", "12,857", "5,840", "5,712", "73.84%", "00:02:31", "1.34%"],
    ["6", "德国", "8,944", "4,268", "4,110", "69.8%", "00:03:09", "0.93%"]
  ];
  return state.analyticsVisitorRegionMode === "country" ? countryRows : provinceRows;
}

function renderVisitorRegionPanel() {
  const rows = getVisitorRegionRows();
  const mode = state.analyticsVisitorRegionMode === "country" ? "country" : "province";
  const maxPv = Number(rows[0][2].replace(/,/g, ""));
  const rankRows = rows.slice(0, 6).map(row => {
    const width = Math.max(10, Math.round(Number(row[2].replace(/,/g, "")) / maxPv * 100));
    return `<div class="analytics-region-row">
      <b>${row[1]}</b><span>${row[2]} PV</span><i><u style="width:${width}%"></u></i><strong>${row[7]}</strong>
    </div>`;
  }).join("");
  return `<section class="panel analytics-visitor-region-panel">
    <div class="analytics-panel-head">
      <div>
        <h2>地域分布</h2>
        <p>查看访客来自哪些地域，核心指标沿用 PV、UV、IP、跳出率和平均访问时长。</p>
      </div>
      <div class="analytics-panel-actions">
        <button class="${mode === "province" ? "active" : ""}" data-visitor-region-mode="province" type="button">按省</button>
        <button class="${mode === "country" ? "active" : ""}" data-visitor-region-mode="country" type="button">按国家</button>
      </div>
    </div>
    <div class="analytics-visitor-panel-toolbar">
      <label class="analytics-trend-select-wrap">指标：
        <select><option>浏览量(PV)</option><option>访客数(UV)</option><option>IP数</option><option>跳出率</option><option>平均访问时长</option></select>
      </label>
      <button type="button">自定义指标</button>
    </div>
    <div class="analytics-region-panel-body">
      <div class="analytics-visitor-map">
        <strong>${mode === "province" ? "省份热度" : "国家热度"}</strong>
        <span class="analytics-map-dot gd"><b>${rows[0][1]}</b><i>${rows[0][2]}</i></span>
        <span class="analytics-map-dot sd"><b>${rows[1][1]}</b><i>${rows[1][2]}</i></span>
        <span class="analytics-map-dot bj"><b>${rows[2][1]}</b><i>${rows[2][2]}</i></span>
        <span class="analytics-map-dot js"><b>${rows[3][1]}</b><i>${rows[3][2]}</i></span>
        <em>当前展示 ${mode === "province" ? "省份" : "国家"} 维度，支持继续下钻到地级市。</em>
      </div>
      <div class="analytics-region-rank">
        ${rankRows}
      </div>
    </div>
  </section>`;
}

function renderVisitorRegionTablePanel() {
  const rows = getVisitorRegionRows();
  const mode = state.analyticsVisitorRegionMode === "country" ? "country" : "province";
  return `<section class="panel analytics-table-panel analytics-visitor-region-detail-panel">
    <div class="analytics-panel-head">
      <div>
        <h2>地域明细</h2>
        <p>单独横向展示完整地域数据，避免地域图表区被明细表拉长。</p>
      </div>
      <div class="analytics-panel-actions">
        <button class="${mode === "province" ? "active" : ""}" data-visitor-region-mode="province" type="button">按省</button>
        <button class="${mode === "country" ? "active" : ""}" data-visitor-region-mode="country" type="button">按国家</button>
        <button type="button">导出 CSV</button>
      </div>
    </div>
    <div class="analytics-table-scroll">
      <table class="analytics-table analytics-visitor-region-table">
        <thead>
          <tr><th rowspan="2">序号</th><th rowspan="2">地域</th><th colspan="3">网站基础指标</th><th colspan="2">流量质量指标</th></tr>
          <tr><th>浏览量(PV)</th><th>访客数(UV)</th><th>IP数</th><th>跳出率</th><th>平均访问时长</th></tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr><td>${row[0]}</td><td><b>${row[1]}</b><span>占比 ${row[7]}</span></td><td>${row[2]}</td><td>${row[3]}</td><td>${row[4]}</td><td>${row[5]}</td><td>${row[6]}</td></tr>`).join("")}
          <tr class="analytics-summary-row"><td></td><td>当前汇总</td><td>${mode === "province" ? "811,286" : "902,099"}</td><td>${mode === "province" ? "404,930" : "447,313"}</td><td>${mode === "province" ? "392,844" : "433,980"}</td><td>72.24%</td><td>00:02:57</td></tr>
        </tbody>
      </table>
    </div>
  </section>`;
}

function getVisitorEnvironmentData() {
  const data = {
    browser: {
      label: "浏览器",
      rows: [
        ["1", "移动端浏览器", "691,266", "377,876", "379,019", "74.44%", "00:02:22", 72],
        ["2", "计算机端浏览器", "267,585", "78,389", "67,509", "62.46%", "00:05:35", 28]
      ],
      insight: "移动端浏览器贡献大部分访问，但 PC 端平均访问时长更高。"
    },
    device: {
      label: "网络设备类型",
      rows: [
        ["1", "移动设备", "691,266", "377,876", "379,019", "74.44%", "00:02:22", 72],
        ["2", "计算机", "267,585", "78,389", "67,509", "62.46%", "00:05:35", 28]
      ],
      insight: "移动端流量占主导，移动端首屏和咨询按钮需要优先验证。"
    },
    resolution: {
      label: "屏幕分辨率",
      rows: [
        ["1", "390 × 844", "182,420", "98,216", "97,804", "75.02%", "00:02:06", 34],
        ["2", "1920 × 1080", "146,338", "42,586", "39,913", "61.86%", "00:05:48", 27],
        ["3", "375 × 812", "118,904", "65,440", "64,905", "76.21%", "00:02:01", 22],
        ["4", "1440 × 900", "84,512", "25,791", "24,118", "63.08%", "00:04:52", 16]
      ],
      insight: "高分辨率 PC 访问质量更好，小屏移动端跳出率偏高。"
    }
  };
  return data[state.analyticsVisitorEnvDimension] || data.browser;
}

function renderVisitorEnvironmentPanel() {
  const active = state.analyticsVisitorEnvDimension || "browser";
  const env = getVisitorEnvironmentData();
  return `<section class="panel analytics-visitor-env-panel">
    <div class="analytics-panel-head">
      <div>
        <h2>系统环境</h2>
        <p>合并浏览器、设备类型、屏幕分辨率等环境维度，用来判断体验差异。</p>
      </div>
      <div class="analytics-panel-actions">
        ${["browser", "device", "resolution"].map(id => `<button class="${active === id ? "active" : ""}" data-visitor-env-dimension="${id}" type="button">${{ browser: "浏览器", device: "设备", resolution: "分辨率" }[id]}</button>`).join("")}
      </div>
    </div>
    <div class="analytics-visitor-panel-toolbar">
      <label class="analytics-trend-select-wrap">指标：
        <select><option>浏览量(PV)</option><option>访客数(UV)</option><option>IP数</option><option>跳出率</option><option>平均访问时长</option></select>
      </label>
      <span>${env.insight}</span>
    </div>
    <div class="analytics-env-panel-body">
      <div class="analytics-env-bars">
        ${env.rows.map(row => `<div class="analytics-env-row">
          <div><b>${row[1]}</b><span>${row[2]} PV · ${row[5]} 跳出</span></div>
          <i><u style="width:${row[7]}%"></u></i><strong>${row[7]}%</strong>
        </div>`).join("")}
      </div>
      <div class="analytics-env-summary">
        <b>${env.label}访问质量</b>
        <strong>${env.rows[0][2]}</strong>
        <span>${env.rows[0][1]} 为当前最大访问来源，平均访问时长 ${env.rows[0][6]}。</span>
      </div>
    </div>
    <div class="analytics-table-scroll">
      <table class="analytics-table analytics-visitor-env-table">
        <thead><tr><th>${env.label}</th><th>浏览量(PV)</th><th>访客数(UV)</th><th>IP数</th><th>跳出率</th><th>平均访问时长</th></tr></thead>
        <tbody>
          ${env.rows.map(row => `<tr><td><b>${row[1]}</b></td><td>${row[2]}</td><td>${row[3]}</td><td>${row[4]}</td><td>${row[5]}</td><td>${row[6]}</td></tr>`).join("")}
          <tr class="analytics-summary-row"><td>当前汇总</td><td>958,851</td><td>456,265</td><td>446,528</td><td>72.13%</td><td>00:02:59</td></tr>
        </tbody>
      </table>
    </div>
  </section>`;
}

function renderVisitorTopList(title, rows) {
  return `<div class="analytics-visitor-top-list">
    <b>${title}</b>
    ${rows.map((row, index) => `<div><em>${index + 1}</em><span>${row[0]}</span><strong>${row[1]}</strong></div>`).join("")}
  </div>`;
}

function renderVisitorTypePanel() {
  const newSources = [["直接访问", "237,423"], ["百度", "117,246"], ["产品优化页", "17,051"], ["360搜索", "10,705"], ["小时趋势页", "5,775"]];
  const oldSources = [["直接访问", "343,118"], ["百度", "135,548"], ["产品优化页", "12,391"], ["360搜索", "6,341"], ["站点代码页", "3,814"]];
  const newEntrances = [["/web/visit/attribute", "6,248"], ["/analytics/distribution", "5,826"], ["/web/optes", "4,605"], ["/web/visit/district", "4,500"], ["/trans/basicsetting", "3,774"]];
  const oldEntrances = [["/analytics/conversion/overview", "10,130"], ["/analytics/apply", "4,611"], ["/analytics/distribution", "4,472"], ["/web/source/all", "4,421"], ["/web/custom/pageclick", "4,028"]];
  return `<section class="panel analytics-visitor-type-panel">
    <div class="analytics-panel-head">
      <div>
        <h2>新老访客</h2>
        <p>对比新访客和老访客的访问质量、来源网站和入口页表现。</p>
      </div>
      <div class="analytics-panel-actions"><button type="button">下载</button><button type="button">自定义指标</button></div>
    </div>
    <div class="analytics-visitor-type-grid">
      <article class="analytics-visitor-segment-card new">
        <div class="analytics-segment-meter" style="--value:50.08%"><strong>50.08%</strong><span>新访客</span></div>
        <div class="analytics-visitor-segment-metrics">
          <div><span>浏览量</span><b>425,086</b></div>
          <div><span>访客数</span><b>229,139</b></div>
          <div><span>跳出率</span><b>73.68%</b></div>
          <div><span>平均访问时长</span><b>00:02:04</b></div>
          <div><span>平均访问页数</span><b>1.64</b></div>
        </div>
      </article>
      <article class="analytics-visitor-segment-card returning">
        <div class="analytics-segment-meter" style="--value:49.92%"><strong>49.92%</strong><span>老访客</span></div>
        <div class="analytics-visitor-segment-metrics">
          <div><span>浏览量</span><b>535,674</b></div>
          <div><span>访客数</span><b>228,393</b></div>
          <div><span>跳出率</span><b>70.81%</b></div>
          <div><span>平均访问时长</span><b>00:03:46</b></div>
          <div><span>平均访问页数</span><b>1.78</b></div>
        </div>
      </article>
    </div>
    <div class="analytics-visitor-top-grid">
      ${renderVisitorTopList("新访客来源 TOP 5", newSources)}
      ${renderVisitorTopList("老访客来源 TOP 5", oldSources)}
      ${renderVisitorTopList("新访客入口页 TOP 5", newEntrances)}
      ${renderVisitorTopList("老访客入口页 TOP 5", oldEntrances)}
    </div>
  </section>`;
}

function renderTrafficVisitorPage() {
  return `
    <section class="panel analytics-visitor-workbench">
      <div class="analytics-panel-head">
        <div>
          <h2>访客分析 <small>(2026/05/28)</small></h2>
          <p>合并地域分布、系统环境和新老访客三类报表，用一个页面判断访客来源、设备体验和访问质量。</p>
        </div>
        <div class="analytics-panel-actions"><button type="button">下载</button><button type="button">收起筛选</button></div>
      </div>
      ${renderVisitorMetricStrip()}
    </section>
    <section class="analytics-visitor-combined-grid">
      ${renderVisitorRegionPanel()}
      ${renderVisitorEnvironmentPanel()}
    </section>
    ${renderVisitorRegionTablePanel()}
    ${renderVisitorTypePanel()}
    <section class="panel analytics-table-panel analytics-visitor-detail-panel">
      <div class="analytics-panel-head">
        <div>
          <h2>新老访客明细</h2>
          <p>按新老访客汇总基础指标和流量质量指标，保留可导出的表格口径。</p>
        </div>
        <div class="analytics-panel-actions"><button type="button">导出 CSV</button><button type="button">列设置</button></div>
      </div>
      <div class="analytics-table-scroll">
        <table class="analytics-table analytics-visitor-type-table">
          <thead>
            <tr><th rowspan="2">新老访客</th><th colspan="3">网站基础指标</th><th colspan="3">流量质量指标</th></tr>
            <tr><th>浏览量(PV)</th><th>访客数(UV)</th><th>IP数</th><th>跳出率</th><th>平均访问时长</th><th>平均访问页数</th></tr>
          </thead>
          <tbody>
            <tr><td><b>老访客</b></td><td>535,674</td><td>228,393</td><td>229,805</td><td>70.81%</td><td>00:03:46</td><td>1.78</td></tr>
            <tr><td><b>新访客</b></td><td>425,086</td><td>229,139</td><td>215,781</td><td>73.68%</td><td>00:02:04</td><td>1.64</td></tr>
            <tr class="analytics-summary-row"><td>当前汇总</td><td>960,760</td><td>457,532</td><td>445,586</td><td>72.14%</td><td>00:02:59</td><td>1.71</td></tr>
          </tbody>
        </table>
      </div>
    </section>`;
}

function renderAnalyticsGeoStats() {
  return `
    <section class="analytics-note">
      <b>G</b>
      <span>先把 GEO 统计做成“页面评分”：AI 是否真实引用、提及某个页面不一定稳定可抓，当前优先展示每个页面的 GEO 优化分数和改进项。</span>
    </section>
    <section class="analytics-kpi-grid four">
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>GEO 总分</span>${trendPill("+4分", "up")}</div><strong>82</strong><small>全站页面平均分</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>已评分页面</span>${trendPill("+2页", "up")}</div><strong>32 / 36</strong><small>还有 4 个页面待扫描</small></article>
      <article class="analytics-kpi warn"><div class="analytics-kpi-head"><span>低分页面</span>${trendPill("需处理", "down")}</div><strong>6</strong><small>低于 70 分，优先处理</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>AI Bot 抓取</span>${trendPill("+21%", "up")}</div><strong>186</strong><small>作为辅助观察指标</small></article>
    </section>
    <section class="analytics-detail-grid">
      <article class="panel">
        <div class="analytics-panel-head"><div><span>评分模型</span><h2>GEO 页面评分规则</h2></div>${miniTrend("up")}</div>
        <div class="analytics-geo-score large">
          <div class="analytics-meter" style="--value: 302deg"><strong>84</strong><span>产品页 GEO 分</span></div>
          <div class="analytics-metric-list score-rules">
            <div><span>可抓取性 25%</span><b>22</b><em style="width:88%"></em></div>
            <div><span>问答覆盖 25%</span><b>18</b><em style="width:72%"></em></div>
            <div><span>品牌实体 20%</span><b>17</b><em style="width:85%"></em></div>
            <div><span>结构化内容 20%</span><b>14</b><em style="width:70%"></em></div>
            <div><span>可信证据 10%</span><b>7</b><em style="width:66%"></em></div>
          </div>
        </div>
      </article>
      <article class="panel analytics-table-panel">
        <div class="analytics-panel-head"><div><span>页面排行</span><h2>GEO 分数分布</h2></div>${miniTrend("flat")}</div>
        <table class="analytics-table">
          <thead><tr><th>页面</th><th>分数</th><th>主要短板</th><th>趋势</th></tr></thead>
          <tbody>
            <tr><td><b>首页</b><span>/</span></td><td><em class="ok">92</em></td><td>可继续补案例摘要</td><td>${miniTrend("up")}</td></tr>
            <tr><td><b>产品服务</b><span>/products</span></td><td><em class="warn">74</em></td><td>缺参数和 FAQ</td><td>${miniTrend("flat")}</td></tr>
            <tr><td><b>解决方案</b><span>/solutions</span></td><td><em class="warn">66</em></td><td>场景问题覆盖不足</td><td>${miniTrend("down")}</td></tr>
            <tr><td><b>FAQ</b><span>未发布</span></td><td><em class="risk">38</em></td><td>需要创建页面</td><td>${miniTrend("flat")}</td></tr>
          </tbody>
        </table>
      </article>
    </section>`;
}

function renderAnalyticsSeoStats() {
  return `
    <section class="analytics-kpi-grid four">
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>搜索展现</span>${trendPill("+16%", "up")}</div><strong>18,620</strong><small>来自搜索结果页曝光</small></article>
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>搜索点击</span>${trendPill("+9%", "up")}</div><strong>932</strong><small>自然搜索点击量</small></article>
      <article class="analytics-kpi warn"><div class="analytics-kpi-head"><span>CTR</span>${trendPill("偏低", "down")}</div><strong>5.0%</strong><small>点击率，标题可优化</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>平均排名</span>${trendPill("+3位", "up")}</div><strong>12.4</strong><small>产品词仍在第二页附近</small></article>
    </section>
    <section class="analytics-detail-grid">
      <article class="panel">
        <div class="analytics-panel-head"><div><span>搜索表现</span><h2>关键词基础统计</h2></div>${miniTrend("up")}</div>
        <div class="analytics-keyword-list">
          <div><b>工业视觉检测系统</b><span>产品词</span><strong>3,420</strong><em>展现</em><strong>Top 12</strong></div>
          <div><b>自动化产线改造</b><span>方案词</span><strong>2,186</strong><em>展现</em><strong>Top 18</strong></div>
          <div><b>设备数据采集网关</b><span>产品词</span><strong>1,642</strong><em>展现</em><strong>Top 9</strong></div>
          <div><b>智能制造解决方案</b><span>行业词</span><strong>1,208</strong><em>展现</em><strong>Top 24</strong></div>
        </div>
      </article>
      <article class="panel">
        <div class="analytics-panel-head"><div><span>收录情况</span><h2>页面收录统计</h2></div>${miniTrend("flat")}</div>
        <div class="analytics-source-list">
          <div><b>已收录页面</b><span>搜索引擎可展示的页面</span><i style="width: 67%"></i><strong>24 / 36</strong></div>
          <div><b>Sitemap 提交</b><span>sitemap.xml 正常生成</span><i style="width: 100%"></i><strong>正常</strong></div>
          <div><b>robots.txt</b><span>未阻止核心页面抓取</span><i style="width: 100%"></i><strong>正常</strong></div>
          <div><b>未收录重点页</b><span>产品服务、案例、FAQ 需关注</span><i style="width: 36%"></i><strong>3</strong></div>
        </div>
      </article>
    </section>
    <section class="panel analytics-action-panel">
      <div class="analytics-panel-head"><div><span>SEO 问题</span><h2>基础页面健康检查</h2></div>${miniTrend("down")}</div>
      <div class="analytics-action-list">
        <div class="analytics-action-row"><span class="analytics-tag seo">SEO</span><b>8 个页面 Title 重复</b><small>影响搜索结果识别，建议按页面主题生成唯一标题。</small><button type="button">处理</button></div>
        <div class="analytics-action-row"><span class="analytics-tag seo">SEO</span><b>11 张图片缺少 alt</b><small>影响图片理解和页面语义，建议自动补充产品或场景描述。</small><button type="button">处理</button></div>
        <div class="analytics-action-row"><span class="analytics-tag seo">SEO</span><b>FAQ 页面未发布</b><small>影响长尾问题词覆盖，也会影响 GEO 问答覆盖。</small><button type="button">处理</button></div>
      </div>
    </section>`;
}

function renderSettingsPage() {
  return `${pageHead("账号团队套餐", "成员、权限、额度、账单和企业设置")}
    <section class="grid-2"><div class="panel"><h2>企业空间</h2><div class="company-card"><b>示例智能制造有限公司</b><span>企业版 / 3 个站点 / 8 名成员</span></div>${progress("AI 生成额度",64,"mid")}${progress("GEO 扫描额度",48,"ok")}${progress("资料存储空间",72,"mid")}</div><div class="panel"><h2>团队成员</h2><table><tbody><tr><td>张经理</td><td>管理员</td><td>全部权限</td></tr><tr><td>李运营</td><td>内容编辑</td><td>编辑/发布</td></tr><tr><td>王销售</td><td>线索跟进</td><td>只读/CRM</td></tr></tbody></table></div></section>`;
}

function renderCaptchaModal() {
  return `<div class="modal" id="captchaModal"><div class="modal-panel captcha-panel"><div class="modal-head"><div><h3>图形验证码</h3><p>输入图形验证码后将发送短信验证码</p></div><button class="icon-btn modal-close" type="button">${icon("i-close")}</button></div><div class="captcha-img">A8K2</div><div class="field-line"><input id="captchaInput" maxlength="4" placeholder="请输入图形验证码" /></div><p class="error" id="captchaError"></p><button class="primary-btn solid" id="captchaSubmit" type="button">确认发送</button></div></div>`;
}

function bindAnalyticsTrendInteractions() {
  const chart = $("[data-analytics-trend-chart]");
  if (!chart) return;
  const metric = chart.dataset.metric;
  const series = analyticsTrendSeries[metric] || analyticsTrendSeries.pv;
  const hoverGroup = $("[data-chart-hover-svg]", chart);
  const hoverLine = $("[data-hover-line]", chart);
  const currentDot = $("[data-hover-current]", chart);
  const compareDot = $("[data-hover-compare]", chart);
  const tooltip = $("[data-chart-tooltip]", chart);
  if (!hoverGroup || !hoverLine || !currentDot || !compareDot || !tooltip) return;

  const left = 64;
  const right = 34;
  const top = 22;
  const baseline = 216;
  const chartWidth = 760 - left - right;
  const chartHeight = baseline - top;
  const step = chartWidth / (analyticsTrendLabels.length - 1);
  const pointFor = (value, index) => ({
    x: left + step * index,
    y: baseline - (value / series.max) * chartHeight
  });
  const currentPoints = series.current.map(pointFor);
  const comparePoints = series.compare.map(pointFor);

  const showIndex = clientX => {
    const rect = chart.getBoundingClientRect();
    const viewX = ((clientX - rect.left) / rect.width) * 760;
    const index = Math.max(0, Math.min(analyticsTrendLabels.length - 1, Math.round((viewX - left) / step)));
    const current = currentPoints[index];
    const compare = comparePoints[index];
    const tooltipLeft = Math.max(112, Math.min(rect.width - 124, (current.x / 760) * rect.width));
    const tooltipTop = Math.max(12, Math.min(rect.height - 92, (Math.min(current.y, compare.y) / 260) * rect.height - 10));

    hoverLine.setAttribute("x1", current.x);
    hoverLine.setAttribute("x2", current.x);
    currentDot.setAttribute("cx", current.x);
    currentDot.setAttribute("cy", current.y);
    compareDot.setAttribute("cx", compare.x);
    compareDot.setAttribute("cy", compare.y);
    tooltip.style.left = `${tooltipLeft}px`;
    tooltip.style.top = `${tooltipTop}px`;
    tooltip.innerHTML = `<b>${analyticsTrendLabels[index]}</b><span><i></i>${series.label}：${formatAnalyticsValue(series, series.current[index])}</span><span><i></i>上一周期：${formatAnalyticsValue(series, series.compare[index])}</span>`;
    hoverGroup.classList.remove("is-hidden");
    tooltip.classList.remove("is-hidden");
  };

  chart.addEventListener("mousemove", event => showIndex(event.clientX));
  chart.addEventListener("touchmove", event => {
    if (!event.touches.length) return;
    showIndex(event.touches[0].clientX);
  }, { passive: true });
  chart.addEventListener("mouseleave", () => {
    hoverGroup.classList.add("is-hidden");
    tooltip.classList.add("is-hidden");
  });
}

function bindEvents() {
  $$("[data-section]").forEach(btn => btn.addEventListener("click", () => {
    state.section = btn.dataset.section;
    state.kbManagePage = null;
    state.navMenuOpen = false;
    localStorage.setItem("clone_section", state.section);
    render();
  }));
  $("[data-nav-menu]")?.addEventListener("click", () => {
    state.navMenuOpen = !state.navMenuOpen;
    render();
  });
  $$("[data-kb-tab]").forEach(btn => btn.addEventListener("click", () => {
    state.kbTab = btn.dataset.kbTab;
    render();
  }));
  $$("[data-kb-manage]").forEach(btn => btn.addEventListener("click", () => {
    state.kbManagePage = btn.dataset.kbManage;
    render();
  }));
  $("[data-kb-manage-back]")?.addEventListener("click", () => {
    state.kbManagePage = null;
    render();
  });
  $("[data-supplement-knowledge]")?.addEventListener("click", () => {
    state.returnToGenerationFromKnowledge = true;
    state.section = "knowledge";
    state.kbTab = "company";
    state.kbManagePage = null;
    state.navMenuOpen = false;
    localStorage.setItem("clone_section", state.section);
    render();
  });
  $$("[data-return-generation]").forEach(btn => btn.addEventListener("click", () => {
    state.returnToGenerationFromKnowledge = false;
    state.section = "editor";
    state.kbManagePage = null;
    state.generationScheduleToken += 1;
    state.generationCountdown = generationTimers.phase0;
    state.generationCountdownTotal = generationTimers.phase0;
    localStorage.setItem("clone_section", "editor");
    render();
  }));
  $("[data-url-helper]")?.addEventListener("click", () => { state.urlHelper = true; render(); });
  $("[data-url-cancel]")?.addEventListener("click", () => { state.urlHelper = false; render(); });
  $("[data-create-site]")?.addEventListener("click", () => {
    startGenerationFlow();
  });
  $$("[data-generation-step]").forEach(btn => btn.addEventListener("click", () => {
    const phase = Number(btn.dataset.generationStep);
    if (phase === state.generationPhase) return;
    enterGenerationPhase(phase, phase === 1 ? "structure" : "pause");
  }));
  $$("[data-generation-next]").forEach(btn => btn.addEventListener("click", () => {
    advanceGenerationFlow();
  }));
  $$("[data-build-style]").forEach(btn => btn.addEventListener("click", () => {
    state.selectedBuildStyle = btn.dataset.buildStyle;
    if (state.generationPhase === 1 && state.generationSubphase === "style") {
      state.styleSelectionTouched = true;
      state.generationScheduleToken += 1;
      state.generationCountdown = 0;
      state.generationCountdownTotal = 0;
    }
    render();
  }));
  $$("[data-adopt-style]").forEach(btn => btn.addEventListener("click", () => {
    state.selectedBuildStyle = btn.dataset.adoptStyle;
    enterGenerationPhase(2);
  }));
  $$("[data-publish-step]").forEach(btn => btn.addEventListener("click", () => {
    state.selectedPublishStep = Number(btn.dataset.publishStep);
    render();
  }));
  $$("[data-analytics-tab]").forEach(btn => btn.addEventListener("click", () => {
    state.analyticsTab = btn.dataset.analyticsTab;
    render();
  }));
  $$("[data-traffic-tab]").forEach(btn => btn.addEventListener("click", () => {
    state.trafficAnalyticsTab = btn.dataset.trafficTab;
    render();
  }));
  $$("[data-page-report-tab]").forEach(btn => btn.addEventListener("click", () => {
    state.analyticsPageReportTab = btn.dataset.pageReportTab;
    render();
  }));
  $$("[data-visitor-region-mode]").forEach(btn => btn.addEventListener("click", () => {
    state.analyticsVisitorRegionMode = btn.dataset.visitorRegionMode;
    render();
  }));
  $$("[data-visitor-env-dimension]").forEach(btn => btn.addEventListener("click", () => {
    state.analyticsVisitorEnvDimension = btn.dataset.visitorEnvDimension;
    render();
  }));
  $$("[data-trend-metric]").forEach(btn => btn.addEventListener("click", () => {
    state.analyticsTrendMetric = btn.dataset.trendMetric;
    render();
  }));
  $("[data-trend-select]")?.addEventListener("change", event => {
    state.analyticsTrendMetric = event.target.value;
    render();
  });
  bindAnalyticsTrendInteractions();
  $$("[data-open-editor]").forEach(card => card.addEventListener("click", () => { startGenerationFlow(); }));
  $("#generateSite")?.addEventListener("click", () => { startGenerationFlow(); });
  $$("[data-quick]").forEach(btn => btn.addEventListener("click", () => {
    const text = {
      "换配色": "请帮我更换官网的主题配色方案",
      "发布Blog": "请帮我发布一篇新的 Blog 文章到新闻资讯板块",
      "子页面": "请在产品服务下面生成一个产品服务子页面，样式和内容参考首页",
      "改首屏": "请帮我优化官网首屏口号和公司简介",
      "SEO": "请检查并优化当前官网的 SEO 与 GEO 信息结构"
    }[btn.dataset.quick];
    state.editorMessages.push({ role: "user", text });
    state.editorMessages.push({ role: "ai", text: "已收到优化需求，正在根据企业知识库、页面结构和 GEO Prompt 更新官网预览。" });
    render();
  }));

  $("#logout")?.addEventListener("click", () => {
    localStorage.removeItem("clone_auth");
    state.loggedIn = false;
    render();
  });
  $("#phone")?.addEventListener("input", e => {
    state.phone = e.target.value.replace(/\D/g, "").slice(0, 11);
    e.target.value = state.phone;
  });
  $("#getCode")?.addEventListener("click", () => {
    if (!validPhone()) return showLoginError("请输入正确的手机号");
    openModal("#captchaModal");
  });
  $("#captchaSubmit")?.addEventListener("click", () => {
    if ($("#captchaInput").value.trim().toUpperCase() !== "A8K2") return $("#captchaError").textContent = "验证码输入错误";
    closeModal("#captchaModal");
    $("#sms").value = "123456";
  });
  $("#loginBtn")?.addEventListener("click", doLogin);
  $("#sms")?.addEventListener("keydown", e => e.key === "Enter" && doLogin());
  $$(".modal-close").forEach(btn => btn.addEventListener("click", () => closeModal(`#${btn.closest(".modal").id}`)));
}

function doLogin() {
  if (!validPhone()) return showLoginError("请输入正确的手机号");
  if ($("#sms").value.trim().length < 4) return showLoginError("请输入验证码");
  localStorage.setItem("clone_auth", "1");
  localStorage.setItem("clone_phone", state.phone);
  state.loggedIn = true;
  state.section = "geo";
  localStorage.setItem("clone_section", state.section);
  render();
}

function validPhone() {
  return /^1[3-9]\d{9}$/.test(state.phone);
}

function showLoginError(text) {
  $("#loginError").textContent = text;
}

function openModal(selector) {
  $(selector)?.classList.add("open");
}

function closeModal(selector) {
  $(selector)?.classList.remove("open");
}

function maskPhone(phone) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

document.body.insertAdjacentHTML("afterbegin", $("#icon-sprite")?.innerHTML || "");
render();
