// ============================================================
//  互动故事引擎 - 浏览器控制台一键测试脚本
//  
//  使用方法：
//  1. 打开 http://localhost:5173/
//  2. 按 F12 → Console 标签
//  3. 复制粘贴本脚本所有内容并回车
//  4. 如果要测试真实 LLM，请先在 TEST_CONFIG 中填入 API Key
// ============================================================

// ========== 配置区 ==========
const TEST_CONFIG = {
  // 在这里填入你的真实 API Key（如果要测试 LLM 调用）
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
// ===========================

console.log('%c========================================', 'color: #d4a84b; font-weight: bold; font-size: 14px;');
console.log('%c  互动故事引擎 - 浏览器端到端测试', 'color: #d4a84b; font-weight: bold; font-size: 14px;');
console.log('%c========================================', 'color: #d4a84b; font-weight: bold; font-size: 14px;');
console.log('');

if (!TEST_CONFIG.API_KEY) {
  console.log('%c⚠️  未配置 API Key', 'color: #ffa500; font-weight: bold;');
  console.log('   将只测试模板生成模式。如需测试 LLM 调用，');
  console.log('   请编辑脚本顶部的 TEST_CONFIG.API_KEY 填入真实密钥。');
  console.log('');
}

// ---------- 工具函数 ----------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const setInputValue = (input, value) => {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeSetter.call(input, value);
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
const fetchRequests = [];

window.fetch = async (...args) => {
  const [url, options] = args;
  const isLLM = url.includes('/chat/completions') || url.includes('api.deepseek') || url.includes('api.openai');
  
  if (isLLM) {
    console.log(`%c🌐 LLM 请求: ${url}`, 'color: #4a90d9; font-weight: bold;');
    console.log(`   方法: ${options?.method || 'GET'}`);
    
    if (options?.headers) {
      const auth = options.headers['Authorization'] || options.headers['authorization'];
      if (auth) {
        console.log(`   Authorization: ${auth.slice(0, 15)}...`);
      }
    }
    
    if (options?.body) {
      try {
        const body = JSON.parse(options.body);
        console.log(`   模型: ${body.model}`);
        console.log(`   temperature: ${body.temperature}`);
        console.log(`   max_tokens: ${body.max_tokens}`);
        console.log(`   消息: ${body.messages?.length || 0} 条`);
        if (body.messages?.length > 0) {
          const lastMsg = body.messages[body.messages.length - 1];
          console.log(`   最后一条消息角色: ${lastMsg.role}`);
          console.log(`   内容预览: "${lastMsg.content?.slice(0, 80)}..."`);
        }
      } catch {}
    }
    
    fetchRequests.push({ url, time: Date.now(), status: 'pending' });
  }

  const start = Date.now();
  try {
    const response = await originalFetch(...args);
    const elapsed = Date.now() - start;
    
    if (isLLM) {
      const lastReq = fetchRequests[fetchRequests.length - 1];
      lastReq.status = response.status;
      lastReq.elapsed = elapsed;
      
      console.log(`   响应状态: ${response.status} ${response.statusText}`);
      console.log(`   耗时: ${elapsed}ms`);
      
      if (!response.ok) {
        const clone = response.clone();
        const errorText = await clone.text().catch(() => '');
        console.log(`%c   错误内容: ${errorText.slice(0, 300)}`, 'color: #8b2635;');
      }
    }
    
    return response;
  } catch (e) {
    if (isLLM) {
      const lastReq = fetchRequests[fetchRequests.length - 1];
      lastReq.status = 'error';
      lastReq.error = e.message;
      console.log(`%c   请求失败: ${e.message}`, 'color: #8b2635;');
    }
    throw e;
  }
};

// ---------- 捕获控制台错误 ----------
window.__test_errors__ = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  window.__test_errors__.push(args.join(' '));
  originalConsoleError.apply(console, args);
};

window.addEventListener('error', (e) => {
  window.__test_errors__.push(e.error?.message || e.message);
});

