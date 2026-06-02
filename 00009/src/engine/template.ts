import type { GenerationResult, StoryNode, StoryPremise } from './types';

interface StoryTemplate {
  name: string;
  openingPatterns: string[];
  continuationPatterns: string[];
  choiceThemes: string[][];
  tone: string;
}

const templates: StoryTemplate[] = [
  {
    name: 'heroic_fantasy',
    tone: '史诗奇幻',
    openingPatterns: [
      '在遥远的{setting}，{character}站在命运的十字路口。古老的预言在风中低语，诉说着一个即将改变世界的选择。{scene_description}，空气中弥漫着魔法的气息。',
      '当第一缕晨光穿透{setting}的迷雾，{character}苏醒了。{scene_description}，一切看起来都和往常不同。在远处，一个神秘的身影正在等待。',
      '{setting}的夜晚总是笼罩着神秘的面纱。{character}独自走在蜿蜒的小路上，{scene_description}。突然，三个不同的方向同时传来了召唤。',
    ],
    continuationPatterns: [
      '随着{character}的决定，故事翻开了新的篇章。{action_result}。在{new_setting}，新的挑战正在等待着勇敢的冒险者。',
      '命运的齿轮开始转动。{action_result}，{character}发现自己来到了{new_setting}。这里{scene_description}，而更令人震惊的真相即将揭晓。',
      '选择的后果如涟漪般扩散。{action_result}。在{new_setting}的阴影中，{character}必须面对{new_challenge}，否则一切都将终结。',
    ],
    choiceThemes: [
      ['勇敢地面对未知的危险', '寻找智者指引方向', '隐藏在暗中观察局势'],
      ['追寻古老的魔法力量', '联合各族共同抗敌', '独自寻找真相'],
      ['拯救被囚禁的无辜者', '夺取传说中的神器', '解开古老诅咒的秘密'],
      ['相信直觉勇往直前', '谨慎行事收集情报', '寻求盟友的帮助'],
      ['牺牲小我完成大我', '寻找两全其美的方法', '改变规则创造奇迹'],
    ],
  },
  {
    name: 'mystery_thriller',
    tone: '悬疑惊悚',
    openingPatterns: [
      '在{setting}这个阴雨连绵的城市，{character}收到了一封匿名信。信上只有一句话："你已经被选中了。" {scene_description}，真相就隐藏在这迷雾之后。',
      '当{character}踏入{setting}的那一刻，就意识到事情不对劲。{scene_description}，每个人的眼神中都带着秘密。而在今晚，有人将会死去。',
      '{setting}发生了一起离奇的案件。{character}作为唯一的目击者，却发现自己的记忆出现了空白。{scene_description}，线索指向三个截然不同的方向。',
    ],
    continuationPatterns: [
      '线索逐渐拼凑出一个惊人的真相。{action_result}，{character}意识到{new_revelation}。时间不多了，必须在{deadline}之前找到答案。',
      '每一个选择都让{character}陷入更深的迷局。{action_result}。在{new_location}，{character}发现了{clue}，这将改变一切。',
      '真相远比想象中更加黑暗。{action_result}，{character}终于明白{twist}。现在，必须做出最终的抉择。',
    ],
    choiceThemes: [
      ['深入虎穴直面嫌疑人', '搜集证据还原现场', '追踪神秘的匿名线人'],
      ['相信看似无辜的人', '质疑所有人的证词', '用逻辑推理找出矛盾'],
      ['保护潜在的受害者', '设下陷阱引蛇出洞', '破译凶手留下的密码'],
      ['揭露真相不顾一切', '隐藏秘密保护他人', '利用真相达成目的'],
      ['面对内心的恐惧', '求助专业人士帮助', '依靠自己的直觉'],
    ],
  },
  {
    name: 'sci_fi',
    tone: '科幻冒险',
    openingPatterns: [
      '公元{year}年，{character}作为{setting}空间站的首席科学家，发现了一个异常信号。{scene_description}，这个信号来自一个从未被探索过的星域。',
      '当{character}从冷冻睡眠中苏醒，发现{setting}飞船上的船员都消失了。{scene_description}，主控台的屏幕上闪烁着三个紧急选项。',
      '在{setting}这个殖民星球上，{character}发现了远古文明的遗迹。{scene_description}，遗迹中的科技远超人类的理解。三个不同的实验室同时发出了召唤。',
    ],
    continuationPatterns: [
      '科技的边界再次被突破。{action_result}，{character}面临着{ethical_dilemma}。这将决定人类文明的未来走向。',
      '宇宙的真相远比想象中更加震撼。{action_result}，{character}发现了{alien_secret}。现在，必须决定如何面对这个发现。',
      '时间和空间的法则开始崩塌。{action_result}，{character}必须在{paradox}发生之前，找到修复一切的方法。',
    ],
    choiceThemes: [
      ['探索未知的星域', '研究神秘的科技', '保护脆弱的殖民点'],
      ['与外星文明接触', '关闭危险的实验', '逃离即将毁灭的区域'],
      ['升级人工智能系统', '手动控制关键设备', '寻找隐藏的备用方案'],
      ['牺牲自己拯救他人', '启动紧急协议', '尝试与敌对势力谈判'],
      ['公开惊人的真相', '销毁危险的证据', '将发现卖给最高出价者'],
    ],
  },
  {
    name: 'romance_drama',
    tone: '浪漫剧情',
    openingPatterns: [
      '在{setting}这个浪漫的城市，{character}从未想过会在{scene_description}遇到改变一生的人。三个截然不同的人，三种可能的未来，命运正在等待选择。',
      '{character}回到了阔别多年的{setting}。{scene_description}，过去的回忆如潮水般涌来。而现在，三个曾经重要的人再次出现在生活中。',
      '一场意外让{character}来到了{setting}。{scene_description}，在最意想不到的时刻，心开始动摇。三个选择，三种人生，爱情将会如何绽放？',
    ],
    continuationPatterns: [
      '心的方向逐渐清晰。{action_result}，{character}开始理解{realization}。但在{event}之后，一切都变得复杂起来。',
      '爱情的道路从来都不平坦。{action_result}，{character}必须面对{obstacle}。这将考验{pronoun}对{person}的感情有多深。',
      '当真相大白，{character}终于明白{twist}。现在，必须做出最终的选择：是遵循内心的声音，还是听从理智的安排？',
    ],
    choiceThemes: [
      ['勇敢地表白心意', '默默守护在身边', '让时间来证明一切'],
      ['面对过去的遗憾', '珍惜眼前的幸福', '追寻未知的可能'],
      ['选择热烈的爱情', '选择温暖的陪伴', '选择灵魂的契合'],
      ['原谅曾经的伤害', '坚守自己的原则', '重新开始一段关系'],
      ['为爱情牺牲事业', '平衡爱与梦想', '让对方做出选择'],
    ],
  },
];

