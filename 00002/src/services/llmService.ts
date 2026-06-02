import { MemeStyle, EmotionType } from '../types';
import { styleLabels } from '../data/textTemplates';
import { emotionLabels } from './faceDetection';

const DASHSCOPE_API_KEY = '';

const stylePrompts: Record<MemeStyle, string> = {
  sarcastic: '阴阳怪气、含沙射影、话中有话、表面恭维实则嘲讽',
  office: '职场自嘲、打工人、摸鱼、社畜、加班、老板画饼',
  funny: '沙雕搞笑、无厘头、脑洞大开、接地气、网络热梗',
};

const mockTexts: Record<MemeStyle, Record<EmotionType, string[]>> = {
  sarcastic: {
    happy: [
      '您这笑容可真敷衍呢',
      '笑那么开心，中彩票了？',
      '这表情不去演戏可惜了',
      '呵呵，您可真幽默',
      '笑得跟个傻子似的',
    ],
    sad: [
      '哭吧哭吧，反正没人在乎',
      '这委屈的小表情真让人心疼（才怪）',
      '眼泪都快成河了',
      '不哭不哭，哭了也没用',
      '这表情装得还挺像',
    ],
    angry: [
      '哟，这火气可真大',
      '生气的样子真可爱呢',
      '别气坏了身子，多不值当',
      '这表情能吓哭小朋友',
      '来来来，继续你的表演',
    ],
    surprised: [
      '哟，这么惊讶啊',
      '这表情跟见了鬼似的',
      '下巴都快掉地上了',
      '真的假的？我不信',
      '哟，没见过世面的样子',
    ],
    disgusted: [
      '哟，这嫌弃的小表情',
      '是嫌我不够优秀吗',
      '这表情也太真实了',
      '哟，还挺挑剔啊',
      '就你高贵，就你厉害',
    ],
    fearful: [
      '哟，这小胆儿',
      '看把你吓得，至于吗',
      '这表情都快哭了',
      '别怕别怕，有我呢（才怪）',
      '胆子这么小也好意思出来混',
    ],
    neutral: [
      '哟，装什么深沉呢',
      '这表情可真够面瘫的',
      '内心毫无波澜的样子',
      '哟，还挺淡定啊',
      '这表情跟个木头似的',
    ],
    unknown: [
      '您这表情可真难懂',
      '我该说什么好呢',
      '这表情可真有个性',
      '哟，挺有想法啊',
      '就那样吧，还行',
    ],
  },
  office: {
    happy: [
      '今天摸鱼成功！',
      '又混了一天工资',
      '下班的脚步格外轻快',
      '今天老板不在，爽',
      '摸鱼的日子真快乐',
    ],
    sad: [
      '工资不够花啊',
      '这班谁爱上谁上',
      '又要加班，不想活了',
      '老板画的饼太硬了',
      '今天也是不想上班的一天',
    ],
    angry: [
      '破工作，不干了！',
      '这客户怕不是有病',
      '天天改需求，改你妹',
      '老板脑子是不是进水了',
      '这破公司迟早要完',
    ],
    surprised: [
      '居然准时下班了？',
      '什么？今天不用加班？',
      '老板居然给我加薪了？',
      '这需求居然通过了？',
      '今天居然周五了？',
    ],
    disgusted: [
      '这代码写的什么玩意儿',
      '又要接这个烂摊子',
      '这会议开得真恶心',
      '又是这个傻逼需求',
      '这人怕不是有毛病',
    ],
    fearful: [
      '老板不会要开掉我吧',
      '这个bug要上线了',
      '今天要汇报，好紧张',
      '不会要扣我工资吧',
      '这需求我接不住啊',
    ],
    neutral: [
      '带薪拉屎中...',
      '又是平静的一天',
      '摸鱼摸鱼，不要打扰',
      '等待下班中...',
      '今天也是无欲无求',
    ],
    unknown: [
      '打工而已，认真就输了',
      '上班如上坟',
      '打工人，打工魂',
      '我的工资不配我干活',
      '就那样吧，凑合过',
    ],
  },
  funny: {
    happy: [
      '哈哈哈哈笑死我了',
      '笑得像个傻子',
      '这波稳了稳了',
      '快乐到飞起',
      '芜湖起飞！',
    ],
    sad: [
      '我裂开了啊',
      '蚌埠住了家人们',
      '哭唧唧QAQ',
      '我真的会谢',
      '谁懂啊家人们',
    ],
    angry: [
      '我超勇的好不好',
      '信不信我咬你',
      '老子今天跟你拼了',
      '这能忍？不能忍！',
      '你再骂？！',
    ],
    surprised: [
      '我去！这也行？',
      '我和我的小伙伴都惊呆了',
      '还有这种操作？',
      '不会吧不会吧',
      '这是什么神仙操作',
    ],
    disgusted: [
      'yue了yue了',
      '辣眼睛啊',
      '听我说谢谢你',
      '退退退！',
      '大可不必真的',
    ],
    fearful: [
      '妈妈我要回家',
      '害怕极了',
      '我选择死亡',
      '瑟瑟发抖ing',
      '我只是个小透明',
    ],
    neutral: [
      '我是来凑数的',
      '混子本混',
      '主打的就是一个陪伴',
      '主打一个随缘',
      '躺平了，勿扰',
    ],
    unknown: [
      '主打一个抽象',
      '咱就是说一整个大动作',
      '绝绝子',
      'yyds',
      '尊嘟假嘟',
    ],
  },
};

