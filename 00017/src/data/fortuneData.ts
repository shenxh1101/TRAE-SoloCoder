export interface FortuneData {
  templates: string[];
  subjects: string[];
  actions: string[];
  outcomes: string[];
  mysticalWords: string[];
  timeFrames: string[];
}

export interface ReverseData {
  templates: string[];
  badEvents: string[];
  funnyOutcomes: string[];
}

export interface LuckyColor {
  name: string;
  hex: string;
}

export const normalFortuneData: FortuneData = {
  templates: [
    "本周{mysticalWord}能量强劲，你的{subject}将{action}，{outcome}。",
    "受{timeFrame}的星象影响，{subject}方面{action}，记得{outcome}。",
    "{mysticalWord}正在向你招手，本周{subject}{action}，{outcome}。",
    "在{timeFrame}的能量场中，你的{subject}{action}，{outcome}。",
    "{mysticalWord}能量流动顺畅，{subject}方面{action}，{outcome}。",
    "本周{timeFrame}，{subject}{action}，{outcome}。",
    "{mysticalWord}加持下，你的{subject}{action}，{outcome}。",
    "{timeFrame}星象显示，{subject}{action}，{outcome}。",
    "水逆退散后，{mysticalWord}将为你守护{subject}，{action}，{outcome}。",
    "根据{mysticalWord}的指引，{timeFrame}{subject}会{action}，{outcome}。",
    "宇宙{mysticalWord}频道传来信号，你的{subject}本周{action}，{outcome}。",
    "{timeFrame}，{mysticalWord}与你的{subject}产生共振，{action}，{outcome}。"
  ],
  subjects: [
    "财运", "事业运", "桃花运", "健康运", "学业运", "贵人运",
    "人际关系", "创造力", "自信心", "灵感运", "家庭运", "旅行运"
  ],
  actions: [
    "迎来重大突破", "持续走高", "迎来转机", "获得意外收获", "稳步上升",
    "光芒四射", "得到认可", "顺风顺水", "开启新篇章", "达到新高度",
    "焕发新生", "蓄势待发"
  ],
  outcomes: [
    "把握机会就能收获满满",
    "保持积极心态会有惊喜",
    "贵人相助事半功倍",
    "顺势而为即可水到渠成",
    "适合大胆尝试新事物",
    "好运即将接踵而至",
    "付出终将得到回报",
    "会有意想不到的收获",
    "静候佳音即可",
    "记得感恩身边的贵人"
  ],
  mysticalWords: [
    "水星", "金星", "火星", "木星", "土星", "天王星", "冥王星",
    "太阳", "月亮", "上升星座", "命宫", "能量场", "宇宙磁场",
    "黄道吉日", "紫薇星", "红鸾星", "财神爷", "幸运女神",
    "水逆", "天狼星", "北斗七星", "太岁星", "文昌星"
  ],
  timeFrames: [
    "周一", "周二", "周三", "周四", "周五", "周末",
    "新月", "满月", "水逆结束后", "上弦月", "下弦月"
  ]
};

export const reverseFortuneData: ReverseData = {
  templates: [
    "本周{badEvent}，{funnyOutcome}。",
    "警告：{badEvent}，{funnyOutcome}！",
    "小心了，{badEvent}，{funnyOutcome}。",
    "今日预警：{badEvent}，{funnyOutcome}。",
    "命运的捉弄：{badEvent}，{funnyOutcome}。",
    "前方高能：{badEvent}，{funnyOutcome}。",
    "星象显示{badEvent}，{funnyOutcome}。",
    "紧急通知：{badEvent}，{funnyOutcome}！"
  ],
  badEvents: [
    "点外卖必遇商家忘放餐具",
    "排队永远选到最慢的队伍",
    "手机电量低于20%必找不到充电宝",
    "穿白衣服必被溅到油",
    "刚洗完车必下雨",
    "计划出门必遇突发状况",
    "早睡必失眠，熬夜必早起",
    "减肥期间必有人请吃火锅",
    "地铁刚到站必关门",
    "带伞不下雨，忘伞必下雨",
    "发消息必遇对方正在输入却不回",
    "定闹钟必睡过头",
    "出门必忘带钥匙",
    "想省钱必遇限量折扣",
    "化妆必被口罩蹭花"
  ],
  funnyOutcomes: [
    "建议直接躺平等着倒霉",
    "不要挣扎，这都是命",
    "建议在家躺平一天",
    "多喝热水能稍微缓解",
    "这是上天对你的考验",
    "建议购买彩票对冲一下",
    "反正都这样了，不如开心点",
    "明天会更糟的，放心吧",
    "别慌，习惯就好",
    "转锦鲤也许能救命"
  ]
};

export const luckyColors: LuckyColor[] = [
  { name: "玫瑰红", hex: "#E91E63" },
  { name: "深海蓝", hex: "#2196F3" },
  { name: "翡翠绿", hex: "#4CAF50" },
  { name: "金橙色", hex: "#FF9800" },
  { name: "神秘紫", hex: "#9C27B0" },
  { name: "天空蓝", hex: "#03A9F4" },
  { name: "樱花粉", hex: "#FFB6C1" },
  { name: "薄荷绿", hex: "#98FF98" },
  { name: "香槟金", hex: "#F7E7CE" },
  { name: "珊瑚橙", hex: "#FF7F50" },
  { name: "薰衣草", hex: "#E6E6FA" },
  { name: "蒂芙尼蓝", hex: "#0ABAB5" }
];

export const avoidDoings: string[] = [
  "不要跟处女座吵架",
  "别在凌晨三点刷购物软件",
  "避免和老板谈加薪",
  "不要在网上跟人抬杠",
  "别买彩票，浪费钱",
  "不要在深夜做重要决定",
  "避免借钱给朋友",
  "别吃第三个包子，会胖",
  "不要用剪刀剪指甲",
  "别在周一换发型",
  "避免走左边的楼梯",
  "不要喝第三杯奶茶",
  "别在雨天表白",
  "避免使用蓝色的笔签字",
  "不要踩井盖"
];
