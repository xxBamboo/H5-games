# 我的眼镜在哪里？

一个 2D 卡通风格的限时寻物小游戏。玩家扮演一名近视人物，在凌乱的房间里凭模糊视觉找到并戴上眼镜即可过关。浏览器版纯静态、无运行时依赖、无需联网；另提供抖音小游戏工程。

## 运行

直接用浏览器打开 `index.html` 即可（或用任意静态服务器托管后访问）。无需构建步骤。

```bash
# 可选：本地静态服务器
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000
```

## 操作

| 动作 | 手机 | PC |
| --- | --- | --- |
| 左右环顾 | 左右滑动 | A/D 或 ←/→ |
| 抬头 / 低头 | 上下滑动 | W/S 或 ↑/↓ |
| 走近放大（看清细节） | 双指捏合 | 鼠标滚轮 |
| 确认目标 | 点击 | 鼠标点击 |

近视设定：画面默认模糊，走近（放大）会变清晰一些但仍有残留模糊；只有找到并戴上眼镜才会瞬间全清晰。点错目标会红叉 + 震动 + 扣时。

## 目录结构

```
H5-games/
├── index.html            入口页面（HUD、面板、菜单的 DOM 与样式）
├── package.json          抖音小游戏 CLI 命令与依赖
├── douyin/               抖音小游戏工程（game.js 由构建命令生成）
├── scripts/              小游戏运行逻辑、构建和 CLI 包装命令
├── README.md
├── src/                  游戏源码（普通 <script> 顺序加载，共享全局作用域）
│   ├── config.js         常量、关卡配置 LEVELS、全局状态 game/cam/glasses
│   ├── camera.js         摄像机、缩放、屏幕↔世界坐标转换、画布自适应
│   ├── scene.js          房间与各物件的程序化卡通绘制（无外部图片）
│   ├── render.js         渲染、近视模糊滤镜、戴镜动画叠层
│   ├── input.js          触摸/鼠标/键盘/捏合/滚轮输入，点击命中判定
│   ├── ui.js             首页/关卡选择/结束面板、游戏内菜单、关卡流转
│   └── main.js           主循环 loop() 与初始化 init()（最后加载）
├── tests/
│   ├── test.js           Puppeteer 回归测试（浏览器版）
│   └── douyin-smoke.js   抖音小游戏状态流转冒烟测试
└── docs/
    └── screenshots/      测试与玩法截图证据
```

### 加载顺序

`index.html` 末尾按 `config → camera → scene → render → input → ui → main` 顺序引入。各文件是普通脚本、共享全局作用域；跨文件的函数调用在运行时解析，只有 `main.js` 在末尾调用 `init()` 启动，因此顺序只需保证 `main.js` 最后加载。

## 关卡

关卡由 `src/config.js` 的 `LEVELS` 数组驱动，每项含 `id / name / time / glasses 位置 / playable`。目前第 1 关「卧室」可玩，第 2–6 关为占位锁定态；新增关卡只需补充配置并提供对应场景。

## 测试

```bash
npm install puppeteer-core@21   # 需本机有 Chromium（/usr/bin/chromium）
node tests/test.js              # 输出各断言结果，末尾打印 RESULT: PASS/FAIL
```

测试覆盖：首页→关卡选择→开始、游戏内菜单暂停与返回主页、点错扣时与红叉、走近变清、放大后上下环顾、点中眼镜过关与戴镜动画、超时失败。

## 抖音小游戏工程与 CLI

`douyin/` 是独立的抖音小游戏工程，保留原本的浏览器版 `index.html`。运行 `douyin:build` 会将 `src/scene.js` 的房间绘制与 `scripts/douyin-runtime.js` 的小游戏运行逻辑合成 `douyin/game.js`。小游戏版使用 `tt.createCanvas` 和 `tt.onTouch*`，不依赖浏览器 DOM。

`douyin/project.config.json` 当前使用开发者工具的测试号 `testappId`，可用于本地调试和扫码预览。上传版本前，先把它替换为小游戏控制台分配的正式 AppID。安装抖音开发者工具后，在项目根目录执行：

```bash
npm install
npm run douyin:build
npm run douyin:smoke
npm run douyin:login
npm run douyin:open
npm run douyin:preview
```

`douyin:open` 会构建并在开发者工具中打开工程；`douyin:preview` 会生成扫码预览。需要上传测试版本时，显式提供更新说明：

```bash
npm run douyin:upload -- --app-version 0.1.0 --app-changelog "接入抖音小游戏"
```

三个命令都调用本项目安装的 `tt-minigame-ide-cli`（`tmg`）。`douyin:build`、`douyin:check` 和 `douyin:smoke` 无需 AppID 或平台登录。扫码预览、上传和真机兼容性仍需在抖音开发者工具中验证。
