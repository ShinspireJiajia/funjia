/**
 * route-plan-page.js
 * 路線規劃頁(pages/route-plan.html)邏輯:
 * 起點/終點皆可選擇「目前位置」或旅遊景點,查詢後以模擬資料
 * (route-service)顯示車資、時間與步行/公車轉乘步驟。
 */

(function () {
  "use strict";

  var DEFAULT_LOCATION = { lat: 23.4801, lng: 120.4491, name: "目前位置(嘉義市政府)" };
  var VISIBLE_STEP_COUNT = 3;
  var MODE_ICON = { walk: "fa-person-walking", bus: "fa-bus" };

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    var currentLocation = DEFAULT_LOCATION;
    var attractions = [];

    ns.poiService.getList("attractions").then(function (list) {
      attractions = list;
      fillSelects(attractions);
      detectCurrentLocation();
    });

    document.getElementById("routeForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var origin = resolvePoint(document.getElementById("originSelect").value);
      var destination = resolvePoint(document.getElementById("destinationSelect").value);
      if (!origin || !destination) return;
      var result = ns.routeService.planRoute(origin, destination);
      renderResult(result, origin, destination);
    });

    function fillSelects(list) {
      var options =
        '<option value="current">目前位置</option>' +
        list
          .map(function (a) {
            return '<option value="' + a.id + '">' + a.name + "</option>";
          })
          .join("");

      var originSelect = document.getElementById("originSelect");
      var destSelect = document.getElementById("destinationSelect");
      originSelect.innerHTML = options;
      destSelect.innerHTML = options;
      originSelect.value = "current";
      destSelect.value = list[0] ? list[0].id : "current";
    }

    function detectCurrentLocation() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          currentLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: "目前位置",
          };
          updateCurrentLocationLabel();
        },
        function () {
          // 使用者拒絕定位授權時,維持預設座標(嘉義市政府)
        },
        { timeout: 5000 }
      );
    }

    function updateCurrentLocationLabel() {
      var label = currentLocation.lat.toFixed(4) + ", " + currentLocation.lng.toFixed(4);
      document.querySelectorAll('option[value="current"]').forEach(function (opt) {
        opt.textContent = "目前位置(" + label + ")";
      });
    }

    function resolvePoint(value) {
      if (value === "current") {
        return currentLocation;
      }
      var found = attractions.find(function (a) {
        return a.id === value;
      });
      return found ? { lat: found.lat, lng: found.lng, name: found.name } : null;
    }

    function renderResult(result, origin, destination) {
      var container = document.getElementById("routeResult");
      var stepsHTML = result.steps
        .map(function (step, index) {
          var hiddenClass = index >= VISIBLE_STEP_COUNT ? " is-hidden" : "";
          var metaText =
            "約 " + step.minutes + " 分鐘 (" + step.km.toFixed(1) + " 公里)" +
            (step.mode === "bus" ? ",經過 " + step.stops + " 站" : "");
          return (
            '<div class="route-step mode-' + step.mode + hiddenClass + '">' +
            '<span class="route-step__icon"><i class="fa-solid ' + MODE_ICON[step.mode] + '"></i></span>' +
            '<div class="route-step__body"><p>' + step.label + "</p><span>" + metaText + "</span></div>" +
            "</div>"
          );
        })
        .join("");

      var moreBtn =
        result.steps.length > VISIBLE_STEP_COUNT
          ? '<button type="button" class="route-more-btn" id="routeMoreBtn"><i class="fa-solid fa-chevron-down"></i> 看更多</button>'
          : "";

      var mapUrl =
        "https://www.google.com/maps/dir/?api=1&origin=" +
        origin.lat + "," + origin.lng +
        "&destination=" + destination.lat + "," + destination.lng +
        "&travelmode=transit";

      container.innerHTML =
        '<div class="card">' +
        '<div class="route-summary"><span>車資:<span class="route-summary__fare">$' + result.fare + "</span></span><span>" +
        Math.floor(result.totalMinutes / 60) +
        (result.totalMinutes >= 60 ? " 小時 " : "") +
        (result.totalMinutes % 60) + " 分鐘</span></div>" +
        '<div class="route-steps">' + stepsHTML + "</div>" +
        moreBtn +
        "</div>" +
        '<a class="route-open-map" href="' + mapUrl + '" target="_blank" rel="noopener">' +
        '<i class="fa-solid fa-map-location-dot"></i> 在 Google 地圖中開啟</a>';

      var moreBtnEl = document.getElementById("routeMoreBtn");
      if (moreBtnEl) {
        moreBtnEl.addEventListener("click", function () {
          container.querySelectorAll(".route-step.is-hidden").forEach(function (el) {
            el.classList.remove("is-hidden");
          });
          moreBtnEl.remove();
        });
      }
    }
  });
})();
