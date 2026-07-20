/**
 * deal-card.js
 * 首頁「好康專區」卡片元件:橫向捲動呈現優惠券與活動資訊,
 * 點擊後導向對應景點/店家/活動的 detail.html 詳情頁。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var GRADIENTS = {
    green: "linear-gradient(135deg, #3f7f4c, #1f4a2a)",
    orange: "linear-gradient(135deg, #e08a3c, #b85a1e)",
    blue: "linear-gradient(135deg, #3d7ea6, #1f4a63)",
    brown: "linear-gradient(135deg, #8a6642, #5c4326)",
    pink: "linear-gradient(135deg, #d97a9c, #a8496b)",
    teal: "linear-gradient(135deg, #2f8f82, #1a5a52)",
    gray: "linear-gradient(135deg, #6b7280, #3f4451)",
  };

  function formatDate(dateStr) {
    return dateStr ? dateStr.replace(/-/g, "/") : "";
  }

  function buildCardHTML(item) {
    var gradient = GRADIENTS[item.tone] || GRADIENTS.gray;
    var tagClass = item.kind === "coupon" ? "tag tag-accent" : "tag";
    var href = "detail.html?type=" + item.type + "&id=" + item.refId;

    return (
      '<a class="deal-card" href="' + href + '">' +
      '<div class="deal-card__icon" style="background:' + gradient + '"><i class="fa-solid ' + item.icon + '"></i></div>' +
      '<div class="deal-card__body">' +
      '<span class="' + tagClass + '">' + item.badge + "</span>" +
      "<h3>" + item.title + "</h3>" +
      '<p class="deal-card__desc">' + item.desc + "</p>" +
      '<p class="deal-card__valid"><i class="fa-regular fa-clock"></i> 至 ' + formatDate(item.validUntil) + "</p>" +
      "</div>" +
      "</a>"
    );
  }

  function renderList(container, items) {
    if (!items || !items.length) {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-regular fa-face-frown"></i><p>目前尚無優惠或活動資訊</p></div>';
      return;
    }
    container.innerHTML = items.map(buildCardHTML).join("");
  }

  ns.dealCard = {
    renderList: renderList,
  };
})(window.FunJia);
