# Fork 更新日志

`local/all-feats` 相对上游的改动记录。每次打包的 Release 说明取自最上面的一个 `##` 段落（见 `.github/workflows/build-all-feats.yml`）；发布新改动时在这里加一个新段落，放在最上面。

## 2026-11-02（修复每日构建版本号）

- 桌面包版本号保持与上游基线一致（如 `0.14.0`），不再打 `-af.<日期>.<sha>` 后缀。原先应用与内置 daemon 版本永远不相等，桌面端每次界面重载都会按"版本不匹配"重启 daemon，新建对话等正在进行的创建会直接报 `Agent manager is shutting down` 并断开连接。
- fork 构建标识不变：Release 标签仍为 `v<基线>-af.<日期>.<sha>`，"关于"页继续显示完整构建版本、构建时间与 commit（来自 `FORK_BUILD_META`）。
- 版本比对改为按稳定基线（去掉前置发布/构建后缀）判断，之后任何一侧再出现后缀都不会再触发误重启。
