# 采样来源、依赖与许可记录

核对日期：2026-10-28。本仓库用于个人音乐研究与创作备份，现已按用户后续授权改为公开 GitHub 仓库。作品代码、素材WAV/FLAC、转写数据、试听成品分别记录来源；上传范围与状态见 [UPLOAD_PLAN](../UPLOAD_PLAN.md)。仓库公开和收录文件均不表示已取得公开再分发许可，原有素材许可条款不变。

本文件不授予新许可，不将全部素材统一标为CC0，也不对某项私人个人备份行为的法律性质作结论。已确认的清单包含下述SampleRadar素材、原录音衍生素材及对应试听；这些来源与非开放许可条件继续保留。

## 9个资源目录

下表是整理时的本地文件盘点。`rooftop-v3`、`band-song`、`rooftop-damping`包含演奏或映射数据，不能当成三个独立音源包。

| 新仓库目录 | 本地内容 | 来源及许可记录 | 主要依赖关系 |
|---|---|---|---|
| [public/rooftop-v2/](../public/rooftop-v2/) | 60个吉他FLAC、19个鼓FLAC、samples/preload与3份说明/许可，共84文件 | FreePats FSBS clean与Virtuosity Drums；均有CC0 1.0原文 | 《天台晚风》v2直接使用；v3也引用这里的音频 |
| [public/rooftop-v3/](../public/rooftop-v3/) | 3个JSON、3个MJS，共6文件，无音频 | 本地编曲、技法与映射代码；实际采样许可继承对应音频来源 | `samples.json`的音频基址指向rooftop-v2；有GM贝斯运行时依赖 |
| [public/rooftop-restored/](../public/rooftop-restored/) | 100个Karoryfer吉他WAV、17个SampleRadar鼓WAV、3个JSON及吉他许可，共121文件 | **混合来源**：吉他CC0；鼓有禁止重新分发原采样的条件 | 原旋律回归、原旋律完整曲及后续奏法试验 |
| [public/rooftop-touch/](../public/rooftop-touch/) | 20个轻拨/击弦WAV、3个JSON，共23文件 | Karoryfer Black And Green，同一CC0来源 | 与rooftop-restored一起使用；不包含完整两音连奏过渡 |
| [public/rooftop-damping/](../public/rooftop-damping/) | 1个A/B事件JSON，无音频 | 本地止音试验数据；音频来源仍是restored/touch | 保留试验记录；不是独立音源 |
| [public/band-reference/](../public/band-reference/) | SampleRadar Kit03的48个WAV、samples与events，共50文件 | MusicRadar/SampleRadar；可用于音乐作品，禁止重新分发原采样；不是CC0 | Emo素材参考版与《错拍之后》使用同一48文件 |
| [public/band-song/](../public/band-song/) | 1个完整曲事件JSON，无音频 | 《错拍之后》的本地编排数据；乐句素材来自SampleRadar | 音频仍在band-reference |
| [public/pocket-calculator-remake/](../public/pocket-calculator-remake/) | 41个WAV及score，共42文件 | 用户提供的Kraftwerk录音经AI分轨、短采样和转写；未提供独立再分发授权文件 | 完整复刻与四小节主题学习版 |
| [public/little-logic-v4/](../public/little-logic-v4/) | 从复刻素材独立复制的10个短WAV | 同一Kraftwerk录音衍生来源；不是CC0，不含人声 | 《袖珍电路》v4；无需部署完整复刻目录 |

## FreePats Electric Guitar FSBS clean

