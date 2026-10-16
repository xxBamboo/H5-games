// Preview src/scene.js without starting the game loop.
(function () {
  const previewCanvas = document.getElementById('canvas');
  const viewport = document.getElementById('viewport');
  const gridToggle = document.getElementById('gridToggle');
  const fitButton = document.getElementById('fitButton');
  const resetButton = document.getElementById('resetButton');
  const exportButton = document.getElementById('exportButton');
  const zoomReadout = document.getElementById('zoomReadout');

  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let activePointerId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginX = 0;
  let dragOriginY = 0;

  function devicePixelRatioSafe() {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  function getViewportSize() {
    return {
      width: Math.max(1, viewport.clientWidth - 40),
      height: Math.max(1, viewport.clientHeight - 40),
    };
  }

  function fitScale() {
    const size = getViewportSize();
    return Math.min(size.width / WORLD.w, size.height / WORLD.h);
  }

  function resizeCanvas() {
    const dpr = devicePixelRatioSafe();
    const size = getViewportSize();
    const pixelWidth = Math.max(1, Math.round(size.width * dpr));
    const pixelHeight = Math.max(1, Math.round(size.height * dpr));

    // Resizing the canvas resets its context. Only do this on layout changes,
    // never during pointer movement, otherwise some browsers lose the drag.
    if (previewCanvas.width !== pixelWidth || previewCanvas.height !== pixelHeight) {
      previewCanvas.width = pixelWidth;
      previewCanvas.height = pixelHeight;
    }

    render();
  }

  function render() {
    const dpr = devicePixelRatioSafe();
    const size = getViewportSize();
    const scale = fitScale() * zoom;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.setTransform(
      dpr * scale,
      0,
      0,
      dpr * scale,
      dpr * (size.width / 2 + panX),
      dpr * (size.height / 2 + panY),
    );
    ctx.translate(-WORLD.w / 2, -WORLD.h / 2);

    drawRoom();
    if (gridToggle.checked) drawGrid();
    zoomReadout.textContent = `${Math.round(zoom * 100)}%`;
  }

  function drawGrid() {
    const lineStep = 100;
    const screenScale = Math.max(fitScale() * zoom, 0.001);
    ctx.save();
    ctx.lineWidth = 1 / screenScale;
    ctx.strokeStyle = 'rgba(30, 45, 60, .28)';
    ctx.fillStyle = 'rgba(30, 45, 60, .7)';
    ctx.font = `${14 / screenScale}px ui-monospace, monospace`;

    for (let x = 0; x <= WORLD.w; x += lineStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD.h);
      ctx.stroke();
      if (x < WORLD.w) ctx.fillText(String(x), x + 5, 18);
    }

    for (let y = 0; y <= WORLD.h; y += lineStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD.w, y);
      ctx.stroke();
      if (y < WORLD.h) ctx.fillText(String(y), 5, y - 5);
    }

    ctx.restore();
  }

  function resetView() {
    zoom = 1;
    panX = 0;
    panY = 0;
    render();
  }

  function zoomAt(delta, clientX, clientY) {
    const oldZoom = zoom;
    zoom = Math.max(0.35, Math.min(4, zoom * Math.exp(-delta * 0.001)));

    if (clientX == null || clientY == null || oldZoom === zoom) {
      render();
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const size = getViewportSize();
    const x = clientX - rect.left - (viewport.clientWidth - size.width) / 2 - size.width / 2;
    const y = clientY - rect.top - (viewport.clientHeight - size.height) / 2 - size.height / 2;
    const ratio = zoom / oldZoom - 1;
    panX -= x * ratio;
    panY -= y * ratio;
    render();
  }

  function exportPng() {
    previewCanvas.toBlob(function (blob) {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'room-preview.png';
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function beginDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (activePointerId !== null) return;

    isDragging = true;
    activePointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = panX;
    dragOriginY = panY;
    viewport.classList.add('dragging');

    // Listen on window instead of relying on pointer capture from the viewport.
    // This keeps dragging alive when the pointer moves over the canvas edge.
    window.addEventListener('pointermove', handleDragMove, { passive: false });
    window.addEventListener('pointerup', endDrag, { passive: false });
    window.addEventListener('pointercancel', endDrag, { passive: false });
  }

  function handleDragMove(event) {
    if (!isDragging || event.pointerId !== activePointerId) return;
    event.preventDefault();
    panX = dragOriginX + event.clientX - dragStartX;
    panY = dragOriginY + event.clientY - dragStartY;
    render();
  }

  function endDrag(event) {
    if (event.type !== 'blur' && activePointerId !== null && event.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;
    viewport.classList.remove('dragging');
    window.removeEventListener('pointermove', handleDragMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
  }

  viewport.addEventListener('pointerdown', beginDrag);
  viewport.addEventListener('wheel', function (event) {
    event.preventDefault();
    zoomAt(event.deltaY, event.clientX, event.clientY);
  }, { passive: false });
  viewport.addEventListener('dblclick', resetView);
  gridToggle.addEventListener('change', render);
  fitButton.addEventListener('click', resetView);
  resetButton.addEventListener('click', resetView);
  exportButton.addEventListener('click', exportPng);
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('blur', endDrag);

  window.addEventListener('keydown', function (event) {
    if (event.key === '0') resetView();
    if (event.key === '+' || event.key === '=') zoomAt(-120);
    if (event.key === '-') zoomAt(120);
  });

  resizeCanvas();
})();
