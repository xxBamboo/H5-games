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

// scene.js   房间与物件的程序化绘制（卡通描边 + 厚涂质感）
// 《我的眼镜在哪里？》— 以普通 <script> 顺序加载，共享全局作用域

/* ============================================================
   厚涂卡通：统一的描边色、明暗分层、接触阴影等辅助
   房间由多个"物件"组成，眼镜藏在杂物堆里
   ============================================================ */

// 简单的伪随机，保证杂物布局稳定
function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const INK = '#3a2516';          // 统一描边色（深棕，比纯黑更卡通）

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 描边：对当前路径描一圈卡通墨线
function ink(w) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = w || 5; ctx.stroke();
}

// 填充圆角矩形 + 描边
function box(x, y, w, h, r, fill, lw) {
  roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); ink(lw || 5);
}

// 柔和接触阴影：物件底部的椭圆暗影，让它"落在地上"
function contact(x, y, rx, ry, alpha) {
  ctx.save();
  ctx.fillStyle = `rgba(60,36,20,${alpha == null ? 0.22 : alpha})`;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
  ctx.restore();
}

// 顶部高光条（厚涂质感：受光面提亮）
function toplight(x, y, w, h, r) {
  ctx.save();
  roundRect(x, y, w, h, r); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,.35)');
  g.addColorStop(.35, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// 暗面：在路径内压一层指定方向的暗色（厚涂的背光面）
function shade(x, y, w, h, r, dir) {
  ctx.save();
  roundRect(x, y, w, h, r); ctx.clip();
  const g = (dir === 'r')
    ? ctx.createLinearGradient(x, 0, x + w, 0)
    : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.22)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/* ============================================================
   房间主体
   ============================================================ */
function drawRoom() {
  const floorY = WORLD.h * 0.72;

  // --- 墙面：竖直渐变 ---
  const wall = ctx.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, '#ffe7ad');
  wall.addColorStop(1, '#f8c983');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, WORLD.w, floorY);

  // 墙面壁纸竖纹（极淡）
  ctx.save();
  ctx.globalAlpha = .06; ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 2;
  for (let x = 40; x < WORLD.w; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, floorY); ctx.stroke();
  }
  ctx.restore();

  // --- 地板：透视木地板 ---
  const floor = ctx.createLinearGradient(0, floorY, 0, WORLD.h);
  floor.addColorStop(0, '#d59a63');
  floor.addColorStop(1, '#a86b3d');
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, WORLD.w, WORLD.h - floorY);
  // 木纹（向下发散的斜线，制造纵深）
  ctx.strokeStyle = 'rgba(120,70,30,.3)';
  ctx.lineWidth = 3;
  for (let x = 0; x < WORLD.w + 400; x += 120) {
    ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x - 60, WORLD.h); ctx.stroke();
  }
  // 地板横向接缝
  ctx.strokeStyle = 'rgba(120,70,30,.18)'; ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    const yy = floorY + (WORLD.h - floorY) * (i / 3.2);
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(WORLD.w, yy); ctx.stroke();
  }

  // --- 踢脚线（带高光，有厚度感）---
  ctx.fillStyle = '#8a5a30'; ctx.fillRect(0, floorY - 16, WORLD.w, 16);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, floorY - 16, WORLD.w, 4);
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(WORLD.w, floorY); ctx.stroke();

  // --- 墙角暗角（四周压暗，聚焦中心）---
  const vg = ctx.createRadialGradient(WORLD.w / 2, WORLD.h * 0.48, WORLD.h * 0.3,
                                      WORLD.w / 2, WORLD.h * 0.5, WORLD.w * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(40,20,10,.28)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  // 墙面装饰
  drawWindow(230, 140);
  drawPoster(760, 150, '#6bcB77', '♪');
  drawPoster(980, 180, '#ff9ff3', '★');
  drawShelf(1180, 120);
  drawClock(1980, 150);

  // 家具（含落地阴影）
  drawBed(60, 520);
  drawNightstand(560, 640);
  drawRug(820, 840);
  drawBoxes(1180, 700);
  drawDesk(1760, 560);
  drawClothesPile(430, 880);
  drawScatter();

  drawGlasses(glasses.x, glasses.y);
}

