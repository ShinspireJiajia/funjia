/**
 * map-view.js
 * 快選查詢「地圖模式」:以 Leaflet + OpenStreetMap 圖磚,將目前篩選結果的
 * 地標畫在地圖上,點擊標記可彈出資訊卡(查看詳情 / 導航)。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var DEFAULT_CENTER = [23.48, 120.45]; // 嘉義市區
  var DEFAULT_ZOOM = 11;

  function ensureMap(container) {
    if (container._funjiaMap) {
      return container._funjiaMap;
    }
    var map = L.map(container).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap 貢獻者",
    }).addTo(map);

    map._funjiaMarkersLayer = L.layerGroup().addTo(map);
    map._funjiaItemsById = {};

    map.on("popupopen", function (event) {
      var popupEl = event.popup.getElement();
      if (!popupEl) {
        return;
      }
      popupEl.addEventListener("click", function (evt) {
        var btn = evt.target.closest("[data-action]");
        if (!btn) {
          return;
        }
        var item = map._funjiaItemsById[btn.dataset.id];
        if (item && btn.dataset.action === "nav") {
          ns.landmarkActionSheet.open(item);
        }
      });
    });

    container._funjiaMap = map;
    return map;
  }

  function buildPopupHTML(item) {
    var href = "detail.html?type=" + item.type + "&id=" + item.id;
    return (
      '<div class="map-popup">' +
      '<strong class="map-popup__name">' + item.name + "</strong>" +
      '<p class="map-popup__address"><i class="fa-solid fa-location-dot"></i>' + item.address + "</p>" +
      '<div class="map-popup__actions">' +
      '<a class="map-popup__btn" href="' + href + '">查看詳情</a>' +
      '<button type="button" class="map-popup__btn map-popup__btn--outline" data-action="nav" data-id="' +
      item.id +
      '">導航</button>' +
      "</div></div>"
    );
  }

  /**
   * @param {HTMLElement} container
   * @param {Array} list 目前篩選後的地標清單(需含 lat/lng)
   * @param {string} icon Font Awesome 圖示 class(依分類套用同一圖示),例如 "fa-mountain-sun"
   */
  function render(container, list, icon) {
    var map = ensureMap(container);
    map._funjiaItemsById = {};
    map._funjiaMarkersLayer.clearLayers();

    var bounds = [];
    (list || []).forEach(function (item) {
      if (typeof item.lat !== "number" || typeof item.lng !== "number") {
        return;
      }
      map._funjiaItemsById[item.id] = item;

      var markerIcon = L.divIcon({
        className: "map-marker",
        html: '<span class="map-marker__pin"><i class="fa-solid ' + (icon || "fa-location-dot") + '"></i></span>',
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -30],
      });

      L.marker([item.lat, item.lng], { icon: markerIcon })
        .addTo(map._funjiaMarkersLayer)
        .bindPopup(buildPopupHTML(item));

      bounds.push([item.lat, item.lng]);
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }

    // 容器由 hidden 切換為顯示時,Leaflet 需要重新計算尺寸才能正確繪製圖磚
    setTimeout(function () {
      map.invalidateSize();
    }, 0);
  }

  ns.mapView = {
    render: render,
  };
})(window.FunJia);
