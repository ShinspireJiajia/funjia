/**
 * season-service.js
 * 依目前月份判斷四季,取得對應的主視覺文案與景點資料(data/seasons.json)。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var SEASON_MONTHS = {
    spring: [3, 4, 5],
    summer: [6, 7, 8],
    autumn: [9, 10, 11],
    winter: [12, 1, 2],
  };

  function getCurrentSeasonId(date) {
    var month = (date || new Date()).getMonth() + 1;
    for (var seasonId in SEASON_MONTHS) {
      if (SEASON_MONTHS[seasonId].indexOf(month) !== -1) {
        return seasonId;
      }
    }
    return "spring";
  }

  function getCurrentSeasonData() {
    return ns.dataService.fetchJson("seasons.json").then(function (list) {
      var currentId = getCurrentSeasonId();
      return (
        list.find(function (season) {
          return season.id === currentId;
        }) || list[0]
      );
    });
  }

  ns.seasonService = {
    getCurrentSeasonId: getCurrentSeasonId,
    getCurrentSeasonData: getCurrentSeasonData,
  };
})(window.FunJia);