/* ============================================================
   墙面装饰
   ============================================================ */
function drawWindow(x, y) {
  // 窗框（外深内浅，有厚度）
  box(x - 16, y - 16, 304, 304, 12, '#a06a38', 7);
  box(x - 4, y - 4, 280, 280, 8, '#7a4f28', 5);
  // 天空渐变
  ctx.save();
  roundRect(x, y, 272, 272, 6); ctx.clip();
  const sky = ctx.createLinearGradient(x, y, x, y + 272);
  sky.addColorStop(0, '#74c4ff'); sky.addColorStop(1, '#cdeeff');
  ctx.fillStyle = sky; ctx.fillRect(x, y, 272, 272);
  // 远山
  ctx.fillStyle = 'rgba(120,180,140,.55)';
  ctx.beginPath(); ctx.moveTo(x, y + 240); ctx.lineTo(x + 90, y + 170);
  ctx.lineTo(x + 170, y + 240); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 120, y + 250); ctx.lineTo(x + 210, y + 185);
  ctx.lineTo(x + 290, y + 250); ctx.closePath(); ctx.fill();
  // 太阳 + 云
  ctx.fillStyle = 'rgba(255,240,180,.95)';
  ctx.beginPath(); ctx.arc(x + 60, y + 60, 30, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x + 210, y + 70, 30, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 180, y + 80, 22, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 238, y + 80, 20, 0, 7); ctx.fill();
  ctx.restore();
  // 窗棂
  ctx.strokeStyle = '#7a4f28'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(x + 136, y); ctx.lineTo(x + 136, y + 272);
  ctx.moveTo(x, y + 136); ctx.lineTo(x + 272, y + 136); ctx.stroke();
  // 玻璃反光
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x + 30, y + 110); ctx.lineTo(x + 100, y + 30); ctx.stroke();
}

function drawPoster(x, y, color, glyph) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(-0.04);
  // 投影
  ctx.fillStyle = 'rgba(60,36,20,.18)';
  roundRect(6, 8, 150, 190, 8); ctx.fill();
  box(0, 0, 150, 190, 8, color, 5);
  shade(0, 0, 150, 190, 8, 'd');
  box(12, 12, 126, 126, 6, 'rgba(255,255,255,.9)', 3);
  ctx.fillStyle = INK; ctx.font = '64px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 75, 74);
  ctx.restore();
}

function drawShelf(x, y) {
  // 板子投影
  ctx.fillStyle = 'rgba(60,36,20,.16)';
  ctx.fillRect(x + 6, y + 8, 520, 18);
  ctx.fillRect(x + 6, y + 158, 520, 18);
  // 书本（底层）
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
  let bx = x + 16;
  for (let i = 0; i < 14; i++) {
    const h = 90 + ((i * 37) % 40);
    const w = 24 + (i % 3) * 6;
    box(bx, y - h + 22, w, h, 3, colors[i % colors.length], 3);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(bx + 3, y - h + 28, w - 6, 5);
    bx += 30 + (i % 3) * 6;
  }
  // 搁板
  box(x, y, 520, 22, 4, '#a9743f', 4); toplight(x, y, 520, 10, 4);
  box(x, y + 150, 520, 22, 4, '#a9743f', 4); toplight(x, y + 150, 520, 10, 4);
  // 盆栽
  box(x + 300, y + 100, 44, 46, 6, '#d35400', 4);
  ctx.fillStyle = '#27ae60';
  ctx.beginPath(); ctx.arc(x + 322, y + 96, 26, 0, 7); ctx.fill(); ink(4);
  ctx.beginPath(); ctx.arc(x + 306, y + 104, 17, 0, 7); ctx.fillStyle = '#2ecc71'; ctx.fill();
  ctx.beginPath(); ctx.arc(x + 338, y + 104, 17, 0, 7); ctx.fill();
  // 奖杯
  box(x + 410, y + 96, 40, 30, 6, '#f1c40f', 4);
  ctx.fillStyle = '#f1c40f'; ctx.fillRect(x + 424, y + 126, 12, 14);
  box(x + 410, y + 140, 40, 10, 3, '#e0a800', 3);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath(); ctx.arc(x + 422, y + 106, 5, 0, 7); ctx.fill();
}

