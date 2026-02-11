/**
 * =====================================================
 * MMM-QWeather Node Helper
 * 1️⃣ JWT 鉴权（EdDSA）
 * 2️⃣ 城市解析（Geo API）
 * 3️⃣ 当前天气 / 7 天预报 / 日出日落 / AQI
 * =====================================================
 */

const NodeHelper = require("node_helper");

let SignJWT, importPKCS8, fetch;

module.exports = NodeHelper.create({

  start() {
    console.log("MMM-QWeather node_helper started");

    this.privateKey = null;
    this.config = null;
    this.location = null;
    this.timer = null;
  },

  /* ===================================================== */

  async socketNotificationReceived(notification, payload) {
    if (notification !== "QWEATHER_INIT") return;

    this.config = payload;

    if (!SignJWT) {
      const jose = await import("jose");
      SignJWT = jose.SignJWT;
      importPKCS8 = jose.importPKCS8;
    }

    if (!fetch) {
      fetch = (await import("node-fetch")).default;
    }

    await this.loadPrivateKey(payload.privateKey);

    console.log("Resolving city:", this.config.location);
    this.location = await this.lookupCityId(this.config.location);
    console.log("Resolved:", this.location);

    await this.getWeather();

    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(
      () => this.getWeather(),
      payload.updateInterval
    );
  },

  /* ===================================================== */
  /* 工具函数 */
  /* ===================================================== */

  formatCoord(v) {
    return Number(v).toFixed(2);
  },

  isLocationId(loc) {
    return /^\d+$/.test(loc);
  },

  async loadPrivateKey(key) {
    if (!this.privateKey) {
      this.privateKey = await importPKCS8(key, "EdDSA");
    }
  },

  async generateJWT() {
    const now = Math.floor(Date.now() / 1000);

    return new SignJWT({
      sub: this.config.sub,
      iat: now - 30,
      exp: now + 12 * 60 * 60
    })
      .setProtectedHeader({
        alg: "EdDSA",
        kid: this.config.kid
      })
      .sign(this.privateKey);
  },

  async safeFetch(url, token) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
  },

  /* ===================================================== */
  /* 城市查询 */
  /* ===================================================== */

  async lookupCityId(name) {
    const token = await this.generateJWT();

    const url =
      `${this.config.apiBase}/geo/v2/city/lookup?location=` +
      encodeURIComponent(name);

    const data = await this.safeFetch(url, token);

    if (data.code !== "200" || !data.location?.length) {
      throw new Error("City lookup failed");
    }

    return {
      id: data.location[0].id,
      lat: data.location[0].lat,
      lon: data.location[0].lon
    };
  },

  /* ===================================================== */
  /* 7 天预报 */
  /* ===================================================== */

  async get7dForecast(lat, lon) {
    const token = await this.generateJWT();

    const lat2 = this.formatCoord(lat);
    const lon2 = this.formatCoord(lon);

    let url =
      `${this.config.apiBase}/v7/grid-weather/7d?location=${lon2},${lat2}`;

    let data = await this.safeFetch(url, token);

    if (data.code !== "200") {
      console.warn("7d fallback to LocationID");

      url =
        `${this.config.apiBase}/v7/weather/7d?location=${this.location.id}`;

      data = await this.safeFetch(url, token);
    }

    if (data.code !== "200") {
      throw new Error("7d forecast failed");
    }

    return data.daily;
  },

  /* ===================================================== */
  /* 主天气拉取 */
  /* ===================================================== */

  async getWeather() {
    try {
      const token = await this.generateJWT();

      const nowData = await this.safeFetch(
        `${this.config.apiBase}/v7/weather/now?location=${this.location.id}`,
        token
      );

      const daily = await this.get7dForecast(
        this.location.lat,
        this.location.lon
      );

      const sun = await this.getSunTime(
        this.location.lat,
        this.location.lon
      );

      const air = await this.getAirQuality(
        this.location.lat,
        this.location.lon
      );

      this.sendSocketNotification("QWEATHER_DATA", {
        now: {
          ...nowData.now,
          sunrise: sun.sunrise,
          sunset: sun.sunset
        },
        daily,
        air
      });

    } catch (err) {
      console.error("MMM-QWeather error:", err.message);
    }
  },

  /* ===================================================== */
  /* 日出日落 */
  /* ===================================================== */

  async getSunTime(lat, lon) {
    const token = await this.generateJWT();

    const today = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const lat2 = this.formatCoord(lat);
    const lon2 = this.formatCoord(lon);

    let url =
      `${this.config.apiBase}/v7/astronomy/sun?location=${lon2},${lat2}&date=${today}`;

    let data = await this.safeFetch(url, token);

    if (data.code !== "200") {
      console.warn("Sun fallback to LocationID");

      url =
        `${this.config.apiBase}/v7/astronomy/sun?location=${this.location.id}&date=${today}`;

      data = await this.safeFetch(url, token);
    }

    if (data.code !== "200") {
      return { sunrise: "--:--", sunset: "--:--" };
    }

    return {
      sunrise: data.sunrise,
      sunset: data.sunset
    };
  },

  /* ===================================================== */
  /* AQI */
  /* ===================================================== */

  async getAirQuality(lat, lon) {
    const token = await this.generateJWT();

    const lat2 = this.formatCoord(lat);
    const lon2 = this.formatCoord(lon);

    const url =
      `${this.config.apiBase}/airquality/v1/current/${lat2}/${lon2}`;

    const data = await this.safeFetch(url, token);

    if (!data.indexes?.length) return null;

    const idx = data.indexes[0];

    return {
      aqi: idx.aqiDisplay,
      category: idx.category,
      color: idx.color
    };
  }

});

