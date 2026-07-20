/**
 * hero-banner.js
 * 首頁主視覺元件:依當下季節顯示最具代表性的景點照片與文案(assets/ 內實拍照片)。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  function renderHeroBanner(container, season) {
    container.innerHTML =
      '<div class="hero-banner">' +
      '<img class="hero-banner__photo" src="' + season.image + '" alt="' + season.attractionName + '" />' +
      '<div class="hero-banner__scrim"></div>' +
      '<div class="hero-banner__content">' +
      '<span class="hero-banner__tag"><i class="fa-solid ' + season.icon + '"></i>' + season.seasonLabel + "限定</span>" +
      "<h1>" + season.title + "</h1>" +
      "<p>" + season.subtitle + "</p>" +
      '<a class="hero-banner__cta" href="detail.html?type=attractions&id=' + season.attractionId + '">' +
      season.ctaLabel +
      ' <i class="fa-solid fa-arrow-right"></i>' +
      "</a>" +
      "</div>" +
      "</div>";
  }

  ns.heroBanner = {
    render: renderHeroBanner,
  };
})(window.FunJia);