function drawClock(x, y) {
  contact(x, y + 62, 40, 8, .15);
  ctx.beginPath(); ctx.arc(x, y, 58, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ink(6);
  ctx.beginPath(); ctx.arc(x, y, 50, 0, 7); ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 6; ctx.stroke();
  // 刻度
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 46, y + Math.sin(a) * 46);
    ctx.lineTo(x + Math.cos(a) * 52, y + Math.sin(a) * 52); ctx.stroke();
  }
  ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 26, y - 16); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y - 36); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = INK; ctx.fill();
}

/* ============================================================
   家具（均带落地接触阴影 + 明暗分层）
   ============================================================ */
function drawBed(x, y) {
  contact(x + 235, y + 312, 250, 26);
  // 床架
  box(x, y, 470, 300, 22, '#7a5bc8', 6);
  // 床垫 / 被子
  box(x + 18, y + 38, 434, 246, 18, '#a29bfe', 5);
  shade(x + 18, y + 38, 434, 246, 18, 'd');
  toplight(x + 18, y + 38, 434, 120, 18);
  // 被子褶皱
  ctx.strokeStyle = 'rgba(80,60,160,.35)'; ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const bx = x + 70 + i * 92;
    ctx.beginPath(); ctx.moveTo(bx, y + 130); ctx.lineTo(bx - 14, y + 276); ctx.stroke();
  }
  // 枕头
  box(x + 36, y + 20, 150, 92, 16, '#ffffff', 5);
  toplight(x + 36, y + 20, 150, 50, 16);
}

function drawNightstand(x, y) {
  contact(x + 85, y + 206, 100, 16);
  box(x, y, 170, 200, 12, '#c0925f', 6);
  shade(x, y, 170, 200, 12, 'r');
  // 抽屉
  box(x + 14, y + 26, 142, 62, 8, '#a9743f', 4);
  box(x + 14, y + 104, 142, 78, 8, '#a9743f', 4);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(x + 85, y + 57, 7, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 85, y + 143, 7, 0, 7); ctx.fill();
  // 台灯
  contact(x + 85, y - 6, 42, 8, .15);
  ctx.fillStyle = '#636e72'; ctx.fillRect(x + 82, y - 16, 6, 12);
  box(x + 42, y - 74, 86, 60, 6, '#fdcb6e', 5);
  ctx.save(); roundRect(x + 42, y - 74, 86, 60, 6); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x + 42, y - 74, 86, 24);
  ctx.restore();
  // 灯光晕
  ctx.save();
  const lg = ctx.createRadialGradient(x + 85, y - 30, 4, x + 85, y - 30, 120);
  lg.addColorStop(0, 'rgba(255,230,150,.35)'); lg.addColorStop(1, 'rgba(255,230,150,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x + 85, y - 30, 120, 0, 7); ctx.fill();
  ctx.restore();
}

function drawRug(x, y) {
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, 262, 92, 0, 0, 7);
  ctx.fillStyle = '#ff7675'; ctx.fill(); ink(6);
  ctx.beginPath(); ctx.ellipse(x, y, 182, 62, 0, 0, 7);
  ctx.fillStyle = '#fab1a0'; ctx.fill(); ink(4);
  ctx.beginPath(); ctx.ellipse(x, y, 92, 32, 0, 0, 7);
  ctx.fillStyle = '#ffeaa7'; ctx.fill(); ink(3);
  // 高光
  ctx.beginPath(); ctx.ellipse(x - 60, y - 24, 70, 18, -.3, 0, 7);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
  ctx.restore();
}

