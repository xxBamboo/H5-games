// render.js  渲染 / 近视模糊 / 戴镜动画
// 《我的眼镜在哪里？》— 以普通 <script> 顺序加载，共享全局作用域

/* ============================================================
   渲染：主体画面 + 模糊滤镜 + 戴镜动画
   ============================================================ */
function render() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // 画布级模糊（CSS filter 对整块 canvas 生效，性能好且平滑过渡）
  canvas.style.filter = game.blur > 0.3 ? `blur(${game.blur.toFixed(1)}px)` : 'none';

  ctx.clearRect(0, 0, view.w, view.h);
  ctx.save();
  // 应用摄像机：把注视中心点(cam.x,cam.y)放到屏幕中央，并按 zoom 放大
  const s = effScale(cam.zoom);
  ctx.translate(view.w / 2, view.h / 2);
  ctx.scale(s, s);
  ctx.translate(-cam.x, -cam.y);
  drawRoom();
  ctx.restore();

  // 戴镜动画：从上方落下的镜框叠层（不受画布模糊影响，画在顶层）
  if (game.wearProgress > 0 && game.wearProgress < 1) {
    drawWearOverlay(game.wearProgress);
  }
}

// 戴眼镜第一人称叠层：两个大镜片从上滑入
function drawWearOverlay(p) {
  const w = window.innerWidth, h = window.innerHeight;
  const ov = document.getElementById('wearCanvas');
  // 用主 canvas 顶层直接画会被 filter 影响，这里用独立覆盖层
  // （见 ensureWearLayer）
  const octx = wearCtx;
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, wearCanvas.width, wearCanvas.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  octx.scale(dpr, dpr);
  const ease = 1 - Math.pow(1 - p, 3);
  const dropY = -h * 0.5 + ease * (h * 0.5);  // 从屏幕上方滑到眼睛位置
  octx.save();
  octx.translate(w / 2, h * 0.5 + dropY);
  const R = Math.min(w, h) * 0.19;
  const gap = R * 1.25;
  octx.lineWidth = 14; octx.strokeStyle = 'rgba(30,35,40,.95)';
  octx.fillStyle = 'rgba(150,210,255,.12)';
  for (const sx of [-gap, gap]) {
    octx.beginPath(); octx.ellipse(sx, 0, R, R * 0.85, 0, 0, 7);
    octx.fill(); octx.stroke();
  }
  octx.beginPath(); octx.moveTo(-gap + R, -6);
  octx.quadraticCurveTo(0, -R * 0.5, gap - R, -6); octx.stroke();
  octx.restore();
}

// 独立覆盖层 canvas（不受主画布 blur 影响）
let wearCanvas, wearCtx;
function ensureWearLayer() {
  if (wearCanvas) return;
  wearCanvas = document.createElement('canvas');
  wearCanvas.id = 'wearCanvas';
  wearCanvas.style.cssText = 'position:fixed;inset:0;z-index:16;pointer-events:none;width:100%;height:100%;';
  document.getElementById('game').appendChild(wearCanvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  wearCanvas.width = window.innerWidth * dpr;
  wearCanvas.height = window.innerHeight * dpr;
  wearCtx = wearCanvas.getContext('2d');
}
