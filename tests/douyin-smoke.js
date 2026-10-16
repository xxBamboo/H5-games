const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createContext() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(target, name) {
      if (name in target) return target[name];
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => gradient;
      if (name === 'measureText') return text => ({ width: String(text).length * 12 });
      return () => {};
    }
  });
}

const listeners = {};
let nextFrame;
let canvasCount = 0;
const tt = {
  createCanvas() {
    canvasCount++;
    const context = createContext();
    return { width: 0, height: 0, getContext: () => context };
  },
  getSystemInfoSync() {
    return {
      windowWidth: 412, windowHeight: 915, pixelRatio: 2,
      safeArea: { top: 20, bottom: 895 }
    };
  },
  onTouchStart(callback) { listeners.start = callback; },
  onTouchMove(callback) { listeners.move = callback; },
  onTouchEnd(callback) { listeners.end = callback; },
  onTouchCancel(callback) { listeners.cancel = callback; },
  onWindowResize(callback) { listeners.resize = callback; },
  onAppHide(callback) { listeners.hide = callback; },
  vibrateShort() {},
  vibrateLong() {}
};
const sandbox = vm.createContext({
  tt,
  requestAnimationFrame(callback) { nextFrame = callback; },
  console
});
const script = fs.readFileSync(path.join(__dirname, '../douyin/game.js'), 'utf8');
vm.runInContext(script, sandbox, { filename: 'douyin/game.js' });
const get = expression => vm.runInContext(expression, sandbox);
let timestamp = 0;
function frame(ms = 16) {
  timestamp += ms;
  const callback = nextFrame;
  assert.equal(typeof callback, 'function', 'a new frame must be requested');
  callback(timestamp);
}
function touch(x, y) {
  const point = { clientX: x, clientY: y };
  listeners.start({ touches: [point], changedTouches: [point] });
  listeners.end({ touches: [], changedTouches: [point] });
}

assert.equal(canvasCount, 3, 'one screen canvas and two off-screen canvases');
frame();
assert.equal(get('game.state'), 'home');
touch(110, 500);
assert.equal(get('game.state'), 'playing');
frame();
touch(20, 300);
assert.ok(get('game.timeLeft') < 44, 'wrong tap should deduct time');

const a = { clientX: 100, clientY: 320 };
const b = { clientX: 200, clientY: 320 };
listeners.start({ touches: [a, b], changedTouches: [a, b] });
listeners.move({
  touches: [{ clientX: 80, clientY: 320 }, { clientX: 220, clientY: 320 }],
  changedTouches: [{ clientX: 80, clientY: 320 }, { clientX: 220, clientY: 320 }]
});
listeners.end({ touches: [], changedTouches: [a, b] });
assert.ok(get('cam.targetZoom') > 1.3, 'pinching should zoom in');

vm.runInContext('cam.x = cam.targetX = glasses.x; cam.y = cam.targetY = glasses.y; cam.zoom = cam.targetZoom = 1.6;', sandbox);
frame();
touch(206, 457);
assert.equal(get('game.state'), 'wearing');
for (let i = 0; i < 25; i++) frame(50);
assert.equal(get('game.state'), 'won');
frame();

touch(105, 500);
assert.equal(get('game.state'), 'playing', 'retry should restart the level');
vm.runInContext('game.timeLeft = .01;', sandbox);
frame(50);
assert.equal(get('game.state'), 'lost');
console.log('Douyin mini-game smoke test passed.');