function drawBoxes(x, y) {
  contact(x + 95, y + 152, 120, 16);
  // 下箱
  box(x, y, 160, 150, 6, '#e1a95f', 6);
  shade(x, y, 160, 150, 6, 'r');
  ctx.strokeStyle = '#b5793a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x + 80, y); ctx.lineTo(x + 80, y + 150); ctx.stroke();
  // 封箱胶带
  ctx.fillStyle = 'rgba(180,140,90,.7)'; ctx.fillRect(x + 60, y, 40, 150);
  // 上箱
  box(x + 30, y - 110, 130, 110, 6, '#edc07a', 6);
  toplight(x + 30, y - 110, 130, 50, 6);
  ctx.fillStyle = 'rgba(180,140,90,.7)'; ctx.fillRect(x + 80, y - 110, 34, 110);
}

function drawDesk(x, y) {
  contact(x + 40, y + 232, 54, 10, .18);
  contact(x + 530, y + 232, 54, 10, .18);
  // 桌腿
  box(x + 20, y + 30, 28, 202, 4, '#7d5430', 4);
  box(x + 512, y + 30, 28, 202, 4, '#7d5430', 4);
  // 笔记本电脑
  contact(x + 145, y + 2, 95, 8, .14);
  box(x + 70, y - 92, 150, 98, 8, '#2d3436', 5);
  box(x + 80, y - 82, 130, 78, 4, '#74b9ff', 3);
  ctx.save(); roundRect(x + 80, y - 82, 130, 78, 4); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath(); ctx.moveTo(x + 80, y - 82); ctx.lineTo(x + 150, y - 82);
  ctx.lineTo(x + 90, y - 4); ctx.lineTo(x + 80, y - 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  box(x + 55, y - 4, 180, 16, 4, '#636e72', 4);
  // 马克杯
  box(x + 300, y - 58, 48, 58, 8, '#e17055', 5);
  ctx.strokeStyle = INK; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(x + 356, y - 30, 16, -1.2, 1.2); ctx.stroke();
  // 一摞书（眼镜就靠在旁边）
  const bk = ['#00b894', '#0984e3', '#fdcb6e'];
  for (let i = 0; i < 3; i++) {
    box(x + 400 + i * 6, y - 20 - i * 18, 120 - i * 10, 18, 2, bk[i], 3);
  }
  // 桌面（最后画，压住桌腿顶端）
  box(x, y, 560, 36, 10, '#a9743f', 6);
  toplight(x, y, 560, 16, 10);
}

function drawClothesPile(x, y) {
  contact(x + 110, y + 48, 170, 22);
  const r = rng(7);
  const cols = ['#0984e3', '#00cec9', '#fd79a8', '#fdcb6e', '#6c5ce7'];
  for (let i = 0; i < 7; i++) {
    const cx = x + r() * 220, cy = y + r() * 60;
    const rx = 70 + r() * 40, ry = 36 + r() * 20, rot = r() * 6;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, 7);
    ctx.fillStyle = cols[i % cols.length]; ctx.fill(); ink(4);
    // 布料高光
    ctx.beginPath(); ctx.ellipse(cx - rx * .25, cy - ry * .3, rx * .5, ry * .35, rot, 0, 7);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
  }
}

/* ============================================================
   散落小物（干扰项）—— 全部程序化绘制，卡通描边
   ============================================================ */
function drawScatter() {
  drawBall(300, 960, 44, '#e74c3c');
  drawSock(690, 980, '#3498db');
  drawBook2(1010, 960, '#27ae60');
  drawCup(1700, 980, '#8e44ad');
  drawBall(2050, 960, 36, '#f39c12');
  drawSock(2240, 980, '#e84393');
  drawRemote(1300, 985);
  drawTeddy(150, 740);
  drawBook2(2150, 740, '#2980b9');
  drawBall(900, 1000, 30, '#1abc9c');
}

