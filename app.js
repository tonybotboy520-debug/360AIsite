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
  selectedPublishStep: 3,
  editorMessages: [
    { role: "user", text: "请为「深圳市东星制冷机电有限公司」生成完整企业官网，行业方向：制冷机电。参考「工业自动化」的风格和栏目，但可以自由调整页面结构、布局和交互，以页面美观和资料准确为优先。页面内容使用企业知识库中的企业信息、产品资料、图片、案例、资讯、资质和联系方式。" },
    { role: "ai", text: "Agent 已创建官网记录，正在解析需求并生成首页与子页面源码..." },
    { role: "ai", text: "官网已生成完毕。解析建站需求 → 整理页面输入 → 读取企业知识库 → 重新调用模型生成页面 → 按 GEO Prompt 生成自由页面 → 校准知识库事实 → 使用知识库图片资源 → 保存官网内容到数据库。" }
  ]
};

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
}

function renderLogin() {
  return `
    <main class="login-shell">
      <section class="login-card-wrap">
        <div class="brand-head">
          <div class="logo-box"><img src="assets/ai-avatar.png" alt="AI" /></div>
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
      <button class="brand-chip" data-section="geo" type="button" aria-label="返回 GEO Studio 首页">
        <span>G</span><strong>GEO Studio</strong>
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
  return `
    ${pageHead("企业知识库", "统一沉淀企业事实、产品、案例与资质，后续可同时服务 360智见 GEO 项目和官网生成项目。", `<div class="head-actions"><span class="done-pill">字段 42 项</span><span class="doc-count">· 来源 21</span><button class="primary slim" data-section="site" type="button">生成官网</button></div>`)}
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
    ${pageHead(isDomains ? "已抓取域名管理" : "已上传文档管理", isDomains ? "管理已经输入和识别过的官网、官媒、渠道页等来源。" : "管理企业资料、产品手册、案例材料和资质文件。", `<button class="ghost slim" data-kb-manage-back type="button">返回企业知识库</button>`)}
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
      <section class="assistant-pane">
        <h2>AI 建站助手</h2><p>随时对话优化您的官网</p>
        <div class="chat-list">${state.editorMessages.map(msg => `<div class="chat ${msg.role}">${msg.role === "ai" ? `<img src="assets/ai-avatar.png" alt="AI" />` : ""}<span>${msg.text}</span></div>`).join("")}</div>
        <div class="quick-actions">${["换配色", "发布Blog", "子页面", "改首屏", "SEO"].map((label, i) => `<button class="${i === 4 ? "pressed" : ""}" data-quick="${label}" type="button">${label}</button>`).join("")}</div>
        <div class="composer"><button type="button">添加附件</button><textarea placeholder="输入您的需求，可添加附件发布Blog..."></textarea><button class="primary" type="button">发送</button></div>
      </section>
      <section class="preview-pane">${renderSitePreview()}</section>
    </main>
  `;
}

function renderSitePreview() {
  return `
    <article class="web-preview">
      <nav><b>D<br />深圳市东</b><span>首页</span><span>产品中心</span><span>解决方案</span><span>行业应用</span><span>案例中心</span><span>FAQ</span><span>关于我们</span><span>联系我们</span><em>全国热线 13923464030</em></nav>
      <section class="red-hero"><small>INDUSTRIAL AUTOMATION</small><h1>深圳市东 · 核心业务，专业交付方案</h1><p>精密加工，品质交付</p><div><button>获取方案建议</button><button>咨询产品详情</button></div></section>
      <section class="preview-section"><small>WHY CHOOSE US</small><h2>核心优势</h2><div class="adv-grid">${["经验积累", "品质服务", "品质服务", "品质服务"].map((v, i) => `<div><b>0${i + 1}</b><h3>${v}</h3><p>${i === 0 ? "数十年冷水机、冷冻机、制冷机研发经验。" : "专业、高效、值得信赖。"}</p></div>`).join("")}</div></section>
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
  return `
    <section class="analytics-filter-panel">
      <div class="analytics-time-group">
        <span>统计时间</span>
        <button class="active" type="button">近 7 天</button>
        <button type="button">近 30 天</button>
        <button type="button">自定义</button>
        <label><input type="date" value="2026-05-21" /> 至 <input type="date" value="2026-05-27" /></label>
      </div>
      <div class="analytics-time-group compact">
        <span>统计粒度</span>
        <button class="active" type="button">按日</button>
        <button type="button">按周</button>
        <button type="button">按月</button>
      </div>
    </section>

    <section class="analytics-kpi-grid four">
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>PV</span>${miniTrend("up")}</div><strong>12,480</strong><small>近 7 天页面浏览量，环比 +18%</small></article>
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>UV</span>${miniTrend("up")}</div><strong>4,862</strong><small>近 7 天独立访客，环比 +11%</small></article>
      <article class="analytics-kpi warn"><div class="analytics-kpi-head"><span>访问次数</span>${miniTrend("flat")}</div><strong>6,438</strong><small>平均每人 1.32 次访问</small></article>
      <article class="analytics-kpi risk"><div class="analytics-kpi-head"><span>跳出率</span>${miniTrend("down")}</div><strong>48%</strong><small>产品页偏高，需要关注</small></article>
    </section>

    <section class="analytics-overview-grid traffic">
      <article class="panel analytics-trend-panel">
        <div class="analytics-panel-head">
          <div><span>访问趋势</span><h2>PV / UV 日趋势</h2></div>
          ${miniTrend("up")}
        </div>
        <div class="analytics-line-chart">
          <svg viewBox="0 0 620 220" role="img" aria-label="近 7 天访问趋势">
            <path class="grid-line" d="M0 42H620M0 96H620M0 150H620M0 204H620" />
            <path class="area" d="M0 174C42 154 62 160 98 136C137 110 162 128 200 104C240 80 275 94 310 74C350 50 386 74 424 58C462 42 500 62 536 44C574 26 594 34 620 20V220H0Z" />
            <path class="pv" d="M0 174C42 154 62 160 98 136C137 110 162 128 200 104C240 80 275 94 310 74C350 50 386 74 424 58C462 42 500 62 536 44C574 26 594 34 620 20" />
            <path class="uv" d="M0 190C52 178 74 184 116 164C158 146 184 154 222 136C262 114 296 130 334 108C374 88 410 104 452 88C498 70 530 82 568 62C594 48 608 50 620 42" />
          </svg>
        </div>
      </article>

      <article class="panel analytics-source-panel">
        <div class="analytics-panel-head">
          <div><span>访问来源</span><h2>基础来源分布</h2></div>
          ${miniTrend("flat")}
        </div>
        <div class="analytics-source-list">
          <div><b>搜索引擎</b><span>百度、Google、360、Bing</span><i style="width: 68%"></i><strong>42%</strong></div>
          <div><b>直接访问</b><span>输入网址、收藏夹</span><i style="width: 31%"></i><strong>19%</strong></div>
          <div><b>AI 推荐</b><span>AI 问答跳转或引用链接</span><i style="width: 34%"></i><strong>21%</strong></div>
          <div><b>外链 / 私域</b><span>公众号、名片、朋友圈、合作站</span><i style="width: 28%"></i><strong>18%</strong></div>
        </div>
      </article>
    </section>

    <section class="panel analytics-table-panel">
      <div class="analytics-panel-head">
        <div><span>页面维度</span><h2>访问页面统计</h2></div>
        <div class="analytics-period-note">当前周期：2026-05-21 至 2026-05-27 · 按日统计</div>
      </div>
      <table class="analytics-table">
        <thead><tr><th>页面</th><th>统计周期</th><th>PV</th><th>UV</th><th>日均 PV</th><th>平均停留</th><th>跳出率</th><th>转化</th><th>7日趋势</th></tr></thead>
        <tbody>
          <tr><td><b>首页</b><span>/</span></td><td>近 7 天</td><td>5,820</td><td>2,416</td><td>831</td><td>1分42秒</td><td>42%</td><td>18</td><td>${miniTrend("up")}</td></tr>
          <tr><td><b>产品服务</b><span>/products</span></td><td>近 7 天</td><td>2,430</td><td>1,106</td><td>347</td><td>1分08秒</td><td>61%</td><td>9</td><td>${miniTrend("down")}</td></tr>
          <tr><td><b>解决方案</b><span>/solutions</span></td><td>近 7 天</td><td>1,108</td><td>624</td><td>158</td><td>1分21秒</td><td>56%</td><td>6</td><td>${miniTrend("flat")}</td></tr>
          <tr><td><b>联系我们</b><span>/contact</span></td><td>近 7 天</td><td>618</td><td>402</td><td>88</td><td>42秒</td><td>37%</td><td>42</td><td>${miniTrend("up")}</td></tr>
        </tbody>
      </table>
    </section>`;
}

