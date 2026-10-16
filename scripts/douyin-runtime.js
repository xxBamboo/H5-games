// Generated into douyin/game.js together with src/scene.js.
// The first Canvas is the only on-screen Canvas; later canvases are off-screen.
const screenCanvas = tt.createCanvas();
const screenCtx = screenCanvas.getContext('2d');
const sceneCanvas = tt.createCanvas();
const ctx = sceneCanvas.getContext('2d');
const blurCanvas = tt.createCanvas();
const blurCtx = blurCanvas.getContext('2d');

const WORLD = { w: 2400, h: 1080 };
const ZOOM_MIN = 1;
const ZOOM_MAX = 2.8;
const BLUR_BASE = 14;
const BLUR_NEAR = 4.5;
const LEVELS = [
  { id: 1, name: '卧室', time: 45, glasses: { x: 1512, y: 742, w: 120, h: 46 }, playable: true },
  { id: 2, name: '书房', time: 40, playable: false },
  { id: 3, name: '客厅', time: 38, playable: false },
  { id: 4, name: '厨房', time: 35, playable: false },
  { id: 5, name: '阳台', time: 32, playable: false },
  { id: 6, name: '储物间', time: 30, playable: false }
];
const glasses = { x: 1512, y: 742, w: 120, h: 46 };
const cam = { x: 1200, y: 540, zoom: 1, targetX: 1200, targetY: 540, targetZoom: 1 };
const game = {
  state: 'home', timeLeft: 45, blur: BLUR_BASE, targetBlur: BLUR_BASE,
  wearProgress: 0, lastTs: 0, level: 1, menuOpen: false,
  wrongUntil: 0, wrongX: 0, wrongY: 0
};
const view = { w: 0, h: 0, dpr: 1, baseScale: 1, safeTop: 0, safeBottom: 0 };
const buttons = [];
const pointer = { down: false, startX: 0, startY: 0, camX: 0, camY: 0, moved: 0, lastX: 0, lastY: 0 };
const pinch = { active: false, startDist: 0, zoomStart: 1, x: 0, y: 0 };

function resize() {
  const info = tt.getSystemInfoSync();
  view.w = info.windowWidth || info.screenWidth;
  view.h = info.windowHeight || info.screenHeight;
  view.dpr = Math.min(info.pixelRatio || 1, 2);
  view.baseScale = view.h / WORLD.h;
  view.safeTop = info.safeArea ? Math.max(0, info.safeArea.top) : 0;
  view.safeBottom = info.safeArea ? Math.max(0, view.h - info.safeArea.bottom) : 0;
  screenCanvas.width = sceneCanvas.width = Math.round(view.w * view.dpr);
  screenCanvas.height = sceneCanvas.height = Math.round(view.h * view.dpr);
  clampCam();
}
function effScale(zoom) { return view.baseScale * zoom; }
function camBounds(zoom) {
  const halfW = view.w / effScale(zoom) / 2;
  const halfH = view.h / effScale(zoom) / 2;
  return {
    minX: Math.min(WORLD.w / 2, halfW),
    maxX: Math.max(WORLD.w / 2, WORLD.w - halfW),
    minY: Math.min(WORLD.h / 2, halfH),
    maxY: Math.max(WORLD.h / 2, WORLD.h - halfH)
  };
}
function clampCam() {
  for (const target of [false, true]) {
    const bounds = camBounds(target ? cam.targetZoom : cam.zoom);
    const x = target ? 'targetX' : 'x';
    const y = target ? 'targetY' : 'y';
    cam[x] = Math.max(bounds.minX, Math.min(bounds.maxX, cam[x]));
    cam[y] = Math.max(bounds.minY, Math.min(bounds.maxY, cam[y]));
  }
}
function screenToWorld(x, y) {
  const scale = effScale(cam.zoom);
  return { x: cam.x + (x - view.w / 2) / scale, y: cam.y + (y - view.h / 2) / scale };
}
function zoomToward(x, y, zoom) {
  const oldScale = effScale(cam.targetZoom);
  const beforeX = cam.targetX + (x - view.w / 2) / oldScale;
  const beforeY = cam.targetY + (y - view.h / 2) / oldScale;
  cam.targetZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
  const scale = effScale(cam.targetZoom);
  cam.targetX += beforeX - (cam.targetX + (x - view.w / 2) / scale);
  cam.targetY += beforeY - (cam.targetY + (y - view.h / 2) / scale);
  clampCam();
}

