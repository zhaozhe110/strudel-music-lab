# GitHub 上传与公开状态记录

当前状态：**仓库已按用户后续授权改为 public；GitHub 返回 `isPrivate=false`。** 用户先确认私人上传，后明确接受 Git 仓库公开，以免自行托管 HTTP 服务。后一次指示覆盖旧的私人可见性要求，无需重复确认。

仓库：[zhaozhe110/strudel-music-lab](https://github.com/zhaozhe110/strudel-music-lab)。首次载荷提交：`aea8f3a6573b9c09570f001bd2ceffc2e1adc62a`。首次上传的 606 个文件及 Git tree 已与本地核对一致，见[首次上传历史记录](evidence/packaging/github-upload.json)。该报告中的 `private=true` 对应首次上传时的状态，保留原样；它不证明当前可见性。当前最新提交以 `main` 为准。

## 目标

| 项目 | 已确认值 |
| --- | --- |
| GitHub 账号 | `zhaozhe110`，已通过本机 GitHub CLI 只读核对 |
| 仓库名 | `strudel-music-lab` |
| 完整名称 | `zhaozhe110/strudel-music-lab` |
| 当前可见性 | **public**；首次上传时为 private |
| 初始分支 | `main` |
| 用途 | 个人 Strudel 作品、试听、研究材料、交接备份与线上分享入口 |

2026-10-28 的授权与执行顺序：

1. 用户先确认：“按清单上传到 zhaozhe110/strudel-music-lab，保持私人仓库。”据此完成首次私有上传；已审阅的初始提交为 `aea8f3a6573b9c09570f001bd2ceffc2e1adc62a`。
2. 用户随后表示：“我可以接受git仓库公开 托管http太麻烦了”。仓库已据此改为公开，GitHub 返回 `isPrivate=false`。
3. 为《袖珍电路》v4 增加线上分发副本与[分享说明](docs/SHARING.md)。副本仅把采样基址切换到首次载荷固定提交的 GitHub Raw 路径，本地 v4 和音乐内容保留。

## 当前收录内容

新目录独立于原工作区：原作品、运行中的 Strudel checkout、完整音轨和环境均保留。收录约 **220 MB 未压缩文件内容**，不含 `.git` 与可重新安装的环境。

| 内容 | 范围 |
| --- | --- |
| 乐谱 | 20 份 `.strudel`；首次上传为 19 份，现新增 1 份 v4 线上分发副本，不是新音乐版本；按 little-logic、rooftop、offbeat、reference、sketches 分类 |
| 试听 | 18 份不同内容的 M4A；去掉 1 份完全重复副本 |
| 本地资源 | 9 个目录、338 个文件；约 179.7 MB，含采样、映射与事件数据 |
| 运行工具 | 固定 Strudel 提交、锁定 npm/pnpm 依赖、安装／启动／校验／离线渲染脚本 |
| 文档 | README、HANDOFF、AGENTS、作品目录、采样来源与许可原文、历史说明 |
| 证据和研究 | 导入散列清单、选定历史 JSON、路径脱敏后的研究源码、本轮验证报告 |

乐谱和试听的完整目录见 [CATALOG](docs/CATALOG.md)，采样明细见 [SAMPLES](docs/SAMPLES.md)。导入时核对原工作区的 563 个源文件与打包文件，62 份历史文本只对个人路径做了替换；原文件不改动。

## 本次包含的音频来源

已确认范围保留了恢复当前作品所需的素材，包括下面三类。不能把整个 `public/` 当成统一开放许可的音源库。

| 类别 | 已包含范围 | 已记录的条件 |
| --- | --- | --- |
| CC0 乐器样本 | FreePats 吉他、Virtuosity 鼓、Karoryfer 吉他 | 保留原始许可与归属说明 |
| SampleRadar 原采样 | `band-reference/` 的 48 个 WAV、`rooftop-restored/drums/` 的 17 个 WAV | 官网允许用于音乐作品，但明确禁止重新分发原采样；私人备份不在本清单中被自动解释为获得授权 |
| 用户录音衍生素材 | Pocket 复刻的 41 个短 WAV（含 24 段分离人声），及 v4 独立复制的 10 个短鼓击／键音 | 没有独立再分发授权文件；用途记录为个人分析、转写和比较，不标作 CC0 |

对应 M4A 试听也保留其素材来源关系。仓库由 private 改为 public 不改变上述来源与许可条款，也不构成新的素材再分发授权。若以后决定外置某类样本，需同时交代恢复步骤及 Git 历史中的已有内容，不能只隐藏当前文件就声称历史内容已移除。

## 不上传

- 完整商业 MP3、整条分离音轨、原始下载 ZIP、模型缓存。
- 根目录中的大型 WAV 导出；选定 M4A 已足够浏览试听。
- 原 Strudel checkout 的 Git 历史、`.runtime/`、`node_modules/`、Python 虚拟环境与缓存。
- `.env`、密钥、令牌、个人浏览器会话、临时输出、系统杂项。

新 `.gitignore` 明确忽略这些环境和输出路径。必要的 `public/` WAV 不被笼统忽略。

## 确认与交接

用户已确认目标账号及名称、包含采样与试听的上传范围，并在首次私有上传后明确接受 **public** 可见性。当前增加的线上谱只改变采样加载地址，不改变作品、采样、试听或许可范围。

首次上传证据保留当时的远端 URL、首次载荷提交 SHA 和 `private=true` 状态；公开状态和线上入口另行记录，不改写旧报告。线上播放的使用步骤与验证边界见[分享说明](docs/SHARING.md)，不能把资源可下载、事件检查或离线渲染等同于浏览器实时播放通过。

不自动创建 Pages、Release 或设置协作者。`package.json` 的 `private: true` 仅防止 npm 发布，与仓库公开状态无关，保持原设置。
