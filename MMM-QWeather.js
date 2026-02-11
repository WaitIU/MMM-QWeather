Module.register("MMM-QWeather", {

  /* ==============================
   * 默认配置
   * ============================== */
  defaults: {
    location: "kunming",
    updateInterval: 26 * 60 * 1000,
    iconBase: "modules/MMM-QWeather/icons/",
    forecastDays: 5
  },

  /* ==============================
   * ISO 时间 → HH:mm
   * ============================== */
  formatTime(iso) {
    if (!iso) return "--:--";
    return iso.slice(11, 16);
  },

  /* ==============================
   * 日期文字
   * ============================== */
  getDayLabel(dateStr, index) {
    if (index === 0) return "今天";
    if (index === 1) return "明天";
    const d = new Date(dateStr);
    return "周" + "日一二三四五六"[d.getDay()];
  },

  /* ==============================
   * AQI 分级
   * ============================== */
  getAqiClass(aqi) {
    if (aqi <= 50) return "aqi-good";
    if (aqi <= 100) return "aqi-moderate";
    if (aqi <= 150) return "aqi-light";
    if (aqi <= 200) return "aqi-medium";
    if (aqi <= 300) return "aqi-heavy";
    return "aqi-severe";
  },

  start() {
    this.now = null;
    this.daily = null;
    this.air = null;
    this.sendSocketNotification("QWEATHER_INIT", this.config);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "QWEATHER_DATA") {
      this.now = payload.now;
      this.daily = payload.daily;
      this.air = payload.air;
      this.updateDom(300);
    }
  },

  getStyles() {
    return ["MMM-QWeather.css"];
  },

  /* ==============================
   * 主 DOM
   * ============================== */
  getDom() {

    const wrapper = document.createElement("div");
    wrapper.className = "qweather";

    /* ===== 防止数据未加载时报错 ===== */
    if (!this.now || !this.daily) {
      wrapper.innerHTML = "Loading weather...";
      return wrapper;
    }

    /* ===== 当前天气标题 ===== */
    const nowHeader = document.createElement("div");
    nowHeader.className = "qweather-header";
    nowHeader.innerHTML = `
      <div class="qweather-header-title">
        当前天气 · 
        <span class="qweather-city">${this.config.location}</span>
        <span class="qweather-text"> · ${this.now.text || ""}</span>
      </div>
      <div class="qweather-header-line"></div>
    `;
    wrapper.appendChild(nowHeader);

    /* ===== 当前天气主体 ===== */
    const nowDiv = document.createElement("div");
    nowDiv.className = "now-advanced";

    /* 风向 + AQI */
    const wind = document.createElement("div");
    wind.className = "now-wind";

    let aqiHtml = "";
    if (this.air && this.air.aqi) {
      const aqiClass = this.getAqiClass(this.air.aqi);
      aqiHtml = ` · AQI <span class="aqi-value ${aqiClass}">${this.air.aqi}</span>`;
    }

    wind.innerHTML =
      `➜ ${this.now.windDir} · ${this.now.windScale}级${aqiHtml}`;

    /* 日出日落 */
    const sun = document.createElement("div");
    sun.className = "now-sun";
    sun.innerHTML = `
      <span>
        <img src="modules/MMM-QWeather/sun/Sunrise.svg" class="sun-icon">
        ${this.formatTime(this.now.sunrise)}
      </span>
      &nbsp;&nbsp;
      <span>
        <img src="modules/MMM-QWeather/sun/Sunset.svg" class="sun-icon">
        ${this.formatTime(this.now.sunset)}
      </span>
    `;

    /* 中央区域 */
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

    /* ===== 预报标题 ===== */
    const forecastHeader = document.createElement("div");
    forecastHeader.className = "qweather-header";
    forecastHeader.innerHTML = `
      <div class="qweather-header-title">
        天气预报 · <span class="qweather-city">${this.config.location}</span>
      </div>
      <div class="qweather-line"></div>
    `;
    wrapper.appendChild(forecastHeader);

    /* ===== 预报列表 ===== */
    const forecast = document.createElement("div");
    forecast.className = "forecast";

    this.daily
      .slice(0, this.config.forecastDays)
      .forEach((day, index) => {

        const row = document.createElement("div");
        row.className = "forecast-row";

        row.innerHTML = `
          <div>${this.getDayLabel(day.fxDate, index)}</div>
          <img class="forecast-icon"
               src="${this.config.iconBase}${day.iconDay}.svg">
          <div>${day.tempMax}°~</div>
          <div>~${day.tempMin}°</div>
        `;

        forecast.appendChild(row);
      });

    wrapper.appendChild(forecast);

    return wrapper;
  }
});

