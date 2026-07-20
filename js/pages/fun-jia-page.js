/**
 * fun-jia-page.js
 * Fun 嘉推薦行程頁(pages/fun-jia.html)邏輯:
 * 顯示平台策展的推薦行程列表,支援收藏(愛心);
 * 點選「查看完整行程」會另開 itin-detail.html 呈現完整規劃與留言。
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    paint(ns);

    document.getElementById("itinList").addEventListener("click", function (e) {
      var favBtn = e.target.closest(".fav-btn");
      if (!favBtn) return;
      e.preventDefault();
      ns.itineraryService.toggleFavorite(favBtn.getAttribute("data-id"));
      paint(ns);
    });
  });

  function paint(ns) {
    ns.itineraryService.getItineraries().then(function (list) {
      document.getElementById("itinList").innerHTML = list.map(renderCard).join("");
    });
  }

  function renderCard(item) {
    return (
      '<div class="itin-card card">' +
      '<div class="itin-card__top">' +
      window.FunJia.poiPlaceholder.render(item.image, "size-sm") +
      '<div class="itin-card__body">' +
      "<h3>" + item.title + "</h3>" +
      '<p class="summary">' + item.summary + "</p>" +
      '<div class="itin-card__meta">' +
      '<span><i class="fa-regular fa-calendar"></i> ' + item.days + " 天</span>" +
      '<button class="fav-btn' + (item.isFavorited ? " is-active" : "") + '" data-id="' + item.id + '">' +
      '<i class="fa-' + (item.isFavorited ? "solid" : "regular") + ' fa-heart"></i> ' + item.favoriteCount +
      "</button>" +
      '<span><i class="fa-regular fa-comment"></i> ' + item.comments.length + "</span>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<a class="itin-card__link" href="itin-detail.html?id=' + item.id + '">' +
      "查看完整行程 <i class=\"fa-solid fa-chevron-right\"></i>" +
      "</a>" +
      "</div>"
    );
  }
})();