function drawBall(x, y, r, c1) {
  contact(x, y + r - 4, r * .9, r * .3);
  const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.35, c1); g.addColorStop(1, c1);
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = g; ctx.fill(); ink(5);
  // 分割线
  ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, r * .5, r, 0, 0, 7); ctx.stroke();
}

function drawSock(x, y, c) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(.3);
  contact(6, 34, 42, 8);
  roundRect(-16, -40, 32, 60, 14); ctx.fillStyle = c; ctx.fill();
  roundRect(-16, 10, 58, 30, 14); ctx.fill();
  roundRect(-16, -40, 32, 60, 14); ink(5);
  roundRect(-16, 10, 58, 30, 14); ink(5);
  ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fillRect(-14, -36, 28, 9);
  ctx.restore();
}

function drawBook2(x, y, c) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.12);
  contact(0, 18, 64, 8);
  box(-60, -16, 120, 32, 4, c, 5);
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-54, -10, 108, 7);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-60, 6, 120, 10);
  ctx.restore();
}

function drawCup(x, y, c) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(.5);
  contact(0, 32, 30, 7);
  box(-26, -30, 52, 60, 8, c, 5);
  shade(-26, -30, 52, 60, 8, 'r');
  ctx.beginPath(); ctx.ellipse(0, -30, 26, 8, 0, 0, 7);
  ctx.fillStyle = '#fff'; ctx.fill(); ink(4);
  ctx.restore();
}

function drawRemote(x, y) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(.2);
  contact(0, 50, 28, 7);
  box(-22, -48, 44, 96, 10, '#2d3436', 5);
  ctx.fillStyle = '#636e72';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    ctx.beginPath(); ctx.arc(-10 + j * 20, -20 + i * 20, 6, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(0, -36, 7, 0, 7); ctx.fill();
  ctx.restore();
}

function drawTeddy(x, y) {
  contact(x, y + 86, 46, 12);
  ctx.fillStyle = '#b5651d';
  ctx.beginPath(); ctx.arc(x - 26, y - 34, 16, 0, 7); ctx.fill(); ink(5);
  ctx.beginPath(); ctx.arc(x + 26, y - 34, 16, 0, 7); ctx.fill(); ink(5);
  ctx.beginPath(); ctx.ellipse(x, y + 42, 40, 46, 0, 0, 7); ctx.fillStyle = '#b5651d'; ctx.fill(); ink(5);
  ctx.beginPath(); ctx.arc(x, y - 16, 34, 0, 7); ctx.fill(); ink(5);
  // 耳朵内 / 肚皮
  ctx.fillStyle = '#e8c39e';
  ctx.beginPath(); ctx.arc(x - 26, y - 34, 8, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 26, y - 34, 8, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + 48, 24, 30, 0, 0, 7); ctx.fill();
  // 口鼻
  ctx.beginPath(); ctx.arc(x, y - 6, 16, 0, 7); ctx.fill(); ink(3);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(x - 12, y - 22, 4, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 12, y - 22, 4, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 8, 5, 0, 7); ctx.fill();
}

/* ============================================================
   目标：一副卡通眼镜，靠在桌上书堆旁
   ============================================================ */
function drawGlasses(cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  contact(0, 20, 70, 10, .18);
  // 镜片底（浅玻璃色）
  ctx.fillStyle = 'rgba(160,215,255,.5)';
  ctx.beginPath(); ctx.arc(-32, 0, 24, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(32, 0, 24, 0, 7); ctx.fill();
  // 镜框描边
  ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-32, 0, 26, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(32, 0, 26, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -4); ctx.quadraticCurveTo(0, -14, 6, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-58, -6); ctx.lineTo(-80, -14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(58, -6); ctx.lineTo(80, -14); ctx.stroke();
  // 高光
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(-32, 0, 16, -2.4, -1.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(32, 0, 16, -2.4, -1.2); ctx.stroke();
  ctx.restore();
}


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
