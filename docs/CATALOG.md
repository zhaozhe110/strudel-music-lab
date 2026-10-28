# 作品与版本目录

整理日期：2026-10-28。目录保留20个 `.strudel` 文件，分别覆盖作品、历史版本、参考复刻与奏法试验；其中1份是 v4 的线上分发副本，不是新音乐版本。另有18份不同内容的 M4A、9个资源目录。文件名中的版本号表示创作分支，不自动表示“听感更好”或“已验收”。素材来源见 [SAMPLES.md](SAMPLES.md)。

## 从哪里开始

- **电子作品：**先听、改 [袖珍电路-v3.strudel](../pieces/little-logic/袖珍电路-v3.strudel)。这是用户认可的纯合成器底座。要比较复合鼓击与真实计算器短采样，打开 [v4](../pieces/little-logic/袖珍电路-v4.strudel)；它保留v3核心旋律、低音、切分与悬置和声，增强鼓和按键层次。v4不替代v3这个基准。
- **从官网加载 v4：**使用 [v4 线上副本](../pieces/little-logic/袖珍电路-v4-online.strudel)和[分享说明](SHARING.md)。它从固定提交的 GitHub Raw 路径加载同一组样本，无需自行托管 HTTP 服务。
- **《天台晚风》的原旋律：**从 [保留原旋律完整曲](../pieces/rooftop/天台晚风-保留原旋律完整曲.strudel) 开始。若只看原来的36小节，打开 [原旋律回归](../pieces/rooftop/天台晚风-原旋律回归.strudel)。v3是另写主题的分支，不是这条原旋律的后续定稿。
- **乐句素材编排：**[错拍之后](../pieces/offbeat/错拍之后-完整曲.strudel) 是完整器乐编排，旋律和演奏来自SampleRadar现成乐句；[Emo素材参考版](../pieces/reference/Emo乐队-素材参考版.strudel) 是同一音源的短参考。
- **观察《Pocket Calculator》结构：**[复刻版](../pieces/reference/Pocket%20Calculator-复刻版.strudel) 保留按时间触发的转写；[主题循环](../pieces/reference/Pocket%20Calculator-主题循环.strudel) 适合直接改音符。两者都使用原录音提取素材，属于参考研究。
- **最小入门：**[入门旋律](../pieces/sketches/入门旋律.strudel) 只有两行，不依赖外部采样。

## 袖珍电路：6个文件，含1份线上分发副本

| 文件 | 状态与内容 | 播放依赖 |
|---|---|---|
| [袖珍电路.strudel](../pieces/little-logic/袖珍电路.strudel) | v1原名；126 BPM、E大调、64小节，约2:02。保留早期创作记录。 | Strudel内置合成器 |
| [袖珍电路-v1-顶部可视化存档.strudel](../pieces/little-logic/袖珍电路-v1-顶部可视化存档.strudel) | 顶部音符图与波形的v1存档；整理时与上述原名文件逐字节相同，两个名称均保留。 | Strudel内置合成器 |
| [袖珍电路-v2.strudel](../pieces/little-logic/袖珍电路-v2.strudel) | 126 BPM、E大调；两小节动机、长短句和功能和声的探索。用户认为过于流行、太悦耳，偏离目标；保留作比较，不作为当前起点。 | Strudel内置合成器 |
| [袖珍电路-v3.strudel](../pieces/little-logic/袖珍电路-v3.strudel) | **已认可底座。**136 BPM、B♭ Mixolydian、64小节，约1:53；B♭八度低音、A♭切分、短句和悬置色彩。 | Strudel内置合成器；无本地采样目录依赖 |
| [袖珍电路-v4.strudel](../pieces/little-logic/袖珍电路-v4.strudel) | 鼓机与计算器增强版；核心沿用v3。增加复合鼓击、中音按键、高蜂鸣、对话与留白。F♯6用于计算器效果音。顶部有 `DRUM_LEVEL`、`KEY_LEVEL`、`BUZZ_LEVEL`。 | [public/little-logic-v4/](../public/little-logic-v4/) 的10个短WAV；不需要复刻版人声 |
| [袖珍电路-v4-online.strudel](../pieces/little-logic/袖珍电路-v4-online.strudel) | 同一 v4 的线上分发副本，只替换 `sampleBase`；音乐、编排与可视化不变，沿用 v4 试听。 | 固定提交 `aea8f3a6573b9c09570f001bd2ceffc2e1adc62a` 的 GitHub Raw `public/little-logic-v4/`，同一10个短WAV |

试听与对照：

