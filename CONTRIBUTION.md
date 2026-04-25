# Contribution Guide

## GitHub Action 发布配置

本项目使用 `.github/workflows/publish-on-release-tag.yml` 自动发布到 npm。

### 1) 配置仓库 Secret

在 GitHub 仓库中添加：

- `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`
- 名称：`NPM_TOKEN`
- 值：npm 账号的 Access Token（需具备 publish 权限）

### 2) 触发规则

发布工作流在 push tag 时触发，且 tag 必须匹配：

- `release-x.y.z`（例如：`release-1.0.0`）

工作流会校验：

- tag 格式必须正确
- tag 版本必须与 `package.json` 的 `version` 一致

### 3) 发布步骤

先更新 `package.json` 版本号，再执行：

```bash
git tag release-1.0.0
git push origin release-1.0.0
```

### 4) 工作流执行内容

- `npm ci`
- `npm run build:prod`
- `npm publish --access public`

### 5) 常见失败原因

- 未配置 `NPM_TOKEN`
- tag 不符合 `release-x.y.z`
- tag 版本与 `package.json` 版本不一致
