// ui.js      面板 / 游戏内菜单 / 导航 / 关卡流转
// 《我的眼镜在哪里？》— 以普通 <script> 顺序加载，共享全局作用域

/* ============================================================
   游戏状态流转
   ============================================================ */
// 面板显隐小工具
function showPanel(id) {
  for (const p of ['homePanel', 'levelPanel', 'endPanel']) {
    document.getElementById(p).classList.toggle('hidden', p !== id);
  }
}
function showGameUI(on) {
  document.getElementById('hud').classList.toggle('hidden', !on);
  document.getElementById('goalIcon').classList.toggle('hidden', !on);
  document.getElementById('menuBtn').classList.toggle('hidden', !on);
  if (!on) closeMenu();
}

/* ---------- 游戏内菜单（暂停） ---------- */
let menuOpen = false;
function toggleMenu() { menuOpen ? closeMenu() : openMenu(); }
function openMenu() {
  if (game.state !== 'playing') return;
  menuOpen = true;
  game.paused = true;                 // 暂停倒计时
  document.getElementById('menuDrop').classList.remove('hidden');
  document.getElementById('menuMask').classList.remove('hidden');
}
function closeMenu() {
  menuOpen = false;
  game.paused = false;
  document.getElementById('menuDrop').classList.add('hidden');
  document.getElementById('menuMask').classList.add('hidden');
}

/* ---------- 导航：主页 / 关卡选择 ---------- */
function goHome() {
  game.state = 'menu';
  showGameUI(false);
  showPanel('homePanel');
}

function showLevels() {
  game.state = 'levels';
  showGameUI(false);
  buildLevelGrid();
  showPanel('levelPanel');
}

function buildLevelGrid() {
  const grid = document.getElementById('levelGrid');
  grid.innerHTML = '';
  for (const lv of LEVELS) {
    const card = document.createElement('button');
    card.className = 'level-card' + (lv.playable ? '' : ' locked');
    card.innerHTML = lv.playable
      ? `<span class="num">${lv.id}</span><span class="name">${lv.name}</span><span class="star">★</span>`
      : `<span class="num">🔒</span><span class="name">${lv.name}</span><span class="star">即将推出</span>`;
    if (lv.playable) card.addEventListener('click', () => startLevel(lv.id));
    grid.appendChild(card);
  }
}

/* ---------- 关卡开始 ---------- */
function startLevel(id) {
  const lv = LEVELS.find(l => l.id === id) || LEVELS[0];
  if (!lv.playable) return;
  currentLevel = lv.id;
  // 应用关卡配置
  glasses.x = lv.glasses.x; glasses.y = lv.glasses.y;
  glasses.w = lv.glasses.w; glasses.h = lv.glasses.h;

  game.state = 'playing';
  game.timeLeft = lv.time;
  game.blur = BLUR_BASE; game.targetBlur = BLUR_BASE;
  game.found = false; game.wearProgress = 0;
  cam.x = cam.targetX = WORLD.w / 2;
  cam.y = cam.targetY = WORLD.h / 2;
  cam.zoom = cam.targetZoom = ZOOM_MIN;
  clampCam();
  closeMenu();
  showPanel(null);               // 隐藏所有面板
  showGameUI(true);
  updateTimerUI();
}

function retryLevel() { startLevel(currentLevel); }

function nextLevel() {
  const next = LEVELS.find(l => l.id === currentLevel + 1);
  if (next && next.playable) startLevel(next.id);
  else showLevels();            // 没有下一关则回到关卡选择
}

// 兼容旧入口
function startGame() { startLevel(1); }

function win() {
  if (game.state !== 'playing') return;
  game.state = 'won';
  game.found = true;
  game.targetBlur = 0;              // 戴上后立即变清晰
  game.wearProgress = 0.0001;       // 触发戴镜动画
  ensureWearLayer();
  if (navigator.vibrate) navigator.vibrate([40, 60, 120]);
  // 把镜头走近并对准眼镜，突出"看清了"
  cam.targetX = glasses.x;
  cam.targetY = glasses.y;
  cam.targetZoom = 1.8;
  clampCam();
}

function finishWin() {
  // 戴镜动画结束，展示过关面板
  const left = Math.ceil(game.timeLeft);
  const lv = LEVELS.find(l => l.id === currentLevel);
  const hasNext = LEVELS.some(l => l.id === currentLevel + 1 && l.playable);
  showGameUI(false);
  document.getElementById('endEmoji').textContent = '🎉';
  document.getElementById('endTitle').textContent = '看清啦！过关！';
  document.getElementById('endMsg').textContent = hasNext
    ? `你戴上眼镜，世界瞬间清晰。剩余时间 ${left} 秒。\n准备好进入下一个房间了吗？`
    : `你戴上眼镜，世界瞬间清晰。剩余时间 ${left} 秒。\n第 ${currentLevel} 关（${lv ? lv.name : ''}）完成，更多关卡即将推出……`;
  document.getElementById('nextBtn').style.display = hasNext ? '' : 'none';
  showPanel('endPanel');
}

function lose() {
  if (game.state !== 'playing') return;
  game.state = 'lost';
  if (navigator.vibrate) navigator.vibrate(300);
  showGameUI(false);
  document.getElementById('endEmoji').textContent = '😵‍💫';
  document.getElementById('endTitle').textContent = '时间到！';
  document.getElementById('endMsg').textContent =
    '还是一片模糊……没找到眼镜。\n再试一次，这次留意桌面附近。';
  document.getElementById('nextBtn').style.display = 'none';
  showPanel('endPanel');
}
