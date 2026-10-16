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
