/**
 * weather-card.js
 * 首頁天氣資訊卡元件:依序顯示太保市、布袋鎮、阿里山鄉、嘉義市(由 data 中 homeTab 標記篩選),
 * 預設選中第一個分頁(太保市),可點擊地點切換。
 * 同時負責「近三日預報」區塊,兩者共用目前選中的地點。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  function renderWeatherCard(container, forecastContainer, weatherData) {
    var tabLocations = weatherData.locations.filter(function (loc) {
      return loc.homeTab;
    });
    if (!tabLocations.length) {
      tabLocations = weatherData.locations;
    }
    var activeId = tabLocations[0].id;

    function paint() {
      var active = weatherData.locations.find(function (loc) {
        return loc.id === activeId;
      });
      var iconClass = ns.weatherService.getIconClass(active.weatherIcon);

      container.innerHTML =
        '<div class="weather-card">' +
        '<div class="weather-card__header">' +
        '<div class="weather-card__tabs">' +
        tabLocations
          .map(function (loc) {
            return (
              '<button class="weather-tab' +
              (loc.id === activeId ? " is-active" : "") +
              '" data-loc="' +
              loc.id +
              '">' +
              loc.locationName +
              "</button>"
            );
          })
          .join("") +
        "</div>" +
        '<span class="weather-card__update">資料更新:' + formatTime(weatherData.updateTime)  +
        "</div>" +
        '<div class="weather-card__main">' +
        '<div class="weather-card__primary">' +
        '<div class="weather-card__temp-row">' +
        '<i class="fa-solid ' + iconClass + ' weather-card__icon"></i>' +
        '<span class="weather-card__temp">' + active.temperature + "<small>°C</small></span>" +
        "</div>" +
        '<p class="weather-card__desc">' + active.weatherDesc + "</p>" +
        "</div>" +
        '<div class="weather-card__stats">' +
        '<span class="weather-card__stat"><i class="fa-solid fa-droplet"></i>' + active.minT + "°/" + active.maxT + "°</span>" +
        '<span class="weather-card__stat is-rain"><i class="fa-solid fa-cloud-rain"></i>' + active.pop + "%</span>" +
        '<span class="weather-card__stat is-humidity"><i class="fa-solid fa-droplet"></i>' + active.humidity + "%</span>" +
        '<span class="weather-card__stat is-uv"><i class="fa-solid fa-sun"></i>紫外線 ' + active.uvIndex + " " + active.uvLevel + "</span>" +
        "</div>" +
        "</div>" +
        "</div>";

      container.querySelectorAll(".weather-tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
          activeId = tab.getAttribute("data-loc");
          paint();
        });
      });

      if (forecastContainer) {
        paintForecast(active);
      }
    }

    function paintForecast(active) {
      forecastContainer.innerHTML = active.forecast3d
        .map(function (day) {
          var iconClass = ns.weatherService.getIconClass(day.weatherIcon);
          return (
            '<div class="forecast3d-item">' +
            '<span class="forecast3d-item__label">' + day.label + "</span>" +
            '<i class="fa-solid ' + iconClass + ' forecast3d-item__icon"></i>' +
            '<span class="forecast3d-item__temp">' + day.maxT + "°<span class=\"lo\">/" + day.minT + "°</span></span>" +
            "</div>"
          );
        })
        .join("");
    }

    function formatTime(iso) {
      var d = new Date(iso);
      var hh = String(d.getHours()).padStart(2, "0");
      var mm = String(d.getMinutes()).padStart(2, "0");
      return hh + ":" + mm;
    }

    paint();
  }

  ns.weatherCard = {
    render: renderWeatherCard,
  };
})(window.FunJia);
