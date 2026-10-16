// input.js   触摸 / 鼠标 / 键盘 / 缩放输入
// 《我的眼镜在哪里？》— 以普通 <script> 顺序加载，共享全局作用域

/* ============================================================
   输入：滑动平移 + 点击确认 / 鼠标拖拽 + 点击
   ============================================================ */
let pointer = { down: false, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: 0, camStartX: 0, camStartY: 0 };

// 以某个屏幕点为锚心调整 zoom：让该点下的世界坐标在缩放前后尽量保持不动
function zoomToward(sx, sy, newZoom) {
  newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
  const before = screenToWorldAt(sx, sy, cam.targetZoom, cam.targetX, cam.targetY);
  cam.targetZoom = newZoom;
  const after = screenToWorldAt(sx, sy, cam.targetZoom, cam.targetX, cam.targetY);
  cam.targetX += before.x - after.x;
  cam.targetY += before.y - after.y;
  clampCam();
}
function screenToWorldAt(sx, sy, zoom, cx, cy) {
  const s = effScale(zoom);
  return { x: cx + (sx - view.w / 2) / s, y: cy + (sy - view.h / 2) / s };
}

function onDown(x, y) {
  if (game.state !== 'playing') return;
  pointer.down = true;
  pointer.startX = pointer.lastX = x;
  pointer.startY = pointer.lastY = y;
  pointer.moved = 0;
  pointer.camStartX = cam.targetX;
  pointer.camStartY = cam.targetY;
}
function onMove(x, y) {
  if (!pointer.down || game.state !== 'playing') return;
  pointer.moved += Math.abs(x - pointer.lastX) + Math.abs(y - pointer.lastY);
  pointer.lastX = x; pointer.lastY = y;
  const s = effScale(cam.targetZoom);
  // 拖动 => 环顾（视图随手指反向移动，像用手推动画面）
  cam.targetX = pointer.camStartX - (x - pointer.startX) / s;  // 左右环顾
  cam.targetY = pointer.camStartY - (y - pointer.startY) / s;  // 抬头/低头
  clampCam();
}
function onUp(x, y) {
  if (!pointer.down || game.state !== 'playing') { pointer.down = false; return; }
  pointer.down = false;
  // 判定为点击（而非拖动/缩放）：总位移小
  if (pointer.moved < 12) handleTap(x, y);
}

/* 双指捏合缩放 */
let pinch = { active: false, startDist: 0, zoomStart: 1, cx: 0, cy: 0 };
function pinchDist(t0, t1) {
  return Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
}

function handleTap(sx, sy) {
  const w = screenToWorld(sx, sy);
  // 命中眼镜包围盒（留一点容差便于手指点击）
  const pad = 18;
  if (w.x >= glasses.x - glasses.w / 2 - pad && w.x <= glasses.x + glasses.w / 2 + pad &&
      w.y >= glasses.y - glasses.h / 2 - pad && w.y <= glasses.y + glasses.h / 2 + pad) {
    win();
  } else {
    wrongTap(sx, sy);
  }
}

// 点错：红叉 + 屏幕红闪 + 震动 + 轻微扣时
function wrongTap(sx, sy) {
  const x = document.getElementById('wrongX');
  x.style.left = (sx - 32) + 'px';
  x.style.top = (sy - 40) + 'px';
  x.classList.remove('show'); void x.offsetWidth; x.classList.add('show');
  const flash = document.getElementById('flashRed');
  flash.classList.remove('show'); void flash.offsetWidth; flash.classList.add('show');
  if (navigator.vibrate) navigator.vibrate(120);
  game.timeLeft = Math.max(0, game.timeLeft - 2); // 扣 2 秒
  updateTimerUI();
}

/* 事件绑定（触摸 + 鼠标） */
function bindInput() {
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length >= 2) {
      pointer.down = false;            // 取消单指拖动
      pinch.active = true;
      pinch.startDist = pinchDist(e.touches[0], e.touches[1]);
      pinch.zoomStart = cam.targetZoom;
      pinch.cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      pinch.cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else {
      const t = e.changedTouches[0]; onDown(t.clientX, t.clientY);
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (pinch.active && e.touches.length >= 2) {
      const d = pinchDist(e.touches[0], e.touches[1]);
      const ratio = d / (pinch.startDist || d);
      zoomToward(pinch.cx, pinch.cy, pinch.zoomStart * ratio);
    } else if (!pinch.active) {
      const t = e.changedTouches[0]; onMove(t.clientX, t.clientY);
    }
  }, { passive: true });
  canvas.addEventListener('touchend', e => {
    if (pinch.active) {
      if (e.touches.length < 2) pinch.active = false;
      return;
    }
    const t = e.changedTouches[0]; onUp(t.clientX, t.clientY);
  }, { passive: true });

  canvas.addEventListener('mousedown', e => onDown(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', e => onUp(e.clientX, e.clientY));

  // 滚轮 => 走近/后退，锚定鼠标位置
  canvas.addEventListener('wheel', e => {
    if (game.state !== 'playing') return;
    e.preventDefault();
    zoomToward(e.clientX, e.clientY, cam.targetZoom - e.deltaY * 0.0016);
  }, { passive: false });

  window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
}
