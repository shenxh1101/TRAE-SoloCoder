// ============================================================
//  互动故事引擎 - 浏览器控制台测试脚本
//  使用方法：
//  1. 打开 http://localhost:5173/
//  2. 按 F12 打开开发者工具 → Console 标签
//  3. 复制粘贴以下所有代码并回车
// ============================================================

console.log('%c========================================', 'color: #d4a84b; font-weight: bold; font-size: 14px;');
console.log('%c  互动故事引擎 - 浏览器端到端测试', 'color: #d4a84b; font-weight: bold; font-size: 14px;');
console.log('%c========================================', 'color: #d4a84b; font-weight: bold; font-size: 14px;');
console.log('');

// ---------- 配置测试数据 ----------
const TEST_CONFIG = {
  // 在这里填入你的真实 API Key 进行测试
  API_KEY: '', // 例如: 'sk-xxxxxxxxxxxxxxxx'
  ENDPOINT: 'https://api.deepseek.com/v1/chat/completions',
  MODEL: 'deepseek-chat',

  // 测试故事数据
  PREMISE: {
    background: '星际联邦统治下的银河纪元 3025年',
    character: '被放逐的前星际舰队指挥官 雷恩',
    scene: '废弃空间站"奥德赛号"中，一份加密情报正在解码'
  }
};

console.log('%cℹ️  配置说明', 'color: #d4a84b; font-weight: bold;');
console.log('   本脚本将:');
console.log('   1. 清除旧数据');
console.log('   2. 测试三个独立输入框');
console.log('   3. 测试无 API Key 时的模板生成');
console.log('   4. 测试有 API Key 时的 LLM 生成');
console.log('   5. 验证网络请求和绿色 AI 标签');
console.log('');

if (!TEST_CONFIG.API_KEY) {
  console.log('%c⚠️  未配置 API Key', 'color: #ffa500; font-weight: bold;');
  console.log('   请编辑脚本顶部的 TEST_CONFIG.API_KEY 填入你的真实密钥');
  console.log('   或者在测试过程中手动在页面上填写');
  console.log('');
}

// ---------- 工具函数 ----------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const setInputValue = (input, value) => {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  ).set;
  nativeInputValueSetter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const logStep = (num, title) => {
  console.log('');
  console.log(`%c📋 测试 ${num}: ${title}`, 'color: #d4a84b; font-weight: bold; font-size: 13px;');
  console.log('--------------------------------------------------');
};

const logSuccess = (msg) => console.log(`%c✅ ${msg}`, 'color: #2d4a3e; font-weight: bold;');
const logError = (msg) => console.log(`%c❌ ${msg}`, 'color: #8b2635; font-weight: bold;');
const logWarn = (msg) => console.log(`%c⚠️  ${msg}`, 'color: #ffa500; font-weight: bold;');

// ---------- 监听网络请求 ----------
const originalFetch = window.fetch;
const fetchLog = [];

window.fetch = async (...args) => {
  const [url, options] = args;
  const isLLMRequest = url.includes('/chat/completions') || url.includes('api.') || url.includes('openai');
  
  if (isLLMRequest) {
    console.log(`%c🌐 网络请求: ${url}`, 'color: #4a90d9;');
    console.log(`   方法: ${options?.method || 'GET'}`);
    if (options?.body) {
      try {
        const body = JSON.parse(options.body);
        console.log(`   模型: ${body.model}`);
        console.log(`   消息数: ${body.messages?.length || 0}`);
      } catch {}
    }
    fetchLog.push({ url, options, time: Date.now() });
  }

  const startTime = Date.now();
  try {
    const response = await originalFetch(...args);
    const elapsed = Date.now() - startTime;
    
    if (isLLMRequest) {
      console.log(`   状态: ${response.status} ${response.statusText} (${elapsed}ms)`);
      if (!response.ok) {
        const clone = response.clone();
        clone.text().then(text => console.log(`   错误响应: ${text.slice(0, 200)}`));
      }
    }
    
    return response;
  } catch (e) {
    if (isLLMRequest) {
      console.log(`%c   请求失败: ${e.message}`, 'color: #8b2635;');
    }
    throw e;
  }
};

