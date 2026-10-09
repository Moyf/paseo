# Fork 更新日志

`local/all-feats` 相对上游的改动记录。每次打包的 Release 说明取自最上面的一个 `##` 段落（见 `.github/workflows/build-all-feats.yml`）；发布新改动时在这里加一个新段落，放在最上面。

## 2026-10-09

### 修复

- Windows 下点击回答里的 `file:///C:/.../opencode.jsonc:95` 这类链接报 ENOENT：`file://` 路径里的 `:行号` 后缀现在会被剥离并定位到对应行
- 相对路径带工作区文件夹名前缀（如 `civil-rhino\docs\report.html`）提示找不到文件：改由守护进程按后缀匹配解析，匹配不到时自动去掉前缀重试；真实存在的同名子文件夹优先
- 点击文件夹路径报 "Requested path is not a file"：先向守护进程探测目录类型，文件夹直接在文件浏览器中打开并导航到该目录

### 新增

- 回答里的文件/文件夹路径支持右键菜单（桌面端，参考 Codex）：打开文件、在侧边打开、复制路径（Windows 下为原生反斜杠格式）、复制相对路径、在资源管理器中显示（仅本地 daemon）