const characterTemplates = [
  '年轻的冒险者',
  '神秘的侦探',
  '天才科学家',
  '落魄的贵族',
  '孤独的旅人',
  '勇敢的战士',
  '机智的盗贼',
  '隐居的智者',
  '失忆的陌生人',
  '背负诅咒的英雄',
];

const settingTemplates = [
  '被遗忘的王国',
  '永夜之城',
  '漂浮在云端的岛屿',
  '时间静止的废墟',
  '迷雾笼罩的森林',
  '繁华的都市',
  '荒凉的边境',
  '古老的学院',
  '被诅咒的城堡',
  '无尽的沙漠',
];

const sceneDescriptions = [
  '月光洒在古老的石墙上',
  '暴风雨即将来临',
  '霓虹灯在夜色中闪烁',
  '落叶在秋风中飘舞',
  '晨雾笼罩着一切',
  '夕阳染红了天际',
  '雪花缓缓飘落',
  '远处传来神秘的钟声',
  '空气中弥漫着花香',
  '星星在夜空中闪烁',
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(
  template: string,
  premise: StoryPremise,
  context?: {
    character?: string;
    setting?: string;
    sceneDescription?: string;
    lastChoice?: string;
    previousContent?: string;
  }
): string {
  let result = template;

  const character = context?.character || randomChoice(characterTemplates);
  const setting = context?.setting || randomChoice(settingTemplates);
  const sceneDescription = context?.sceneDescription || randomChoice(sceneDescriptions);

  result = result.replace(/{character}/g, character);
  result = result.replace(/{setting}/g, setting);
  result = result.replace(/{scene_description}/g, sceneDescription);
  result = result.replace(/{year}/g, String(2000 + Math.floor(Math.random() * 1000)));
  result = result.replace(/{pronoun}/g, Math.random() > 0.5 ? '他' : '她');

  result = result.replace(/{action_result}/g, generateActionResult(context?.lastChoice));
  result = result.replace(/{new_setting}/g, randomChoice(settingTemplates));
  result = result.replace(/{new_challenge}/g, generateChallenge());
  result = result.replace(/{new_revelation}/g, generateRevelation());
  result = result.replace(/{deadline}/g, generateDeadline());
  result = result.replace(/{new_location}/g, randomChoice(settingTemplates));
  result = result.replace(/{clue}/g, generateClue());
  result = result.replace(/{twist}/g, generateTwist());
  result = result.replace(/{ethical_dilemma}/g, generateDilemma());
  result = result.replace(/{alien_secret}/g, generateAlienSecret());
  result = result.replace(/{paradox}/g, generateParadox());
  result = result.replace(/{realization}/g, generateRealization());
  result = result.replace(/{event}/g, generateEvent());
  result = result.replace(/{obstacle}/g, generateObstacle());
  result = result.replace(/{person}/g, character);

  if (result.includes('{') || result.includes('}')) {
    result = result.replace(/{[^}]+}/g, '');
  }

  return result;
}

function generateActionResult(choice?: string): string {
  const results = [
    '这个选择带来了意想不到的后果',
    '命运之轮开始向新的方向转动',
    '一切都在悄然改变',
    '前路逐渐变得清晰',
    '隐藏的真相开始浮出水面',
  ];
  if (choice) {
    return `当${choice}的决定尘埃落定，${randomChoice(results)}`;
  }
  return randomChoice(results);
}

