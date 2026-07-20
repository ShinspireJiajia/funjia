/**
 * geocode-service.js
 * 地址/地點名稱定位服務:呼叫 OpenStreetMap Nominatim 公開 API,將使用者輸入的
 * 自訂地點名稱或地址轉換為經緯度,供揪團「自行建立行程」的最佳動線計算使用。
 * demo 階段直接呼叫 Nominatim(免金鑰,但有流量限制),未來正式上線建議
 * 改接付費地理編碼服務(Google Geocoding API 等)並加上後端快取。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var ENDPOINT = "https://nominatim.openstreetmap.org/search";
  // 嘉義縣市概略範圍,用於提升在地搜尋結果的相關性(非強制邊界)
  var CHIAYI_VIEWBOX = "120.10,23.65,120.85,23.00";
  var REQUEST_TIMEOUT_MS = 6000;
  var cache = {};
  var lastRequestAt = 0;
  var MIN_INTERVAL_MS = 1000; // 遵守 Nominatim 使用政策:同來源請求間隔至少 1 秒

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function throttle() {
    var elapsed = Date.now() - lastRequestAt;
    var remaining = MIN_INTERVAL_MS - elapsed;
    lastRequestAt = Date.now() + Math.max(0, remaining);
    return remaining > 0 ? wait(remaining) : Promise.resolve();
  }

  /**
   * @param {string} query 地點名稱或地址
   * @returns {Promise<{lat:number, lng:number, displayName:string}|null>}
   */
  function geocode(query) {
    var key = query.trim();
    if (!key) {
      return Promise.resolve(null);
    }
    if (cache.hasOwnProperty(key)) {
      return Promise.resolve(cache[key]);
    }

    return throttle().then(function () {
      // 注意:countrycodes 與 viewbox 同時帶入時,Nominatim 若未明確帶 bounded 參數會回傳空結果,
      // 須明確指定 bounded=0(僅用於加權排序,不強制邊界)才能正常取得結果。
      var url =
        ENDPOINT +
        "?format=json&limit=1&countrycodes=tw&viewbox=" +
        CHIAYI_VIEWBOX +
        "&bounded=0&q=" +
        encodeURIComponent(key);

      var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS) : null;

      return fetch(url, {
        headers: { "Accept-Language": "zh-TW" },
        signal: controller ? controller.signal : undefined,
      })
        .then(function (res) {
          if (!res.ok) throw new Error("geocode failed: " + res.status);
          return res.json();
        })
        .then(function (list) {
          var result =
            list && list[0]
              ? { lat: parseFloat(list[0].lat), lng: parseFloat(list[0].lon), displayName: list[0].display_name }
              : null;
          cache[key] = result;
          return result;
        })
        .catch(function () {
          cache[key] = null;
          return null;
        })
        .finally(function () {
          if (timer) clearTimeout(timer);
        });
    });
  }

  ns.geocodeService = {
    geocode: geocode,
  };
})(window.FunJia);
