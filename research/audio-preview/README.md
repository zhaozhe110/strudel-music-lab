# 天台晚风试听渲染

输入是 `.music-check/events.json`，由当前 `天台晚风.strudel` 的真实 Strudel 引擎查询得到。
预览使用相同的 1,240 个调度事件、音符、速度、吉他与贝斯 SoundFont、Roland TR707 鼓采样。
它使用 Node Web Audio API 离线渲染，不需要浏览器或扬声器。

浏览器 Strudel 的原生效果链未被调用；此脚本按事件控制值近似实现包络、滤波、声像、混响和延迟。
因此它用于试听编曲，不是浏览器输出的逐样本录音。

运行：

```sh
cd <LEGACY_WORKSPACE>/.audio-preview
node render.mjs
cd ..
afconvert -f m4af -d aac -b 192000 '天台晚风-preview.wav' '天台晚风-preview.m4a'
```

首次运行下载的音色原始文件保存在 `assets/`，来源与渲染电平统计见 `render-report.json`。
生成文件包括一轮 36 小节（65.45 秒）及 2.5 秒尾音，最终 67.95 秒。
当前 WAV 为 44.1 kHz、16 位、双声道；最高峰值 -1.72 dBFS，没有削波。

原创器乐，不是 Chinese Football 原曲扒谱或录音。
