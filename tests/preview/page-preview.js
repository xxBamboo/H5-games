(function () {
  const roomViewport = document.getElementById('viewport');
  const screenViewport = document.getElementById('screenViewport');
  const roomControls = document.getElementById('roomControls');
  const mockScreen = document.getElementById('mockScreen');
  const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));

  const pages = {
    home: `
      <section class="mock-panel">
        <div class="mock-emoji">👓</div>
        <h1>我的眼镜在哪里？</h1>
        <p>你是个近视眼，眼镜又双叒不见了。\n在凌乱的房间里，限时找到并戴上它！</p>
        <div class="mock-btn-row">
          <div class="mock-btn">开始游戏</div>
          <div class="mock-btn ghost">选择关卡</div>
        </div>
        <div class="mock-tip">PC：A/D 或方向键环顾，滚轮走近\n手机：滑动环顾，双指捏合走近</div>
      </section>`,
    levels: `
      <section class="mock-panel">
        <h1 style="font-size:26px">选择关卡</h1>
        <div class="mock-level-grid">
          <div class="mock-level-card"><span class="num">1</span><span class="name">卧室</span><span class="star">★</span></div>
          <div class="mock-level-card locked"><span class="num">🔒</span><span class="name">书房</span><span class="star">即将推出</span></div>
          <div class="mock-level-card locked"><span class="num">🔒</span><span class="name">客厅</span><span class="star">即将推出</span></div>
          <div class="mock-level-card locked"><span class="num">🔒</span><span class="name">厨房</span><span class="star">即将推出</span></div>
          <div class="mock-level-card locked"><span class="num">🔒</span><span class="name">阳台</span><span class="star">即将推出</span></div>
          <div class="mock-level-card locked"><span class="num">🔒</span><span class="name">储物间</span><span class="star">即将推出</span></div>
        </div>
        <div class="mock-btn ghost">返回主页</div>
      </section>`,
    win: `
      <section class="mock-panel">
        <div class="mock-emoji">🎉</div>
        <h1>看清啦！过关！</h1>
        <p>你戴上眼镜，世界瞬间清晰。剩余时间 28 秒。\n准备好进入下一个房间了吗？</p>
        <div class="mock-btn-row">
          <div class="mock-btn">下一关</div>
          <div class="mock-btn">再玩一次</div>
          <div class="mock-btn ghost">选择关卡</div>
          <div class="mock-btn ghost">返回主页</div>
        </div>
      </section>`,
    lose: `
      <section class="mock-panel">
        <div class="mock-emoji">😵‍💫</div>
        <h1>时间到！</h1>
        <p>还是一片模糊……没找到眼镜。\n再试一次，这次留意桌面附近。</p>
        <div class="mock-btn-row">
          <div class="mock-btn">再玩一次</div>
          <div class="mock-btn ghost">选择关卡</div>
          <div class="mock-btn ghost">返回主页</div>
        </div>
      </section>`,
    menu: `
      <section class="mock-game">
        <div class="mock-hud">
          <span class="mock-pill">⏱ 32</span>
          <span class="mock-pill">🔍 ×1.4</span>
        </div>
        <div class="mock-menu-button">☰</div>
        <div class="mock-menu">
          <div>▶️ 继续游戏</div>
          <div>🔄 重玩本关</div>
          <div>🗂️ 选择关卡</div>
          <div>🏠 返回主页</div>
        </div>
      </section>`,
  };

  function setMode(mode) {
    const isRoom = mode === 'room';
    roomViewport.classList.toggle('hidden', !isRoom);
    screenViewport.classList.toggle('hidden', isRoom);
    roomControls.classList.toggle('hidden', !isRoom);
    modeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === mode);
    });

    if (isRoom) {
      // The room canvas was hidden while the page mock was active. Recalculate it.
      window.dispatchEvent(new Event('resize'));
    } else {
      mockScreen.innerHTML = pages[mode] || pages.home;
    }
  }

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  setMode('room');
})();