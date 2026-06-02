import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOWNLOAD_DIR = path.join(__dirname, '..', 'test-downloads');
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots');

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForFile(dir, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      const files = fs.readdirSync(dir).filter(f => !f.endsWith('.crdownload'));
      if (files.length > 0) {
        clearInterval(checkInterval);
        resolve(path.join(dir, files[0]));
      }
      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('等待下载超时'));
      }
    }, 200);
  });
}

function generateLargeTestConfig(imageSizeMB = 3) {
  console.log(`生成 ${imageSizeMB}MB 测试图片...`);
  
  const generateId = () => Math.random().toString(36).substring(2, 11);
  const geometryTypes = ['sphere', 'octahedron', 'icosahedron', 'torus'];
  
  const createLargeBase64Image = (sizeMB) => {
    const targetBytes = sizeMB * 1024 * 1024;
    const pixels = Math.floor(targetBytes / 4);
    const width = Math.min(Math.ceil(Math.sqrt(pixels)), 2048);
    const height = Math.min(Math.ceil(pixels / width), 2048);
    
    const canvasData = Buffer.alloc(width * height * 4);
    for (let i = 0; i < canvasData.length; i += 4) {
      canvasData[i] = Math.floor(Math.random() * 255);
      canvasData[i + 1] = Math.floor(Math.random() * 255);
      canvasData[i + 2] = Math.floor(Math.random() * 255);
      canvasData[i + 3] = 255;
    }
    
    const pngBase64 = 'data:image/png;base64,' + canvasData.toString('base64');
    return pngBase64;
  };
  
  const fragments = [];
  for (let i = 0; i < 6; i++) {
    fragments.push({
      id: generateId(),
      geometryType: geometryTypes[i % geometryTypes.length],
      size: 0.8 + Math.random() * 0.7,
      orbitRadius: 3 + Math.random() * 5,
      orbitEllipticity: 0.3 + Math.random() * 0.4,
      orbitTilt: (Math.random() - 0.5) * 1.6,
      orbitPhase: Math.random() * Math.PI * 2,
      rotationSpeed: 0.2 + Math.random() * 0.6,
      imageData: createLargeBase64Image(imageSizeMB),
      imageName: `test-large-${i + 1}.png`,
    });
    
    const sizeMB = ((fragments[i].imageData.length * 0.75) / (1024 * 1024)).toFixed(2);
    console.log(`  图片 ${i + 1}: ${sizeMB}MB`);
  }
  
  const config = {
    lucidity: 0.5,
    fragmentCount: fragments.length,
    fragments,
  };
  
  const json = JSON.stringify(config, null, 2);
  const totalSizeMB = ((json.length * 0.75) / (1024 * 1024)).toFixed(2);
  console.log(`测试配置总大小: ${totalSizeMB}MB`);
  
  const configPath = path.join(DOWNLOAD_DIR, `test-large-config-${totalSizeMB}MB.json`);
  fs.writeFileSync(configPath, json);
  console.log(`测试配置已保存: ${configPath}`);
  
  return configPath;
}

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║        梦境碎片 - 浏览器端到端测试                    ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  let browser;
  let page;
  const results = {
    screenshot: {},
    largeConfig: {},
  };
  
  try {
    console.log('━━━ 启动浏览器... ━━━\n');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1440, height: 900 },
    });
    
    page = await browser.newPage();
    
    const client = await page.target().createCDPSession();
    await client.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: DOWNLOAD_DIR,
    });
    
    let consoleLogs = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text, time: new Date().toISOString() });
      if (text.includes('[截图]') || text.includes('[测试]') || text.includes('错误') || text.includes('失败') || text.includes('警告') || text.includes('较大')) {
        console.log(`  📋 控制台: ${text}`);
      }
    });
    
    page.on('pageerror', (err) => {
      console.error(`  ❌ 页面错误: ${err.message}`);
    });
    
    let dialogShown = false;
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogShown = true;
      dialogMessage = dialog.message();
      console.log(`  💬 对话框: ${dialogMessage}`);
      await dialog.accept();
    });
    
    // ───────────── 测试 1: 页面加载 ─────────────
    console.log('\n━━━ 测试 1: 页面加载 ━━━\n');
    const loadStart = Date.now();
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 60000 });
    const loadTime = Date.now() - loadStart;
    console.log(`  ✅ 页面加载完成: ${loadTime}ms`);
    
    await sleep(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-page-loaded.png'), fullPage: true });
    console.log('  📸 页面截图已保存: 01-page-loaded.png');
    
    // ───────────── 测试 2: 截图功能 ─────────────
    console.log('\n━━━ 测试 2: 截图功能 ━━━\n');
    
    const preFiles = new Set(fs.readdirSync(DOWNLOAD_DIR));
    
    console.log('  🖱️  点击截图按钮...');
    const screenshotBtn = await page.waitForSelector('button[aria-label="截图"]', { timeout: 10000 });
    await screenshotBtn.click();
    
    console.log('  ⏳ 等待下载文件 (最长20秒)...');
    try {
      const downloadedFile = await waitForFile(DOWNLOAD_DIR, 20000);
      
      const newFiles = fs.readdirSync(DOWNLOAD_DIR).filter(f => !preFiles.has(f));
      if (newFiles.length === 0) {
        throw new Error('未检测到新下载的文件');
      }
      
      const stats = fs.statSync(downloadedFile);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`  📥 下载文件名: ${path.basename(downloadedFile)}`);
      console.log(`  📐 文件大小: ${fileSizeKB}KB`);
      console.log(`  ✅ 文件大于0KB: ${stats.size > 0}`);
      
      const header = fs.readFileSync(downloadedFile, null, 0, 8);
      const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
      console.log(`  🖼️  有效的PNG文件: ${isPNG}`);
      
      results.screenshot = {
        success: stats.size > 0 && isPNG,
        fileName: path.basename(downloadedFile),
        fileSizeKB,
        isPNG,
      };
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-after-screenshot.png') });
      console.log('  📸 截图后页面状态已保存: 02-after-screenshot.png');
      
      const screenshotLogs = consoleLogs.filter(l => l.text.includes('[截图]'));
      console.log(`  📋 截图相关日志: ${screenshotLogs.length}条`);
      screenshotLogs.forEach(l => console.log(`     - ${l.text}`));
      
    } catch (err) {
      console.log(`  ❌ 截图失败: ${err.message}`);
      results.screenshot = { success: false, error: err.message };
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-screenshot-failed.png'), fullPage: true });
    }
    
    // ───────────── 测试 3: 大配置加载 ─────────────
    console.log('\n━━━ 测试 3: 大配置加载 (3MB+图片) ━━━\n');
    
    console.log('  🎨 生成大配置测试文件...');
    const largeConfigPath = generateLargeTestConfig(3);
    const configFileSizeMB = (fs.statSync(largeConfigPath).size / (1024 * 1024)).toFixed(2);
    console.log(`  📁 配置文件: ${path.basename(largeConfigPath)} (${configFileSizeMB}MB)`);
    
    consoleLogs = [];
    
    console.log('  🖱️  点击加载按钮...');
    const loadBtn = await page.waitForSelector('button[aria-label="加载配置"]', { timeout: 10000 });
    
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser({ timeout: 10000 }),
      loadBtn.click(),
    ]);
    
    const loadStartTime = Date.now();
    await fileChooser.accept([largeConfigPath]);
    console.log('  ⏳ 等待解析和渲染...');
    
    await sleep(2000);
    
    const freezeStart = Date.now();
    try {
      await page.evaluate(() => document.readyState);
      const freezeTime = Date.now() - freezeStart;
      console.log(`  ⏱️  页面响应时间: ${freezeTime}ms`);
      console.log(`  ✅ 页面未卡死超过1秒: ${freezeTime < 1000}`);
      results.largeConfig.freezeTime = freezeTime;
      results.largeConfig.notFrozen = freezeTime < 1000;
    } catch (err) {
      console.log(`  ❌ 页面无响应: ${err.message}`);
      results.largeConfig.notFrozen = false;
    }
    
    await sleep(3000);
    
    const loadTime2 = Date.now() - loadStartTime;
    console.log(`  ⏱️  总加载时间: ${loadTime2}ms`);
    
    const warningLogs = consoleLogs.filter(l => 
      l.text.includes('警告') || l.text.includes('较大') || l.text.includes('占位图') || l.text.includes('⚠️')
    );
    console.log(`  ⚠️  警告/信息日志: ${warningLogs.length}条`);
    warningLogs.forEach(l => console.log(`     - ${l.text}`));
    
    results.largeConfig.hasWarning = warningLogs.length > 0 || dialogShown;
    results.largeConfig.dialogShown = dialogShown;
    results.largeConfig.dialogMessage = dialogMessage;
    
    const errorLogs = consoleLogs.filter(l => l.text.includes('错误') || l.text.includes('失败') || l.text.includes('❌'));
    console.log(`  ❌ 错误日志: ${errorLogs.length}条`);
    errorLogs.forEach(l => console.log(`     - ${l.text}`));
    
    results.largeConfig.loadSuccess = errorLogs.length === 0 || warningLogs.length > 0;
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-after-large-config.png'), fullPage: true });
    console.log('  📸 加载大配置后截图已保存: 03-after-large-config.png');
    
    // ───────────── 测试 4: 截图功能 (加载后) ─────────────
    console.log('\n━━━ 测试 4: 截图功能 (加载大配置后) ━━━\n');
    
    const preFiles2 = new Set(fs.readdirSync(DOWNLOAD_DIR));
    console.log('  🖱️  再次点击截图按钮...');
    const screenshotBtn2 = await page.waitForSelector('button[aria-label="截图"]', { timeout: 10000 });
    await screenshotBtn2.click();
    
    try {
      const downloadedFile = await waitForFile(DOWNLOAD_DIR, 20000);
      const newFiles = fs.readdirSync(DOWNLOAD_DIR).filter(f => !preFiles2.has(f));
      
      if (newFiles.length > 0) {
        const stats = fs.statSync(downloadedFile);
        const fileSizeKB = (stats.size / 1024).toFixed(2);
        const header = fs.readFileSync(downloadedFile, null, 0, 8);
        const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
        
        console.log(`  📥 下载文件名: ${path.basename(downloadedFile)}`);
        console.log(`  📐 文件大小: ${fileSizeKB}KB`);
        console.log(`  ✅ 有效的PNG文件: ${isPNG && stats.size > 0}`);
        
        results.screenshot.afterLargeConfig = {
          success: stats.size > 0 && isPNG,
          fileSizeKB,
        };
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-screenshot-after-config.png') });
      } else {
        console.log('  ❌ 未检测到新下载文件');
      }
    } catch (err) {
      console.log(`  ❌ 截图失败: ${err.message}`);
    }
    
  } catch (err) {
    console.error('\n❌ 测试过程异常:', err.message);
    if (page) {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '99-error.png'), fullPage: true });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    
    // ───────────── 测试报告 ─────────────
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║                    测试报告                            ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    
    console.log('📸 截图功能测试:');
    if (results.screenshot.success) {
      console.log(`  ✅ 成功! ${results.screenshot.fileName} (${results.screenshot.fileSizeKB}KB, PNG有效)`);
    } else {
      console.log(`  ❌ 失败: ${results.screenshot.error || '未知原因'}`);
    }
    
    console.log('\n📦 大配置加载测试:');
    console.log(`  ⏱️  页面冻结时间: ${results.largeConfig.freezeTime || 'N/A'}ms`);
    console.log(`  ✅ 页面未卡死: ${results.largeConfig.notFrozen ? '是' : '否'}`);
    console.log(`  ⚠️  有警告信息: ${results.largeConfig.hasWarning ? '是' : '否'}`);
    console.log(`  💬 有确认对话框: ${results.largeConfig.dialogShown ? '是' : '否'}`);
    if (results.largeConfig.dialogMessage) {
      console.log(`     对话框内容: ${results.largeConfig.dialogMessage}`);
    }
    console.log(`  ✅ 加载结果: ${results.largeConfig.loadSuccess ? '成功（含降级）' : '失败'}`);
    
    if (results.screenshot.afterLargeConfig) {
      console.log(`\n📸 加载后截图: ${results.screenshot.afterLargeConfig.success ? '✅ 成功' : '❌ 失败'}`);
    }
    
    console.log('\n🖼️  测试截图已保存到:');
    console.log(`   ${SCREENSHOT_DIR}`);
    console.log('\n📥 下载文件已保存到:');
    console.log(`   ${DOWNLOAD_DIR}`);
    
    console.log('\n═══════════════════════════════════════════════════════\n');
  }
}

runTests();
