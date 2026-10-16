// main.js    主循环 + 初始化（入口，最后加载）
// 《我的眼镜在哪里？》— 以普通 <script> 顺序加载，共享全局作用域

/* ============================================================
   主循环
   ============================================================ */
function loop(ts) {
  const dt = Math.min(0.05, (ts - game.lastTs) / 1000 || 0);
  game.lastTs = ts;

  if (game.state === 'playing') {
    // 键盘：A/D ←/→ 左右环顾；W/S ↑/↓ 抬头/低头（纵向环顾）
    const panSpeed = 900 / cam.zoom;   // 放大后平移更精细
    if (keys['a'] || keys['arrowleft']) cam.targetX -= panSpeed * dt;
    if (keys['d'] || keys['arrowright']) cam.targetX += panSpeed * dt;
    if (keys['w'] || keys['arrowup']) cam.targetY -= panSpeed * dt;    // 抬头
    if (keys['s'] || keys['arrowdown']) cam.targetY += panSpeed * dt;  // 低头
    clampCam();

    // 倒计时（菜单暂停时不走表）
    if (!game.paused) {
      game.timeLeft -= dt;
      if (game.timeLeft <= 0) { game.timeLeft = 0; lose(); }
      updateTimerUI();
    }
  }

  // 摄像机缓动（位置 + 缩放）
  const k = Math.min(1, dt * 12);
  cam.x += (cam.targetX - cam.x) * k;
  cam.y += (cam.targetY - cam.y) * k;
  cam.zoom += (cam.targetZoom - cam.zoom) * Math.min(1, dt * 9);
  clampCam();
  updateZoomUI();

  // 近视模糊：未戴镜时，走得越近越清晰（但保留残留模糊）；戴镜后 targetBlur=0
  if (!game.found) {
    const t = (cam.zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN); // 0..1
    game.targetBlur = BLUR_BASE + (BLUR_NEAR - BLUR_BASE) * t;
  }
  game.blur += (game.targetBlur - game.blur) * Math.min(1, dt * 4);

  // 戴镜动画推进
  if (game.found && game.wearProgress < 1) {
    game.wearProgress = Math.min(1, game.wearProgress + dt * 1.1);
    if (game.wearProgress >= 1) finishWin();
  }

  render();
  requestAnimationFrame(loop);
}

/* ---------- 定时 UI ---------- */
function updateTimerUI() {
  const t = document.getElementById('timer');
  t.textContent = '⏱ ' + Math.ceil(game.timeLeft);
  t.classList.toggle('warn', game.timeLeft <= 10);
}

/* ---------- 缩放档位 UI ---------- */
function updateZoomUI() {
  const z = document.getElementById('zoom');
  if (!z) return;
  z.textContent = '🔍 ×' + cam.zoom.toFixed(1);
  z.classList.toggle('near', cam.zoom > 1.15);
}

/* ============================================================
   初始化
   ============================================================ */
function init() {
  resize();
  bindInput();

  // 根据设备显示操作提示
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  document.getElementById('ctrlTip').innerHTML = isTouch
    ? '📱 滑动屏幕：左右环顾 + 抬头低头<br>🤏 双指捏合：走近放大看清细节<br>👆 看清后点击目标确认'
    : '⌨️ A/D ←/→：左右环顾　W/S ↑/↓：抬头低头<br>🖱️ 滚轮：走近放大看清细节<br>🖱️ 看清后点击目标确认';

  // 首页
  document.getElementById('homePlayBtn').addEventListener('click', () => startLevel(1));
  document.getElementById('homeLevelsBtn').addEventListener('click', showLevels);
  // 关卡选择
  document.getElementById('levelBackBtn').addEventListener('click', goHome);
  // 结束面板
  document.getElementById('nextBtn').addEventListener('click', nextLevel);
  document.getElementById('retryBtn').addEventListener('click', retryLevel);
  document.getElementById('endLevelsBtn').addEventListener('click', showLevels);
  document.getElementById('endHomeBtn').addEventListener('click', goHome);
  // 游戏内菜单
  document.getElementById('menuBtn').addEventListener('click', toggleMenu);
  document.getElementById('menuMask').addEventListener('click', closeMenu);
  document.getElementById('mResume').addEventListener('click', closeMenu);
  document.getElementById('mRetry').addEventListener('click', () => { closeMenu(); retryLevel(); });
  document.getElementById('mLevels').addEventListener('click', () => { closeMenu(); showLevels(); });
  document.getElementById('mHome').addEventListener('click', () => { closeMenu(); goHome(); });

  goHome();   // 启动进入主页

  // 重新调整覆盖层尺寸
  window.addEventListener('resize', () => {
    if (wearCanvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      wearCanvas.width = window.innerWidth * dpr;
      wearCanvas.height = window.innerHeight * dpr;
    }
  });

  game.lastTs = performance.now();
  requestAnimationFrame(loop);
}

init();







