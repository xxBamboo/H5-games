const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const errors = [];
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=412,915'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  const PROJECT = path.resolve(__dirname, '..');   // tests/ 的上一级为项目根
  const url = 'file://' + path.resolve(PROJECT, 'index.html');
  await page.goto(url, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  // 1) 初始应处于主页
  let st = await page.evaluate(() => ({ state: game.state,
    homeVisible: !document.getElementById('homePanel').classList.contains('hidden') }));
  console.log('INIT (home):', JSON.stringify(st));

  // 1b) 主页 -> 关卡选择 -> 返回主页
  await page.click('#homeLevelsBtn');
  await new Promise(r => setTimeout(r, 150));
  const lvView = await page.evaluate(() => ({ state: game.state,
    cards: document.querySelectorAll('#levelGrid .level-card').length,
    locked: document.querySelectorAll('#levelGrid .level-card.locked').length }));
  console.log('LEVEL SELECT:', JSON.stringify(lvView));
  await page.click('#levelBackBtn');
  await new Promise(r => setTimeout(r, 120));

  // 2) 开始游戏（主页按钮）
  await page.click('#homePlayBtn');
  await new Promise(r => setTimeout(r, 300));
  st = await page.evaluate(() => ({ state: game.state, blur: game.blur, time: game.timeLeft,
    menuBtn: !document.getElementById('menuBtn').classList.contains('hidden') }));
  console.log('AFTER START:', JSON.stringify(st));

  // 2b) 菜单：打开 -> 暂停倒计时 -> 返回主页
  const pauseTest = await page.evaluate(async () => {
    document.getElementById('menuBtn').click();
    const t0 = game.timeLeft, paused = game.paused;
    await new Promise(r => setTimeout(r, 400));
    const t1 = game.timeLeft;
    return { opened: !document.getElementById('menuDrop').classList.contains('hidden'),
      paused, timerFrozen: Math.abs(t1 - t0) < 0.05 };
  });
  console.log('MENU PAUSE:', JSON.stringify(pauseTest));
  await page.click('#mHome');
  await new Promise(r => setTimeout(r, 150));
  const backHome = await page.evaluate(() => ({ state: game.state,
    homeVisible: !document.getElementById('homePanel').classList.contains('hidden'),
    menuHidden: document.getElementById('menuBtn').classList.contains('hidden') }));
  console.log('MENU->HOME:', JSON.stringify(backHome));

  // 回到游戏继续后续断言
  await page.click('#homePlayBtn');
  await new Promise(r => setTimeout(r, 250));
  st = await page.evaluate(() => ({ state: game.state, blur: game.blur, time: game.timeLeft }));

  // 3) 故意点错（空白处），验证扣时 + 红叉触发
  const before = await page.evaluate(() => game.timeLeft);
  await page.mouse.click(50, 300);
  await new Promise(r => setTimeout(r, 200));
  const after = await page.evaluate(() => game.timeLeft);
  const xShown = await page.evaluate(() => document.getElementById('wrongX').classList.contains('show'));
  console.log('WRONG TAP: timeBefore=%s timeAfter=%s penaltyApplied=%s redXshown=%s',
    before.toFixed(1), after.toFixed(1), (before - after >= 1.5), xShown);

  // 3b) 走近放大 -> 模糊应减弱（近视走近看得更清）
  const zoomTest = await page.evaluate(async () => {
    const blurFar = game.blur;
    cam.targetZoom = 2.8;                    // 走到最近
    await new Promise(r => setTimeout(r, 700));
    return { blurFar: +blurFar.toFixed(2), blurNear: +game.blur.toFixed(2), zoom: +cam.zoom.toFixed(2) };
  });
  console.log('ZOOM CLARITY:', JSON.stringify(zoomTest),
    'improved=' + (zoomTest.blurNear < zoomTest.blurFar - 2));

  // 3c) 放大后应能上下环顾（抬头/低头）
  const panTest = await page.evaluate(async () => {
    cam.targetZoom = 2.5; await new Promise(r => setTimeout(r, 400));
    const y0 = cam.y;
    cam.targetY = cam.y + 300;           // 尝试低头
    await new Promise(r => setTimeout(r, 500));
    return { y0: +y0.toFixed(1), y1: +cam.y.toFixed(1), moved: +Math.abs(cam.y - y0).toFixed(1) };
  });
  console.log('VERTICAL PAN:', JSON.stringify(panTest), 'canLookDown=' + (panTest.moved > 20));
  await page.evaluate(() => { cam.targetZoom = 1; });   // 复位
  await new Promise(r => setTimeout(r, 400));

  // 4) 把摄像机对准眼镜中心，然后点中 -> 过关
  const win = await page.evaluate(async () => {
    cam.x = cam.targetX = glasses.x;
    cam.y = cam.targetY = glasses.y;
    cam.zoom = cam.targetZoom = 1.6;
    await new Promise(r => setTimeout(r, 50));
    const s = view.baseScale * cam.zoom;
    const sx = view.w / 2 + (glasses.x - cam.x) * s;   // = 屏幕中心
    const sy = view.h / 2 + (glasses.y - cam.y) * s;
    return { sx, sy, zoom: cam.zoom };
  });
  console.log('AIM:', JSON.stringify(win));
  await page.mouse.click(win.sx, win.sy);
  await new Promise(r => setTimeout(r, 300));
  st = await page.evaluate(() => ({ state: game.state, found: game.found, targetBlur: game.targetBlur }));
  console.log('AFTER CORRECT TAP:', JSON.stringify(st));

  // 5) 等待戴镜动画完成 -> 过关面板（轮询至多 4s，避免无头帧率波动造成的误判）
  for (let i = 0; i < 40; i++) {
    const done = await page.evaluate(() => game.wearProgress >= 1);
    if (done) break;
    await new Promise(r => setTimeout(r, 100));
  }
  await new Promise(r => setTimeout(r, 150));
  const endVisible = await page.evaluate(() => ({
    state: game.state,
    wear: game.wearProgress,
    blur: +game.blur.toFixed(2),
    endPanel: !document.getElementById('endPanel').classList.contains('hidden'),
    title: document.getElementById('endTitle').textContent,
  }));
  console.log('WIN STATE:', JSON.stringify(endVisible));

  // 6) 截图保存证据
  await page.screenshot({ path: path.resolve(PROJECT, 'docs/screenshots/shot_win.png') });

  // 7) 重新开始 -> 验证超时失败路径
  await page.click('#retryBtn');
  await new Promise(r => setTimeout(r, 100));
  await page.evaluate(() => { game.timeLeft = 0.3; });
  await new Promise(r => setTimeout(r, 1000));
  const loseState = await page.evaluate(() => ({
    state: game.state,
    endPanel: !document.getElementById('endPanel').classList.contains('hidden'),
    title: document.getElementById('endTitle').textContent,
  }));
  console.log('LOSE STATE:', JSON.stringify(loseState));

  console.log('ERRORS:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();

  // 判定
  const zoomOk = zoomTest.blurNear < zoomTest.blurFar - 2;
  const panOk = panTest.moved > 20;
  const navOk = lvView.cards === 6 && lvView.locked === 5 &&
                pauseTest.opened && pauseTest.paused && pauseTest.timerFrozen &&
                backHome.state === 'menu' && backHome.homeVisible && backHome.menuHidden;
  const ok = st.state === 'won' && endVisible.endPanel && endVisible.blur < 1 &&
             loseState.state === 'lost' && loseState.endPanel && errors.length === 0 &&
             zoomOk && panOk && navOk;
  console.log('NAV OK:', navOk);
  console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('TEST CRASH:', e); process.exit(2); });
