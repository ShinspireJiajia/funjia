/**
 * poi-card-list.js
 * 共用的 POI 卡片元件:同時支援首頁「推薦專區」橫向捲動卡片,
 * 以及「快選查詢」結果列表的直向卡片。點擊卡片會導向 detail.html 詳情頁。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  /** 依資料型態組出卡片的第二行資訊(營業時間 / 公車到站 / 停車位數) */
  function buildMetaLine(item) {
    if (Array.isArray(item.routes) && item.routes.length) {
      var first = item.routes[0];
      return (
        '<i class="fa-solid fa-bus"></i> ' +
        first.routeName +
        " 約 " +
        first.eta +
        " 分鐘到站"
      );
    }
    if (typeof item.availableSpaces === "number") {
      return (
        '<i class="fa-solid fa-square-parking"></i> 剩餘 ' +
        item.availableSpaces +
        " / " +
        item.totalSpaces +
        " 格"
      );
    }
    if (typeof item.availableBikes === "number") {
      return (
        '<i class="fa-solid fa-bicycle"></i> 可借 ' +
        item.availableBikes +
        " 輛・可還 " +
        item.availableDocks +
        " 位"
      );
    }
    if (item.hours) {
      return '<i class="fa-regular fa-clock"></i> ' + item.hours;
    }
    return "";
  }

  function buildFavoriteButton(item) {
    if (!ns.poiFavoriteService || ns.poiFavoriteService.FAVORITABLE_TYPES.indexOf(item.type) === -1) {
      return "";
    }
    var favorited = ns.poiFavoriteService.isFavorited(item.type, item.id);
    return (
      '<button type="button" class="poi-fav-btn' + (favorited ? " is-active" : "") + '" data-type="' +
      item.type + '" data-id="' + item.id + '" aria-label="收藏">' +
      '<i class="fa-' + (favorited ? "solid" : "regular") + ' fa-heart"></i></button>'
    );
  }

  function buildHotTagHTML(item, showHotTag) {
    if (item.isHot && showHotTag) {
      return '<span class="tag tag-accent poi-card__hot-tag"><i class="fa-solid fa-fire"></i> 熱門</span>';
    }
    if (item.isUserCreated) {
      return '<span class="tag poi-card__hot-tag"><i class="fa-solid fa-user-pen"></i> 使用者新增</span>';
    }
    return "";
  }

  /** 無障礙 / 分眾標籤:圖示 + 名稱小標籤,依目前語言顯示翻譯後名稱 */
  function buildA11yChipsHTML(item) {
    if (!Array.isArray(item.a11yTags) || !item.a11yTags.length || !ns.a11yTags) return "";
    return (
      '<div class="poi-card__a11y-chips">' +
      item.a11yTags
        .map(function (code) {
          var def = ns.a11yTags.get(code);
          if (!def) return "";
          return (
            '<span class="poi-card__a11y-chip" style="background:' + def.color + ';">' +
            '<i class="fa-solid ' + def.icon + '"></i> ' + ns.a11yTags.label(code) +
            "</span>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function buildCardHTML(item, variant, showHotTag) {
    var sizeClass = variant === "horizontal" ? "size-md" : "size-sm";
    var placeholder = ns.poiPlaceholder.render(item.image, sizeClass, item.photo);
    var hotTag = buildHotTagHTML(item, showHotTag);
    var href = "detail.html?type=" + item.type + "&id=" + item.id;

    return (
      '<a class="poi-card poi-card--' + variant + '" href="' + href + '">' +
      '<div class="poi-card__media">' + placeholder + hotTag + "</div>" +
      '<div class="poi-card__body">' +
      '<div class="poi-card__title-row"><h3>' + item.name + "</h3></div>" +
      '<p class="poi-card__address"><i class="fa-solid fa-location-dot"></i> ' + item.address + "</p>" +
      '<p class="poi-card__meta">' + buildMetaLine(item) + "</p>" +
      buildA11yChipsHTML(item) +
      "</div>" +
      buildFavoriteButton(item) +
      "</a>"
    );
  }

  /** 卡片收藏按鈕位於 <a> 內,需攔截點擊避免觸發連結導向,並綁定一次即可(委派事件) */
  function bindFavoriteToggle(container) {
    if (!ns.poiFavoriteService || container.dataset.favBound) return;
    container.dataset.favBound = "1";
    container.addEventListener("click", function (e) {
      var btn = e.target.closest(".poi-fav-btn");
      if (!btn) return;
      e.preventDefault();
      var favorited = ns.poiFavoriteService.toggleFavorite(btn.getAttribute("data-type"), btn.getAttribute("data-id"));
      btn.classList.toggle("is-active", favorited);
      btn.querySelector("i").className = "fa-" + (favorited ? "solid" : "regular") + " fa-heart";
    });
  }

  // 記錄目前畫面上已渲染的卡片清單,語言切換時可就地重繪無障礙標籤的翻譯文字,毋須重新查詢資料
  var renderedLists = [];

  function paint(container, items, variant, showHotTag) {
    if (!items || !items.length) {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-regular fa-face-frown"></i><p>目前查無相關資料</p></div>';
      return;
    }
    container.innerHTML = items
      .map(function (item) {
        return buildCardHTML(item, variant, showHotTag);
      })
      .join("");
    bindFavoriteToggle(container);
  }

  /**
   * @param {HTMLElement} container
   * @param {Array} items
   * @param {"horizontal"|"list"} variant
   * @param {boolean} [showHotTag=true]
   */
  function renderList(container, items, variant, showHotTag) {
    if (showHotTag === undefined) {
      showHotTag = true;
    }
    renderedLists.push({ container: container, items: items, variant: variant, showHotTag: showHotTag });
    paint(container, items, variant, showHotTag);
  }

  document.addEventListener("funjia:lang-changed", function () {
    renderedLists = renderedLists.filter(function (entry) {
      return entry.container.isConnected;
    });
    renderedLists.forEach(function (entry) {
      paint(entry.container, entry.items, entry.variant, entry.showHotTag);
    });
  });

  ns.poiCardList = {
    renderList: renderList,
  };
})(window.FunJia);
