Module.register("MMM-QWeather", {

  /* ==============================
   * 模块默认配置
   * ============================== */
  defaults: {
    location: "kunming",                     // 城市（用于 geo 查询 & 标题显示）
    updateInterval: 60 * 60 * 1000,          // 刷新间隔：60 分钟
    iconBase: "modules/MMM-QWeather/icons/", // 天气图标路径（保持你的格式）
    forecastDays: 5                          // 未来预报天数
  },

  /* ==============================
   * 时间格式化：ISO → HH:mm
   * ============================== */
  formatTime(iso) {
    if (!iso) return "--:--";
    return iso.slice(11, 16);
  },

  /* ==============================
   * 预报日期文字：今天 / 明天 / 周X
   * ============================== */
  getDayLabel(dateStr, index) {
    if (index === 0) return "今天";
    if (index === 1) return "明天";
    const d = new Date(dateStr);
    return "周" + "日一二三四五六"[d.getDay()];
  },

  /* ==============================
   * AQI 数值 → CSS 颜色等级
   * ============================== */
  getAqiClass(aqi) {
    if (aqi <= 50) return "aqi-good";
    if (aqi <= 100) return "aqi-moderate";
    if (aqi <= 150) return "aqi-light";
    if (aqi <= 200) return "aqi-medium";
    if (aqi <= 300) return "aqi-heavy";
    return "aqi-severe";
  },

  /* ==============================
   * 模块启动
   * ============================== */
  start() {
    this.now = null;     // 当前天气
    this.daily = null;   // 未来预报
    this.air = null;     // 空气质量
    this.sendSocketNotification("QWEATHER_INIT", this.config);
  },

  /* ==============================
   * 接收 NodeHelper 返回的数据
   * ============================== */
  socketNotificationReceived(notification, payload) {
    if (notification === "QWEATHER_DATA") {
      this.now = payload.now;
      this.daily = payload.daily;
      this.air = payload.air;
      this.updateDom(300);
    }
  },

  /* ==============================
   * 加载模块 CSS
   * ============================== */
  getStyles() {
    return ["MMM-QWeather.css"];
  },

  /* ==============================
   * 主 DOM 渲染函数
   * ============================== */
  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "qweather";

    /* ===== 当前天气标题 ===== */
    const nowHeader = document.createElement("div");
    nowHeader.className = "qweather-header";
    nowHeader.innerHTML = `
      <div class="qweather-header-title">
        当前天气 · 
        <span class="qweather-city">${this.config.location}</span>
        <span class="qweather-text">· ${this.now?.text || ""}</span>
      </div>
      <div class="qweather-header-line"></div>
    `;

    wrapper.appendChild(nowHeader);

    /* ===== 当前天气主体区域 ===== */
    const nowDiv = document.createElement("div");
    nowDiv.className = "now-advanced";

    /* —— 风向 + AQI（右对齐） —— */
    const wind = document.createElement("div");
    wind.className = "now-wind";

    let aqiHtml = "";
    if (this.air && this.air.aqi) {
      const aqiClass = this.getAqiClass(this.air.aqi);
      aqiHtml = `
        · AQI
        <span class="aqi-value ${aqiClass}">
          ${this.air.aqi}
        </span>
      `;
    }

    wind.innerHTML = `➜ ${this.now.windDir} · ${this.now.windScale}级${aqiHtml}`;

    /* —— 日出 / 日落时间（右对齐） —— */
    const sun = document.createElement("div");
    sun.className = "now-sun";
    sun.innerHTML = `
      🌅 ${this.formatTime(this.now.sunrise)}
      &nbsp;
      🌇 ${this.formatTime(this.now.sunset)}
    `;

    /* —— 中央：天气图标 + 温度 + 体感 —— */
    const center = document.createElement("div");
    center.className = "now-center";
    center.innerHTML = `
      <img src="${this.config.iconBase}${this.now.icon}.svg" class="now-icon-large"/>
      <div class="now-temp-line">
        <span class="now-temp-large">${this.now.temp}°</span>
        <span class="now-temp-dot">·</span>
        <span class="now-feels-inline">体感${this.now.feelsLike}°</span>
      </div>
    `;

    nowDiv.append(wind, sun, center);
    wrapper.appendChild(nowDiv);

    /* ===== 天气预报标题 ===== */
    const forecastHeader = document.createElement("div");
    forecastHeader.className = "qweather-header";
    forecastHeader.innerHTML = `
      <div class="qweather-header-title">
        天气预报 · <span class="qweather-city">${this.config.location}</span>
      </div>
      <div class="qweather-line"></div>
    `;
    wrapper.appendChild(forecastHeader);

    /* ===== 未来天气预报列表 ===== */
    const forecast = document.createElement("div");
    forecast.className = "forecast";

    this.daily.slice(0, this.config.forecastDays).forEach((day, index) => {
      const row = document.createElement("div");
      row.className = "forecast-row";

      const label = document.createElement("div");
      label.className = "forecast-day";
      label.innerHTML = this.getDayLabel(day.fxDate, index);

      const icon = document.createElement("img");
      icon.className = "forecast-icon";
      icon.src = `${this.config.iconBase}${day.iconDay}.svg`;

      const tempMax = document.createElement("div");
      tempMax.className = "forecast-max";
      tempMax.innerHTML = `${day.tempMax}°~`;

      const tempMin = document.createElement("div");
      tempMin.className = "forecast-min";
      tempMin.innerHTML = `~${day.tempMin}°`;

      row.append(label, icon, tempMax, tempMin);
      forecast.appendChild(row);
    });

    wrapper.appendChild(forecast);

    return wrapper;
  }
});