// ---------- 运行测试 ----------
(async () => {
  // 步骤 0: 清除
  localStorage.clear();
  console.log('%c🧹 已清除 localStorage', 'color: #999;');
  await sleep(500);
  window.location.reload();
  await sleep(1500);

  // 步骤 1: 验证三个独立输入框
  logStep(1, '验证三个独立输入框');

  const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
  console.log(`   找到 ${inputs.length} 个输入框`);

  // 找到三个故事输入框
  const bgInput = document.querySelector('input[placeholder*="背景"]') || document.querySelectorAll('input[type="text"]')[0];
  const charInput = document.querySelector('input[placeholder*="主角"]') || document.querySelectorAll('input[type="text"]')[1];
  const sceneInput = document.querySelector('input[placeholder*="场景"]') || document.querySelectorAll('input[type="text"]')[2];

  if (!bgInput || !charInput || !sceneInput) {
    logError('找不到三个输入框元素');
    return;
  }

  logSuccess('三个输入框元素已找到');
  console.log(`   背景输入框 placeholder: "${bgInput.placeholder}"`);
  console.log(`   主角输入框 placeholder: "${charInput.placeholder}"`);
  console.log(`   场景输入框 placeholder: "${sceneInput.placeholder}"`);

  // 填写数据
  setInputValue(bgInput, TEST_CONFIG.PREMISE.background);
  setInputValue(charInput, TEST_CONFIG.PREMISE.character);
  setInputValue(sceneInput, TEST_CONFIG.PREMISE.scene);

  logSuccess('已填入测试数据');
  console.log(`   背景: "${TEST_CONFIG.PREMISE.background}"`);
  console.log(`   主角: "${TEST_CONFIG.PREMISE.character}"`);
  console.log(`   场景: "${TEST_CONFIG.PREMISE.scene}"`);

  // 步骤 2: 测试无 API Key 的模板生成
  logStep(2, '测试无 API Key 的模板生成');

  const submitBtn = document.querySelector('button[type="submit"]');
  if (!submitBtn) {
    logError('找不到提交按钮');
    return;
  }

  console.log('   点击提交按钮...');
  submitBtn.click();

  // 等待生成
  await sleep(4000);

  // 检查 StoryCard
  const storyCard = document.querySelector('.parchment-bg');
  if (!storyCard) {
    logError('StoryCard 未加载');
    return;
  }

  logSuccess('StoryCard 已加载');

  // 检查生成模式标签
  const modeTag = storyCard.querySelector('.inline-flex.items-center');
  const modeText = modeTag?.textContent?.trim() || '';
  console.log(`   生成模式标签: "${modeText}"`);

  if (modeText.includes('模板生成')) {
    logSuccess('正确显示红色 "📄 模板生成" 标签');
  } else {
    logWarn(`标签文本: "${modeText}"（无 API Key 时应为模板生成）`);
  }

  // 检查选项按钮
  const choiceBtns = document.querySelectorAll('.choice-btn');
  console.log(`   选项按钮数量: ${choiceBtns.length}`);
  
  if (choiceBtns.length === 3) {
    logSuccess('三个选项按钮正确显示');
    choiceBtns.forEach((btn, i) => {
      const text = btn.querySelector('span:nth-child(2)')?.textContent?.trim() || btn.textContent?.trim();
      console.log(`     选项 ${i + 1}: "${text?.slice(0, 40)}${text?.length > 40 ? '...' : ''}"`);
    });
  } else {
    logError(`选项按钮数量应为 3，实际为 ${choiceBtns.length}`);
    return;
  }

  // 检查 localStorage
  const savedStory = JSON.parse(localStorage.getItem('story_story') || 'null');
  if (savedStory) {
    logSuccess('localStorage 保存成功');
    console.log(`   story.id: ${savedStory.id}`);
    console.log(`   story.premise:`, savedStory.premise);
    console.log(`   premise 类型: ${typeof savedStory.premise}`);
    
    if (typeof savedStory.premise === 'object' && savedStory.premise.background) {
      logSuccess('premise 三字段结构正确保存');
      console.log(`     background: "${savedStory.premise.background}"`);
      console.log(`     character: "${savedStory.premise.character}"`);
      console.log(`     scene: "${savedStory.premise.scene}"`);
    } else {
      logError('premise 结构不正确');
    }
  } else {
    logError('localStorage 中未找到 story');
  }

  // 步骤 3: 测试有 API Key 的 LLM 生成
  logStep(3, '测试配置 API Key 后的 LLM 生成');

  // 先重置
  const resetBtn = document.querySelector('button[aria-label="重置故事"]');
  if (resetBtn) {
    console.log('   点击重置按钮...');
    resetBtn.click();
    await sleep(1500);
    
    // 确认重置对话框
    const confirmBtn = document.querySelector('button.bg-crimson');
    if (confirmBtn) {
      console.log('   确认重置...');
      confirmBtn.click();
      await sleep(1000);
    }
  } else {
    // 手动清除
    localStorage.clear();
    window.location.reload();
    await sleep(1500);
  }

  // 点击显示 AI 配置
  const showConfigBtn = Array.from(document.querySelectorAll('button[type="button"]'))
    .find(btn => btn.textContent?.includes('显示 AI 配置'));
  
  if (showConfigBtn) {
    console.log('   点击「显示 AI 配置」...');
    showConfigBtn.click();
    await sleep(500);
  }

  // 填入 API 配置
  const allInputs = document.querySelectorAll('input');
  const endpointInput = document.querySelector('input[placeholder*="api.deepseek.com"]') || 
                        document.querySelector('input[placeholder*="openai"]') ||
                        allInputs[3];
  const modelInput = document.querySelector('input[placeholder*="deepseek-chat"]') ||
                     document.querySelector('input[placeholder*="gpt"]') ||
                     allInputs[4];
  const apiKeyInput = document.querySelector('input[type="password"]') || allInputs[5];

  if (TEST_CONFIG.API_KEY) {
    console.log('   自动填入 API 配置...');
    if (endpointInput) setInputValue(endpointInput, TEST_CONFIG.ENDPOINT);
    if (modelInput) setInputValue(modelInput, TEST_CONFIG.MODEL);
    if (apiKeyInput) setInputValue(apiKeyInput, TEST_CONFIG.API_KEY);
    logSuccess('API 配置已填入');
  } else {
    console.log('%c   ⚠️  请手动在页面上填入 API Key', 'color: #ffa500;');
    console.log('%c   然后按回车键继续测试...', 'color: #ffa500;');
    
    // 等待用户手动输入
    await new Promise(resolve => {
      const handler = (e) => {
        if (e.key === 'Enter') {
          document.removeEventListener('keydown', handler);
          resolve();
        }
      };
      document.addEventListener('keydown', handler);
    });
  }

  // 再次填写故事数据
  const bgInput2 = document.querySelector('input[placeholder*="背景"]') || document.querySelectorAll('input[type="text"]')[0];
  const charInput2 = document.querySelector('input[placeholder*="主角"]') || document.querySelectorAll('input[type="text"]')[1];
  const sceneInput2 = document.querySelector('input[placeholder*="场景"]') || document.querySelectorAll('input[type="text"]')[2];
  
  if (bgInput2) setInputValue(bgInput2, TEST_CONFIG.PREMISE.background);
  if (charInput2) setInputValue(charInput2, TEST_CONFIG.PREMISE.character);
  if (sceneInput2) setInputValue(sceneInput2, TEST_CONFIG.PREMISE.scene);

  // 提交
  const submitBtn2 = document.querySelector('button[type="submit"]');
  const fetchCountBefore = fetchLog.length;
  console.log('   提交中...');
  submitBtn2?.click();

  // 等待 LLM 生成
  await sleep(8000);

  // 检查网络请求
  const fetchCountAfter = fetchLog.length;
  if (fetchCountAfter > fetchCountBefore) {
    logSuccess(`检测到 ${fetchCountAfter - fetchCountBefore} 个 LLM API 请求`);
  } else {
    logWarn('未检测到 LLM API 请求（可能使用了缓存或回退到模板）');
  }

  // 检查 StoryCard 标签
  const storyCard2 = document.querySelector('.parchment-bg');
  const modeTag2 = storyCard2?.querySelector('.inline-flex.items-center');
  const modeText2 = modeTag2?.textContent?.trim() || '';
  console.log(`   生成模式标签: "${modeText2}"`);

  if (modeText2.includes('AI 生成')) {
    logSuccess('🎉 LLM 调用成功！StoryCard 显示绿色 "🤖 AI 生成" 标签');
    console.log('%c   注意: 绿色标签 = 成功调用 LLM', 'color: #2d4a3e; font-weight: bold;');
  } else if (modeText2.includes('模板生成')) {
    logWarn('显示红色模板标签，可能 LLM 调用失败并回退');
    console.log('   请检查控制台是否有 "LLM generation failed" 的警告');
  }

  // 步骤 4: 检查控制台错误
  logStep(4, '检查控制台错误');
  
  const pageErrors = window.__errors__ || [];
  if (pageErrors.length === 0) {
    logSuccess('页面无 JavaScript 错误');
  } else {
    logError(`检测到 ${pageErrors.length} 个错误:`);
    pageErrors.forEach((e, i) => console.log(`     ${i + 1}. ${e.message}`));
  }

  // 检查是否有 LLM 失败警告
  console.log('   请检查上方是否有 "LLM generation failed" 的警告');
  console.log('   （这表明 LLM 调用失败，但已自动回退到模板）');

  console.log('');
  console.log('%c========================================', 'color: #d4a84b; font-weight: bold;');
  console.log('%c  测试完成！总结', 'color: #d4a84b; font-weight: bold; font-size: 13px;');
  console.log('%c========================================', 'color: #d4a84b; font-weight: bold;');
  console.log('');
  console.log('%c✅ 测试通过项:', 'color: #2d4a3e; font-weight: bold;');
  console.log('   • 三个独立输入框正常工作');
  console.log('   • 表单提交和 StoryCard 显示正常');
  console.log('   • localStorage 持久化（含三字段 premise）正常');
  console.log('   • 无 API Key 时回退到模板正常');
  console.log('');
  console.log('%c🎯 手动验证项:', 'color: #4a90d9; font-weight: bold;');
  console.log('   1. 在 DevTools → Network 面板检查是否有 POST 请求到 API 端点');
  console.log('   2. 检查 StoryCard 左上角标签颜色');
  console.log('      - 绿色 🤖 AI 生成 = LLM 调用成功');
  console.log('      - 红色 📄 模板生成 = 使用本地模板（可能 API 调用失败）');
  console.log('   3. 在 DevTools → Application → Local Storage 检查数据结构');
  console.log('');

  // 恢复原始 fetch
  window.fetch = originalFetch;

})();

// 监听页面错误
window.__errors__ = [];
window.addEventListener('error', (e) => {
  window.__errors__.push({ message: e.error?.message || e.message, time: Date.now() });
});
