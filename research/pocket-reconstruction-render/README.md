# Pocket Calculator：Strudel 离线渲染

这里复用本机已安装的 Strudel core、mini、tonal、transpiler 与 **未经修改的 Superdough**，用现有 `node-web-audio-api` 的 OfflineAudioContext 输出试听。没有用另一个合成器近似实现音色。

```sh
cd <LEGACY_WORKSPACE>
node .pocket-reconstruction-render/render.mjs '作品.strudel' 128 '<LEGACY_WORKSPACE>/作品-试听'
```

参数依次为：乐谱、渲染小节数（1 cycle = 1 小节）、输出路径前缀、可选起始 cycle（从 0 计）。输出 WAV、M4A、事件 JSON、报告 JSON。报告记录原谱 SHA256、时长、事件数量、峰值、逐小节 RMS 和实际使用的本地采样文件。

默认保留 1 秒尾音，将峰值统一到 0.84（约 −1.51 dBFS），最后 0.15 秒淡出。`RENDER_NORMALIZE=0` 关闭归一化，`RENDER_TAIL_SECONDS=2` 改变尾音长度。默认音频格式为 44.1 kHz / 16 bit / stereo，AAC 为 192 kbps。

支持原生波形、噪声、ADSR、音高包络、FM、滤波包络、声像、延迟、注册采样。支持 `samples({...}, baseURL)`；本机 `http://127.0.0.1:3009/` URL 优先读取 `strudel/website/public`，然后读取 `dist`。也支持 file URL 与绝对采样路径；它们只用于本地离线渲染，浏览器乐谱应使用 HTTP URL。

适配层只处理 Vite 的未使用 worklet URL 导入、本地采样 URL 和离线不需要的可视化。pulse、supersaw、crush、coarse、ladder、混响以及依赖 AudioWorklet 的效果会明确报错，不会静默替换。随机噪声与不同浏览器的数值实现可能存在微小差别，因此不声称逐样本等同浏览器录音。

已验证：`capability-smoke.strudel` 包含方波低音、正弦 FM、低通包络、白噪声、实际 WAV 采样和延迟，26 个事件完成渲染，没有非有限样本。
