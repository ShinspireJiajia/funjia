/**
 * deal-service.js
 * 首頁「好康專區」資料服務層:提供優惠券與活動資訊,
 * 未來可分別替換為商家合作優惠 API 與觀光署活動資訊 API。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  function getDeals(limit) {
    return ns.dataService.fetchJson("deals.json").then(function (list) {
      return typeof limit === "number" ? list.slice(0, limit) : list;
    });
  }

  ns.dealService = {
    getDeals: getDeals,
  };
})(window.FunJia);