const fallbackTexts: Record<MemeStyle, string[]> = {
  sarcastic: [
    '您说的都对',
    '真厉害呢',
    '我就笑笑不说话',
    '您开心就好',
    '好棒棒哦',
  ],
  office: [
    '这班谁爱上谁上',
    '打工人，打工魂',
    '我的工资不配我干活',
    '上班如上坟',
    '老板画的饼太硬了',
  ],
  funny: [
    '我不是胖，我是可爱到膨胀',
    '干饭人，干饭魂',
    '每天都被自己帅醒',
    '人生苦短，再来一碗',
    '我超勇的好不好',
  ],
};

export async function generateMemeTexts(
  style: MemeStyle,
  emotion: EmotionType,
  count: number = 5
): Promise<string[]> {
  const emotionText = emotionLabels[emotion];
  const styleText = styleLabels[style];
  const styleDescription = stylePrompts[style];

  const apiKey = (window as any).DASHSCOPE_API_KEY || DASHSCOPE_API_KEY;

  if (apiKey) {
    try {
      const prompt = `你是一个专业的表情包配文大师。请根据以下要求生成${count}条表情包配文：

表情类型：${emotionText}
文字风格：${styleText}（${styleDescription}）

要求：
1. 每条配文控制在4-15个字之间
2. 符合${styleText}的语言风格
3. 结合${emotionText}的表情情绪
4. 语言要口语化、接地气、有网感
5. 不要重复
6. 直接输出配文内容，每行一条，不要编号，不要解释

配文列表：`;

      return await callQwenAPI(prompt, count, apiKey);
    } catch (error) {
      console.warn('LLM API failed, using mock texts:', error);
    }
  }

  return getMockTexts(style, emotion, count);
}

function getMockTexts(style: MemeStyle, emotion: EmotionType, count: number): string[] {
  const texts = mockTexts[style]?.[emotion] || fallbackTexts[style];
  const shuffled = [...texts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function callQwenAPI(prompt: string, count: number, apiKey: string): Promise<string[]> {
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一个创意十足的表情包配文大师，擅长根据表情和风格生成幽默、接地气的网络流行语。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  const texts = content
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0 && line.length < 30)
    .slice(0, count);

  return texts.length >= count ? texts : getMockTexts('funny', 'happy', count);
}

function getFallbackTexts(style: MemeStyle, count: number): string[] {
  const texts = [...fallbackTexts[style]];
  for (let i = texts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [texts[i], texts[j]] = [texts[j], texts[i]];
  }
  return texts.slice(0, count);
}

export function setLLMApiKey(apiKey: string) {
  (window as any).DASHSCOPE_API_KEY = apiKey;
}

export function hasLLMApiKey(): boolean {
  return !!((window as any).DASHSCOPE_API_KEY || DASHSCOPE_API_KEY);
}
