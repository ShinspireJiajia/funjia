/**
 * hsr-schedule.js
 * 高鐵時刻查詢結果列表元件:呈現嘉義站北上/南下班次(出發時間、車次、抵達站與時間)。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  // 嘉義高鐵站地標資訊,供地標動作選單(導航/複製地址)使用
  var STATION = {
    name: "嘉義高鐵站",
    address: "622嘉義縣太保市高鐵一路1號",
    lat: 23.452286,
    lng: 120.315541,
  };

  function buildStationCardHTML(station) {
    return (
      '<button type="button" class="hsr-station-card">' +
      '<i class="fa-solid fa-train-subway"></i>' +
      '<div class="hsr-station-card__body">' +
      "<strong>" + station.name + "</strong>" +
      "<span>" + station.address + "</span>" +
      "</div>" +
      '<i class="fa-solid fa-chevron-right hsr-station-card__chevron"></i>' +
      "</button>"
    );
  }

  function renderStationCard(container) {
    container.innerHTML = buildStationCardHTML(STATION);
    container.querySelector(".hsr-station-card").addEventListener("click", function () {
      ns.landmarkActionSheet.open(STATION);
    });
  }

  function buildRowHTML(item) {
    return (
      '<div class="hsr-row">' +
      '<div class="hsr-row__time">' + item.departure + "</div>" +
      '<div class="hsr-row__body">' +
      '<div class="hsr-row__dest"><i class="fa-solid fa-train"></i> ' + item.from + " → " + item.to + "</div>" +
      '<div class="hsr-row__meta">車次 ' + item.trainNo + (item.note ? "・" + item.note : "") + "</div>" +
      "</div>" +
      '<div class="hsr-row__arrival"><span>抵達</span>' + item.arrival + "</div>" +
      "</div>"
    );
  }

  function renderList(container, items) {
    if (!items || !items.length) {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-regular fa-face-frown"></i><p>目前查無相關班次</p></div>';
      return;
    }
    container.innerHTML = items.map(buildRowHTML).join("");
  }

  ns.hsrSchedule = {
    renderList: renderList,
    renderStationCard: renderStationCard,
  };
})(window.FunJia);