| 音频 | 用途 |
|---|---|
| [袖珍电路-v1-试听.m4a](../audio/little-logic/袖珍电路-v1-试听.m4a) | v1试听；原目录的“袖珍电路-试听.m4a”与此文件哈希相同，归档只需保存一份 |
| [袖珍电路-v2-试听.m4a](../audio/little-logic/袖珍电路-v2-试听.m4a) | v2历史分支 |
| [袖珍电路-v1-v2-主题对照.m4a](../audio/little-logic/袖珍电路-v1-v2-主题对照.m4a) | 主题A/B对照 |
| [袖珍电路-v3-试听.m4a](../audio/little-logic/袖珍电路-v3-试听.m4a) | v3整曲 |
| [袖珍电路-v3-主段试听.m4a](../audio/little-logic/袖珍电路-v3-主段试听.m4a) | v3主段 |
| [袖珍电路-v4-试听.m4a](../audio/little-logic/袖珍电路-v4-试听.m4a) | v4整曲 |
| [袖珍电路-v4-主段试听.m4a](../audio/little-logic/袖珍电路-v4-主段试听.m4a) | v4主段 |

## 天台晚风：8个版本文件

这条分支的状态依据源码、旋律修复说明和两次奏法A/B说明整理。当前材料没有证明所有版本都已获得用户最终认可。

| 文件 | 状态与内容 | 播放依赖 |
|---|---|---|
| [天台晚风.strudel](../pieces/rooftop/天台晚风.strudel) | 最初原创双吉他草稿；132 BPM、36小节，约65秒；D→F♯→G→A。后续恢复原旋律时的基准。 | Strudel的GM吉他、GM贝斯与RolandTR707默认音源，首次可能联网 |
| [天台晚风-v2.strudel](../pieces/rooftop/天台晚风-v2.strudel) | 保留最初旋律和36小节段落，更换FreePats电吉他与Virtuosity原声鼓。 | [rooftop-v2/](../public/rooftop-v2/)；GM finger bass |
| [天台晚风-v3.strudel](../pieces/rooftop/天台晚风-v3.strudel) | 新写的双吉他问答分支；126 BPM，包含7/8、5/8连接，演奏主体约79秒；有微时差、滑音与揉弦开关。不能当作最初旋律的保留版。 | [rooftop-v3/](../public/rooftop-v3/) 的score、模块和映射；实际音频仍在 [rooftop-v2/](../public/rooftop-v2/)；GM贝斯 |
| [天台晚风-v3-完整版.strudel](../pieces/rooftop/天台晚风-v3-完整版.strudel) | 将v3分支的编曲和技法逻辑内联，方便完整阅读；仍依赖外部音频，不是纯合成器版。 | rooftop-v3中的samples/preload及其引用的rooftop-v2音频；GM贝斯 |
| [天台晚风-原旋律回归.strudel](../pieces/rooftop/天台晚风-原旋律回归.strudel) | 恢复最初36小节；改用Karoryfer逐音吉他和SampleRadar单击鼓。默认只播放一次。修复说明记录680个旋律/低音事件的音高与时序一致性验证。 | [rooftop-restored/](../public/rooftop-restored/)；GM贝斯 |
| [天台晚风-保留原旋律完整曲.strudel](../pieces/rooftop/天台晚风-保留原旋律完整曲.strudel) | **原旋律的完整曲入口。**前36小节保持回归版，之后复用原主题扩展到70小节，约127秒，默认一次播放。 | rooftop-restored；GM贝斯 |
| [天台晚风-拨弦连续性试验.strudel](../pieces/rooftop/天台晚风-拨弦连续性试验.strudel) | 以完整曲为基准；轻拨与3处目标音击弦替换普通拨弦，`SOFTER_PICKING`可回退。说明记录用户听后“好了一些”；不表示真实连奏问题已解决。 | rooftop-restored + [rooftop-touch/](../public/rooftop-touch/)；GM贝斯 |
| [天台晚风-同弦止音试验.strudel](../pieces/rooftop/天台晚风-同弦止音试验.strudel) | 在轻拨/击弦试验上增加 `STRING_DAMPING`；544个左吉他事件新增cut分组，实际发声音长可能缩短。分弦是编配选择；保留为可回退试验，未记录最终听感验收。 | rooftop-restored + rooftop-touch；GM贝斯。rooftop-damping仅保存A/B事件数据 |

现有试听：

