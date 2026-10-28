# 验证与来源记录

这里保存历史事件表、验证报告和采样来源清单。JSON 中的事实只对应当时的源码、范围与环境；不代表其他版本或其他机器已通过同样检查。

- `pocket-calculator-v3/`、`pocket-calculator-v4/`：原创电子作品的事件、调式、声部保持和音频验证。
- `pocket-reconstruction-*`、`pocket-visual-fix/`：参考复刻的转写、样本、渲染及可视化验证。
- `restored-song/`、`legato-ab/`、`string-damping/`：原旋律恢复、拨弦与同弦止音实验。
- `reference-packs/`：外部素材的本地来源记录。
- `packaging/import-manifest.json`：旧工作区到本仓库的文件映射、原始 SHA-256 与打包后 SHA-256；标记历史文本中的路径替换。
- `packaging/package-manifest.json`：本次待上传文件的大小和 SHA-256；清单及审计文件本身不参与散列，避免循环引用。
- `packaging/package-audit.json`：文件范围、源文件保持、维护文档链接、个人路径与常见凭据模式扫描的结果。
- `packaging/` 的其他报告：本次整理与新工具的实际验证，范围以各报告为准。

旧报告中的个人绝对路径已脱敏。源路径为旧工作区的相对路径，不应作为新工具的运行依赖。新运行结果默认写到忽略的 `outputs/`，只有明确选定的证据才归档进此目录。

事件有效、音频非静音和浏览器实时播放是三种不同检查。技术通过不等于听感获得用户认可；具体解释见 [HANDOFF](../HANDOFF.md)。
