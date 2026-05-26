const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const params = new URLSearchParams(location.search);

const navItems = [
  { id: "geo", label: "GEO工作台" },
  { id: "knowledge", label: "企业知识库" },
  { id: "pages", label: "页面模板" },
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
  templateModal: false,
  navMenuOpen: false,
  selectedTemplate: "industrial",
  selectedPageTemplate: "standard",
  selectedTemplatePage: "home",
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
    desc: "将已确认的页面模板、风格和 GEO 内容生成生产版本，配置 SSL、回滚点、静态资源和表单收件能力。",
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

const templates = [
  { id: "machinery", name: "机械设备官网", style: "红黑高端重工风", desc: "工业自动化/工控产品供应商", active: true },
  { id: "industrial", name: "工业自动化", style: "红黑高端重工风（动效增强版）", desc: "工业自动化/工控产品供应商" }
];

const pageTemplates = [
  {
    id: "standard",
    name: "标准企业官网模板",
    desc: "适合多数 B2B 企业，覆盖首页、产品、行业、媒体、FAQ、关于、联系等完整频道。",
    fit: "稳妥完整",
    pages: [
      {
        id: "home",
        name: "首页",
        purpose: "快速说明企业是谁、做什么、有什么能力，并引导客户咨询。",
        blocks: [
          {
            type: "首屏摘要",
            media: "图 + 文",
            layout: "hero",
            title: "工业制冷恒温设备源头制造商",
            content: "深圳市东星制冷机电有限公司面向注塑、电镀、新能源、化工等行业提供冷水机组与工艺温控方案。",
            image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80",
            highlights: ["2007 年创立", "58 项研发专利", "ISO / CE 认证"]
          },
          {
            type: "核心优势",
            media: "文",
            layout: "stats",
            content: "研发、制造、检测、交付一体化，形成从选型到售后的完整服务能力。",
            metrics: [
              { value: "6", label: "研发与制造基地" },
              { value: "58", label: "研发专利" },
              { value: "24h", label: "需求响应" }
            ]
          },
          {
            type: "核心产品",
            media: "图 + 文",
            layout: "card-grid",
            content: "把企业知识库中的重点产品前置展示，帮助客户快速判断适配范围。",
            items: [
              { title: "水冷箱式冷水机组", desc: "适合稳定连续的工业制冷场景。", image: "https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=520&q=80" },
              { title: "螺杆式冷水机组", desc: "面向大制冷量和集中供冷需求。", image: "https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=520&q=80" },
              { title: "低温冷水机", desc: "满足低温工艺与精密控温。", image: "https://images.unsplash.com/photo-1581092919535-7146ff1a590b?auto=format&fit=crop&w=520&q=80" }
            ]
          },
          {
            type: "应用场景",
            media: "图 + 文",
            layout: "media-grid",
            content: "按客户所在行业组织入口，让 AI 搜索和真实访客都能快速找到应用答案。",
            items: [
              { title: "吹塑注塑", desc: "模具控温、设备降温、成型稳定。", image: "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?auto=format&fit=crop&w=520&q=80" },
              { title: "新能源锂电", desc: "生产线恒温与设备热管理。", image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=520&q=80" },
              { title: "电镀阳极氧化", desc: "槽液温度控制与连续生产保障。", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=520&q=80" }
            ]
          },
          {
            type: "行动转化",
            media: "文",
            layout: "cta",
            title: "提交工况参数，获取专业选型建议",
            content: "客户留下行业、温度范围、制冷量和联系方式后，销售与工程师可继续跟进。",
            highlights: ["电话 13923464030", "支持非标定制", "提供参数选型"]
          }
        ]
      },
      {
        id: "products",
        name: "产品中心",
        purpose: "把企业知识库中的产品拆成清晰分类，方便客户快速判断适配范围。",
        blocks: [
          { type: "分类导航", media: "文", layout: "tabs", content: "冷水机组、工业冷水机、螺杆式、风冷式、低温、磁悬浮冷水机、气悬浮冷水机。", highlights: ["全部产品", "水冷式", "风冷式", "低温系列", "节能系列"] },
          {
            type: "产品列表",
            media: "图 + 文",
            layout: "card-grid",
            content: "每个产品包含图片、名称、适用场景、关键参数和详情入口。",
            items: [
              { title: "开放式工业冷水机", desc: "适合注塑、挤出、印刷包装等工艺冷却。", image: "https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&w=520&q=80" },
              { title: "冷热双用控温机组", desc: "兼顾加热与冷却，适合反应釜控温。", image: "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=520&q=80" },
              { title: "磁悬浮冷水机", desc: "面向节能改造与大型中央制冷需求。", image: "https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=520&q=80" }
            ]
          },
          { type: "选型说明", media: "图 + 文", layout: "split", title: "按工况而不是只按型号选型", content: "通过制冷量、控温范围、介质、现场环境、连续运行时间判断推荐型号，并给出可追溯的参数依据。", image: "https://images.unsplash.com/photo-1581093804475-577d72e38aa0?auto=format&fit=crop&w=820&q=80" },
          { type: "采购 FAQ", media: "文", layout: "faq", content: "把采购前常见问题直接放在产品频道中，减少重复咨询。", items: [
            { title: "是否支持定制？", desc: "支持按温控范围、制冷量、接口和现场条件做非标配置。" },
            { title: "如何获得报价？", desc: "提交产品型号或工况参数后，由工程师确认方案再报价。" }
          ] }
        ]
      },
      {
        id: "applications",
        name: "行业应用",
        purpose: "用行业场景证明产品应用能力，补齐 GEO 问答需要的场景实体。",
        blocks: [
          { type: "行业入口", media: "图 + 文", layout: "media-grid", content: "按行业展示典型工况、痛点和推荐产品。", items: [
            { title: "注塑吹塑行业", desc: "模具控温、设备降温、成型稳定。", image: "https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=520&q=80" },
            { title: "化工反应釜", desc: "反应过程恒温与安全温控。", image: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=520&q=80" },
            { title: "新能源制造", desc: "产线冷却、设备热管理和能效优化。", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=520&q=80" }
          ] },
          { type: "场景痛点", media: "文", layout: "text-columns", content: "温控稳定、连续生产、设备降温、工艺恒温、节能维护都需要在页面中变成可检索的问答实体。", highlights: ["控温精度", "连续运行", "节能维护"] },
          { type: "推荐产品", media: "图 + 文", layout: "split reverse", title: "行业页面关联产品与咨询入口", content: "每个行业应用页关联水冷箱式、螺杆式、低温式、冷热双用控温机组等产品，方便访客继续了解。", image: "https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=820&q=80" }
        ]
      },
      {
        id: "solutions",
        name: "解决方案",
        purpose: "把客户问题、推荐配置和交付路径组织成独立方案页。",
        blocks: [
          { type: "方案总览", media: "图 + 文", layout: "split", title: "从需求评估到安装调试的完整制冷方案", content: "围绕设备热负荷、温控范围、现场水电条件、生产节拍给出方案路径。", image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=820&q=80" },
          { type: "交付路径", media: "文", layout: "steps", content: "需求评估、方案选型、图纸确认、生产调试、现场交付、售后维护。", items: [
            { title: "01 需求评估", desc: "收集行业、温度、流量、现场环境。" },
            { title: "02 产品选型", desc: "匹配机型、压缩机、冷却方式和控制方式。" },
            { title: "03 交付维护", desc: "安装调试、培训、质保和备件支持。" }
          ] },
          { type: "方案价值", media: "文", layout: "stats", content: "让客户理解为什么选择方案型供应商。", metrics: [
            { value: "稳定", label: "持续控温" },
            { value: "节能", label: "降低运行成本" },
            { value: "可靠", label: "减少停机风险" }
          ] }
        ]
      },
      {
        id: "media",
        name: "媒体报道",
        purpose: "沉淀外部报道、企业动态和品牌背书，提升真实可信度。",
        blocks: [
          { type: "媒体报道列表", media: "图 + 文", layout: "article-list", content: "展示媒体报道、展会动态、企业新闻和技术文章。", items: [
            { title: "东星制冷亮相工业节能技术交流会", desc: "围绕工业温控节能改造分享制冷系统经验。", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=520&q=80" },
            { title: "专精特新企业能力持续完善", desc: "研发制造与检测体系成为客户选择的重要背书。", image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=520&q=80" },
            { title: "工业冷水机组选型指南发布", desc: "帮助采购和工程团队快速理解核心参数。", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=520&q=80" }
          ] },
          { type: "品牌背书", media: "文", layout: "quote", title: "把真实报道和企业动态作为可信来源", content: "媒体报道频道可承接新闻、展会、认证、案例复盘，为 AI 引用提供稳定内容来源。" }
        ]
      },
      {
        id: "faq",
        name: "FAQ",
        purpose: "把高频采购和技术问题整理成 AI 容易引用的问答格式。",
        blocks: [
          { type: "采购问题", media: "文", layout: "faq", content: "围绕报价、交期、定制和售后建立标准答案。", items: [
            { title: "工业冷水机如何选型？", desc: "先确认制冷量、控温范围、介质、现场环境和连续运行时间，再匹配机型。" },
            { title: "是否支持非标定制？", desc: "支持按接口、控制方式、温度范围、现场空间和行业工况定制。" },
            { title: "售后服务如何保障？", desc: "提供安装调试、使用培训、质保维护和备件支持。" }
          ] },
          { type: "技术问题", media: "图 + 文", layout: "split reverse", title: "技术问答配合真实工况图", content: "在 FAQ 中加入工况图片和参数解释，方便客户理解，也方便搜索引擎识别。", image: "https://images.unsplash.com/photo-1581092335878-2d9ff86ca2bf?auto=format&fit=crop&w=820&q=80" }
        ]
      },
      {
        id: "about",
        name: "关于我们",
        purpose: "承接企业知识库中的事实，建立可信背书。",
        blocks: [
          { type: "公司介绍", media: "图 + 文", layout: "split", title: "EAST STAR 东星集团", content: "创立于 2007 年，总部位于深圳，研发、设计、制造、服务工农业制冷恒温设备。", image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=820&q=80" },
          { type: "研发制造能力", media: "图 + 文", layout: "media-grid", content: "香港、越南、惠州、昆山、武汉研发中心和制造基地，惠州东星产业园已投入使用。", items: [
            { title: "研发中心", desc: "持续优化制冷系统与控制方案。", image: "https://images.unsplash.com/photo-1581093804475-577d72e38aa0?auto=format&fit=crop&w=520&q=80" },
            { title: "制造基地", desc: "支持标准产品与定制机组生产。", image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=520&q=80" }
          ] },
          { type: "资质荣誉", media: "文", layout: "stats", content: "高新技术及专精特新企业，ISO、CE 国际认证，58 项研发专利。", metrics: [
            { value: "ISO", label: "质量体系" },
            { value: "CE", label: "国际认证" },
            { value: "58", label: "研发专利" }
          ] }
        ]
      },
      {
        id: "contact",
        name: "联系我们",
        purpose: "让客户能快速提交需求，并让 AI 搜索抓到明确联系方式。",
        blocks: [
          { type: "联系方式", media: "文", layout: "contact", content: "电话 13923464030，邮箱 szwj1688@163.com，地址 深圳市东星制冷机电有限公司。", highlights: ["电话 13923464030", "邮箱 szwj1688@163.com", "粤ICP备09046816号-8"] },
          { type: "需求表单", media: "文", layout: "form", content: "姓名、电话、应用行业、产品型号、制冷需求、备注。" }
        ]
      }
    ]
  },
  {
    id: "product",
    name: "产品驱动官网模板",
    desc: "优先展示产品分类、型号、参数、FAQ，适合产品数量较多的企业。",
    fit: "产品优先",
    pages: [
      {
        id: "home",
        name: "首页",
        purpose: "首屏直接把产品能力和选型入口放在最前面。",
        blocks: [
          { type: "首屏产品定位", media: "图 + 文", content: "工业冷水机组及制冷恒温设备研发制造服务商，突出选型咨询。" },
          { type: "产品矩阵", media: "图 + 文", content: "按水冷、风冷、螺杆、低温、磁悬浮、气悬浮分类展示。" },
          { type: "参数选型入口", media: "文", content: "制冷量、温度范围、应用行业、现场条件四类信息。" },
          { type: "热门 FAQ", media: "文", content: "现货、交期、定制、售后、认证、报价方式。" }
        ]
      },
      {
        id: "catalog",
        name: "产品总览",
        purpose: "集中承载所有产品条目，便于后续生成产品详情页。",
        blocks: [
          { type: "筛选项", media: "文", content: "产品类型、应用行业、制冷方式、温控范围。" },
          { type: "产品卡片", media: "图 + 文", content: "产品名、用途摘要、适配行业、关键参数、详情入口。" },
          { type: "资料下载", media: "文", content: "产品画册、参数表、选型表。" }
        ]
      },
      {
        id: "detail",
        name: "产品详情",
        purpose: "定义单个产品详情页的标准结构。",
        blocks: [
          { type: "产品概述", media: "图 + 文", content: "产品名称、适用对象、核心卖点。" },
          { type: "参数说明", media: "文", content: "制冷量、压缩机、控温精度、冷却方式、适用行业。" },
          { type: "应用案例", media: "文", content: "引用行业应用中的相关案例。" },
          { type: "咨询表单", media: "文", content: "提交型号/参数/应用场景。" }
        ]
      },
      {
        id: "faq",
        name: "FAQ",
        purpose: "把采购前问题整理成 AI 容易引用的问答格式。",
        blocks: [
          { type: "采购问题", media: "文", content: "是否有现货、如何报价、交付周期、是否支持定制。" },
          { type: "技术问题", media: "文", content: "如何选型、支持哪些行业、控温范围如何确认。" },
          { type: "服务问题", media: "文", content: "安装调试、售后响应、质保、备件。" }
        ]
      }
    ]
  },
  {
    id: "solution",
    name: "解决方案官网模板",
    desc: "围绕行业问题组织页面，适合靠场景和方案获客的企业。",
    fit: "场景获客",
    pages: [
      {
        id: "home",
        name: "首页",
        purpose: "先展示行业场景和解决问题，再引导产品选型。",
        blocks: [
          { type: "场景首屏", media: "图 + 文", content: "面向吹塑注塑、电镀、新能源锂电池、化工反应釜等行业提供制冷恒温方案。" },
          { type: "问题归纳", media: "文", content: "生产过程控温不稳、设备热负荷高、连续生产停机风险、节能要求。" },
          { type: "方案路径", media: "文", content: "需求评估 → 产品选型 → 现场适配 → 安装调试 → 售后维护。" },
          { type: "行业入口", media: "图 + 文", content: "按行业跳转到对应方案页面。" }
        ]
      },
      {
        id: "solutions",
        name: "解决方案",
        purpose: "每个行业方案形成独立页面，便于 GEO 问答命中。",
        blocks: [
          { type: "行业痛点", media: "文", content: "按行业描述温控、降温、恒温、节能等问题。" },
          { type: "推荐配置", media: "文", content: "关联对应产品系列和参数选择逻辑。" },
          { type: "落地效果", media: "文", content: "稳定生产、降低故障、提升控温精度、节能优化。" },
          { type: "关联案例", media: "图 + 文", content: "展示相近行业应用案例。" }
        ]
      },
      {
        id: "cases",
        name: "案例中心",
        purpose: "用案例补足可信度和行业关键词。",
        blocks: [
          { type: "案例列表", media: "图 + 文", content: "应用于吹塑注塑、电镀阳极氧化、新能源锂电池、化工反应釜等案例。" },
          { type: "案例详情结构", media: "文", content: "客户背景、问题、方案、产品、效果、咨询入口。" }
        ]
      },
      {
        id: "contact",
        name: "方案咨询",
        purpose: "把用户需求转化成可跟进线索。",
        blocks: [
          { type: "需求采集", media: "文", content: "行业、设备、温度、产能、现场条件、联系人。" },
          { type: "联系方式", media: "文", content: "电话、邮箱、地址、官网、备案。" }
        ]
      }
    ]
  },
  {
    id: "brand",
    name: "品牌展示官网模板",
    desc: "适合需要强调企业实力、资质荣誉、品牌故事和媒体背书的企业。",
    fit: "品牌背书",
    pages: [
      {
        id: "home",
        name: "首页",
        purpose: "以品牌可信度和核心业务建立第一印象。",
        blocks: [
          { type: "品牌首屏", media: "图 + 文", layout: "hero", title: "可信赖的工业制冷品牌", content: "首屏突出品牌定位、制造实力和咨询入口。", image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80", highlights: ["品牌定位", "企业实力", "咨询入口"] },
          { type: "实力背书", media: "文", layout: "stats", content: "展示年限、专利、认证和服务网络。", metrics: [{ value: "2007", label: "成立时间" }, { value: "58", label: "研发专利" }, { value: "ISO", label: "体系认证" }] }
        ]
      },
      {
        id: "about",
        name: "品牌故事",
        purpose: "讲清楚企业发展、理念和能力边界。",
        blocks: [
          { type: "发展历程", media: "图 + 文", layout: "split", title: "从设备制造到系统服务", content: "用时间线组织企业发展节点和关键能力。", image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=820&q=80" }
        ]
      },
      {
        id: "honors",
        name: "资质荣誉",
        purpose: "集中展示证书、专利、认证和客户认可。",
        blocks: [
          { type: "荣誉墙", media: "文", layout: "stats", content: "按认证、专利、奖项分组展示。", metrics: [{ value: "CE", label: "国际认证" }, { value: "高新", label: "企业资质" }, { value: "专精", label: "特新企业" }] }
        ]
      }
    ]
  },
  {
    id: "content",
    name: "内容获客官网模板",
    desc: "适合用文章、FAQ、案例和资料下载持续获客的企业。",
    fit: "内容增长",
    pages: [
      {
        id: "home",
        name: "首页",
        purpose: "把产品入口、知识内容和转化表单放在同一条路径中。",
        blocks: [
          { type: "内容首屏", media: "图 + 文", layout: "hero", title: "让客户先获得答案，再留下需求", content: "首屏提供行业指南、产品选型、FAQ 和资料下载入口。", image: "https://images.unsplash.com/photo-1487611459768-bd414656ea10?auto=format&fit=crop&w=900&q=80", highlights: ["选型指南", "技术 FAQ", "资料下载"] }
        ]
      },
      {
        id: "blog",
        name: "知识文章",
        purpose: "沉淀行业教程、选型指南和技术解释。",
        blocks: [
          { type: "文章列表", media: "图 + 文", layout: "article-list", content: "按知识主题组织内容。", items: [
            { title: "工业冷水机选型指南", desc: "用参数和场景解释采购决策。", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=520&q=80" },
            { title: "温控系统维护建议", desc: "减少故障停机和维护成本。", image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=520&q=80" }
          ] }
        ]
      },
      {
        id: "faq",
        name: "FAQ",
        purpose: "覆盖 AI 搜索高频问题。",
        blocks: [
          { type: "问答集合", media: "文", layout: "faq", content: "报价、交付、定制、售后、参数等高频问题。", items: [
            { title: "报价需要哪些信息？", desc: "产品型号、行业、制冷量、温度范围和现场条件。" },
            { title: "资料如何下载？", desc: "可按产品、行业和方案下载画册与选型表。" }
          ] }
        ]
      }
    ]
  }
];

function icon(id, cls = "icon") {
  return `<svg class="${cls}"><use href="#${id}"></use></svg>`;
}

function renderTopNav() {
  const activeNavItem = navItems.find(item => item.id === state.section);
  const primaryIds = ["geo", "knowledge", "pages"];
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

function renderTemplateThumb(template) {
  const pageCount = Math.min(template.pages.length, 6);
  const rows = Array.from({ length: pageCount }, (_, index) => `<i style="width:${index % 3 === 0 ? 74 : index % 3 === 1 ? 58 : 66}%"></i>`).join("");
  return `<div class="template-thumb" aria-hidden="true"><b></b><span>${rows}</span></div>`;
}

function renderPreviewImage(src, alt) {
  if (!src) return "";
  return `<figure class="preview-image"><img src="${src}" alt="${alt}" /></figure>`;
}

function renderPreviewCards(items = []) {
  return items.map(item => `
    <article class="preview-card">
      ${item.image ? `<img src="${item.image}" alt="${item.title}" />` : ""}
      <h4>${item.title}</h4>
      <p>${item.desc}</p>
    </article>
  `).join("");
}

function renderPreviewBlock(block, index) {
  const layout = block.layout || "text";
  const title = block.title || block.type;
  const chips = (block.highlights || []).map(item => `<span>${item}</span>`).join("");
  const sectionTitle = `
    <div class="site-block-title">
      <small>${String(index + 1).padStart(2, "0")} · ${block.media}</small>
      <h3>${title}</h3>
      <p>${block.content}</p>
    </div>
  `;

  if (layout === "hero") {
    return `
      <article class="site-block site-hero">
        <div>
          ${sectionTitle}
          ${chips ? `<div class="preview-chip-row">${chips}</div>` : ""}
        </div>
        ${renderPreviewImage(block.image, title)}
      </article>
    `;
  }

  if (layout.includes("split")) {
    return `
      <article class="site-block site-split ${layout.includes("reverse") ? "reverse" : ""}">
        ${renderPreviewImage(block.image, title)}
        ${sectionTitle}
      </article>
    `;
  }

  if (layout === "stats") {
    return `
      <article class="site-block">
        ${sectionTitle}
        <div class="preview-stats">
          ${(block.metrics || []).map(metric => `<div><b>${metric.value}</b><span>${metric.label}</span></div>`).join("")}
        </div>
      </article>
    `;
  }

  if (["card-grid", "media-grid"].includes(layout)) {
    return `
      <article class="site-block">
        ${sectionTitle}
        <div class="preview-card-grid ${layout === "media-grid" ? "media" : ""}">${renderPreviewCards(block.items)}</div>
      </article>
    `;
  }

  if (layout === "article-list") {
    return `
      <article class="site-block">
        ${sectionTitle}
        <div class="preview-article-list">${renderPreviewCards(block.items)}</div>
      </article>
    `;
  }

  if (layout === "faq") {
    return `
      <article class="site-block">
        ${sectionTitle}
        <div class="preview-faq">
          ${(block.items || []).map(item => `<details open><summary>${item.title}</summary><p>${item.desc}</p></details>`).join("")}
        </div>
      </article>
    `;
  }

  if (layout === "tabs" || layout === "text-columns") {
    return `
      <article class="site-block">
        ${sectionTitle}
        <div class="preview-chip-row">${chips}</div>
      </article>
    `;
  }

  if (layout === "steps") {
    return `
      <article class="site-block">
        ${sectionTitle}
        <div class="preview-steps">
          ${(block.items || []).map(item => `<div><b>${item.title}</b><span>${item.desc}</span></div>`).join("")}
        </div>
      </article>
    `;
  }

  if (layout === "contact") {
    return `
      <article class="site-block site-contact">
        ${sectionTitle}
        <div class="preview-contact-list">${(block.highlights || []).map(item => `<span>${item}</span>`).join("")}</div>
      </article>
    `;
  }

  if (layout === "form") {
    return `
      <article class="site-block site-form">
        ${sectionTitle}
        <div class="preview-form-grid"><span>姓名</span><span>电话</span><span>应用行业</span><span>产品型号</span><span>制冷需求</span><span>备注</span></div>
      </article>
    `;
  }

  if (layout === "cta" || layout === "quote") {
    return `
      <article class="site-block site-cta">
        ${sectionTitle}
        ${chips ? `<div class="preview-chip-row">${chips}</div>` : ""}
      </article>
    `;
  }

  return `<article class="site-block">${sectionTitle}</article>`;
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
    ${state.templateModal ? renderTemplateModal() : ""}
  `;
}

function renderSection() {
  return {
    knowledge: renderKnowledgePage,
    site: renderSitePage,
    geo: renderGeoWorkbench,
    pages: renderPagesPage,
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
    <section class="site-center">
      <div class="site-hero">
        <h1>生成官网</h1>
        <p>描述需求，AI 为您生成专业企业官网</p>
      </div>
      <div class="prompt-card">
        <textarea id="sitePrompt" placeholder="描述您想要的企业官网，例如：帮我生成一个制造业企业官网..."></textarea>
        <div class="prompt-actions">
          <div><button class="ghost slim" data-section="knowledge" type="button">企业知识库 (19)</button><button class="ghost slim selected" data-template-open type="button">工业自动化（默认）</button></div>
          <button class="primary slim" id="generateSite" type="button">开始生成</button>
        </div>
      </div>
      <p class="template-note">未手动选择时默认使用工业自动化模板</p>
      <div class="site-list-head"><strong>我的官网 <span>(2)</span></strong><button class="ghost slim" type="button">刷新</button></div>
      <div class="site-grid">
        ${[1,2].map(() => `<button class="site-item" data-open-editor type="button"><span>编辑中</span><h3>深圳市东星制冷机电有限公司官网</h3><p><small>2026-05-25</small><b>0</b></p></button>`).join("")}
      </div>
    </section>
  `;
}

function renderTemplateModal() {
  return `
    <div class="modal open">
      <div class="modal-panel template-panel" role="dialog" aria-label="选择网站模板">
        <div class="modal-head"><div><h2>选择网站模板</h2><p>同一行业支持多套模板风格，点击模板卡片可选择，再次点击可取消选择。</p></div><button class="icon-btn" data-modal-close type="button" aria-label="Close">${icon("i-close")}</button></div>
        <div class="template-choice-grid">
          ${templates.map(tpl => `<div class="template-choice ${tpl.id === state.selectedTemplate ? "active" : ""}" data-template="${tpl.id}"><div class="template-shot">${tpl.name}</div><h3>${tpl.name}</h3><b>${tpl.style}</b><p>${tpl.desc}</p><div><span>产品中心</span><span>解决方案</span><span>行业应用</span><span>+4</span></div><button class="ghost slim" type="button">预览模板</button></div>`).join("")}
        </div>
        <div class="modal-actions"><button class="ghost slim" data-modal-close type="button">取消</button><button class="primary slim" data-modal-close type="button">确认</button></div>
      </div>
    </div>
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

function renderPagesPage() {
  const selectedTemplate = pageTemplates.find(template => template.id === state.selectedPageTemplate) || pageTemplates[0];
  if (!selectedTemplate.pages.some(page => page.id === state.selectedTemplatePage)) {
    state.selectedTemplatePage = selectedTemplate.pages[0].id;
  }
  const selectedPage = selectedTemplate.pages.find(page => page.id === state.selectedTemplatePage) || selectedTemplate.pages[0];
  return `
    ${pageHead(
      "页面模板",
      "先确认频道页面、页面结构和企业知识库生成内容；未修改时默认使用当前结构进入生成。",
      ""
    )}
    <div class="template-step-head">
      <div>
        <span>第一步</span>
        <h2>选择模板</h2>
      </div>
    </div>
    <section class="template-picker">
      ${pageTemplates.map(template => `
        <button class="template-option ${template.id === selectedTemplate.id ? "active" : ""}" data-page-template="${template.id}" type="button">
          ${renderTemplateThumb(template)}
          <div class="template-option-copy">
            <em>${template.fit}</em>
            <h3>${template.name}</h3>
            <p>${template.desc}</p>
            <small>${template.pages.length} 个频道页面 · ${template.pages.reduce((sum, page) => sum + page.blocks.length, 0)} 个结构模块</small>
          </div>
        </button>
      `).join("")}
    </section>
    <div class="template-step-head workbench-step-head">
      <div>
        <span>第二步</span>
        <h2>预览并生成官网</h2>
      </div>
      <button class="primary generate-site-btn" data-open-editor type="button">生成官网 →</button>
    </div>
    <section class="page-template-workbench">
      <aside class="template-channel-list">
        <div class="template-side-head">
          <span>当前模板</span>
          <strong>${selectedTemplate.name}</strong>
        </div>
        ${selectedTemplate.pages.map((page, index) => `
          <button class="${page.id === selectedPage.id ? "active" : ""}" data-template-page="${page.id}" type="button">
            <b>${String(index + 1).padStart(2, "0")}</b>
            <span>${page.name}</span>
            <small>${page.blocks.length} 个结构模块</small>
          </button>
        `).join("")}
      </aside>
      <section class="structure-preview">
        <div class="structure-head">
          <div>
            <span>网站结构预览</span>
            <h2>${selectedPage.name}</h2>
            <p>${selectedPage.purpose}</p>
          </div>
          <div class="structure-status">
            <b>内容来源</b>
            <span>企业知识库 / 产品信息 / 行业案例 / 荣誉资质</span>
          </div>
        </div>
        <div class="site-preview-page">
          ${selectedPage.blocks.map(renderPreviewBlock).join("")}
        </div>
      </section>
    </section>
  `;
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

function renderAnalyticsPage() {
  return `${pageHead("数据分析", "把访问表现、AI 搜索可见度和传统 SEO 问题统一落到页面优化动作。", `<div class="head-actions"><button class="ghost slim" type="button">近 30 天</button><button class="ghost slim" type="button">导出报告</button><button class="primary slim" type="button">生成优化建议</button></div>`)}
    <section class="analytics-tabs" aria-label="分析类型">
      ${["总览", "访问分析", "GEO 分析", "SEO 分析", "优化队列"].map((label, index) => `<button class="${index === 0 ? "active" : ""}" type="button">${label}</button>`).join("")}
    </section>

    <section class="analytics-kpi-grid">
      <article class="analytics-kpi good"><span>PV / UV</span><strong>12,480 / 4,862</strong><small>PV 环比 +18%，UV 环比 +11%</small></article>
      <article class="analytics-kpi"><span>询盘转化率</span><strong>3.6%</strong><small>42 条表单，18 次电话点击</small></article>
      <article class="analytics-kpi good"><span>AI 提及率</span><strong>41%</strong><small>68 个问题中 28 个提及品牌</small></article>
      <article class="analytics-kpi warn"><span>SEO 健康度</span><strong>78</strong><small>13 个页面存在标题或收录问题</small></article>
      <article class="analytics-kpi risk"><span>待处理优化</span><strong>18</strong><small>高优先级 5 项，集中在产品页</small></article>
    </section>

    <section class="analytics-overview-grid">
      <article class="panel analytics-trend-panel">
        <div class="analytics-panel-head">
          <div><span>传统网站分析</span><h2>访问与转化趋势</h2></div>
          <div class="analytics-segmented"><button class="active" type="button">PV</button><button type="button">UV</button><button type="button">转化</button></div>
        </div>
        <div class="analytics-line-chart">
          <svg viewBox="0 0 620 220" role="img" aria-label="近 30 天访问趋势">
            <path class="grid-line" d="M0 42H620M0 96H620M0 150H620M0 204H620" />
            <path class="area" d="M0 174C42 154 62 160 98 136C137 110 162 128 200 104C240 80 275 94 310 74C350 50 386 74 424 58C462 42 500 62 536 44C574 26 594 34 620 20V220H0Z" />
            <path class="pv" d="M0 174C42 154 62 160 98 136C137 110 162 128 200 104C240 80 275 94 310 74C350 50 386 74 424 58C462 42 500 62 536 44C574 26 594 34 620 20" />
            <path class="uv" d="M0 190C52 178 74 184 116 164C158 146 184 154 222 136C262 114 296 130 334 108C374 88 410 104 452 88C498 70 530 82 568 62C594 48 608 50 620 42" />
          </svg>
        </div>
        <div class="analytics-source-row">
          <div><b>42%</b><span>自然搜索</span></div>
          <div><b>21%</b><span>AI 推荐</span></div>
          <div><b>19%</b><span>直接访问</span></div>
          <div><b>18%</b><span>外链 / 私域</span></div>
        </div>
      </article>

      <article class="panel analytics-geo-card">
        <div class="analytics-panel-head">
          <div><span>GEO 分析</span><h2>AI 可见度</h2></div>
          <b class="analytics-score good">82 分</b>
        </div>
        <div class="analytics-geo-score">
          <div class="analytics-meter" style="--value: 295deg"><strong>41%</strong><span>提及率</span></div>
          <div class="analytics-metric-list">
            <div><span>可抓取页面</span><b>32 / 36</b></div>
            <div><span>AI Bot 抓取</span><b>186 次</b></div>
            <div><span>平均推荐位</span><b>第 3.8 位</b></div>
            <div><span>答案准确率</span><b>76%</b></div>
          </div>
        </div>
        <div class="analytics-bot-row"><span>GPTBot 62</span><span>ClaudeBot 38</span><span>Perplexity 29</span><span>Google 57</span></div>
      </article>

      <article class="panel analytics-seo-card">
        <div class="analytics-panel-head">
          <div><span>SEO 分析</span><h2>收录与排名</h2></div>
          <b class="analytics-score warn">78 分</b>
        </div>
        <div class="analytics-seo-stack">
          <div class="analytics-seo-bar"><div><span>已收录页面</span><b>24 / 36</b></div><i style="width: 67%"></i></div>
          <div class="analytics-keyword-row"><span>品牌词</span><b>Top 1</b><em>稳定</em></div>
          <div class="analytics-keyword-row"><span>产品词</span><b>Top 12</b><em>可提升</em></div>
          <div class="analytics-keyword-row"><span>行业问题词</span><b>Top 28</b><em>缺内容</em></div>
        </div>
      </article>
    </section>

    <section class="analytics-detail-grid">
      <article class="panel analytics-table-panel">
        <div class="analytics-panel-head">
          <div><span>页面维度</span><h2>页面表现排行</h2></div>
          <button class="ghost slim" type="button">查看全部</button>
        </div>
        <table class="analytics-table">
          <thead><tr><th>页面</th><th>PV</th><th>跳出率</th><th>转化</th><th>GEO</th><th>SEO</th></tr></thead>
          <tbody>
            <tr><td><b>首页</b><span>/</span></td><td>5,820</td><td>42%</td><td>18</td><td><em class="ok">92</em></td><td><em class="ok">86</em></td></tr>
            <tr><td><b>产品服务</b><span>/products</span></td><td>2,430</td><td>61%</td><td>9</td><td><em class="warn">74</em></td><td><em class="warn">71</em></td></tr>
            <tr><td><b>解决方案</b><span>/solutions</span></td><td>1,108</td><td>56%</td><td>6</td><td><em class="warn">66</em></td><td><em class="ok">82</em></td></tr>
            <tr><td><b>FAQ</b><span>未发布</span></td><td>-</td><td>-</td><td>-</td><td><em class="risk">38</em></td><td><em class="risk">0</em></td></tr>
          </tbody>
        </table>
      </article>

      <article class="panel analytics-question-panel">
        <div class="analytics-panel-head">
          <div><span>AI 问题覆盖</span><h2>GEO 机会问题</h2></div>
          <button class="primary slim" type="button">生成 FAQ</button>
        </div>
        <div class="analytics-question high"><b>工业视觉检测系统哪家公司好？</b><span>已提及，第 4 位；竞品出现 3 次，缺案例证明。</span></div>
        <div class="analytics-question"><b>自动化产线改造周期多久？</b><span>未覆盖；建议新增“交付周期 / 实施流程”问答。</span></div>
        <div class="analytics-question"><b>设备数据采集网关支持哪些 PLC？</b><span>提及不完整；产品页缺品牌型号与协议清单。</span></div>
        <div class="analytics-question low"><b>智能制造系统怎么选型？</b><span>有曝光无品牌；建议补行业方案页摘要。</span></div>
      </article>
    </section>

    <section class="panel analytics-action-panel">
      <div class="analytics-panel-head">
        <div><span>统一输出</span><h2>优化建议队列</h2></div>
        <button class="ghost slim" type="button">按优先级排序</button>
      </div>
      <div class="analytics-action-list">
        <div class="analytics-action-row urgent"><span class="analytics-tag">GEO</span><b>为产品服务页补充 PLC 支持型号、协议清单和可引用摘要</b><small>影响：AI 问答覆盖、产品页跳出率、产品词排名</small><button type="button">处理</button></div>
        <div class="analytics-action-row"><span class="analytics-tag seo">SEO</span><b>修复 8 个页面的重复 Title，并补充 Description</b><small>影响：搜索点击率、收录质量、页面健康度</small><button type="button">处理</button></div>
        <div class="analytics-action-row"><span class="analytics-tag visit">访问</span><b>在首页首屏增加行业入口和询盘按钮，降低高流量页面流失</b><small>影响：首页转化、访问路径、表单提交</small><button type="button">处理</button></div>
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
  $("[data-template-open]")?.addEventListener("click", () => { state.templateModal = true; render(); });
  $$("[data-modal-close]").forEach(btn => btn.addEventListener("click", () => { state.templateModal = false; render(); }));
  $$("[data-template]").forEach(card => card.addEventListener("click", () => { state.selectedTemplate = card.dataset.template; render(); }));
  $$("[data-page-template]").forEach(card => card.addEventListener("click", () => {
    state.selectedPageTemplate = card.dataset.pageTemplate;
    const template = pageTemplates.find(item => item.id === state.selectedPageTemplate);
    state.selectedTemplatePage = template?.pages[0]?.id || "home";
    render();
  }));
  $$("[data-template-page]").forEach(btn => btn.addEventListener("click", () => {
    state.selectedTemplatePage = btn.dataset.templatePage;
    render();
  }));
  $$("[data-confirm-template]").forEach(btn => btn.addEventListener("click", () => {
    state.section = "geo";
    render();
  }));
  $$("[data-publish-step]").forEach(btn => btn.addEventListener("click", () => {
    state.selectedPublishStep = Number(btn.dataset.publishStep);
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