| 音频 | 用途 |
|---|---|
| [天台晚风-preview.m4a](../audio/rooftop/天台晚风-preview.m4a) | 最初草稿 |
| [天台晚风-v2-preview.m4a](../audio/rooftop/天台晚风-v2-preview.m4a) | 真实吉他/鼓的v2 |
| [天台晚风-v3-preview.m4a](../audio/rooftop/天台晚风-v3-preview.m4a) | 新主题分支，含尾响约82秒 |
| [天台晚风-音色对比.m4a](../audio/rooftop/天台晚风-音色对比.m4a) | 已有音色对照，不代表新增定稿 |
| [天台晚风-v2-v3对比.m4a](../audio/rooftop/天台晚风-v2-v3对比.m4a) | 前15秒v2，停顿后15秒v3；说明记录为响度匹配对比 |
| [天台晚风-保留原旋律完整曲.m4a](../audio/rooftop/天台晚风-保留原旋律完整曲.m4a) | 原旋律完整曲 |
| [天台晚风-拨弦连续性AB.m4a](../audio/rooftop/天台晚风-拨弦连续性AB.m4a) | 约20秒A/B：普通拨弦与轻拨/击弦；不是完整试验曲的整曲渲染 |
| [天台晚风-同弦止音AB.m4a](../audio/rooftop/天台晚风-同弦止音AB.m4a) | 约20秒A/B：轻拨/击弦基准与增加同弦止音的版本 |

## 错拍之后：1个完整编排

| 文件 | 状态与内容 | 播放依赖 |
|---|---|---|
| [错拍之后-完整曲.strudel](../pieces/offbeat/错拍之后-完整曲.strudel) | 99 BPM、约121.82秒。将SampleRadar Kit03现成乐句重新编排成前奏、主题、变拍间奏、留白与尾声；素材旋律和实际演奏来自套装。默认只演奏一次，`LOOP=true`可循环。 | [band-reference/](../public/band-reference/) 的48个WAV；[band-song/](../public/band-song/) 保存事件快照，不是独立音源 |

试听：[错拍之后-完整曲.m4a](../audio/offbeat/错拍之后-完整曲.m4a)。音色沿用已确认的Emo素材参考版；这不等于把来源乐句声明为原创旋律。

## 参考作品：3个文件

| 文件 | 状态与内容 | 播放依赖 |
|---|---|---|
| [Emo乐队-素材参考版.strudel](../pieces/reference/Emo乐队-素材参考版.strudel) | SampleRadar Kit03，99 BPM，约58秒循环。真实演奏乐句的素材与编排参考；不可当作《天台晚风》的旋律基准。 | band-reference的48个WAV |
| [Pocket Calculator-复刻版.strudel](../pieces/reference/Pocket%20Calculator-复刻版.strudel) | 用户提供的2009 Remaster MP3之转写与采样复刻；135.85 BPM、约4:57、2621个事件。含24段分离人声，`VOICE=0`可关闭；机器识谱和分轨有误差，不是原始多轨。 | [pocket-calculator-remake/](../public/pocket-calculator-remake/) 的score和41个WAV |
| [Pocket Calculator-主题循环.strudel](../pieces/reference/Pocket%20Calculator-主题循环.strudel) | 原曲主题的可编辑四小节学习循环；不是原创旋律。 | pocket-calculator-remake中的score与单音采样 |

试听：[Emo乐队-素材参考版.m4a](../audio/reference/Emo乐队-素材参考版.m4a)、[Pocket Calculator-复刻版.m4a](../audio/reference/Pocket%20Calculator-复刻版.m4a)。复刻预览含原录音衍生素材，许可状态与源码分开处理。

## 草稿与入门：2个文件

| 文件 | 状态与内容 | 播放依赖 |
|---|---|---|
| [电路夜行.strudel](../pieces/sketches/电路夜行.strudel) | 124 BPM、四小节原创电子循环；Am9→Fmaj7→Dm9→E7，鼓、贝斯和合成器分轨写在代码中。 | 内置合成器与RolandTR808默认鼓库，首次可能联网；没有独立试听文件 |
| [入门旋律.strudel](../pieces/sketches/入门旋律.strudel) | 90 BPM、三角波四音循环；用于检查播放链与最基础编辑。 | 内置合成器；没有独立试听文件 |

## 归档与验证边界

- 音频目录按内容哈希去重，保留18份不同的M4A；对应WAV渲染产物不另算为作品版本。两份内容相同的v1源码保留名称，用于保持版本记录。
- 本地谱的资源地址仍使用 `http://127.0.0.1:3009/<资源目录>/`，需用仓库的启动方式将 `public/` 中资源映射到这些路径。v4 线上副本改用固定提交的 GitHub Raw 采样地址；浏览器缓存不替代文件依赖。
- 自带合成器、默认远程音源、本地采样是三种不同依赖；“代码完整”不等于“全部音频已内联”。
- 现有说明和报告记录了Strudel编译、事件、资源及离线渲染检查；这些不是对每个版本的主观试听验收，也不保证不同浏览器的实时AudioWorklet初始化均成功。
