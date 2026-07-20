/**
 * deals-page.js
 * 好康專區列表頁(pages/deals.html)邏輯:依網址參數 kind(coupon/event/mission)
 * 篩選並顯示優惠券、活動資訊或探索/文化/低碳任務,並可透過分類頁籤切換。
 */

(function () {
  "use strict";

  var TITLE_MAP = { coupon: "好康優惠", event: "活動資訊", mission: "任務" };
  var VALID_KINDS = ["coupon", "event", "mission"];

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    var params = new URLSearchParams(location.search);
    var requestedKind = params.get("kind");
    var initialKind = VALID_KINDS.indexOf(requestedKind) !== -1 ? requestedKind : "coupon";
    var tabs = document.querySelectorAll(".deals-tab");
    var dealsListEl = document.getElementById("dealsList");
    var missionGridEl = document.getElementById("missionGrid");

    ns.missionGrid.init(missionGridEl);

    function renderKind(kind) {
      document.getElementById("dealsTitle").textContent = TITLE_MAP[kind];
      tabs.forEach(function (tab) {
        tab.classList.toggle("is-active", tab.getAttribute("data-kind") === kind);
      });

      if (kind === "mission") {
        dealsListEl.hidden = true;
        missionGridEl.hidden = false;
        ns.missionService.getMissionsWithStatus().then(function (missions) {
          ns.missionGrid.render(missionGridEl, missions);
        });
        return;
      }

      dealsListEl.hidden = false;
      missionGridEl.hidden = true;
      ns.dealService.getDeals().then(function (list) {
        var filtered = list.filter(function (item) {
          return item.kind === kind;
        });
        ns.dealCard.renderList(dealsListEl, filtered);
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        renderKind(tab.getAttribute("data-kind"));
      });
    });

    renderKind(initialKind);
  });
})();
