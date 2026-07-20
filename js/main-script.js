/**
 * main-script.js
 * masterpage(index.html)專用邏輯:
 * 1. 底部導覽列 / 浮動快捷鍵 → 切換 iframe 內容頁面
 * 2. 頁首彈出面板 → 掛載共用的語言 / 字級 / 高對比設定元件(js/core/a11y-panel.js),
 *    設定變更會即時透過 postMessage 同步進 iframe,不需整頁重新載入。
 */

(function () {
  "use strict";

  var contentFrame = document.getElementById("contentFrame");
  var bottomNav = document.getElementById("bottomNav");
  var headerLangBtn = document.getElementById("headerLangBtn");
  var langPopover = document.getElementById("langPopover");
  var fabGroupTravel = document.getElementById("fabGroupTravel");

  /** 切換 iframe 內容,並更新底部導覽列選中狀態 */
  function navigateTo(pageUrl) {
    contentFrame.setAttribute("src", "pages/" + pageUrl);
    updateActiveNav(pageUrl);
  }

  function updateActiveNav(pageUrl) {
    var basePage = pageUrl.split("?")[0];
    var items = bottomNav.querySelectorAll(".bottom-nav__item");
    items.forEach(function (item) {
      var itemBase = item.getAttribute("data-page").split("?")[0];
      item.classList.toggle("is-active", itemBase === basePage);
    });
  }

  bottomNav.addEventListener("click", function (event) {
    var btn = event.target.closest(".bottom-nav__item");
    if (!btn) return;
    navigateTo(btn.getAttribute("data-page"));
  });

  /* -------- 懸浮快捷鍵:一鍵進入揪團旅行 -------- */
  fabGroupTravel.addEventListener("click", function () {
    navigateTo(fabGroupTravel.getAttribute("data-page"));
  });

  /* -------- 頁首「語言 / 字級 / 高對比」彈出面板 -------- */
  headerLangBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    langPopover.classList.toggle("is-open");
  });

  document.addEventListener("click", function () {
    langPopover.classList.remove("is-open");
  });

  langPopover.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  window.FunJia.a11yPanel.init(langPopover);
})();
