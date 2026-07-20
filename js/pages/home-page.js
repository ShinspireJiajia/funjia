/**
 * home-page.js
 * 首頁(pages/home.html)頁面邏輯:整合天氣卡、快選查詢格線、
 * 推薦專區(熱門景點/推薦美食)、最新消息預覽。
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;

    // 1. 主視覺:依季節顯示當下最有特色的景點與文案
    ns.seasonService.getCurrentSeasonData().then(function (season) {
      ns.heroBanner.render(document.getElementById("heroBanner"), season);
    });

    // 2. 天氣資訊卡 + 近三日預報
    ns.weatherService.getWeather().then(function (data) {
      ns.weatherCard.render(
        document.getElementById("weatherCard"),
        document.getElementById("forecast3dGrid"),
        data
      );
    });

    // 3. 快選查詢格線
    ns.quickSelectGrid.render(document.getElementById("quickSelectGrid"));

    // 4. 推薦專區:熱門景點
    ns.poiService.getHotAttractions(6).then(function (list) {
      ns.poiCardList.renderList(document.getElementById("hotAttractions"), list, "horizontal", false);
    });

    // 5. 推薦專區:推薦美食
    ns.poiService.getRecommendedFood(6).then(function (list) {
      ns.poiCardList.renderList(document.getElementById("recommendedFood"), list, "horizontal", false);
    });

    // 6. 最新消息預覽(取最新 3 筆)
    ns.newsService.getNewsList().then(function (list) {
      renderNewsPreview(list.slice(0, 3));
    });
  });

  function renderNewsPreview(list) {
    var container = document.getElementById("newsPreview");
    if (!list.length) {
      container.innerHTML = '<div class="empty-state"><p>目前尚無最新消息</p></div>';
      return;
    }
    container.innerHTML = list
      .map(function (item) {
        return (
          '<a class="news-preview-item" href="news.html?id=' + item.id + '">' +
          '<span class="news-preview-item__icon"><i class="fa-solid fa-bullhorn"></i></span>' +
          '<div class="news-preview-item__body">' +
          "<h3>" + item.title + "</h3>" +
          "<p>" + item.date + " · " + item.category + "</p>" +
          "</div>" +
          "</a>"
        );
      })
      .join("");
  }
})();
