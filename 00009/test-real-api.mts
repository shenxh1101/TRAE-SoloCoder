import { generateStoryNode } from './src/engine/generator.ts';
import { updateLLMConfig, loadLLMConfig, generateByLLM } from './src/engine/llm.ts';
import { storage } from './src/utils/storage.ts';
import type { StoryPremise, StoryNode } from './src/engine/types.ts';

class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string): string | null { return this.store[key] || null; }
  setItem(key: string, value: string): void { this.store[key] = String(value); }
  removeItem(key: string): void { delete this.store[key]; }
  clear(): void { this.store = {}; }
}
(globalThis as any).localStorage = new LocalStorageMock();

const apiKey = process.env.LLM_API_KEY || '';
const endpoint = process.env.LLM_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
const model = process.env.LLM_MODEL || 'deepseek-chat';

console.log('========================================');
console.log('   真实 LLM API 端到端测试');
console.log('========================================\n');

if (!apiKey) {
  console.log('⚠️  未设置 LLM_API_KEY 环境变量');
  console.log('   请运行: LLM_API_KEY=sk-xxx npx tsx test-real-api.mts\n');
  console.log('   支持的环境变量:');
  console.log('   - LLM_API_KEY: API 密钥 (必需)');
  console.log('   - LLM_ENDPOINT: API 端点 (默认: https://api.deepseek.com/v1/chat/completions)');
  console.log('   - LLM_MODEL: 模型名称 (默认: deepseek-chat)');
  process.exit(0);
}

console.log(`API Endpoint: ${endpoint}`);
console.log(`Model: ${model}`);
console.log(`API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}\n`);

updateLLMConfig({ apiKey, endpoint, model });
const config = loadLLMConfig();
console.log('✅ 配置已保存到 localStorage');

const premise: StoryPremise = {
  background: '星际联邦统治下的银河纪元 3025年',
  character: '被放逐的前星际舰队指挥官 雷恩',
  scene: '废弃空间站"奥德赛号"中，一份加密情报正在解码',
};

console.log('\n📋 测试 1: 开篇场景生成（LLM）');
console.log('--------------------------------------------------');

try {
  const startTime = Date.now();
  const result = await generateStoryNode(premise, undefined, undefined, undefined, config);
  const elapsed = Date.now() - startTime;

  console.log(`✅ 生成成功 (耗时: ${elapsed}ms)`);
  console.log(`   生成模式: %c${result.mode}`, result.mode === 'llm' ? 'color: #2d4a3e;' : 'color: #8b2635;');
  console.log(`   内容长度: ${result.content.length} 字符`);
  console.log(`   内容:\n   ${result.content.split('\n').join('\n   ')}\n`);
  console.log(`   选项:`);
  result.choices.forEach((c, i) => {
    console.log(`     ${i + 1}. "${c.text}"`);
  });

  if (result.mode !== 'llm') {
    console.error('\n❌ 失败: 生成模式应为 llm，但实际是', result.mode);
    process.exit(1);
  }

} catch (e) {
  console.error('\n❌ 测试 1 失败:', e);
  process.exit(1);
}

console.log('\n📋 测试 2: 续写场景生成（包含历史上下文）');
console.log('--------------------------------------------------');

const mockNode: StoryNode = {
  id: 'node-1',
  storyId: 'story-1',
  parentId: null,
  content: '星际联邦3025年，被放逐的前舰队指挥官雷恩站在废弃的"奥德赛号"空间站中。屏幕上的加密情报解码进度条缓缓前进，突然，一行红色文字闪烁出现："巨龙计划已经启动，他们回来了。"雷恩的瞳孔骤然收缩——这个代号他整整十五年没有听过了。',
  choices: [
    { id: 'c1', text: '立刻联系旧日的战友', nextNodeId: null },
    { id: 'c2', text: '独自深入调查真相', nextNodeId: null },
    { id: 'c3', text: '销毁情报假装从未发现', nextNodeId: null },
  ],
  depth: 0,
  createdAt: Date.now(),
};

const mockNodes = { 'node-1': mockNode };

try {
  const startTime = Date.now();
  const result = await generateStoryNode(premise, mockNodes, mockNode, '独自深入调查真相', config);
  const elapsed = Date.now() - startTime;

  console.log(`✅ 续写成功 (耗时: ${elapsed}ms)`);
  console.log(`   生成模式: %c${result.mode}`, result.mode === 'llm' ? 'color: #2d4a3e;' : 'color: #8b2635;');
  console.log(`   内容长度: ${result.content.length} 字符`);
  console.log(`   内容预览: "${result.content.slice(0, 150)}..."\n`);
  console.log(`   选项:`);
  result.choices.forEach((c, i) => {
    console.log(`     ${i + 1}. "${c.text}"`);
  });

  if (result.mode !== 'llm') {
    console.log('\n⚠️  警告: LLM 调用可能失败，已回退到模板');
  }

} catch (e) {
  console.error('\n❌ 测试 2 失败:', e);
  process.exit(1);
}

console.log('\n📋 测试 3: 无效 API Key 回退测试');
console.log('--------------------------------------------------');

updateLLMConfig({ apiKey: 'sk-invalid-key-12345', endpoint, model });
const invalidConfig = loadLLMConfig();

try {
  const startTime = Date.now();
  const result = await generateStoryNode(premise, undefined, undefined, undefined, invalidConfig);
  const elapsed = Date.now() - startTime;

  console.log(`✅ 回退成功 (耗时: ${elapsed}ms)`);
  console.log(`   生成模式: ${result.mode}`);
  
  if (result.mode !== 'template') {
    console.error('❌ 失败: 无效 Key 时应回退到 template');
    process.exit(1);
  }
  
  console.log(`   内容预览: "${result.content.slice(0, 80)}..."`);
  console.log(`   选项: ${result.choices.map(c => c.text).join(' | ')}`);

} catch (e) {
  console.error('❌ 测试 3 失败:', e);
  process.exit(1);
}

console.log('\n========================================');
console.log('   🎉 所有真实 API 测试通过！');
console.log('========================================\n');

console.log('浏览器验证步骤:');
console.log('1. 打开 http://localhost:5173/');
console.log('2. 按 F12 → Network 标签');
console.log('3. 点击 "显示AI配置"，填入:');
console.log(`   Endpoint: ${endpoint}`);
console.log(`   Model: ${model}`);
console.log('   API Key: 你的真实密钥');
console.log('4. 填写三个故事字段并提交');
console.log('5. 观察 Network 面板应有请求发送到 ${endpoint}');
console.log('6. StoryCard 左上角显示绿色 "🤖 AI 生成" 标签');

storage.clearAll();
(globalThis as any).localStorage.clear();
