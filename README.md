# cool-page

记录一次网页 CPU 占用异常排查的完整过程，并附带一个实用的油猴脚本。

## 内容

| 文件 | 说明 |
|------|------|
| [排查友盟官网卡顿记.md](./排查友盟官网卡顿记.md) | 友盟官网首页卡顿的完整排查记录：curl 服务端测量 → DevTools Performance 130MB Trace 解析 → 定位到全屏 blur 滤镜动画逐帧重栅格化 |
| [cool-page.user.js](./cool-page.user.js) | Cool Page 油猴脚本，按需冻结页面的烧机特效 |

## 核心结论

友盟首页在 24.3 秒的采样中掉帧 68%（2871/4212），Paint 事件 8741 次。元凶是 `bg-aurora` 全屏背景加六个 `filter: blur(6px~12px)` 光斑的持续动画：带 filter 的大面积元素每帧都要重新栅格化，多层叠加后 CPU 和 GPU 同时满载。主线程 JS 和 Layout 反而都不重。

## Cool Page 脚本用法

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展；
2. 管理面板 → 实用工具 → 导入 `cool-page.user.js`（或新建脚本后粘贴全文）；
3. 在卡顿页面上按 `Alt+F` 进入冷静模式，效果包括：
   - 清除所有元素的 `filter` / `backdrop-filter`；
   - 停用全部 CSS 动画和过渡；
   - 暂停所有 `<video>`；
   - 将 `requestAnimationFrame` 限流到 2fps，canvas / lottie 动画循环随即静止。

状态按站点记忆，下次打开自动生效。再按 `Alt+F` 恢复。油猴菜单里另有"彻底冻结"模式（rAF 直接置空），刷新页面后恢复为限流模式。

## 适用场景

营销页的重特效（blur 光斑、粒子背景、lottie 动画）导致风扇狂转、笔记本发热的场合。对纯静态页面没有副作用。

## 协议

[MIT](./LICENSE)