function renderAnalyticsGeoStats() {
  return `
    <section class="analytics-note">
      <b>G</b>
      <span>先把 GEO 统计做成“页面评分”：AI 是否真实引用、提及某个页面不一定稳定可抓，当前优先展示每个页面的 GEO 优化分数和改进项。</span>
    </section>
    <section class="analytics-kpi-grid four">
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>GEO 总分</span>${miniTrend("up")}</div><strong>82</strong><small>全站页面平均分</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>已评分页面</span>${miniTrend("flat")}</div><strong>32 / 36</strong><small>还有 4 个页面待扫描</small></article>
      <article class="analytics-kpi warn"><div class="analytics-kpi-head"><span>低分页面</span>${miniTrend("down")}</div><strong>6</strong><small>低于 70 分，优先处理</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>AI Bot 抓取</span>${miniTrend("up")}</div><strong>186</strong><small>作为辅助观察指标</small></article>
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
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>搜索展现</span>${miniTrend("up")}</div><strong>18,620</strong><small>来自搜索结果页曝光</small></article>
      <article class="analytics-kpi good"><div class="analytics-kpi-head"><span>搜索点击</span>${miniTrend("up")}</div><strong>932</strong><small>自然搜索点击量</small></article>
      <article class="analytics-kpi warn"><div class="analytics-kpi-head"><span>CTR</span>${miniTrend("down")}</div><strong>5.0%</strong><small>点击率，标题可优化</small></article>
      <article class="analytics-kpi"><div class="analytics-kpi-head"><span>平均排名</span>${miniTrend("up")}</div><strong>12.4</strong><small>产品词仍在第二页附近</small></article>
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
  $("[data-url-helper]")?.addEventListener("click", () => { state.urlHelper = true; render(); });
  $("[data-url-cancel]")?.addEventListener("click", () => { state.urlHelper = false; render(); });
  $("[data-create-site]")?.addEventListener("click", () => {
    state.section = "editor";
    render();
  });
  $$("[data-publish-step]").forEach(btn => btn.addEventListener("click", () => {
    state.selectedPublishStep = Number(btn.dataset.publishStep);
    render();
  }));
  $$("[data-analytics-tab]").forEach(btn => btn.addEventListener("click", () => {
    state.analyticsTab = btn.dataset.analyticsTab;
    render();
  }));
  $$("[data-open-editor]").forEach(card => card.addEventListener("click", () => { state.section = "editor"; render(); }));
  $("#generateSite")?.addEventListener("click", () => { state.section = "editor"; render(); });
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
