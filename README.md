# 网页版扫雷

一个原生 HTML/CSS/JavaScript 实现的扫雷小游戏。

## 运行方式

直接用浏览器打开 `index.html` 即可开始游戏。

## 功能

- 三档难度（初级/中级/高级）
- 首次点击安全（首格及周围不会出现雷）
- 左键翻格、右键插旗、移动端长按插旗
- 自动扩散空白区
- 胜负判定与结果提示
- 计时与剩余雷数显示

## 发布到 GitHub Pages

仓库已包含自动部署工作流：`.github/workflows/deploy-pages.yml`。

首次使用需要在仓库里做一次设置：

1. 打开仓库 `Settings` -> `Pages`
2. 在 `Build and deployment` 中将 `Source` 设为 **GitHub Actions**
3. 保存后，推送代码（或在 `Actions` 页面手动运行 `Deploy GitHub Pages`）

发布成功后，访问：

- `https://<你的用户名>.github.io/<仓库名>/`
