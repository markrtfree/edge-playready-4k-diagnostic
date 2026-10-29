# GitHub 发布指南（公开仓库）

建议仓库：`edge-playready-4k-diagnostic`（Public）

简介（About）：`Experimental Edge PlayReady EME/MediaCapabilities diagnostics for Netflix 4K/HDR; reversible, no license bypass.`

Topics：`microsoft-edge`, `playready`, `netflix`, `4k`, `hdr`, `browser-extension`, `eme`, `mediacapabilities`, `drm`, `windows11`

## 推荐流程

1. 在 GitHub 创建公开空仓库 `edge-playready-4k-diagnostic`，**不要**选择自动生成 README/LICENSE（本项目已有）。
2. 将源代码 ZIP 解压到本地。确保根目录是 `manifest.json`、`diagnose-force.js` 和 `README.md`，不要把原始排障 ZIP / 完整 HAR / 设备会话日志上传。
3. 将整个项目文件夹推送到新仓库。首次推送命令示例（在项目根目录）：

```sh
git init
git branch -M main
git add .
git commit -m "Initial public release: v0.3.2 diagnostic extension"
git remote add origin https://github.com/<YOUR_USERNAME>/edge-playready-4k-diagnostic.git
git push -u origin main
```

4. 等待 GitHub Actions `Tests` 成功；创建 **Release v0.3.2**，在 Release 中上传仅含 `manifest.json`、`diagnose-force.js` 的 extension ZIP。使用 `docs/release-notes-v0.3.2.md` 作为 Release Notes。
5. 首次公开后，先小范围收集匿名测试反馈；暂不宣称解决全部 Netflix 4K 问题，也不建议直接提交到 Edge Add-ons 商店。商店发布需要另外审核与相应开发者账户。

## 发布前的最后核对

- 13 项模拟 API 自动化测试通过。
- 项目源码公开，未包含设备 ESN、PBCID、Xid、登录 Cookie、许可证或视频 URL。
- MIT LICENSE 的 `contributors` 是默认署名。如希望以实际开发者姓名或组织持有版权，请在发布前修改署名。
- 项目非 Netflix / Microsoft / Google 官方产品；用户可随时在扩展管理页禁用并回滚。
- 建议 GitHub 个人资料和本机 Git commit 作者署名由仓库所有者自行确认。