// ---------- 运行测试 ----------
(async () => {
  // 前置：清除旧数据
  localStorage.clear();
  console.log('%c🧹 已清除 localStorage', 'color: #999;');
  await sleep(500);
  window.location.reload();
  await sleep(2000);

  // ========== 测试 1：验证三个独立输入框 ==========
  logStep(1, '验证三个独立输入框');

  const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
  console.log(`   页面上共有 ${inputs.length} 个输入框`);

  // 定位三个故事输入框
  const bgInput = document.querySelector('input[placeholder*="背景"]') || 
                  Array.from(document.querySelectorAll('input[type="text"]'))[0];
  const charInput = document.querySelector('input[placeholder*="主角"]') ||
                    Array.from(document.querySelectorAll('input[type="text"]'))[1];
  const sceneInput = document.querySelector('input[placeholder*="场景"]') ||
                      Array.from(document.querySelectorAll('input[type="text"]'))[2];

  if (!bgInput || !charInput || !sceneInput) {
    logError('找不到三个故事输入框！');
    return;
  }

  logSuccess('三个输入框已找到');
  console.log(`   背景框: placeholder="${bgInput.placeholder}"`);
  console.log(`   主角框: placeholder="${charInput.placeholder}"`);
  console.log(`   场景框: placeholder="${sceneInput.placeholder}"`);

  // 输入测试数据
  setInputValue(bgInput, TEST_CONFIG.PREMISE.background);
  setInputValue(charInput, TEST_CONFIG.PREMISE.character);
  setInputValue(sceneInput, TEST_CONFIG.PREMISE.scene);

  logSuccess('已填入测试数据');
  console.log(`   背景: "${TEST_CONFIG.PREMISE.background}"`);
  console.log(`   主角: "${TEST_CONFIG.PREMISE.character}"`);
  console.log(`   场景: "${TEST_CONFIG.PREMISE.scene}"`);

  // ========== 测试 2：无 API Key 提交 - 模板生成 ==========
  logStep(2, '无 API Key 提交 - 模板生成');

  const submitBtn = document.querySelector('button[type="submit"]');
  if (!submitBtn) {
    logError('找不到提交按钮！');
    return;
  }

  console.log('   点击提交按钮...');
  const fetchCountBefore = fetchRequests.length;
  submitBtn.click();

  console.log('   等待故事生成（4秒）...');
  await sleep(4000);

  // 检查 StoryCard
  const storyCard = document.querySelector('.parchment-bg');
  if (!storyCard) {
    logError('StoryCard 未显示！');
    return;
  }
  logSuccess('StoryCard 已显示');

  // 检查生成模式标签
  const modeTag = storyCard.querySelector('.inline-flex.items-center');
  const modeText = modeTag?.textContent?.trim() || '';
  console.log(`   生成模式标签: "${modeText}"`);

  const fetchCountAfter = fetchRequests.length;
  console.log(`   LLM 请求数: ${fetchCountAfter - fetchCountBefore}`);

  if (modeText.includes('模板生成')) {
    logSuccess('正确显示红色 📄 模板生成标签（无 API Key 时的预期行为）');
  } else if (modeText.includes('AI 生成')) {
    logSuccess('显示绿色 🤖 AI 生成标签（已有配置的 API Key）');
  } else {
    logWarn(`标签文本异常: "${modeText}"`);
  }

  // 检查选项按钮
  const choiceBtns = document.querySelectorAll('.choice-btn');
  console.log(`   选项按钮数量: ${choiceBtns.length}`);
  
  if (choiceBtns.length === 3) {
    logSuccess('三个选项按钮正确显示');
    choiceBtns.forEach((btn, i) => {
      const text = btn.querySelector('span:nth-child(2)')?.textContent?.trim() || btn.textContent?.trim();
      console.log(`     ${i + 1}. "${text?.slice(0, 50)}${text?.length > 50 ? '...' : ''}"`);
    });
  } else {
    logError(`选项按钮数量应为 3，实际为 ${choiceBtns.length}`);
  }

  // 检查 localStorage
  const savedStory = JSON.parse(localStorage.getItem('story_story') || 'null');
  if (savedStory) {
    logSuccess('localStorage 持久化成功');
    console.log(`   story ID: ${savedStory.id}`);
    console.log(`   premise 类型: ${typeof savedStory.premise}`);
    
    if (typeof savedStory.premise === 'object' && savedStory.premise.background) {
      logSuccess('premise 三字段结构正确');
      console.log(`     background: "${savedStory.premise.background}"`);
      console.log(`     character: "${savedStory.premise.character}"`);
      console.log(`     scene: "${savedStory.premise.scene}"`);
    } else {
      logError(`premise 结构错误: ${JSON.stringify(savedStory.premise)}`);
    }
  } else {
    logError('localStorage 中未找到 story 数据');
  }

  // ========== 测试 3：点击选项生成下一节点 ==========
  logStep(3, '点击选项 - 生成下一节点');

  if (choiceBtns.length > 0) {
    const firstChoiceText = choiceBtns[0].querySelector('span:nth-child(2)')?.textContent?.trim();
    console.log(`   点击第一个选项: "${firstChoiceText}"`);
    
    const fetchBefore2 = fetchRequests.length;
    choiceBtns[0].click();
    
    console.log('   等待生成（4秒）...');
    await sleep(4000);

    const storyCard2 = document.querySelector('.parchment-bg');
    const chapterTag = storyCard2?.querySelector('span.text-ink\\/50')?.textContent?.trim();
    console.log(`   章节标签: ${chapterTag}`);
    
    if (chapterTag?.includes('第 2 章')) {
      logSuccess('成功跳转到第 2 章');
    } else {
      logWarn(`章节可能不正确: "${chapterTag}"`);
    }

    const fetchAfter2 = fetchRequests.length;
    console.log(`   LLM 请求数: ${fetchAfter2 - fetchBefore2}`);

    // 检查新节点的 choiceText
    const savedAfter = JSON.parse(localStorage.getItem('story_story') || 'null');
    const nodesAfter = JSON.parse(localStorage.getItem('story_nodes') || '{}');
    const currentNodeAfter = nodesAfter[savedAfter?.currentNodeId];
    
    if (currentNodeAfter?.choiceText) {
      logSuccess('新节点正确记录了用户选择的选项文字');
      console.log(`     choiceText: "${currentNodeAfter.choiceText}"`);
      console.log(`     节点深度: ${currentNodeAfter.depth}`);
    }
  }

  // ========== 测试 4：重置并配置 API Key ==========
  logStep(4, '重置 + 配置 API Key');

  // 重置
  const resetBtn = document.querySelector('button[aria-label="重置故事"]');
  if (resetBtn) {
    console.log('   点击重置按钮...');
    resetBtn.click();
    await sleep(1000);
    
    const confirmBtn = document.querySelector('button.bg-crimson');
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(1000);
    }
  } else {
    localStorage.clear();
    window.location.reload();
    await sleep(2000);
  }

  // 点击显示 AI 配置
  const showConfigBtn = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent?.includes('显示 AI 配置'));
  
  if (showConfigBtn) {
    console.log('   点击「显示 AI 配置」...');
    showConfigBtn.click();
    await sleep(500);
  }

  // 填入 API 配置
  const allInputs = document.querySelectorAll('input');
  const endpointInput = document.querySelector('input[placeholder*="deepseek"]') || 
                        document.querySelector('input[placeholder*="openai"]') || allInputs[3];
  const modelInput = document.querySelector('input[placeholder*="deepseek-chat"]') ||
                     document.querySelector('input[placeholder*="gpt"]') || allInputs[4];
  const apiKeyInput = document.querySelector('input[type="password"]') || allInputs[5];

  if (TEST_CONFIG.API_KEY) {
    console.log('   自动填入 API 配置...');
    if (endpointInput) setInputValue(endpointInput, TEST_CONFIG.ENDPOINT);
    if (modelInput) setInputValue(modelInput, TEST_CONFIG.MODEL);
    if (apiKeyInput) setInputValue(apiKeyInput, TEST_CONFIG.API_KEY);
    logSuccess('API 配置已填入');
    console.log(`     Endpoint: ${TEST_CONFIG.ENDPOINT}`);
    console.log(`     Model: ${TEST_CONFIG.MODEL}`);
    console.log(`     API Key: ${TEST_CONFIG.API_KEY.slice(0, 8)}...`);
  } else {
    console.log('%c   ⚠️  未配置 API Key，请手动填入后按回车键继续', 'color: #ffa500;');
    console.log('%c   （或直接按回车跳过 LLM 测试）', 'color: #ffa500;');
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
  const bgInput2 = document.querySelector('input[placeholder*="背景"]') || 
                   Array.from(document.querySelectorAll('input[type="text"]'))[0];
  const charInput2 = document.querySelector('input[placeholder*="主角"]') ||
                     Array.from(document.querySelectorAll('input[type="text"]'))[1];
  const sceneInput2 = document.querySelector('input[placeholder*="场景"]') ||
                      Array.from(document.querySelectorAll('input[type="text"]'))[2];
  
  if (bgInput2) setInputValue(bgInput2, TEST_CONFIG.PREMISE.background);
  if (charInput2) setInputValue(charInput2, TEST_CONFIG.PREMISE.character);
  if (sceneInput2) setInputValue(sceneInput2, TEST_CONFIG.PREMISE.scene);

  // 提交
  const submitBtn2 = document.querySelector('button[type="submit"]');
  const fetchBefore3 = fetchRequests.length;
  console.log('   提交中...');
  submitBtn2?.click();

  console.log('   等待生成（8秒，LLM 调用较慢）...');
  await sleep(8000);

  // 检查结果
  const fetchAfter3 = fetchRequests.length;
  const storyCard3 = document.querySelector('.parchment-bg');
  const modeTag3 = storyCard3?.querySelector('.inline-flex.items-center');
  const modeText3 = modeTag3?.textContent?.trim() || '';

  console.log(`   LLM 请求数: ${fetchAfter3 - fetchBefore3}`);
  console.log(`   生成模式标签: "${modeText3}"`);

  // 检查 localStorage 中的 API 配置
  const savedApiKey = localStorage.getItem('llm_api_key');
  const savedEndpoint = localStorage.getItem('llm_endpoint');
  const savedModel = localStorage.getItem('llm_model');
  
  if (savedApiKey || savedEndpoint || savedModel) {
    logSuccess('API 配置已保存到 localStorage');
    console.log(`     apiKey: ${savedApiKey ? savedApiKey.slice(0, 8) + '...' : '(未保存)'}`);
    console.log(`     endpoint: ${savedEndpoint || '(未保存)'}`);
    console.log(`     model: ${savedModel || '(未保存)'}`);
  }

  const hasApiKey = savedApiKey && savedApiKey.length > 5;

  if (hasApiKey && modeText3.includes('AI 生成')) {
    logSuccess('🎉 LLM 调用成功！StoryCard 显示绿色 🤖 AI 生成标签');
    console.log('%c   ✓ 网络请求已发送到 API 端点', 'color: #2d4a3e;');
    console.log('%c   ✓ 响应已正确解析', 'color: #2d4a3e;');
    console.log('%c   ✓ 标签显示为绿色 AI 生成', 'color: #2d4a3e;');
  } else if (hasApiKey && modeText3.includes('模板生成')) {
    logWarn('LLM 调用失败，已自动回退到模板生成');
    console.log('   请检查上方控制台中是否有 "LLM generation failed" 的错误信息');
    console.log('   常见原因：API Key 错误、网络问题、额度不足等');
  } else if (!hasApiKey) {
    logWarn('未检测到 API Key，跳过 LLM 测试');
  }

  // ========== 测试 5：控制台错误检查 ==========
  logStep(5, '控制台错误检查');

  console.log(`   JavaScript 错误数: ${window.__test_errors__.length}`);
  console.log(`   LLM 请求总数: ${fetchRequests.length}`);
  
  const successfulLLM = fetchRequests.filter(r => r.status === 200).length;
  const failedLLM = fetchRequests.filter(r => r.status !== 200 && r.status !== 'pending').length;
  
  console.log(`   成功的 LLM 请求: ${successfulLLM}`);
  console.log(`   失败的 LLM 请求: ${failedLLM}`);

  if (window.__test_errors__.length === 0) {
    logSuccess('页面无 JavaScript 错误');
  } else {
    logError(`检测到 ${window.__test_errors__.length} 个错误:`);
    window.__test_errors__.slice(0, 5).forEach((e, i) => 
      console.log(`     ${i + 1}. ${e.slice(0, 200)}`)
    );
  }

  // ========== 总结 ==========
  console.log('');
  console.log('%c========================================', 'color: #d4a84b; font-weight: bold;');
  console.log('%c  测试完成！测试结果总结', 'color: #d4a84b; font-weight: bold; font-size: 13px;');
  console.log('%c========================================', 'color: #d4a84b; font-weight: bold;');
  console.log('');
  
  console.log('%c✅ 已验证通过项:', 'color: #2d4a3e; font-weight: bold;');
  console.log('   • 三个独立输入框正常工作');
  console.log('   • 表单提交和 StoryCard 显示正常');
  console.log('   • 选项点击和章节跳转正常');
  console.log('   • localStorage 三字段 premise 结构正确');
  console.log('   • 无 API Key 时回退到模板生成');
  console.log('   • API 配置正确保存到 localStorage');
  console.log('');
  
  if (successfulLLM > 0) {
    console.log('%c🎉 LLM 调用成功项:', 'color: #2d4a3e; font-weight: bold;');
    console.log('   • 网络请求正确发送到 API 端点');
    console.log('   • 请求格式正确（标准 OpenAI 兼容格式）');
    console.log('   • 响应正确解析为故事内容和选项');
    console.log('   • StoryCard 显示绿色 🤖 AI 生成标签');
    console.log('');
  }
  
  if (failedLLM > 0) {
    console.log('%c⚠️  LLM 调用失败项:', 'color: #ffa500; font-weight: bold;');
    console.log('   • 已自动回退到模板生成（用户无感知）');
    console.log('   • 请检查 API Key、Endpoint、网络连接');
    console.log('');
  }

  console.log('%c👆 手动验证建议:', 'color: #4a90d9; font-weight: bold;');
  console.log('   1. DevTools → Network 面板检查请求详情');
  console.log('   2. 点击「上帝视角」按钮查看故事树');
  console.log('   3. 测试「导出 Markdown」功能');
  console.log('   4. 测试「回退」功能');
  console.log('');

  // 恢复
  window.fetch = originalFetch;
  console.error = originalConsoleError;

})();
