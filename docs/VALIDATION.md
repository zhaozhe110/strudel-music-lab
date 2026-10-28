# 本次整理的验证记录

日期：2026-10-28。环境：macOS、Node.js 26.8.1、`node-web-audio-api` 2.2.0、固定 Strudel 提交 `fdaa55937776dbd644da3d64e864527df4a105a6`。

这次整理没有改动乐谱、已导出试听或播放采样的内容。新增维护工具使用真实 Strudel REPL 与 Superdough；归档研究脚本不作为本轮通过对象。

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| 导入完整性 | 563 个收录源文件均存在，原 SHA-256 未变化；打包后散列也全部匹配。62 份历史文本只替换个人绝对路径 | [导入清单](../evidence/packaging/import-manifest.json) |
| 默认乐谱校验 | little-logic 5 份、reference 3 份，共 8/8；校验求值、事件有效性及全部已声明本地样本 | [validation.json](../evidence/packaging/validation.json) |
| Pocket 全时间线 | 显式查询 296.8294 秒，2621 事件、41 个样本文件通过 | [全曲事件报告](../evidence/packaging/validation-pocket-full.json) |
| v4 实际渲染 | 4 小节、93 事件，其中 36 个样本触发；实际使用 8 个不同样本。含尾音共 9.059 秒，WAV 与 AAC 成功 | [v4 渲染报告](../evidence/packaging/smoke-v4.render.json) |
| Pocket 实际渲染 | 8 秒音乐、76 事件，13 个不同样本；含尾音共 10 秒，WAV 与 AAC 成功 | [Pocket 渲染报告](../evidence/packaging/smoke-pocket.render.json) |
| 纯合成器导出 | v1、v2、v3 分别导出 2 小节，真实引擎生成有效 WAV | [工具验证汇总](../evidence/packaging/script-verification-summary.json) |
| v4 循环 | 完整 64 cycles 与下一轮的事件重复检查通过 | [循环报告](../evidence/packaging/validation-v4-loop.json) |
| 静态服务 | 仅 loopback 监听；首页和本仓库采样返回 200，缺失文件返回 404，测试后停止临时服务 | [服务报告](../evidence/packaging/start-validation.json) |
| 全新安装 | 从 Codeberg 只获取固定提交，锁定依赖安装、完整网站构建、采样镜像均成功；全新运行时再次通过 8/8 校验、v4 1 小节实际渲染和 HTTP 检查 | [全新安装报告](../evidence/packaging/managed-install.json) |

两段渲染均非静音，所有浮点样本有限；峰值归一化到 0.84，约 −1.51 dBFS。报告中的原始峰值未超过 1。渲染报告引用的 WAV/M4A 和事件文件位于忽略的 `outputs/`，没有作为新试听成品重复归档。

工具汇总中的 `outputs/` 报告路径是当次执行位置；需要跨机器追溯时，查本仓库 `evidence/packaging/` 中同名归档。新目录中单独运行 `npm ci` 已成功，外部固定运行时的只读复用也已通过。全新安装和复用既有运行时两条路径均已实际验证。

默认校验对没有 `arrange` 总长度的乐谱使用 64 cycles。因此默认 Pocket 查询只是约 113 秒，不是整曲；全曲另有上表的显式时间范围检查。结构校验中的 `offlineRender.supported` 只是已知兼容性检查，不能替代实际声音渲染。

复现核心检查：

```sh
npm run validate
npm run validate -- "pieces/reference/Pocket Calculator-复刻版.strudel" --seconds 296.8294 --out outputs/pocket-full-validation.json
npm run render -- pieces/little-logic/袖珍电路-v4.strudel --begin 16 --cycles 4 --aac --out outputs/v4-check
npm run render -- "pieces/reference/Pocket Calculator-复刻版.strudel" --seconds 8 --aac --out outputs/pocket-check
```

本轮没有重新完整渲染全部历史作品，也没有把 HTTP 服务检查写成浏览器实时播放通过。特殊吉他奏法、未支持的 AudioWorklet／空间效果与 Ego Lite 音频初始化边界见 [HANDOFF](../HANDOFF.md)。没有用技术检查替代用户对 v4 完整听感的验收。
