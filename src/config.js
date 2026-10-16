// config.js  常量 / 关卡配置 / 全局状态
// 《我的眼镜在哪里？》— 以普通 <script> 顺序加载，共享全局作用域

/* ============================================================
   《我的眼镜在哪里？》 第 1 关 Demo
   - 第一人称：横向平移摄像机环顾一个比视口更宽的房间
   - 近视模糊：未找到眼镜前画面模糊，找到后戴镜动画 + 立即变清晰
   - 操作：手机滑动平移 + 点击确认；PC WASD/方向键 + 鼠标点击
   - 限时找到眼镜即过关，点错给红叉 + 震动 + 轻微扣时
   ============================================================ */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 世界尺寸（比视口宽，用于平移环顾）
const WORLD = { w: 2400, h: 1080 };

// 摄像机：以"注视中心点 + 缩放"表达
//  - x: 水平注视点（世界坐标）   横向平移环顾
//  - y: 垂直注视点（世界坐标）   近看时上下微调
//  - zoom: 1 = 远观全景；>1 = 走近放大观察细节
const ZOOM_MIN = 1, ZOOM_MAX = 2.8;
const cam = {
  x: 0, targetX: 0,
  y: WORLD.h / 2, targetY: WORLD.h / 2,
  zoom: 1, targetZoom: 1,
};
let view = { w: 0, h: 0, baseScale: 1 };   // baseScale: zoom=1 时屏幕/世界比例

// 近视模糊：基础模糊随走近(zoom)而减弱，但戴上眼镜前永远无法完全清晰
const BLUR_BASE = 14;      // 远观时的模糊
const BLUR_NEAR = 4.5;     // 走到最近时仍残留的模糊

// 游戏状态
const game = {
  state: 'menu',          // menu | playing | won | lost
  timeLeft: 45,
  lastTs: 0,
  blur: BLUR_BASE,        // 当前模糊半径(px)
  targetBlur: BLUR_BASE,
  found: false,
  wearProgress: 0,        // 戴镜动画 0..1
  paused: false,          // 菜单打开时暂停
};

// 眼镜目标（世界坐标，玩家要点中它）—— 由当前关卡配置填充
const glasses = { x: 1512, y: 742, w: 120, h: 46 };

/* ============================================================
   关卡配置
   第 1 关可玩（本 Demo）；其余为占位，后续关卡接入后解锁
   ============================================================ */
const LEVELS = [
  { id: 1, name: '卧室', time: 45, glasses: { x: 1512, y: 742, w: 120, h: 46 }, playable: true },
  { id: 2, name: '书房', time: 40, glasses: { x: 900,  y: 760, w: 120, h: 46 }, playable: false },
  { id: 3, name: '客厅', time: 38, glasses: { x: 1700, y: 820, w: 120, h: 46 }, playable: false },
  { id: 4, name: '厨房', time: 35, glasses: { x: 600,  y: 700, w: 120, h: 46 }, playable: false },
  { id: 5, name: '阳台', time: 32, glasses: { x: 1300, y: 780, w: 120, h: 46 }, playable: false },
  { id: 6, name: '储物间', time: 30, glasses: { x: 2000, y: 760, w: 120, h: 46 }, playable: false },
];
let currentLevel = 1;

// 键盘
const keys = {};