function generateChallenge(): string {
  return randomChoice([
    '前所未有的考验',
    '内心深处的恐惧',
    '来自过去的阴影',
    '难以想象的困境',
    '打破常规的抉择',
  ]);
}

function generateRevelation(): string {
  return randomChoice([
    '一切都不是表面看起来那样',
    '真正的敌人一直就在身边',
    '时间已经不多了',
    '这个世界的真相远比想象中可怕',
    '自己一直在被人利用',
  ]);
}

function generateDeadline(): string {
  return randomChoice([
    '黎明到来之前',
    '午夜的钟声敲响第十二下时',
    '三天之后',
    '下一次月圆之夜',
    '所有的蜡烛燃尽之前',
  ]);
}

function generateClue(): string {
  return randomChoice([
    '一张泛黄的旧照片',
    '一段被遗忘的录音',
    '一个加密的文件',
    '目击者留下的日记',
    '现场遗留的神秘信物',
  ]);
}

function generateTwist(): string {
  return randomChoice([
    '所谓的受害者才是真正的凶手',
    '这一切都是一场精心设计的骗局',
    '记忆是可以被篡改的',
    '自己才是这一切的始作俑者',
    '时间是一个闭环',
  ]);
}

function generateDilemma(): string {
  return randomChoice([
    '拯救少数人还是保护多数人',
    '遵循道德还是追求真相',
    '信任机器还是相信人类',
    '改变过去还是接受现在',
    '揭示真相还是保护无辜',
  ]);
}

function generateAlienSecret(): string {
  return randomChoice([
    '人类并不是宇宙中唯一的智慧生命',
    '地球是一个巨大的实验场',
    '时间旅行早已经实现',
    '我们的宇宙只是无数平行宇宙中的一个',
    '人工智能早已经觉醒',
  ]);
}

function generateParadox(): string {
  return randomChoice([
    '时间悖论',
    '因果倒置',
    '存在与不存在的矛盾',
    '自我毁灭的预言',
    '无限循环的命运',
  ]);
}

function generateRealization(): string {
  return randomChoice([
    '什么才是真正重要的东西',
    '爱有时候意味着放手',
    '幸福一直在身边却从未察觉',
    '过去的已经过去，未来还在手中',
    '勇敢的心才能获得真正的爱情',
  ]);
}

function generateEvent(): string {
  return randomChoice([
    '一场突如其来的变故',
    '一个神秘人物的出现',
    '一封迟到多年的信',
    '一次意外的重逢',
    '一个无法挽回的错误',
  ]);
}

function generateObstacle(): string {
  return randomChoice([
    '世俗的眼光',
    '家庭的反对',
    '身份的差距',
    '曾经的误会',
    '对未来的恐惧',
  ]);
}

export function generateByTemplate(
  premise: StoryPremise,
  currentNode?: StoryNode,
  lastChoice?: string
): GenerationResult {
  const template = randomChoice(templates);

  let content: string;
  let choices: string[];

  if (!currentNode) {
    const openingPattern = randomChoice(template.openingPatterns);
    content = fillTemplate(openingPattern, premise, {
      character: premise.character || undefined,
      setting: premise.background || undefined,
      sceneDescription: premise.scene || undefined,
    });

    const themeSet = randomChoice(template.choiceThemes);
    choices = themeSet.slice(0, 3);
  } else {
    const continuationPattern = randomChoice(template.continuationPatterns);
    content = fillTemplate(continuationPattern, premise, {
      character: premise.character || undefined,
      setting: premise.background || undefined,
      sceneDescription: premise.scene || undefined,
      lastChoice,
      previousContent: currentNode.content,
    });

    const themeSet = randomChoice(template.choiceThemes);
    choices = themeSet.slice(0, 3);
  }

  content = `【${template.tone}风格】\n\n${content}`;

  return {
    content,
    choices: choices.map((text) => ({ id: '', text })),
    mode: 'template',
  };
}

export function extractContextFromPremise(premise: string): {
  character?: string;
  setting?: string;
  sceneDescription?: string;
} {
  const result: {
    character?: string;
    setting?: string;
    sceneDescription?: string;
  } = {};

  const characterPatterns = [
    /(?:主角|主人公|我|你|他|她)\s*(?:是|叫|作为|扮演)?\s*([^，。！？、；：]+?)(?:的故事|在|去|，|。|$)/,
    /一个?([^，。！？、；：]+?)(?:的|在|去|，|。)/,
  ];

  for (const pattern of characterPatterns) {
    const match = premise.match(pattern);
    if (match && match[1].length > 1 && match[1].length < 20) {
      result.character = match[1].trim();
      break;
    }
  }

  const settingPatterns = [
    /在([^，。！？、；：]+?)(?:中|里|发生|的故事|，|。|$)/,
    /([^，。！？、；：]+?(?:世界|大陆|城市|王国|星球|时代|年代|世纪))/,
  ];

  for (const pattern of settingPatterns) {
    const match = premise.match(pattern);
    if (match && match[1].length > 1 && match[1].length < 30) {
      result.setting = match[1].trim();
      break;
    }
  }

  return result;
}
