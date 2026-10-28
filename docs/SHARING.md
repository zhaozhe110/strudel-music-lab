# 在线播放与分享

当前仓库为 public。GitHub 同时保存代码与采样，无需再启动自己的 HTTP 服务器或部署其他音频服务。

## 播放《袖珍电路》v4

打开 [作品页](PLAY_V4.md)，点击“在 Strudel 打开作品”，再点击官网的 **play**。

- [官网版源码](../pieces/little-logic/袖珍电路-v4-online.strudel)：从 GitHub Raw 的固定提交加载十个短 WAV；共 363,808 字节。
- [本地版源码](../pieces/little-logic/袖珍电路-v4.strudel)：保持原样，继续使用 `127.0.0.1:3009`。
- macOS 可双击 [官网入口](../launchers/袖珍电路-v4-官网.webloc)，直接进入已装入代码的 Strudel 页面。

两份代码是同一首曲子的两种资源地址，1250 个事件、136 BPM、64 小节编排、音量、采样选择和顶部可视化保持一致。线上版不是新的作曲版本。

固定采样提交为 `aea8f3a6573b9c09570f001bd2ceffc2e1adc62a`。主分支日后修改采样不会悄悄改变已经分享的版本；如确需更新，应生成新分发版本和链接。仓库改回 private、删除仓库或导致固定提交不可访问，会使这些外部采样链接失效。

## 分享入口

直接分享这个作品页即可：

<https://github.com/zhaozhe110/strudel-music-lab/blob/main/docs/PLAY_V4.md>

它包含作品介绍、试听、源码，以及进入官方编辑器的按钮。用户需要在作品页再点一次进入 Strudel；它不是自动跳转脚本。Strudel Share 的长链接包含完整代码，作品页里的按钮将这条长链接隐藏在清晰的文字后面。

短链与统计将在创建并验证后记录在本页。原始 Strudel 分享地址仍保留在作品页和 `.webloc` 中，不依赖短链服务才能播放。

## 验证与统计的含义

十个 GitHub Raw 文件已匿名下载，HTTP 200、SHA-256 与本地相同，响应包含 `Access-Control-Allow-Origin: *`。对应 [资源报告](../evidence/publishing/v4-online-assets.json) 与 [事件等价报告](../evidence/publishing/v4-online-equivalence.json) 保留验证范围。

官网编辑器已正确装入完整代码，实际浏览器跨域读取十个文件成功；另用真实 Superdough 从远端样本渲染四小节，结果非静音，音符事件与本地版相同。Ego Lite 的 play 入口仍停留在初始化状态，本轮未把它标记为实时播放通过；完整观察见 [线上验证记录](../evidence/publishing/v4-online-verification.json)。

入口访问次数不等于播放次数、独立听众或完整听完次数。重复打开、分享软件预览以及验证请求都可能产生计数。若使用第三方短链统计，其可用性和保留时长取决于该服务，不能将它作为唯一作品备份。

公开 GitHub 仓库不改变音频素材自身的许可或来源，见 [SAMPLES](SAMPLES.md)。