- 上游：[FreePats / electric-guitar-FSBS-clean](https://github.com/freepats/electric-guitar-FSBS-clean)。所选来源提交为 `192cf0d9bf2c4ba6ead8e3524ba3f78818e4fe91`，本地来源记录的版本日期为2026-08-07。
- 对应文件：`public/rooftop-v2/guitar/*.flac`，共60个。使用原始FLAC、按音高根音和轻拨/普通拨弦层映射，每个根音有轮替录音；现有来源记录注明未处理采样音频。
- 许可：[原始CC0 1.0文本](licenses/FreePats-FSBS-CC0-1.0.txt)，逐字节保留。
- 归属与选择说明：[Rooftop-v2-CREDITS.txt](licenses/Rooftop-v2-CREDITS.txt)。v3沿用这些采样；脚本中的滑音、揉弦或微时差，不会把它们变成新录制的吉他素材。

## Virtuosity Drums

- 制作者：Versilian Studios与Karoryfer Samples；演奏者：Austin McMahon。
- 上游：[产品页](https://versilian-studios.com/virtuosity-drums/)、[sfzinstruments / virtuosity_drums](https://github.com/sfzinstruments/virtuosity_drums)。来源提交为 `9f04cf9a734527edfbb0a4eee1f674e45bbf71bc`。
- 对应文件：`public/rooftop-v2/drums/*.flac`，共19个中距离麦克风采样。来源记录注明保持原文件、未归一化。
- 许可：[原始CC0 1.0文本](licenses/Virtuosity-Drums-CC0-1.0.txt)，逐字节保留。与FreePats吉他共同支撑《天台晚风》v2/v3音色分支。

## Karoryfer Black And Green Guitars

- 上游：[sfzinstruments / karoryfer.black-and-green-guitars](https://github.com/sfzinstruments/karoryfer.black-and-green-guitars)、[作者产品页](https://shop.karoryfer.com/pages/free-black-and-green-guitars)。来源提交为 `b3b3249d37dc977a1a297bd2dc053e6d9b6b805c`。
- 对应文件：`public/rooftop-restored/green/*.wav`、`public/rooftop-restored/black/*.wav`，合计100个普通拨弦；以及 `public/rooftop-touch/*.wav` 的14个轻拨与6个击弦目标音，共20个。
- 许可：[原始CC0 1.0文本](licenses/Karoryfer-Black-And-Green-CC0-1.0.txt)，逐字节保留。`rooftop-restored/guitar-LICENSE.txt`也保留同一吉他许可；**该文件不覆盖相邻的SampleRadar鼓目录。**
- 根音按官方SFZ数值映射，不按文件名猜八度。轻拨/击弦是录制好的目标音，不是包含前后两音连续转换的真实legato过渡库。同弦止音的弦号由本次编配分组，不是源录音的弦号元数据。
- 早期素材说明中曾把Black And Green列为“未安装的候选”；后续restored/touch文件与来源清单证明已实际使用。Shinyguitar仍仅出现在早期候选说明中，不是这9个资源目录的音源。

## MusicRadar / SampleRadar — 451 free emo samples

来源：[发布页](https://www.musicradar.com/news/tech/sampleradar-451-free-emo-samples-479864)、[原下载ZIP](https://cdn.mos.musicradar.com/audio/samples/musicradar-emo-samples.zip)。选用Kit03、99 BPM、24-bit / 44.1 kHz WAV。

2026-10-28核对发布页“ What you need to know ”：页面允许将royalty-free采样用于音乐作品，同时明确要求不要重新分发采样。禁止条款的逐字摘录及链接保存在 [SampleRadar-emo-terms.txt](licenses/SampleRadar-emo-terms.txt)。本地ZIP未发现独立的LICENSE/README条款文件，因此不把本地说明冒充上游许可证。

原有引入说明也完整保存在 [SampleRadar-来源与使用说明.txt](licenses/SampleRadar-来源与使用说明.txt)。该文件描述的是当时本机引入状态，不是对此次上传的授权。

适用文件：

| 路径或数据 | 与源素材的关系 |
|---|---|
| `public/band-reference/EMOK3RhyGuitA99A-01.wav` 至 `-08.wav` | 8个节奏吉他A乐句 |
| `public/band-reference/EMOK3RhyGuitB99A-01.wav` 至 `-08.wav` | 8个节奏吉他B乐句 |
| `public/band-reference/EMOK3RhyGuitC99A-01.wav` 至 `-08.wav` | 8个节奏吉他C乐句 |
| `public/band-reference/EMOK3LeadGuitB99A-01.wav` 至 `-08.wav` | 8个主音吉他乐句 |
| `public/band-reference/EMOK3BassA99A-01.wav` 至 `-08.wav` | 8个贝斯乐句 |
| `public/band-reference/EMOK3Beat99-01.wav` 至 `-08.wav` | 8个鼓乐句；上述6组合计48个原WAV |
| `public/rooftop-restored/drums/EMOK3DHit-Kick01.wav` 至 `Kick03.wav` | 3个单击底鼓 |
| `public/rooftop-restored/drums/EMOK3DHit-Snare01.wav` 至 `Snare06.wav` | 6个单击军鼓 |
| `public/rooftop-restored/drums/EMOK3DHit-ClHat01.wav`、`ClHat02.wav` | 2个闭镲 |
| `public/rooftop-restored/drums/EMOK3DHit-OpHat01.wav`、`OpHat02.wav` | 2个开镲 |
| `public/rooftop-restored/drums/EMOK3DHit-Tom01.wav`、`Tom02.wav` | 2个通鼓 |
| `public/rooftop-restored/drums/EMOK3DHit-Crash01.wav`、`Crash02.wav` | 2个吊镲；上述单击合计17个原WAV |
| `public/band-song/events.json` 与相关乐谱 | 对乐句的本地编排；不含新录制的乐器，也不改变原素材条款 |

《Emo乐队·素材参考版》《错拍之后》的旋律、实际演奏来自源套装；《天台晚风》恢复分支保留自身旋律，只使用该套装的鼓单击。成品音乐的使用许可与原始采样的再分发条件需要分开理解；本记录没有把某种私人仓库用途自动解释为许可或禁止。

## Pocket Calculator录音衍生素材

来源是用户提供的 `Kraftwerk - Pocket Calculator (2009 Remaster).mp3`，用于个人分析、转写与比较。完整复刻使用AI分离后的短单音、单次鼓击与24段人声，再按转写时间触发；不是原始录音室多轨，也没有用连续全混音或整段伴奏充当重新演奏。

`public/pocket-calculator-remake/`的41个WAV构成如下：

| 文件 | 数量 | 用途与边界 |
|---|---:|---|
| `pc-kit-0.wav` … `pc-kit-5.wav` | 6 | 约185 ms的复合鼓击；按频谱特征聚类，可能同时含底鼓/军鼓/镲，不能当作6件干净独立乐器 |
| `pc-bass-bb1.wav` | 1 | B♭1短贝斯样本，再按转写事件重奏 |
| `pc-lead-ab3.wav`、`pc-lead-bb3.wav`、`pc-lead-c4.wav`、`pc-lead-d4.wav`、`pc-lead-eb4.wav`、`pc-lead-f4.wav` | 6 | 主题的6个单音样本 |
| `pc-midkeys-ab4.wav`、`pc-midkeys-bb4.wav` | 2 | 中音计算器按键样本 |
| `pc-buzz-g5.wav`、`pc-buzz-fs6.wav` | 2 | 高区蜂鸣效果；频谱和载波音高不等于整曲调式定义 |
| `pc-voice-00.wav` … `pc-voice-23.wav` | 24 | 约37.6秒分离人声片段；可在复刻谱中用VOICE开关关闭 |

AI分轨、裁切、归一化、转写和重新编排不等于取得了原录音或作品的再分发授权。现有材料没有附带这些录音衍生文件的CC0或其他开放许可，因此此处不将其标为可公开分发。个人研究用途是项目用途记录，不是授权凭据。

转写事件的时长、力度、弱音识别、串音和人声分离均存在误差；不得把score视为经原作者确认的精确乐谱。

### 袖珍电路v4只使用其中10个短样本

`public/little-logic-v4/`独立保存：

```text
pc-kit-0.wav
pc-kit-1.wav
pc-kit-2.wav
pc-kit-3.wav
pc-kit-4.wav
pc-kit-5.wav
pc-midkeys-ab4.wav
pc-midkeys-bb4.wav
pc-buzz-g5.wav
pc-buzz-fs6.wav
```

这10个文件未选入专门的 `pc-lead-*`、`pc-bass-*` 或 `pc-voice-*` 素材；AI分轨短采样仍可能含串音。v4旋律与结构沿用原创v3，再编排鼓机和按键。**音色样本仍来自同一原录音**，独立复制与改名目录不会让许可变成CC0。对应v4试听也包含这些声音。

`袖珍电路-v4-online.strudel` 只把同一组样本的加载基址改为 `https://raw.githubusercontent.com/zhaozhe110/strudel-music-lab/aea8f3a6573b9c09570f001bd2ceffc2e1adc62a/public/little-logic-v4/`。固定提交避免采样随 `main` 更新而变化；这个地址变化不增加新音源、不产生新音乐版本，也不改变上述许可边界。打开方法见[分享说明](SHARING.md)。

## 运行时音源与归档边界

- 《天台晚风》初版使用默认GM吉他/贝斯与RolandTR707；v2/v3/restored等版本仍使用GM finger bass。《电路夜行》使用RolandTR808默认鼓库。这些运行时下载的音源不在上述9个目录中，也不受这里的CC0文件统一覆盖。
- 《袖珍电路》v1/v2/v3及《入门旋律》使用合成振荡器，不依赖本项目采样目录；Strudel软件自身的许可是另一层事项。
- `.m4a`试听保留各自的素材来源关系。去重、转码或剪短不会消除源素材的许可边界。
- 必须一起保留的依赖：rooftop-v3→rooftop-v2，拨弦/止音试验→rooftop-restored+rooftop-touch，《错拍之后》→band-reference。band-song与rooftop-damping的事件快照有助于复现试验，但不提供声音。
- 已确认的上传清单分别列出开放许可音频、SampleRadar原采样、原录音衍生样本与试听。首次私有上传保留了这些文件，之后用户接受仓库公开；可见性变化不改变来源条款。若以后决定外置某类音频，保留代码与来源记录，并按相同资源路径恢复。
