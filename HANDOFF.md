# Agent 交接

本文件记录 2026-10-28 整理时的创作决策、运行入口和验证边界。先读 [README](README.md)、[作品目录](docs/CATALOG.md) 和 [素材说明](docs/SAMPLES.md)，再按本文件继续。历史报告证明的是对应版本在原环境中的状态，不能替代新机器上的验证。

## 当前交接状态

- 本仓库是原音乐工作目录的便携整理版，保留作品、试听、必要采样、验证证据和研究归档。
- 本轮任务是整理、说明与上传私人 GitHub 仓库，不是继续改曲。用户已审阅成品，并于 2026-10-28 明确确认按清单上传到 `zhaozhe110/strudel-music-lab`，保持私人仓库；本次上传无需重复确认。
- [GitHub 仓库](https://github.com/zhaozhe110/strudel-music-lab) 已上传且返回 `private=true`。首次载荷提交 `aea8f3a6573b9c09570f001bd2ceffc2e1adc62a` 的 606 个文件及 Git tree 已与远端核对一致；后续状态更新记录在 `main`。范围与证据见 [UPLOAD_PLAN](UPLOAD_PLAN.md)。
- 当前创作主线是《袖珍电路》。v3 是用户明确认可的底座；v4 是保留该底座的最新鼓机与计算器音色增强版，已完成技术验证。当前证据没有用户对 v4 完整试听后的最终验收，不能把 v4 标成“已获听感认可”。

## 新机器上先做什么

在仓库根目录执行。工具要求 Node.js 24 或更高版本；实际验证版本为 26.8.1，离线音频依赖 `node-web-audio-api` 2.2.0。Strudel 上游依赖使用 pnpm 10.15.0。

```sh
npm ci
npm run setup
npm start
```

`setup` 负责取得固定 Strudel checkout、安装依赖、构建网站并镜像本仓库 `public/`。固定上游提交为 `fdaa55937776dbd644da3d64e864527df4a105a6`。默认运行时目录为 `.runtime/strudel`；`STRUDEL_RUNTIME` 可指向另一个已经位于同一提交的 checkout。不要未经验证跟随上游 `main` 更新。

`npm start` 默认仅监听 `127.0.0.1:3009`。在浏览器打开该地址，把需要的 `.strudel` 文件完整粘贴到编辑器，点击 **play**。修改后用 **update**。固定使用相同主机名和端口：官网、`localhost` 和 `127.0.0.1` 的浏览器存储彼此独立，编辑器缓存不是作品备份。

离线验证与渲染的默认入口：

```sh
npm run validate
npm run validate -- pieces/little-logic/袖珍电路-v4.strudel --cycles 64
npm run render -- pieces/little-logic/袖珍电路-v4.strudel --begin 16 --cycles 16 --out outputs/v4-main
npm run render -- pieces/little-logic/袖珍电路-v4.strudel --cycles 64 --out outputs/v4-full
```

默认 `validate` 覆盖 little-logic 与 reference；也可传作品路径及 `--cycles`。新脚本把本机采样 URL 映射到仓库 `public/`，因此**离线 render/validate 不要求 HTTP 服务运行**。浏览器播放本地采样作品仍需要 `npm start`。新增输出写入 `outputs/`，先检查工具的报告和文件，再决定是否把它收入版本化的 `audio/`。

旧音频的 AAC 转换在 macOS 使用 `afconvert`。新机是否可输出 M4A 取决于当前工具与系统编码器，不能仅凭旧报告承诺跨平台转换成功。WAV 是检查渲染结果的基础格式。Python 不是日常播放与上述离线入口的前置条件；只有重做研究归档时才按需准备环境。若需新建 Python 环境，用户偏好 conda；已有项目环境则沿用。

## 目录用途

| 目录 | 用途与使用原则 |
| --- | --- |
| `pieces/little-logic/` | 《袖珍电路》各版及相关电子乐作品。v4 为最新增强版，v3 为认可底座。 |
| `pieces/rooftop/` | 《天台晚风》原版、音色实验、恢复原旋律版及奏法试验。版本数字不代表当前创作优先级。 |
| `pieces/offbeat/` | 《错拍之后》的素材乐句编排，保留作独立历史作品。 |
| `pieces/reference/` | Pocket Calculator 复刻及素材参考作品；与原创作品分开。 |
| `pieces/sketches/` | 入门与短循环草稿。 |
| `audio/` | 按同类目录保存的唯一 M4A 试听文件。它们是导出物，不是可编辑乐谱。 |
| `public/` | 浏览器和离线渲染需要的样本、映射与事件数据。URL 中的子目录名有实际意义，不能随意改名。 |
| `evidence/` | 选择保留的 JSON 验证记录；历史隐藏目录名移除了前导点。 |
| `research/` | 旧 mjs、py、txt 等研究归档，目录名也移除了前导点。这些脚本未全面迁移，可能依赖旧环境、旧路径或未打包中间产物；不是推荐运行入口。 |
| `scripts/` | 本仓库推荐的 setup、start、render、validate 工具。 |

`public/` 的九个作品素材目录是 `band-reference`、`band-song`、`little-logic-v4`、`pocket-calculator-remake`、`rooftop-damping`、`rooftop-restored`、`rooftop-touch`、`rooftop-v2`、`rooftop-v3`。不要把它们与 Strudel 自身的字体、图标、缓存或构建产物混为一谈。

## 《袖珍电路》：用户决策与当前入口

| 版本 | 状态与入口 |
| --- | --- |
| 初版 / v1 | 用户认为“有那味”，之后要求保存。顶部可视化存档见 [v1](pieces/little-logic/袖珍电路-v1-顶部可视化存档.strudel)。保留作为可回退版本。 |
| v2 | 为增加记忆点加入两小节动机、长音和完整和声收束。用户明确评价“过于悦耳、太流行，没有 Pocket Calculator 那种感觉”。[v2](pieces/little-logic/袖珍电路-v2.strudel) 是被否定的方向，不应作为后续默认旋律基础。 |
| v3 | [v3](pieces/little-logic/袖珍电路-v3.strudel) 改为 B♭ Mixolydian，保留 B♭ 八度持续低音与 A♭ 切分，去掉功能和声推进。用户明确称其为“非常好的底座”。 |
| v4 | [v4](pieces/little-logic/袖珍电路-v4.strudel) 保留 v3 核心，采用参考复刻中的短鼓击和计算器单音，增加鼓型变化、按键应答、高频蜂鸣和计算器独奏。最新增强版，完整听感验收未记录。 |

继续这一主线时保留这些不变量：

1. **以 v3 为认可的音乐基础。** B♭ Mixolydian 的音集为 B♭ C D E♭ F G A♭。持续 B♭ 低音、A♭ 降七级切分、短句、E♭→D 的短摩擦是核心。不要自行恢复 v2 的 E/A/B 根音循环、相对小调抒情段、长音落主音或流行式大终止。
2. **v4 的增强目标是声音角色与编排。** 用户指出的不足是计算器蜂鸣和鼓声丰富性。优先调整声部何时出现、应答、过门与音量，而不是每一小节都加满新声音。
3. **可视化固定放在代码顶部。** 用户先试过底部、编辑器背景，最终选择顶部。`showVisuals` 必须定义在顶部，内部放 `_pianoroll` 与 `_scope`，最后只调用一次 `showVisuals(song)`。widget 按函数体内的源码位置挂载；不能把函数移到末尾，否则图也移走。绘图副本的 `gain(.85)` 只增加画面亮度，实际返回的 `p._scope(...)` 必须保持原歌曲音量。
4. **不要把两个分析器直接串联。** `_scope()._spectrum()` 各写单值 `analyze(id)`，后者会覆盖前者。需要频谱时替换波形组件，或另行明确设计和验证分析路由。
5. **保存新版本，保留旧版本。** 新一轮听感改动先另存，不覆盖认可的 v3 和已保存的 v1。A/B 应匹配同一时长窗口的 RMS、说明先后顺序；不能靠单独增大新版本音量证明改进。

### v4 的素材边界

- `public/little-logic-v4/` 独立保存十个声音文件：六种 `pcKit` 复合短击与四种 `pc_keys` 根音样本。来源是用户提供录音的本地复刻素材；未使用原曲完整伴奏或人声来给原创曲垫底。
- `pcKit0…5` 来自机器分离鼓轨的聚类单击，不是六个纯净独立鼓件。`pcKit2` 主要是低频，`pcKit0/3` 有较多高频，部分样本同时含低频与高频；不要全部再叠在原合成底鼓上。
- `pc_keys` 的四个根音为 Ab4、Bb4、G5、F♯6，样本响度和时长不同。代码中的 `keyLevels` 是分别平衡后的起点，不能简单统一为同一个 gain。
- **F♯6 是计算器效果音，位于 B♭ Mixolydian 音集之外。** v3 的严格音级集合验证不适用于 v4 全部事件。v4 应验证原创核心仍在该调式、效果音按设计出现。
- 样本约 0.185–0.28 秒，来自机器分离而非原始多轨，可能含串音或调制。普通按键保留自然形态；快速连按时才缩短门限。不要宣称无残留或与原录音逐样本一致。
- `DRUM_LEVEL`、`KEY_LEVEL`、`BUZZ_LEVEL` 是可单独调整的相对电平。当前初始值均为 1。

## 《天台晚风》：避免重犯的方向错误

**有效旋律基准是 [原版](pieces/rooftop/天台晚风.strudel) 与 [v2](pieces/rooftop/天台晚风-v2.strudel)。** 用户后来明确要求找回最初原创旋律。不能因文件名带 v3 就把新的主题当成已接受基准，也不能把 SampleRadar 的整句乐句替换进来后称为原曲音色升级。

- 原旋律：132 BPM，36 小节，D → F♯ → G → A；left/right/lead/bass 共 680 条原旋律事件。right 晚 `1/16 cycle`，原谱中的 `gs4`、`a5` 均有意保留，不能当错音自动“修正”。
- [原旋律回归](pieces/rooftop/天台晚风-原旋律回归.strudel) 保留原来的 36 小节和声部进出。
- [保留原旋律完整曲](pieces/rooftop/天台晚风-保留原旋律完整曲.strudel) 的前 36 小节与回归版一致，后续继续复用主题，默认只播放一次。整曲 2374 个事件，音乐约 127.27 秒。
- 当前修复路线使用 Karoryfer Black And Green 的现成单音 WAV，按官方 SFZ **数值根音**加载；不能按文件名猜八度。库提交 `b3b3249d37dc977a1a297bd2dc053e6d9b6b805c`，CC0-1.0。Strudel 采样播放不等于完整 SFZ 奏法引擎。
- [拨弦连续性试验](pieces/rooftop/天台晚风-拨弦连续性试验.strudel) 只改变左吉他音源与平衡：四小节 32 音中 8 个普通拨弦、21 个轻拨、3 个目标音 hammer-on；用户反馈“好了一些”。`SOFTER_PICKING` 可切回基准。
- [同弦止音试验](pieces/rooftop/天台晚风-同弦止音试验.strudel) 以轻拨版为比较基准，只给 544 条左吉他事件增加 `cut`，`STRING_DAMPING=false` 可关闭。它是进一步试验，未记录主观验收。分弦是编配选择，不是源 WAV 的真实弦号元数据。
- 连续性问题不能仅解释为音符之间有空隙：原包络已重叠。长 release 不等于 legato，目标音 hammer-on 也不等于包含前音与转换的真实连奏采样。不要未经请求改装外部吉他音源或用木吉他替换当前电吉他方向。

`天台晚风-v3.strudel`、`天台晚风-v3-完整版.strudel`、Emo 素材参考版和《错拍之后》仍有历史与研究价值，但不是恢复后的原创旋律基准。

## 参考复刻与《错拍之后》

### Pocket Calculator 参考复刻

入口：[完整复刻](pieces/reference/Pocket%20Calculator-复刻版.strudel)、[四小节主题](pieces/reference/Pocket%20Calculator-主题循环.strudel)。它们复刻用户提供的 2009 Remaster 录音，属于参考材料，与原创《袖珍电路》分开。

- 完整版约 4:57，平均 135.85 BPM；`public/pocket-calculator-remake/score.json` 使用原录音秒数时间线保留细小速度变化，不能为了整齐直接全部量化。
- 2621 个事件：主旋律 762、贝斯 373、鼓击 1326、按键/蜂鸣 136、人声片段 24。乐器为短单音或单次击打重新演奏；人声是用户录音的机器分离片段。
- 顶部 `LEAD_NOTES`、`BASS_NOTES`、`KEY_NOTES`、`DRUM_SOUNDS`、`VOICE_CLIPS` 实际参与播放和高亮。可以改音名，但必须保留各面板项目数；不要退回只有展示、不能控制时间线的伪面板。
- `VOICE=0` 可听器乐版；`START/END` 用原录音秒数选择区间。改变 BPM 不会自动对人声做时间拉伸。
- 复刻含机器识谱、重叠声部分离和音色提取误差，不是原始多轨，也不是逐点无误的原版。

### 素材参考与《错拍之后》

[Emo 素材参考版](pieces/reference/Emo乐队-素材参考版.strudel) 与 [错拍之后](pieces/offbeat/错拍之后-完整曲.strudel) 使用 SampleRadar Kit03 的现成乐句、原速与原音高。原旋律和实际演奏来自素材套装，不能标作逐音原创演奏。

《错拍之后》99 BPM、约 121.82 秒，包含 7/8、5/8、3+3+2 等安排，默认一次播放，`LOOP=true` 才循环。用户已否定其作为《天台晚风》旋律替代的方向；保留历史作品，不自行移植回原创基准。

## 验证证据入口与能证明什么

| 证据入口 | 已验证事实 | 不能由此推出 |
| --- | --- | --- |
| `evidence/pocket-calculator-v3/score-validation.json` | 1767 事件，136 BPM、64 小节精确循环，基音集合为 B♭ Mixolydian，bass 仅 Bb1/Bb2；应答落在休止处。 | 不能推广到含 F♯6 FX 的 v4，也不是主观音质评分。 |
| `evidence/pocket-calculator-v4/score-validation.json` | 1250 事件，136 BPM、64 小节，`coreV3Unchanged=true`，60 个按键事件，末两小节静音。 | 不能称 v4 获用户最终听感验收。 |
| `evidence/pocket-calculator-v4/audio-validation.json` | 真正 Superdough 渲染；完整 114.941 秒，原始峰值约 0.494，PCM 峰值约 −1.515 dBFS；十个采样与源文件散列核对，源素材未变。 | 不是浏览器实时回录，也不是“听起来成熟”的证据。 |
| `evidence/pocket-reconstruction-render/final-validation.json` | 2621 事件、42 个资源散列；完整导出 296.979 秒，原始峰值约 0.835，无非有限样本或 PCM 削波。 | 不能消除自动分离与转写误差。 |
| `evidence/pocket-visual-fix/validation.json` | 顶部面板修复前后 2621 事件等价，全部事件可关联源码高亮。 | 不能证明 Ego Lite 的实时声音播放正常。 |
| `evidence/restored-song/melody-validation.json` | 回归版 1208 事件、完整版 2374 事件；两版的 680 条原旋律事件逐项保留。 | 不能把整体事件数不同理解为旋律被改写。 |
| `evidence/legato-ab/validation.json` | 2374 事件的音符、时间、休止、包络和效果不变，只改变左声部音源与 gain。 | 不等于真实连奏已经实现。 |
| `evidence/string-damping/validation.json` | 2374 事件中 544 个左声部事件只增加 `cut`；其他音符与声部不变。 | 实际发声音长会变短，不能声称音频本身完全相同。 |
| `evidence/song-arrangement/validation.json` | 《错拍之后》119 事件，有限播放，原速原音高，切片与调度匹配。 | 不证明该旋律方向获认可。 |

如果整理时修改了注释、路径或装载方式，源码 SHA 会变化。不要硬说新文件仍匹配旧 SHA；应另记新散列，并比较实际音频事件、采样选择、速度、力度和声像。旧报告里的历史路径不应成为新机运行依赖。

## 引擎与浏览器边界

- little-logic 与参考复刻的后期试听使用安装的 Strudel core/mini/transpiler 和实际 Superdough 音源/效果链，通过 `node-web-audio-api` 的 OfflineAudioContext 渲染。不是另写一个近似合成器替代演奏。
- Node 适配层可绕过未使用的 Vite `?audioworklet` 资源导入，并把本地 HTTP 采样 URL 映射到 `public/`。可视化在离线渲染中是无声的空操作，实际浏览器仍正常显示。
- **不要静默近似不支持的效果。** 依赖 AudioWorklet 的 supersaw、pulse、crush/coarse、ladder 等，以及当前 Node 链不支持的空间效果/自定义浏览器模块，需要明确报错或扩展真实支持。不能为了“渲染成功”偷偷删掉用户已接受的音色参数。
- 多个 rooftop 版本带混响或自定义奏法模块，历史成功路径包含浏览器原生 OfflineAudioContext；新通用 Node 工具默认验证范围不能自动推广为所有历史作品都已支持。遇到不支持项，先看相应作品的报告和归档实现，再选择正确的原引擎路径。
- 最早 `天台晚风-preview` 的 `audio-preview` 管线近似实现了包络/滤波/混响/延迟；`tone-v2` 也记录了空间效果近似。不要把所有历史试听一概称为真实 Superdough 完整效果链输出。
- Ego Lite 的标准 Strudel **play** 入口曾多次停在 AudioWorklet 初始化。页面加载、采样注册、事件查询、静止时钟下的可视化检查，与实时声音输出是不同的验证。不能把前者写成后者通过，也不要未经用户要求改浏览器或 Strudel 引擎绕过问题。
- 浏览器自动化默认用 `ego-browser` Skill。用户未明确指定其他浏览器时，不改用 Chrome Plugin、Browser Plugin 或 Computer Use；Ego Lite 不可用时先报告，再继续不依赖浏览器的独立工作。
- 技术检查不等于听感判断。没有真正听辨时，不说“我听过了”“更像真人”“已经不刺耳”。对照采用的 RMS 匹配也不等于 BS.1770 LUFS 匹配。

## 上传前与后续工作边界

1. 本次已完成仓库清单、样本来源、依赖锁定、原文件保留核对、新入口验证与最终上传确认。后续操作按明确的任务范围继续，不重复索要已经获得的同一项权限。
2. 私人仓库目标不自动改变素材许可。Pocket 复刻及 v4 部分声音取自用户提供的商业录音；SampleRadar 允许在音乐作品中使用，但来源说明写明不要重新分发原采样。上传范围必须明确交代这些资产，不能把 `public/` 默认视为全 CC0，也不能未经确认擅自改为公开仓库或发布网站。详细来源以 [SAMPLES](docs/SAMPLES.md) 为准。
3. 不上传原始商业 MP3、机器分离的大型完整声轨、下载包、虚拟环境、node_modules、运行时 checkout、临时输出或凭据。不要因打包而删除原工作目录中的这些资料。
4. 获得上传确认后也只执行已说明的范围；不能顺便删旧版本、改采样许可标签、更新上游版本或改写作品。
5. 回到创作时，先明确当轮对象是 little-logic、rooftop 还是参考复刻。按用户当轮要求继续，不把不同作品的接受/否定意见相互套用。
6. little-logic 的下一步听感任务是请用户评估 v4 鼓机与蜂鸣增强是否恰当，尤其高区蜂鸣的密度和电平；保持 v3 核心进行小范围可回退修改。rooftop 的下一步是评估同弦止音试验，不能直接把该试验覆盖成默认正式版。
