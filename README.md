# Strudel Music Lab

**[▶ 在 Strudel 打开袖珍电路 v4](https://zhaozhe110.github.io/strudel-music-lab/)** · [作品介绍](docs/PLAY_V4.md)

打开后点击 **play**。采样由 GitHub 提供，无需本地服务器。

一个用于学习、创作和比较电子音乐与乐队编曲的 Strudel 工作室。仓库包含可编辑乐谱、压缩试听、运行所需的本地采样、验证记录，以及后续继续工作的交接说明。

当前重点是 **《袖珍电路》**：v3 是已认可的机械电子底座，v4 在同一旋律、低音和调式结构上增加鼓击质感与计算器蜂鸣。天台晚风、错拍之后和参考复刻也一并保留，具体状态见[作品目录](docs/CATALOG.md)。

这是个人音乐研究与创作项目，远端 [zhaozhe110/strudel-music-lab](https://github.com/zhaozhe110/strudel-music-lab) 当前为 **公开仓库**。仓库公开不改变素材许可：其中包含不同来源、不同许可条件的音频素材，使用范围见[采样来源](docs/SAMPLES.md)。上传及可见性变更记录见 [UPLOAD_PLAN.md](UPLOAD_PLAN.md)。

## 从哪里开始

| 目的 | 入口 |
| --- | --- |
| 继续打磨当前作品 | [袖珍电路 v4 乐谱](pieces/little-logic/袖珍电路-v4.strudel) · [完整试听](audio/little-logic/袖珍电路-v4-试听.m4a) · [30 秒主段](audio/little-logic/袖珍电路-v4-主段试听.m4a) |
| 从官网加载 v4，或分享给别人 | [v4 作品页](docs/PLAY_V4.md) · [v4 线上谱](pieces/little-logic/袖珍电路-v4-online.strudel) · [分享说明](docs/SHARING.md)；先打开作品页，再点击进入 Strudel，采样由 GitHub Raw 提供 |
| 听不依赖本地采样的认可底座 | [袖珍电路 v3 乐谱](pieces/little-logic/袖珍电路-v3.strudel) · [试听](audio/little-logic/袖珍电路-v3-试听.m4a) |
| 查看 Pocket Calculator 复刻参考 | [完整乐谱](pieces/reference/Pocket%20Calculator-复刻版.strudel) · [试听](audio/reference/Pocket%20Calculator-复刻版.m4a) |
| 查看天台晚风的旋律恢复版 | [保留原旋律完整曲](pieces/rooftop/天台晚风-保留原旋律完整曲.strudel) · [试听](audio/rooftop/天台晚风-保留原旋律完整曲.m4a) |
| 第一次接手项目 | [HANDOFF.md](HANDOFF.md) |
| 查找所有版本和依赖 | [作品目录](docs/CATALOG.md) |

## 目录结构

```text
pieces/          可编辑的 .strudel 乐谱，按作品系列分组
audio/           已导出的 M4A 试听；保留独立版本，去掉完全重复的音频副本
public/          本地播放器和离线渲染使用的采样、事件表和配置
launchers/       macOS 本地编辑器入口，URL 中已包含对应乐谱
scripts/         当前维护的安装、启动、校验和渲染工具
runtime/         Strudel 上游地址与固定提交记录
docs/            作品目录、采样来源、许可原文和历史说明
evidence/        历史验证结果、事件记录和整理清单
research/        历史编曲、识谱、分离和音色研究脚本，仅供追溯
.runtime/        安装生成的 Strudel 运行时，不进入 Git
outputs/         新渲染和新验证产物，不进入 Git
```

当前收录 20 份乐谱、18 份不同内容的 M4A 和 9 个资源目录。20 份乐谱中包含 1 份 v4 线上分发副本，它与本地 v4 是同一音乐版本，仅采样基址不同。

乐谱及其依赖放在相邻的明确目录中；Strudel 本身通过固定版本安装，不把上游 Git 仓库和依赖缓存再次塞进这个仓库。

## 安装与启动

当前本机验证环境为 macOS、Node.js 26.8.1。工具要求 Node.js 24 或更高版本；需要 npm、Git 和可以访问上游仓库及 npm 的网络。精确依赖以 `package-lock.json`、运行时记录为准。

在本仓库根目录运行：

```sh
npm ci
npm run setup
npm start
```

`setup` 将 Strudel 安装到 `.runtime/strudel`，固定在提交 `fdaa55937776dbd644da3d64e864527df4a105a6`，使用 pnpm 10.15.0 安装和构建。首次安装需要下载依赖；后续启动无需重建。

打开 <http://127.0.0.1:3009>，粘贴一份 `pieces/` 中的乐谱，点击 **play**。修改后点击 **update**。macOS 也可在服务启动后双击 `launchers/` 中对应的入口。

本地作品默认使用固定的 `127.0.0.1:3009` 地址。浏览器缓存和编辑状态按网站地址、浏览器分别保存；请以已保存的 `.strudel` 文件作为作品来源，不依赖浏览器历史。多数纯合成器作品也能在官网运行；依赖 `public/` 的本地谱应使用本地服务。v4 另有使用固定提交 GitHub Raw 采样地址的线上副本，打开方法和验证边界见[分享说明](docs/SHARING.md)。

如已拥有相同提交、依赖和构建完成的 Strudel checkout，可显式复用：

```sh
STRUDEL_RUNTIME=/path/to/existing/strudel npm run setup
STRUDEL_RUNTIME=/path/to/existing/strudel npm start
```

外部运行时只读核验；仓库采样由启动服务覆盖提供，避免为了复用运行时改动旧 checkout。

## 渲染试听

支持的默认离线工作流是《袖珍电路》系列和 Pocket Calculator 参考复刻。渲染使用固定 Strudel 的事件解析与真实 Superdough 声音引擎，输出 WAV；添加 `--aac` 后，macOS 存在 `afconvert` 时另生成 M4A。

```sh
# v4 全曲，64 个 cycle，每个 cycle 是四拍
npm run render -- pieces/little-logic/袖珍电路-v4.strudel --cycles 64 --aac --out outputs/little-logic-v4

# 从第 17 小节起，听 16 小节的按键和高蜂鸣段落
npm run render -- pieces/little-logic/袖珍电路-v4.strudel --begin 16 --cycles 16 --out outputs/little-logic-v4-main

# 复刻版前 30 秒
npm run render -- "pieces/reference/Pocket Calculator-复刻版.strudel" --seconds 30 --out outputs/pocket-reference-30s
```

离线工具将乐谱中的本机采样 URL 映射到本仓库 `public/`，不要求先启动 HTTP 服务。`--begin` 按从 0 开始的 cycle 计数，`--seconds` 按实际秒数指定片段长度；不要混淆小节与秒。片段从区间内的起音开始，不补算区间前的长音或回声；需要连续上下文时从更早位置渲染，或从头导出。

WAV 和 M4A 会写入忽略的 `outputs/`，同一输出前缀还会生成事件和渲染报告。文件已存在时默认拒绝覆盖；明确需要替换时加 `--force`。默认禁止下载远端素材，确有需要时加 `--allow-remote`。所有选项可通过 `npm run render -- --help` 查看。

确认试听后，可把选定 M4A 和必要报告归档到 `audio/`、`evidence/`，再提交版本。历史根目录中的大型 WAV、完整源 MP3、分轨音轨和模型缓存没有收入仓库；本地原件仍保留。

## 校验与已知边界

```sh
npm run validate
```

默认校验核心电子乐谱和参考复刻，检查求值、有效事件与本地资源等。乐队作品的特殊音源与演奏模型应按作品目录和交接说明核验，不能由核心电子作品的通过结果推断为全部音源均已通过统一离线渲染。

本次实际通过范围与报告见 [docs/VALIDATION.md](docs/VALIDATION.md)。

- **事件检查**回答代码是否产生预期音符和时间；**离线渲染**回答声音引擎是否能生成有效音频；两者都不替代主观试听。
- Ego Lite 的普通 play 入口曾停在 AudioWorklet 初始化。已有画面、代码和离线音频验证，不应写成该浏览器实时播放已通过。
- 乐谱的可视化放在顶部函数中，最后才调用完整歌曲；保留这个写法，避免把画面挪回底部或背景。
- `research/` 归档中的个人绝对路径已替换成 `<LEGACY_WORKSPACE>` / `<USER_HOME>`。这些脚本保留当时的假设和依赖，需按需迁移，不作为安装或运行入口。
- `evidence/` 的历史记录对应其当时版本；导入清单保留源内容和打包内容的散列，避免把路径整理后的文件误称为原始字节。

## 采样、来源与依赖

`public/` 中包含纯合成器作品之外的必要本地资源。Pocket Calculator 复刻使用用户提供录音中提取的短单音、鼓击和分离人声；v4 仅取其中十个短鼓击／键音，按自己的节奏演奏。六种鼓击是可能包含多个同时发声乐器的复合切片。

其他乐队音源含 FreePats、Karoryfer、Virtuosity 和 SampleRadar 等来源。它们的许可不相同，部分素材有原采样再分发限制。这里没有给整个音频目录统一授予开放许可。详细对应关系、保留的许可原文和可公开范围见 [docs/SAMPLES.md](docs/SAMPLES.md)。

Strudel 上游代码遵循其自身 AGPL 许可；上游代码不作为本项目原创代码重新声明。安装脚本固定上游版本，避免随着 main 分支变化而悄悄改变音乐运行行为。

## 继续工作

先读 [HANDOFF.md](HANDOFF.md)，再读对应作品源码。对创作改动另存新版本，保留已认可的底座，并提供易比较的试听。修改节奏或音色时重新渲染；只改文档、颜色或可视化位置时核对事件语义即可。

用户于 2026-10-28 先确认私人上传，随后明确接受公开 Git 仓库以简化分享。仓库现为 **public**；首次私人上传记录保留。后续为解决过长的 Share 链接，启用了仅发布 `share-site/` 的 GitHub Pages 自动跳转入口，维护方式见 [分享说明](docs/SHARING.md)。`package.json` 的 `private: true` 仅防止 npm 发布，与 GitHub 可见性无关。不自动创建 Release 或添加协作者。
