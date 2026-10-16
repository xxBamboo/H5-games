// camera.js  摄像机 / 坐标转换 / 画布自适应
// 《我的眼镜在哪里？》— 以普通 <script> 顺序加载，共享全局作用域

/* ---------- 画布自适应 ---------- */
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = window.innerWidth, ch = window.innerHeight;
  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // zoom=1 时让房间高度铺满屏幕高
  view.baseScale = ch / WORLD.h;
  view.w = cw; view.h = ch;
  clampCam();
}
window.addEventListener('resize', resize);

// 当前有效缩放：屏幕像素 / 世界像素
function effScale(zoom) { return view.baseScale * zoom; }

// 在给定 zoom 下，注视中心点的可取范围（保证画面不露出世界外）
function camBounds(zoom) {
  const s = effScale(zoom);
  const halfW = (view.w / s) / 2;
  const halfH = (view.h / s) / 2;
  return {
    minX: Math.min(WORLD.w / 2, halfW), maxX: Math.max(WORLD.w / 2, WORLD.w - halfW),
    minY: Math.min(WORLD.h / 2, halfH), maxY: Math.max(WORLD.h / 2, WORLD.h - halfH),
  };
}

function clampCam() {
  for (const k of ['target', '']) {
    const zoom = k ? cam.targetZoom : cam.zoom;
    const b = camBounds(zoom);
    const xk = k ? 'targetX' : 'x', yk = k ? 'targetY' : 'y';
    cam[xk] = Math.max(b.minX, Math.min(b.maxX, cam[xk]));
    cam[yk] = Math.max(b.minY, Math.min(b.maxY, cam[yk]));
  }
}

/* ---------- 坐标转换：屏幕 -> 世界（考虑缩放与注视中心） ---------- */
function screenToWorld(sx, sy) {
  const s = effScale(cam.zoom);
  return {
    x: cam.x + (sx - view.w / 2) / s,
    y: cam.y + (sy - view.h / 2) / s,
  };
}
