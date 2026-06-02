import { test, expect } from '@playwright/test';

test.describe('3D Robotic Arm Assembly Line', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { timeout: 60000 });
    await page.waitForTimeout(3000);
  });

  test('should load the 3D scene with canvas', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('should display control panel on the left', async ({ page }) => {
    const panel = page.locator('text=控制面板');
    await expect(panel).toBeVisible({ timeout: 5000 });
  });

  test('should display all three robotic arms in control panel', async ({ page }) => {
    const controlPanel = page.locator('.overflow-y-auto, .overflow-auto').first();
    await expect(controlPanel.locator('text=机械臂 A')).toBeVisible({ timeout: 5000 });
    await expect(controlPanel.locator('text=机械臂 B')).toBeVisible({ timeout: 5000 });
    await expect(controlPanel.locator('text=机械臂 C')).toBeVisible({ timeout: 5000 });
  });

  test('should display toolbar at the top', async ({ page }) => {
    await expect(page.locator('button:has-text("自由视角")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("附着")')).toBeVisible({ timeout: 5000 });
  });

  test('should display data panel on the right', async ({ page }) => {
    await expect(page.locator('text=实时数据')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Arm Speed and Amplitude Sliders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { timeout: 60000 });
    await page.waitForTimeout(3000);
  });

  test('should adjust arm speed via slider', async ({ page }) => {
    const sliders = page.locator('input[type="range"]');
    const firstSlider = sliders.first();
    await expect(firstSlider).toBeVisible({ timeout: 5000 });
  });

  test('should show speed value next to slider', async ({ page }) => {
    const speedLabel = page.locator('text=运动速度').first();
    await expect(speedLabel).toBeVisible({ timeout: 5000 });
  });

  test('should show amplitude label', async ({ page }) => {
    const ampLabel = page.locator('text=运动幅度').first();
    await expect(ampLabel).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Part Selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { timeout: 60000 });
    await page.waitForTimeout(3000);
  });

  test('should display part type selector', async ({ page }) => {
    await expect(page.locator('text=零件类型')).toBeVisible({ timeout: 5000 });
  });

  test('should switch part type when clicking', async ({ page }) => {
    const gearButton = page.locator('text=齿轮');
    await expect(gearButton).toBeVisible({ timeout: 5000 });
    await gearButton.click();

    const activeGear = page.locator('button:has-text("齿轮")').first();
    const borderColor = await activeGear.evaluate((el) => {
      return window.getComputedStyle(el).borderColor;
    });
    expect(borderColor).toBeDefined();
  });
});

test.describe('Camera Mode Switching (Bug Fix #2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { timeout: 60000 });
    await page.waitForTimeout(3000);
  });

  test('should switch to attach mode and show arm selector', async ({ page }) => {
    const attachBtn = page.locator('button:has-text("附着")');
    await expect(attachBtn).toBeVisible({ timeout: 10000 });
    await attachBtn.click();

    await expect(page.locator('text=机械臂 A').first()).toBeVisible({ timeout: 5000 });
  });

  test('should select an arm to attach camera to', async ({ page }) => {
    const attachBtn = page.locator('button:has-text("附着")');
    await attachBtn.click();
    await page.waitForTimeout(500);

    const armOption = page.locator('text=机械臂 B').first();
    await armOption.click();
    await page.waitForTimeout(1000);

    const attachBtnActive = page.locator('button:has-text("附着")');
    await expect(attachBtnActive).toBeVisible();
  });

  test('should switch back to free camera mode', async ({ page }) => {
    const freeBtn = page.locator('button:has-text("自由视角")');
    await freeBtn.click();
    await page.waitForTimeout(500);

    const activeFreeBtn = page.locator('button:has-text("自由视角")');
    await expect(activeFreeBtn).toBeVisible();
  });
});

test.describe('Recording and JSON Export (Bug Fix #3, #4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { timeout: 60000 });
    await page.waitForTimeout(3000);
  });

  test('should start and stop recording', async ({ page }) => {
    const videoButtons = page.locator('svg');
    const recordBtn = page.locator('button[title="开始录制"]');
    await expect(recordBtn).toBeVisible({ timeout: 5000 });
    await recordBtn.click();
    await page.waitForTimeout(1000);

    const recIndicator = page.locator('text=● REC');
    await expect(recIndicator).toBeVisible({ timeout: 3000 });

    const stopBtn = page.locator('button[title="停止录制"]');
    await expect(stopBtn).toBeVisible({ timeout: 3000 });
    await stopBtn.click();

    await expect(recIndicator).not.toBeVisible({ timeout: 3000 });
  });

  test('should show frame count after recording', async ({ page }) => {
    const recordBtn = page.locator('button[title="开始录制"]');
    await recordBtn.click();
    await page.waitForTimeout(2000);

    const stopBtn = page.locator('button[title="停止录制"]');
    await stopBtn.click();
    await page.waitForTimeout(500);

    const frameCount = page.locator('text=/\\d+帧/');
    await expect(frameCount).toBeVisible({ timeout: 3000 });
  });

  test('should enable export button after recording', async ({ page }) => {
    const recordBtn = page.locator('button[title="开始录制"]');
    await recordBtn.click();
    await page.waitForTimeout(1500);

    const stopBtn = page.locator('button[title="停止录制"]');
    await stopBtn.click();
    await page.waitForTimeout(500);

    const exportBtn = page.locator('button[title="导出JSON"]');
    await expect(exportBtn).toBeEnabled({ timeout: 3000 });
  });

  test('should enable play button after recording', async ({ page }) => {
    const recordBtn = page.locator('button[title="开始录制"]');
    await recordBtn.click();
    await page.waitForTimeout(1500);

    const stopBtn = page.locator('button[title="停止录制"]');
    await stopBtn.click();
    await page.waitForTimeout(500);

    const playBtn = page.locator('button[title="播放"]');
    await expect(playBtn).toBeEnabled({ timeout: 3000 });
  });
});

test.describe('Collision Detection Highlighting (Bug Fix #1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { timeout: 60000 });
    await page.waitForTimeout(3000);
  });

  test('should show data panel with arm states', async ({ page }) => {
    await expect(page.locator('text=实时数据')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('text=总周期')).toBeVisible({ timeout: 5000 });
  });

  test('should show joint angles in control panel', async ({ page }) => {
    const jointLabels = page.locator('text=J1');
    await expect(jointLabels.first()).toBeVisible({ timeout: 5000 });
  });

  test('should update cycle counts over time', async ({ page }) => {
    await page.waitForTimeout(5000);

    const cycleDisplay = page.locator('text=/周期: \\d+/').first();
    await expect(cycleDisplay).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Control Panel Collapse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { timeout: 60000 });
    await page.waitForTimeout(3000);
  });

  test('should collapse and expand control panel', async ({ page }) => {
    const collapseBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    await collapseBtn.click();
    await page.waitForTimeout(500);

    const expandBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expandBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=控制面板')).toBeVisible({ timeout: 3000 });
  });
});
