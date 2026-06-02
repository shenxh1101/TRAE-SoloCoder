export type ModelType = 'phone' | 'tape' | 'tv' | 'camera' | 'computer' | 'radio' | 'walkman' | 'floppy' | 'gameboy' | 'cd' | 'pager' | 'vhs' | 'newspaper' | 'typewriter' | 'custom';

export interface EraItem {
  id: string;
  name: string;
  yearRanges: [number, number][];
  modelType: ModelType;
  descriptions: string[];
  color: string;
}

export const eraItems: EraItem[] = [
  {
    id: 'old-phone',
    name: '老式手机',
    yearRanges: [[1995, 2005], [2006, 2010]],
    modelType: 'phone',
    descriptions: ['1999年，人们还在用拨号上网，手机只能打电话发短信', '那年的诺基亚3310，摔不坏的手机才是好手机', '2003年，攒了半年的零花钱终于买了一部翻盖手机'],
    color: '#4A7C59',
  },
  {
    id: 'cassette-tape',
    name: '磁带',
    yearRanges: [[1975, 1990], [1991, 2000]],
    modelType: 'tape',
    descriptions: ['用铅笔卷磁带是每个孩子的必修课', '那盘周杰伦的磁带，翻来覆去听了整整一个夏天', '随身听里永远卡带的烦恼，反而成了最深的记忆'],
    color: '#8B4513',
  },
  {
    id: 'crt-tv',
    name: '显像管电视',
    yearRanges: [[1980, 1995], [1996, 2005]],
    modelType: 'tv',
    descriptions: ['傍晚六点整，全村人围坐在唯一一台电视机前看动画片', '雪花屏的时候拍两下就好了，这是爸爸的独门绝技', '每周二下午电视台检修，满屏的彩条信号让人无比失落'],
    color: '#2F4F4F',
  },
  {
    id: 'film-camera',
    name: '胶卷相机',
    yearRanges: [[1970, 1990], [1991, 2003]],
    modelType: 'camera',
    descriptions: ['一卷胶卷只有36张，每按下快门都要想半天', '等了整整一周才拿到洗出来的照片，有一半都是糊的', '柯达黄包装的胶卷，是过年才能用的奢侈品'],
    color: '#C4A35A',
  },
  {
    id: 'early-computer',
    name: '老式电脑',
    yearRanges: [[1990, 2000], [2001, 2008]],
    modelType: 'computer',
    descriptions: ['开机要等五分钟，但那个Windows启动音乐让人无比期待', '软盘里装着整个童年的游戏，1.44MB装下了整个世界', '拨号上网的吱吱声，是通往奇妙世界的入场券'],
    color: '#5B6B7C',
  },
  {
    id: 'radio',
    name: '收音机',
    yearRanges: [[1960, 1980], [1981, 1995]],
    modelType: 'radio',
    descriptions: ['每天晚上守着收音机听评书，一集不落', '调频时那沙沙的电流声，是深夜最温暖的陪伴', '外婆的收音机里永远在放越剧，那声音现在还回荡在耳边'],
    color: '#8B0000',
  },
  {
    id: 'walkman',
    name: '随身听',
    yearRanges: [[1985, 1998], [1999, 2005]],
    modelType: 'walkman',
    descriptions: ['书包里藏着随身听，耳机线从袖子里穿过，上课偷偷听歌', '两节五号电池能听一下午，那是属于少年的自由', '按下播放键的咔嗒声，比任何音乐都动听'],
    color: '#4682B4',
  },
  {
    id: 'floppy-disk',
    name: '软盘',
    yearRanges: [[1988, 2000], [2001, 2005]],
    modelType: 'floppy',
    descriptions: ['1.44MB的容量，装下了整篇作文和全部期待', '软盘上的写保护开关，是最早学会的加密方式', '那张写着"作业"的软盘，里面其实装满了小游戏'],
    color: '#708090',
  },
  {
    id: 'gameboy',
    name: '游戏机',
    yearRanges: [[1990, 2000], [2001, 2010]],
    modelType: 'gameboy',
    descriptions: ['被窝里打着小手电玩俄罗斯方块，第二天上课直打瞌睡', '和小伙伴比谁通关快，输的人请吃辣条', '游戏机没电了就用充电线接着玩，根本停不下来'],
    color: '#9370DB',
  },
  {
    id: 'cd-disc',
    name: '光盘',
    yearRanges: [[1995, 2008], [2009, 2012]],
    modelType: 'cd',
    descriptions: ['阳光照在光盘上反射出彩虹，那是数字时代的万花筒', '碟片上划了一道就卡了，心痛得像丢了宝贝', '五块钱一张盗版碟，攒够了就去电脑城淘'],
    color: '#DAA520',
  },
  {
    id: 'pager',
    name: '寻呼机',
    yearRanges: [[1990, 1998], [1999, 2002]],
    modelType: 'pager',
    descriptions: ['腰间别个BP机，走在街上都觉得神气', '嘀嘀声响起来，满大街找公用电话回call', '数字代码比情书还浪漫，5201314就是最长的告白'],
    color: '#2E8B57',
  },
  {
    id: 'vhs-tape',
    name: '录像带',
    yearRanges: [[1985, 1998], [1999, 2003]],
    modelType: 'vhs',
    descriptions: ['租录像带是周末最期待的事，一块钱看一个通宵', '倒带是门技术活，快进了还得重来', '那盘港片录像带翻录了太多次，画面糊成了印象派'],
    color: '#696969',
  },
  {
    id: 'newspaper',
    name: '报纸',
    yearRanges: [[1950, 1970], [1971, 1995], [1996, 2010]],
    modelType: 'newspaper',
    descriptions: ['清晨的报栏前总是站满了人，那是获取世界的唯一窗口', '爷爷用报纸糊墙，每天对着墙上的新闻念叨半天', '中缝的小广告比正文还精彩，找工作租房全靠它'],
    color: '#D2B48C',
  },
  {
    id: 'typewriter',
    name: '打字机',
    yearRanges: [[1955, 1975], [1976, 1990]],
    modelType: 'typewriter',
    descriptions: ['哒哒哒的敲击声是办公室的交响乐', '打错一个字就要整页重来，所以每个字都格外认真', '妈妈用打字机给我打了一封信，歪歪扭扭的字母满含爱意'],
    color: '#3C3C3C',
  },
  {
    id: 'smart-phone',
    name: '智能手机',
    yearRanges: [[2008, 2015], [2016, 2025]],
    modelType: 'phone',
    descriptions: ['第一次用手指滑动屏幕的感觉，像打开了新世界的大门', '从3G到5G，网速越来越快，但等待的快乐却越来越少了', '以前手机用来联系人，现在手机用来远离人'],
    color: '#1E90FF',
  },
  {
    id: 'vinyl-record',
    name: '黑胶唱片',
    yearRanges: [[1950, 1970], [1971, 1985]],
    modelType: 'custom',
    descriptions: ['唱针落下的瞬间，沙沙声里藏着整个时代的温柔', '唱片机上转动的不仅是音乐，还有那再也回不去的慢时光', '那首老歌在黑胶上的温度，是数字音乐永远无法替代的'],
    color: '#1C1C1C',
  },
  {
    id: 'rotary-phone',
    name: '转盘电话',
    yearRanges: [[1950, 1970], [1971, 1985]],
    modelType: 'phone',
    descriptions: ['拨一个0要等转盘转半天，但那节奏让人心安', '整条街就一部电话，邻居喊一声全巷子都知道谁来电了', '转盘的咔咔声，是那个慢年代最真实的注脚'],
    color: '#6B4226',
  },
  {
    id: 'polaroid',
    name: '拍立得',
    yearRanges: [[1980, 1995], [2010, 2025]],
    modelType: 'camera',
    descriptions: ['摇晃照片让它快点显影，虽然说明书说不用摇', '每一张都是唯一，没有修图没有滤镜，真实的笑容最动人', '相纸好贵，只在生日和毕业的时候才舍得拍'],
    color: '#E8735A',
  },
  {
    id: 'cathode-radio',
    name: '电子管收音机',
    yearRanges: [[1950, 1965], [1966, 1978]],
    modelType: 'radio',
    descriptions: ['暖机要等好几分钟，但那金色的电子管亮起来时整个房间都温暖了', '除夕夜守着收音机听春节晚会，比电视版还让人激动', '爸爸说这机器比我还大，是家里最贵重的东西'],
    color: '#A0522D',
  },
  {
    id: 'dvd-player',
    name: 'DVD机',
    yearRanges: [[2000, 2008], [2009, 2015]],
    modelType: 'vhs',
    descriptions: ['从录像带到DVD，画面清晰了好几倍，但那种模糊的浪漫少了', '买碟片时纠结是买国配还是原声，最后两个都买了', 'DVD菜单循环播放的背景音乐，等人的时候听了无数遍'],
    color: '#6A5ACD',
  },
  {
    id: 'net-cafe-computer',
    name: '网吧电脑',
    yearRanges: [[1998, 2008], [2009, 2012]],
    modelType: 'computer',
    descriptions: ['两块钱一小时，攒了一周的早餐钱全献给网吧了', '烟雾缭绕的网吧里，键盘敲击声和游戏音效组成青春交响曲', 'QQ提示音此起彼伏，那是属于千禧一代的社交信号'],
    color: '#483D8B',
  },
  {
    id: 'mp3-player',
    name: 'MP3播放器',
    yearRanges: [[2003, 2010], [2011, 2015]],
    modelType: 'walkman',
    descriptions: ['128MB的容量精打细算，每首歌都要反复斟酌值不值得存', '数据线连上电脑的那一刻，整个音乐世界都在更新', '地铁里塞着耳机假装没听到报站，坐过了无数站'],
    color: '#20B2AA',
  },
];

export function getItemsForYear(year: number): EraItem[] {
  const matched = eraItems.filter(item =>
    item.yearRanges.some(([start, end]) => year >= start && year <= end)
  );
  const shuffled = matched.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8);
}
