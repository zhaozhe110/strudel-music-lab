# 协作约定

## 开始工作

先读 `README.md`、`HANDOFF.md` 和对应作品的源码注释。当前支持的工具在 `scripts/`；`research/` 是历史研究档案，个人路径已做占位处理，不能直接当成新环境可运行的命令。

## 音乐与版本

- 保留已有版本。新的创作改动另存版本，并同时提供代码与试听。
- 《袖珍电路》v3 是用户明确认可的底座：B♭ Mixolydian，B♭八度低音，A♭切分与短促机械句子。v2 被指出太流行，不应自行回到完整功能和声、抒情长句和强主音终止。
- v4 保留 v3 主线，加入短鼓击和计算器采样。它是当前增强版，继续打磨前先听取用户对 v4 的反馈。
- `袖珍电路-v4-online.strudel` 是 v4 的线上分发副本，只将 `sampleBase` 改为固定提交的 GitHub Raw 地址；不是新的音乐版本。保留本地原版，后续如同步音乐改动，应核对两份的音乐事件一致性。
- 可视化放在代码顶部。将 `_pianoroll` 和 `_scope` 写在顶部函数内，最后调用函数播放完整编排。用户已明确放弃背景可视化。
- 天台晚风的有效旋律基准、恢复版与演奏试验见 `HANDOFF.md`；不能仅凭文件名中的 v3 判断它是新的旋律基准。
- 保留采样来源和许可文件。六种 `pcKit` 是复合鼓击切片，不能描述成六件完全分离的鼓乐器。

## 实现与验证

- 优先使用仓库内相对路径和 `scripts/` 的统一入口，不加入个人绝对路径。
- Strudel 上游由 `runtime/strudel.lock.json` 固定。默认不修改上游源码，也不提交 `.runtime/`、`node_modules/` 或编译产物。
- 修改乐谱后运行适用的事件验证；涉及声音的改动用真实 Superdough 渲染并检查时长、有限数值和峰值。
- 仅调整文档、位置或颜色时，核对事件语义和可视化位置即可，无需重新渲染整曲。
- 不把静态编译、事件检查或离线渲染称为浏览器实时试听通过。Ego Lite 的 AudioWorklet 初始化问题是已知限制。
- 新 Python 项目优先 conda；已有 venv、poetry 或 pipenv 配置则沿用现有方案。当前维护入口是 Node 项目。
- 交互式网页操作默认使用 `ego-browser` Skill；只有用户明确指定其他浏览器工具时才切换。纯信息检索可以用 Web Search。

## 远端操作

远端为 `zhaozhe110/strudel-music-lab`，当前可见性为 **public**。按用户已批准的任务范围完成上传与分享，不重复索要同一项权限；不擅自创建 Release 或添加协作者。仓库公开不会改变素材许可，保留 `docs/SAMPLES.md` 和许可原文。

2026-10-28 的授权顺序：用户先批准按 `UPLOAD_PLAN.md` 私有上传，之后明确表示“我可以接受git仓库公开 托管http太麻烦了”。后一次指示覆盖保持私人仓库的旧约束；仓库已改为公开，GitHub 返回 `isPrivate=false`。首次私有上传记录是历史证据，不改写为公开时的验证结果。

`package.json` 中的 `private: true` 用于防止意外发布到 npm，与 GitHub 可见性无关，保留该设置。

后续的长链接改进任务使用 GitHub Pages 提供 v4 的固定自动跳转入口。仅将 `share-site/` 发布到 `gh-pages` 分支，不自行托管 Strudel 引擎，也不扩大发布音频范围。用 `npm run build:share` 从完整官网版乐谱生成跳转目标，再以 `git subtree push --prefix share-site origin gh-pages` 发布。不要把该入口的访问混同于仓库 Traffic 或音乐播放次数。
