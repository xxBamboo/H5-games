# 我的眼镜在哪里？

一个 2D 卡通风格的 H5 限时寻物小游戏。玩家扮演一名近视人物，在凌乱的房间里凭模糊视觉找到并戴上眼镜即可过关。纯静态、无依赖、无需联网。

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
glasses-quest/
├── index.html            入口页面（HUD、面板、菜单的 DOM 与样式）
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
│   └── test.js           Puppeteer 回归测试（导航、玩法、胜负全流程）
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
