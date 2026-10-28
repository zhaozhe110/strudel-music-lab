# 在线播放与分享

当前仓库为 public。GitHub 同时保存代码与采样，无需再启动自己的 HTTP 服务器或部署其他音频服务。

## 播放《袖珍电路》v4

打开 **<https://zhaozhe110.github.io/strudel-music-lab/>**，会自动进入已装入完整代码的 Strudel，再点击官网的 **play**。

- [官网版源码](../pieces/little-logic/袖珍电路-v4-online.strudel)：从 GitHub Raw 的固定提交加载十个短 WAV；共 363,808 字节。
- [本地版源码](../pieces/little-logic/袖珍电路-v4.strudel)：保持原样，继续使用 `127.0.0.1:3009`。
- macOS 可双击 [官网入口](../launchers/袖珍电路-v4-官网.webloc)，直接进入已装入代码的 Strudel 页面。

两份代码是同一首曲子的两种资源地址，1250 个事件、136 BPM、64 小节编排、音量、采样选择和顶部可视化保持一致。线上版不是新的作曲版本。

固定采样提交为 `aea8f3a6573b9c09570f001bd2ceffc2e1adc62a`。主分支日后修改采样不会悄悄改变已经分享的版本；如确需更新，应生成新分发版本和链接。仓库改回 private、删除仓库或导致固定提交不可访问，会使这些外部采样链接失效。

## 分享入口

推荐分享这个 **47 字符**的固定入口：

<https://zhaozhe110.github.io/strudel-music-lab/>

GitHub Pages 只保存一个很小的自动跳转页面，不运行 Strudel 引擎。它把浏览器带到官方编辑器，完整代码、可编辑性和顶部可视化保留；不需要再经过 GitHub 作品页点击一次。

**跳转后地址栏重新变成长链接是正常的。以后发给别人仍复制上面的固定入口，不要复制落地后的地址栏，也不用再次点 Strudel Share。** 该入口指向当前保存并发布的 v4，浏览器中的临时改动不会自动同步到它。

需要作品介绍时也可以分享：

<https://github.com/zhaozhe110/strudel-music-lab/blob/main/docs/PLAY_V4.md>

作品介绍页包含试听、源码和进入官方编辑器的按钮，仍可作为备用入口。

原始 Strudel 分享地址保留在作品页和 `.webloc` 中，不依赖第三方短链服务才能播放。此前尝试 is.gd 时连接超时，没有生成第三方短链；当前提供的是自有 GitHub Pages 跳转入口。

## 为什么 Strudel Share 还是很长

它把整份源码编码在 URL 的 `#` 后面。用户贴来的链接有 12,096 字符，前面还附加了默认 Prebake 脚本；其中的 `ratchet` 没有被这首作品使用。去掉该段后是 11,532 字符，仍然很长。

在 Settings → prebake 中取消 **share with patterns** 可以避免追加预加载脚本，但并不会把整曲代码变成短地址。不要为了缩短链接把可编辑源码换成只会运行、看不到整曲的 loader。当前固定入口跳转后装入的是完整原文，已核对源码 SHA-256。

## 更新固定入口

`scripts/build-share-site.mjs` 从 `pieces/little-logic/袖珍电路-v4-online.strudel` 生成 `share-site/index.html` 和 `.nojekyll`，不修改乐谱。修改已发布的作品后，按顺序重新构建、提交并发布：

```sh
npm run build:share
git add pieces/little-logic/袖珍电路-v4-online.strudel share-site
git commit -m "Update the shared score"
git push origin main
git subtree push --prefix share-site origin gh-pages
```

GitHub Pages 的来源是 `gh-pages` 分支根目录，HTTPS 已启用。该分支只含小型跳转页，不包含整个工作区。构建完成后验证短入口能加载正确版本，再分享。

## 无需新账号的访问统计

打开 [GitHub Insights → Traffic](https://github.com/zhaozhe110/strudel-music-lab/graphs/traffic)。当前账号的流量 API 已读取成功，支持最近 14 天的仓库浏览、访客、来源和热门内容；需要仓库推送权限才能查看。

这统计的是整个仓库的访问，并不专属于 v4，也不能当作 GitHub Pages 短入口的点击统计。**当前跳转页没有安装分析脚本或计数后端，独立点击统计尚未接入。** 热门内容中出现作品页路径后，可进一步看该仓库页面的访问表现。访客数据按小时更新，来源及热门内容按天更新；新发布后暂时显示零不能证明没有人打开。规则见 [GitHub 官方说明](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository)。

如果以后需要独立点击统计，可接入带统计的链接服务或分析服务；此版本没有注册新账号。is.gd 的目标 URL 上限较低，不能直接塞入当前约 11,532 字符的 Strudel 链接，也不应用自动跳转脚本绕过其链式跳转限制。

## 验证与统计的含义

当前固定入口的 HTTPS 响应与生成 HTML 一致，GitHub Pages 构建成功；实际浏览器已自动跳转到 `strudel.cc`，并装入 SHA-256 完全相同的完整源码。见 [跳转验证](../evidence/publishing/share-redirect.json)。本次没有改音符、采样或音色，因此没有重复整曲渲染。

十个 GitHub Raw 文件已匿名下载，HTTP 200、SHA-256 与本地相同，响应包含 `Access-Control-Allow-Origin: *`。对应 [资源报告](../evidence/publishing/v4-online-assets.json) 与 [事件等价报告](../evidence/publishing/v4-online-equivalence.json) 保留验证范围。

官网编辑器已正确装入完整代码，实际浏览器跨域读取十个文件成功；另用真实 Superdough 从远端样本渲染四小节，结果非静音，音符事件与本地版相同。Ego Lite 的 play 入口仍停留在初始化状态，本轮未把它标记为实时播放通过；完整观察见 [线上验证记录](../evidence/publishing/v4-online-verification.json)。

入口访问次数不等于播放次数、独立听众或完整听完次数。重复打开、分享软件预览以及验证请求都可能产生计数。若使用第三方短链统计，其可用性和保留时长取决于该服务，不能将它作为唯一作品备份。

公开 GitHub 仓库不改变音频素材自身的许可或来源，见 [SAMPLES](SAMPLES.md)。
