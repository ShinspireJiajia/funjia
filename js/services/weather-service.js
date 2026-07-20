/**
 * weather-service.js
 * 天氣資訊服務層。目前讀取 data/weather-mock.json,
 * 未來串接中央氣象署開放資料平台(opendata.cwa.gov.tw)時,
 * 改為 fetch 該平台的 F-C0032-001 等資料集並在此轉換格式即可。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var WEATHER_ICON_MAP = {
    sunny: "fa-sun",
    "sun-cloud": "fa-cloud-sun",
    cloudy: "fa-cloud",
    rain: "fa-cloud-rain",
    thunderstorm: "fa-cloud-bolt",
  };

  function getIconClass(weatherIcon) {
    return WEATHER_ICON_MAP[weatherIcon] || "fa-cloud-sun";
  }

  function getWeather() {
    return ns.dataService.fetchJson("weather-mock.json");
  }

  function getLocationWeather(locationId) {
    return getWeather().then(function (data) {
      return data.locations.find(function (loc) {
        return loc.id === locationId;
      });
    });
  }

  function findByName(locationName) {
    return getWeather().then(function (data) {
      return data.locations.find(function (loc) {
        return loc.locationName.indexOf(locationName) !== -1;
      });
    });
  }

  ns.weatherService = {
    getWeather: getWeather,
    getLocationWeather: getLocationWeather,
    findByName: findByName,
    getIconClass: getIconClass,
  };
})(window.FunJia);
