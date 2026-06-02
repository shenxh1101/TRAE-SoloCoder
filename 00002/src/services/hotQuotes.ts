import { HotQuote } from '../types';

const mockQuotes: string[] = [
  '绝绝子',
  'yyds',
  '我不理解',
  '大可不必',
  '就这？',
  '真的会谢',
  '我裂开了',
  '蚌埠住了',
  '拿来吧你',
  '咱就是说',
  '一整个大动作',
  '谁懂啊',
  '主打一个陪伴',
  '显眼包',
  '无语住了',
  '笑不活了',
  '救命',
  '我真的拴Q',
  '退退退',
  '听我说谢谢你',
  '人生无常，大肠包小肠',
  '尊嘟假嘟',
  '哈基米',
  '纯纯无语',
  '这是可以说的吗',
  '主打一个反差',
  '我佛了',
  '难搞哦',
  '格局打开',
  '躺平了',
  '主打一个抽象',
  '主打一个真诚',
  '我超勇的',
  '这是什么梗',
  '完了完了',
  '家人们谁懂啊',
  '这也太那个了',
  '我不是胖，我是可爱到膨胀',
  '干饭人干饭魂',
  '你没事吧',
  '听君一席话如听一席话',
  '我不李姐',
  '你是我的神',
  '栓Q了老铁',
  '我真的会谢',
  '咱们就是说',
  '咱就是一整个大无语住了家人们',
  '狠狠心动了',
  '狠狠拿捏了',
  '这波操作我给满分',
];

const externalAPIs = [
  {
    name: 'hitokoto',
    url: 'https://v1.hitokoto.cn/?c=a&c=b&c=c&c=d&c=h',
    parse: (data: any) => data.hitokoto,
  },
];

export async function fetchHotQuotes(count: number = 10): Promise<HotQuote[]> {
  const quotes: HotQuote[] = [];
  
  for (const api of externalAPIs) {
    try {
      const response = await fetch(api.url, {
        mode: 'cors',
      });
      if (response.ok) {
        const data = await response.json();
        const content = api.parse(data);
        if (content && typeof content === 'string') {
          quotes.push({
            id: `${api.name}-${Date.now()}`,
            content: content.slice(0, 20),
            source: api.name,
          });
        }
      }
    } catch (error) {
      console.log(`API ${api.name} failed, using mock data`);
    }
  }

  if (quotes.length < count) {
    const shuffled = [...mockQuotes].sort(() => Math.random() - 0.5);
    const needed = count - quotes.length;
    for (let i = 0; i < needed && i < shuffled.length; i++) {
      quotes.push({
        id: `mock-${Date.now()}-${i}`,
        content: shuffled[i],
        source: '热词库',
      });
    }
  }

  return quotes.slice(0, count);
}

export async function getRandomHotQuote(): Promise<HotQuote> {
  try {
    const quotes = await fetchHotQuotes(5);
    return quotes[Math.floor(Math.random() * quotes.length)];
  } catch {
    return {
      id: `mock-${Date.now()}`,
      content: getRandomLocalQuote(),
      source: '热词库',
    };
  }
}

export function getRandomLocalQuote(): string {
  return mockQuotes[Math.floor(Math.random() * mockQuotes.length)];
}
