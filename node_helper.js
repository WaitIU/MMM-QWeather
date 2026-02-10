/**
 * =====================================================
 * 1️⃣ JWT 鉴权（和风天气 EdDSA）
 * 2️⃣ 城市解析（Geo API）
 * 3️⃣ 当前天气 / 7 天预报 / 日出日落 / AQI
 * 4️⃣ 将数据通过 socket 发给前端
 * =====================================================
 */

const NodeHelper = require("node_helper");

/**
 * 由于 MagicMirror 仍是 CommonJS
 * 但 jose / node-fetch 是 ESM
 * 所以这里使用「懒加载 import」
 */
let SignJWT, importPKCS8, fetch;

module.exports = NodeHelper.create({
  /**
   * node_helper 启动时调用
   */
  start() {
    console.log("MMM-QWeather node_helper started");

    this.privateKey = null; // JWT 私钥
    this.config = null;     // 模块配置
    this.location = null;   // 城市信息（id + lat + lon）
  },

  /**
   * 接收前端 socket 通知
   */
  async socketNotificationReceived(notification, payload) {
    if (notification !== "QWEATHER_INIT") return;

    this.config = payload;

    /**
     * ① 懒加载 jose（JWT 生成）
     */
    if (!SignJWT) {
      const jose = await import("jose");
      SignJWT = jose.SignJWT;
      importPKCS8 = jose.importPKCS8;
    }

    /**
     * ② 懒加载 node-fetch
     */
    if (!fetch) {
      fetch = (await import("node-fetch")).default;
    }

    /**
     * ③ 加载 EdDSA 私钥（只加载一次）
     */
    await this.loadPrivateKey(payload.privateKey);

    /**
     * ④ 城市解析
     * 使用 Geo API 获取：
     * - 城市 ID（天气接口用）
     * - 纬度 / 经度（AQI / 网格预报用）
     */
    console.log("MMM-QWeather: resolving city:", this.config.location);
    this.location = await this.lookupCityId(this.config.location);
    console.log("MMM-QWeather: resolved:", this.location);

    /**
     * ⑤ 立即拉一次天气
     */
    await this.getWeather();

    /**
     * ⑥ 定时刷新
     */
    setInterval(
      () => this.getWeather(),
      payload.updateInterval
    );
  },

  /* =====================================================
   * 工具函数
   * ===================================================== */

  /**
   * 判断 location 是否为城市 ID
   */
  isLocationId(loc) {
    return /^\d+$/.test(loc);
  },

  /**
   * 加载 PKCS8 私钥（EdDSA）
   */
  async loadPrivateKey(key) {
    if (!this.privateKey) {
      this.privateKey = await importPKCS8(key, "EdDSA");
    }
  },

  /**
   * 生成 JWT Token（和风天气官方方式）
   */
  async generateJWT() {
    const now = Math.floor(Date.now() / 1000);

    return await new SignJWT({
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

  /**
   * 城市查询（Geo API）
   * 返回：id / lat / lon
   */
  async lookupCityId(name) {
    const token = await this.generateJWT();

    const url =
      `${this.config.apiBase}/geo/v2/city/lookup?location=` +
      encodeURIComponent(name);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (data.code !== "200" || !data.location || !data.location.length) {
      throw new Error("City lookup failed");
    }

    return {
      id: data.location[0].id,
      lat: data.location[0].lat,
      lon: data.location[0].lon
    };
  },

  /* =====================================================
   * 7 天天气预报（Grid Weather）
   * ===================================================== */

  async get7dForecast(lat, lon) {
    const token = await this.generateJWT();

    const url =
      `${this.config.apiBase}/v7/grid-weather/7d` +
      `?location=${lon},${lat}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (data.code !== "200") {
      throw new Error("7d forecast fetch failed");
    }

    return data.daily;
  },

  /* =====================================================
   * 主天气拉取逻辑
   * ===================================================== */

  async getWeather() {
    try {
      const token = await this.generateJWT();

      /**
       * ① 当前天气
       */
      const nowRes = await fetch(
        `${this.config.apiBase}/v7/weather/now?location=${this.location.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const nowData = await nowRes.json();

      /**
       * ② 7 天预报
       */
      const daily = await this.get7dForecast(
        this.location.lat,
        this.location.lon
      );

      /**
       * ③ 日出 / 日落
       */
      const sun = await this.getSunTime(
        this.location.lat,
        this.location.lon
      );
      // console.log("Sun location:", this.location.lat, this.location.lon);


      /**
       * ④ 空气质量 AQI
       */
      const air = await this.getAirQuality(
        Number(this.location.lat).toFixed(2),
        Number(this.location.lon).toFixed(2)
      );

      /**
       * ⑤ 发送给前端模块
       */
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
      console.error("MMM-QWeather error:", err);
    }
  },

  /* =====================================================
   * 日出 / 日落时间
   * ===================================================== */

  async getSunTime(lat, lon) {
    const token = await this.generateJWT();
    // YYYYMMDD
    const today = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const url =
      `${this.config.apiBase}/v7/astronomy/sun` +
      `?location=${lon},${lat}&date=${today}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (data.code !== "200") {
      console.error("Sun API error:", data);
      return {
        sunrise: "--:--",
        sunset: "--:--"
      };
    }

    return {
      sunrise: data.sunrise,
      sunset: data.sunset
    };
  },


  /* =====================================================
   * 空气质量 AQI
   * ===================================================== */

  async getAirQuality(lat, lon) {
    const token = await this.generateJWT();

    const url =
      `${this.config.apiBase}/airquality/v1/current/${lat}/${lon}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!data.indexes || !data.indexes.length) {
      return null;
    }

    const idx = data.indexes[0];

    return {
      aqi: idx.aqiDisplay,   // AQI 数值
      category: idx.category, // AQI 等级文字
      color: idx.color      // 官方推荐颜色
    };
  },
});
