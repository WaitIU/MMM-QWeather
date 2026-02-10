# MMM-QWeather 🌤️

基于 **和风天气（QWeather）API** 的 MagicMirror² 天气模块支持 **当前天气 / 多日预报 / 日出日落 / 空气质量 AQI（按等级变色）**

> 🔐 使用和风天气 **EdDSA JWT 官方鉴权方式**

---

## ✨ 功能特性

- 🌡 **当前天气**（温度 / 体感温度 / 天气状况）
- 🌬 **风向 & 风力等级**
- 🌅 **日出** / 🌇 **日落** 时间
- 📅 **未来 7 天预报**（可配置显示天数）
- 🌫 **空气质量 AQI**（按等级自动变色）
- 🇨🇳 **中文显示优化**，适合国内环境

---

## 📸 界面预览

> 推荐在深色主题下使用（MagicMirror² 默认 / 自定义主题均可）

- 🏷 顶部：当前天气 + 城市 + 天气状况
- 🌡 中部：天气图标 + 当前温度 + 体感温度
- 📊 顶部信息：风向 / 风力 / AQI / 日出日落
- 📆 底部：未来多日天气预报

![界面预览](screenshots/preview.png)

---

## 🔧 安装

```bash
# 进入 MagicMirror 模块目录
cd ~/MagicMirror/modules

# 克隆仓库
git clone https://github.com/WaitIU/MMM-QWeather.git

# 安装依赖
cd MMM-QWeather
npm install
```

## 🔄 更新

进入模块目录后执行：

```bash
cd ~/MagicMirror/modules/MMM-QWeather
git pull
```

## ⚙️ 配置

在 `config/config.js` 的 `modules` 数组中添加：

```js
{
  module: "MMM-QWeather",
  position: "top_right",
  config: {
    location: "渠县",
    apiBase: "https://your_api_host",
    privateKey: `-----BEGIN PRIVATE KEY-----YOUR_PRIVATE_KEY-----END PRIVATE KEY-----`,
    sub: "你的项目ID",
    kid: "你的凭据ID"
  }
}
```

## 📋 配置选项说明

### 必填参数


| 参数         | 说明                                                                                  |
| ------------ | ------------------------------------------------------------------------------------- |
| `location`   | 城市名称（支持**中文 / 拼音 / 英文**） 示例：`渠县` / `quxian` / `New York`           |
| `apiBase`    | 和风天气 API Host 📖 https://dev.qweather.com/docs/configuration/api-host/            |
| `privateKey` | Ed25519 私钥（JWT 用） 📖 https://dev.qweather.com/docs/configuration/authentication/ |
| `sub`        | 项目 ID                                                                               |
| `kid`        | JWT 凭据 ID                                                                           |

## 🎨 图标说明

- 天气图标使用 **和风天气官方图标库**
- 项目地址：https://github.com/qwd/Icons
- 模块内使用 SVG，适配深色主题

## ℹ️ About

写这个模块的初衷是：

> 国内网络环境下，可用的 MagicMirror² 天气模块选择不多，
> 而和风官方 QWeather API 稳定、数据完整，却一直缺少现成模块。

所以我借助AI基于 **和风天气官方 API + JWT 鉴权** 写了这个模块。

这是我第一次完整写 MagicMirror² 模块，如有不足请多多包含。

当然，拉取请求也非常欢迎。

## 📜 行为准则

请注意，本项目发布时附带了[贡献者盟约行为准则](www.contributor-covenant.org/version/2/1/code_of_conduct/)。参与本项目即表示您同意遵守其条款。