/* __ROOM_SCENE__ */

function roundPath(context, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}
function panelBackground() {
  const gradient = screenCtx.createLinearGradient(0, 0, 0, view.h);
  gradient.addColorStop(0, '#292943');
  gradient.addColorStop(1, '#15152b');
  screenCtx.fillStyle = gradient;
  screenCtx.fillRect(0, 0, view.w, view.h);
}
function textLine(label, x, y, size, color, weight) {
  screenCtx.fillStyle = color || '#fff';
  screenCtx.textAlign = 'center';
  screenCtx.textBaseline = 'middle';
  screenCtx.font = (weight || 'normal') + ' ' + size + 'px sans-serif';
  screenCtx.fillText(label, x, y);
}
function pill(label, x, y, w, h, fill, fontSize) {
  roundPath(screenCtx, x, y, w, h, h / 2);
  screenCtx.fillStyle = fill;
  screenCtx.fill();
  textLine(label, x + w / 2, y + h / 2, fontSize || 14, '#fff', 'bold');
}
function button(label, x, y, w, h, action, quiet) {
  const gradient = screenCtx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, quiet ? '#43435e' : '#ff9f43');
  gradient.addColorStop(1, quiet ? '#363650' : '#ff6b6b');
  roundPath(screenCtx, x, y, w, h, Math.min(20, h / 2));
  screenCtx.fillStyle = gradient;
  screenCtx.fill();
  textLine(label, x + w / 2, y + h / 2, Math.min(18, Math.max(14, view.w * 0.04)), '#fff', 'bold');
  buttons.push({ x, y, w, h, action });
}
function touchButton(x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      b.action();
      return true;
    }
  }
  return false;
}
function drawHome() {
  panelBackground();
  const center = view.w / 2;
  const mid = view.h * 0.45;
  textLine('◎', center, mid - 142, 58, '#ffba6b', 'bold');
  textLine('我的眼镜在哪里？', center, mid - 66, Math.min(28, view.w * 0.066), '#fff', 'bold');
  textLine('在凌乱的房间里', center, mid - 15, 15, '#d9d9e3');
  textLine('限时找到并戴上眼镜！', center, mid + 9, 15, '#d9d9e3');
  const bw = Math.min(170, (view.w - 50) / 2);
  button('开始游戏', center - bw - 6, mid + 64, bw, 54, () => startLevel(1), false);
  button('选择关卡', center + 6, mid + 64, bw, 54, showLevels, true);
  textLine('滑动环顾房间  ·  双指捏合走近', center, mid + 151, 13, '#afb0c3');
  textLine('看清目标后点击确认', center, mid + 173, 13, '#afb0c3');
}
function drawLevels() {
  panelBackground();
  const center = view.w / 2;
  const top = Math.max(view.safeTop + 90, view.h * 0.27);
  textLine('选择关卡', center, top, 27, '#fff', 'bold');
  const gap = 10;
  const size = Math.min(110, (view.w - 52 - gap * 2) / 3);
  const left = center - (size * 3 + gap * 2) / 2;
  const rowTop = top + 50;
  LEVELS.forEach((lv, index) => {
    const x = left + (index % 3) * (size + gap);
    const y = rowTop + Math.floor(index / 3) * (size + gap);
    roundPath(screenCtx, x, y, size, size, 16);
    screenCtx.fillStyle = lv.playable ? '#ff875b' : '#3b3b55';
    screenCtx.fill();
    textLine(lv.playable ? String(lv.id) : '锁', x + size / 2, y + 37, lv.playable ? 28 : 21, lv.playable ? '#fff' : '#a9a9ba', 'bold');
    textLine(lv.name, x + size / 2, y + 67, 12, lv.playable ? '#fff' : '#a9a9ba');
    if (!lv.playable) textLine('即将推出', x + size / 2, y + size - 18, 11, '#ffe08a');
    if (lv.playable) buttons.push({ x, y, w: size, h: size, action: () => startLevel(lv.id) });
  });
  button('返回主页', center - 72, rowTop + size * 2 + gap + 28, 144, 48, goHome, true);
}
function drawGameHud() {
  const top = Math.max(14, view.safeTop + 8);
  pill('剩余 ' + Math.ceil(game.timeLeft) + ' 秒', 15, top, 107, 38,
    game.timeLeft <= 10 ? 'rgba(205,55,55,.84)' : 'rgba(25,25,30,.6)', 15);
  pill('×' + cam.zoom.toFixed(1), view.w - 137, top, 65, 38,
    cam.zoom > 1.15 ? 'rgba(46,160,120,.85)' : 'rgba(25,25,30,.6)', 15);
  roundPath(screenCtx, view.w - 57, top, 42, 38, 10);
  screenCtx.fillStyle = 'rgba(25,25,30,.6)';
  screenCtx.fill();
  screenCtx.strokeStyle = '#fff';
  screenCtx.lineWidth = 2.5;
  for (const offset of [-6, 0, 6]) {
    screenCtx.beginPath();
    screenCtx.moveTo(view.w - 46, top + 19 + offset);
    screenCtx.lineTo(view.w - 26, top + 19 + offset);
    screenCtx.stroke();
  }
  buttons.push({ x: view.w - 57, y: top, w: 42, h: 38, action: toggleMenu });
  pill('滑动环顾 · 双指捏合走近', view.w / 2 - 113, top + 48, 226, 29, 'rgba(25,25,30,.48)', 12);
  pill('看清可疑目标后，点击确认', view.w / 2 - 120, view.h - view.safeBottom - 53,
    240, 35, 'rgba(25,25,30,.55)', 12);
}
function drawMenu() {
  screenCtx.fillStyle = 'rgba(13,13,27,.48)';
  screenCtx.fillRect(0, 0, view.w, view.h);
  buttons.push({ x: 0, y: 0, w: view.w, h: view.h, action: closeMenu });
  const x = Math.max(12, view.w - 200);
  const top = Math.max(66, view.safeTop + 59);
  button('继续游戏', x, top, 184, 47, closeMenu, true);
  button('重玩本关', x, top + 51, 184, 47, () => startLevel(game.level), true);
  button('选择关卡', x, top + 102, 184, 47, showLevels, true);
  button('返回主页', x, top + 153, 184, 47, goHome, true);
}
function drawEnd() {
  panelBackground();
  const center = view.w / 2;
  const y = view.h * 0.39;
  const won = game.state === 'won';
  textLine(won ? '◎' : '×', center, y - 94, 57, won ? '#ffba6b' : '#ff7777', 'bold');
  textLine(won ? '看清啦！过关！' : '时间到！', center, y - 26, 29, '#fff', 'bold');
  textLine(won ? '你戴上眼镜，世界瞬间清晰。' : '还是一片模糊……没找到眼镜。',
    center, y + 27, 14, '#d9d9e3');
  textLine(won ? '剩余时间 ' + Math.ceil(game.timeLeft) + ' 秒' : '再试一次，留意房间里的可疑目标。',
    center, y + 52, 14, '#d9d9e3');
  if (won) textLine('更多关卡即将推出', center, y + 77, 13, '#bfc0d0');
  const bw = Math.min(170, (view.w - 50) / 2);
  button('再玩一次', center - bw - 6, y + 118, bw, 52, () => startLevel(game.level), false);
  button('选择关卡', center + 6, y + 118, bw, 52, showLevels, true);
  button('返回主页', center - 72, y + 185, 144, 46, goHome, true);
}
function drawWearOverlay() {
  const progress = game.wearProgress;
  const ease = 1 - Math.pow(1 - progress, 3);
  const r = Math.min(view.w, view.h) * 0.19;
  const gap = r * 1.25;
  const cy = -view.h * 0.5 + ease * view.h;
  screenCtx.save();
  screenCtx.translate(view.w / 2, cy);
  screenCtx.lineWidth = 13;
  screenCtx.strokeStyle = '#24292c';
  screenCtx.fillStyle = 'rgba(160,210,255,.14)';
  for (const sign of [-1, 1]) {
    screenCtx.beginPath();
    screenCtx.ellipse(sign * gap, 0, r, r * .85, 0, 0, Math.PI * 2);
    screenCtx.fill();
    screenCtx.stroke();
  }
  screenCtx.beginPath();
  screenCtx.moveTo(-gap + r, -6);
  screenCtx.quadraticCurveTo(0, -r * .5, gap - r, -6);
  screenCtx.stroke();
  screenCtx.restore();
}
function renderScene() {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, view.w, view.h);
  ctx.save();
  const scale = effScale(cam.zoom);
  ctx.translate(view.w / 2, view.h / 2);
  ctx.scale(scale, scale);
  ctx.translate(-cam.x, -cam.y);
  drawRoom();
  ctx.restore();

  if (game.blur < .4) {
    screenCtx.drawImage(sceneCanvas, 0, 0, view.w, view.h);
  } else if (typeof screenCtx.filter === 'string') {
    // Keep the image opaque at the edges while the filter samples nearby pixels.
    screenCtx.drawImage(sceneCanvas, 0, 0, view.w, view.h);
    screenCtx.filter = 'blur(' + game.blur.toFixed(1) + 'px)';
    screenCtx.drawImage(sceneCanvas, 0, 0, view.w, view.h);
    screenCtx.filter = 'none';
  } else {
    // Downsampling keeps the myopia effect on runtimes without Canvas filters.
    const ratio = 1 + game.blur * .48;
    const width = Math.max(1, Math.round(sceneCanvas.width / ratio));
    const height = Math.max(1, Math.round(sceneCanvas.height / ratio));
    if (blurCanvas.width !== width || blurCanvas.height !== height) {
      blurCanvas.width = width;
      blurCanvas.height = height;
    }
    blurCtx.setTransform(1, 0, 0, 1, 0, 0);
    blurCtx.clearRect(0, 0, width, height);
    blurCtx.imageSmoothingEnabled = true;
    blurCtx.drawImage(sceneCanvas, 0, 0, width, height);
    screenCtx.imageSmoothingEnabled = true;
    screenCtx.drawImage(blurCanvas, 0, 0, view.w, view.h);
  }
}
function render() {
  screenCtx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  screenCtx.clearRect(0, 0, view.w, view.h);
  buttons.length = 0;
  if (game.state === 'home') drawHome();
  else if (game.state === 'levels') drawLevels();
  else if (game.state === 'won' || game.state === 'lost') drawEnd();
  else {
    renderScene();
    if (game.state === 'wearing') drawWearOverlay();
    if (game.state === 'playing') {
      drawGameHud();
      if (game.menuOpen) drawMenu();
    }
    if (game.wrongUntil > game.lastTs) {
      screenCtx.fillStyle = 'rgba(255,40,40,.17)';
      screenCtx.fillRect(0, 0, view.w, view.h);
      textLine('×', game.wrongX, game.wrongY, 70, '#ff3030', 'bold');
    }
  }
}
function goHome() { game.state = 'home'; game.menuOpen = false; }
function showLevels() { game.state = 'levels'; game.menuOpen = false; }
function toggleMenu() { if (game.state === 'playing') game.menuOpen = !game.menuOpen; }
function closeMenu() { game.menuOpen = false; }
function startLevel(id) {
  const level = LEVELS.find(item => item.id === id);
  if (!level || !level.playable) return;
  game.level = id;
  game.state = 'playing';
  game.menuOpen = false;
  game.timeLeft = level.time;
  game.blur = game.targetBlur = BLUR_BASE;
  game.wearProgress = 0;
  game.wrongUntil = 0;
  Object.assign(glasses, level.glasses);
  cam.x = cam.targetX = WORLD.w / 2;
  cam.y = cam.targetY = WORLD.h / 2;
  cam.zoom = cam.targetZoom = ZOOM_MIN;
  clampCam();
}
function win() {
  if (game.state !== 'playing') return;
  game.state = 'wearing';
  game.menuOpen = false;
  game.targetBlur = 0;
  game.wearProgress = .0001;
  cam.targetX = glasses.x;
  cam.targetY = glasses.y;
  cam.targetZoom = 1.8;
  clampCam();
  if (tt.vibrateShort) tt.vibrateShort();
}
function lose() {
  if (game.state !== 'playing') return;
  game.state = 'lost';
  game.menuOpen = false;
  if (tt.vibrateLong) tt.vibrateLong();
}
function handleTap(x, y) {
  if (touchButton(x, y)) return;
  if (game.state !== 'playing' || game.menuOpen) return;
  const point = screenToWorld(x, y);
  const pad = 18;
  if (point.x >= glasses.x - glasses.w / 2 - pad &&
      point.x <= glasses.x + glasses.w / 2 + pad &&
      point.y >= glasses.y - glasses.h / 2 - pad &&
      point.y <= glasses.y + glasses.h / 2 + pad) {
    win();
  } else {
    game.timeLeft = Math.max(0, game.timeLeft - 2);
    game.wrongUntil = game.lastTs + 600;
    game.wrongX = x;
    game.wrongY = y;
    if (tt.vibrateShort) tt.vibrateShort();
    if (game.timeLeft <= 0) lose();
  }
}
function touchPos(touch) {
  return { x: touch.clientX == null ? touch.screenX : touch.clientX,
    y: touch.clientY == null ? touch.screenY : touch.clientY };
}
function distance(a, b) {
  const p = touchPos(a);
  const q = touchPos(b);
  return Math.hypot(p.x - q.x, p.y - q.y);
}
function bindInput() {
  tt.onTouchStart(event => {
    if (event.touches.length >= 2 && game.state === 'playing' && !game.menuOpen) {
      pointer.down = false;
      pinch.active = true;
      pinch.startDist = distance(event.touches[0], event.touches[1]);
      pinch.zoomStart = cam.targetZoom;
      const a = touchPos(event.touches[0]);
      const b = touchPos(event.touches[1]);
      pinch.x = (a.x + b.x) / 2;
      pinch.y = (a.y + b.y) / 2;
    } else if (!pinch.active && event.changedTouches.length) {
      const p = touchPos(event.changedTouches[0]);
      pointer.down = true;
      pointer.startX = pointer.lastX = p.x;
      pointer.startY = pointer.lastY = p.y;
      pointer.camX = cam.targetX;
      pointer.camY = cam.targetY;
      pointer.moved = 0;
    }
  });
  tt.onTouchMove(event => {
    if (pinch.active && event.touches.length >= 2) {
      const current = distance(event.touches[0], event.touches[1]);
      zoomToward(pinch.x, pinch.y, pinch.zoomStart * current / (pinch.startDist || current));
    } else if (pointer.down && game.state === 'playing' && !game.menuOpen && event.changedTouches.length) {
      const p = touchPos(event.changedTouches[0]);
      pointer.moved += Math.abs(p.x - pointer.lastX) + Math.abs(p.y - pointer.lastY);
      pointer.lastX = p.x;
      pointer.lastY = p.y;
      const scale = effScale(cam.targetZoom);
      cam.targetX = pointer.camX - (p.x - pointer.startX) / scale;
      cam.targetY = pointer.camY - (p.y - pointer.startY) / scale;
      clampCam();
    }
  });
  tt.onTouchEnd(event => {
    if (pinch.active) {
      if (event.touches.length < 2) pinch.active = false;
      return;
    }
    if (!pointer.down || !event.changedTouches.length) return;
    pointer.down = false;
    if (pointer.moved < 12) {
      const p = touchPos(event.changedTouches[0]);
      handleTap(p.x, p.y);
    }
  });
  if (tt.onTouchCancel) tt.onTouchCancel(() => { pointer.down = false; pinch.active = false; });
}
function loop(timestamp) {
  const dt = Math.max(0, Math.min(.05, (timestamp - game.lastTs) / 1000 || 0));
  game.lastTs = timestamp;
  if (game.state === 'playing' && !game.menuOpen) {
    game.timeLeft -= dt;
    if (game.timeLeft <= 0) { game.timeLeft = 0; lose(); }
  }
  const pan = Math.min(1, dt * 12);
  cam.x += (cam.targetX - cam.x) * pan;
  cam.y += (cam.targetY - cam.y) * pan;
  cam.zoom += (cam.targetZoom - cam.zoom) * Math.min(1, dt * 9);
  clampCam();
  if (game.state !== 'wearing' && game.state !== 'won') {
    const t = (cam.zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN);
    game.targetBlur = BLUR_BASE + (BLUR_NEAR - BLUR_BASE) * t;
  }
  game.blur += (game.targetBlur - game.blur) * Math.min(1, dt * 4);
  if (game.state === 'wearing') {
    game.wearProgress = Math.min(1, game.wearProgress + dt * 1.1);
    if (game.wearProgress >= 1) game.state = 'won';
  }
  render();
  requestAnimationFrame(loop);
}
resize();
bindInput();
if (tt.onWindowResize) tt.onWindowResize(resize);
if (tt.onAppHide) tt.onAppHide(() => { if (game.state === 'playing') game.menuOpen = true; });
requestAnimationFrame(loop);
