/**
 * search-page.js
 * 快選查詢頁(pages/search.html)頁面邏輯:
 * 先依網址 ?group= 決定大分類(交通/住宿/餐飲/景點),
 * 再依 ?type= 決定大分類底下的子項目,支援分類頁籤切換與名稱關鍵字篩選。
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    var params = new URLSearchParams(window.location.search);
    var typeParam = params.get("type");
    var groupParam = params.get("group");
    var currentGroup =
      (groupParam && ns.poiService.getGroupByKey(groupParam)) ||
      (typeParam && ns.poiService.getGroupByType(typeParam)) ||
      ns.poiService.GROUPS[0];
    var groupCategories = ns.poiService.getCategoriesByGroup(currentGroup.key);
    var currentType =
      typeParam &&
      groupCategories.some(function (cat) {
        return cat.type === typeParam;
      })
        ? typeParam
        : groupCategories[0].type;
    var currentList = [];
    var currentDirection = "north"; // 高鐵時刻專用:北上/南下
    var currentView = "list"; // 快選結果檢視模式:list(列表) / map(地圖)

    renderTabs(currentGroup.key, currentType);
    document.getElementById("searchTitle").textContent =
      ns.poiService.getTypeLabel(currentType) + (currentType === "hsr" ? "" : "查詢");

    var searchInput = document.getElementById("searchInput");
    searchInput.placeholder =
      currentType === "hsr" ? "輸入車次或到達站搜尋" : "輸入名稱或分類關鍵字搜尋";

    renderDirectionToggle();
    renderStationCard();
    renderViewToggle();
    renderAddPoiFab();

    ns.poiService.getList(currentType).then(function (list) {
      currentList = list;
      renderResult(getFilteredList());
    });

    searchInput.addEventListener("input", function () {
      renderResult(getFilteredList());
    });

    function getFilteredList() {
      var keyword = searchInput.value.trim();
      var list =
        currentType === "hsr"
          ? currentList.filter(function (item) {
              return item.direction === currentDirection;
            })
          : currentList;
      if (!keyword) {
        return list;
      }
      return list.filter(function (item) {
        if (currentType === "hsr") {
          return (
            item.trainNo.indexOf(keyword) !== -1 ||
            item.to.indexOf(keyword) !== -1 ||
            item.from.indexOf(keyword) !== -1
          );
        }
        return item.name.indexOf(keyword) !== -1 || item.category.indexOf(keyword) !== -1;
      });
    }

    function renderDirectionToggle() {
      var el = document.getElementById("hsrDirectionToggle");
      if (currentType !== "hsr") {
        el.hidden = true;
        el.innerHTML = "";
        return;
      }
      el.hidden = false;
      el.innerHTML =
        '<button type="button" class="hsr-direction-btn' +
        (currentDirection === "north" ? " is-active" : "") +
        '" data-direction="north"><i class="fa-solid fa-arrow-up"></i> 北上</button>' +
        '<button type="button" class="hsr-direction-btn' +
        (currentDirection === "south" ? " is-active" : "") +
        '" data-direction="south"><i class="fa-solid fa-arrow-down"></i> 南下</button>';

      Array.prototype.forEach.call(el.querySelectorAll(".hsr-direction-btn"), function (btn) {
        btn.addEventListener("click", function () {
          currentDirection = btn.dataset.direction;
          renderDirectionToggle();
          renderResult(getFilteredList());
        });
      });
    }

    function renderStationCard() {
      var el = document.getElementById("hsrStationCard");
      if (currentType !== "hsr") {
        el.hidden = true;
        el.innerHTML = "";
        return;
      }
      el.hidden = false;
      ns.hsrSchedule.renderStationCard(el);
    }

    function renderAddPoiFab() {
      var fab = document.getElementById("addPoiFab");
      var isAddable = ns.poiService.USER_ADDABLE_TYPES.indexOf(currentType) !== -1;
      fab.hidden = !isAddable;
      if (isAddable) {
        fab.href = "add-poi.html?type=" + currentType;
        document.getElementById("addPoiFabLabel").textContent = "新增" + ns.poiService.getTypeLabel(currentType);
      }
    }

    function renderViewToggle() {
      var el = document.getElementById("viewToggle");
      if (currentType === "hsr") {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      Array.prototype.forEach.call(el.querySelectorAll(".view-toggle__btn"), function (btn) {
        btn.classList.toggle("is-active", btn.dataset.view === currentView);
      });
      el.onclick = function (event) {
        var btn = event.target.closest(".view-toggle__btn");
        if (!btn || btn.dataset.view === currentView) {
          return;
        }
        currentView = btn.dataset.view;
        renderViewToggle();
        renderResult(getFilteredList());
      };
    }

    function renderTabs(activeGroupKey, activeType) {
      var tabsEl = document.getElementById("searchTabs");
      tabsEl.innerHTML = ns.poiService.GROUPS.map(function (group) {
        return (
          '<a class="search-tab' + (group.key === activeGroupKey ? " is-active" : "") + '" href="search.html?group=' + group.key + '">' +
          '<i class="fa-solid ' + group.icon + '"></i>' +
          group.label +
          "</a>"
        );
      }).join("");

      var subTabsEl = document.getElementById("searchSubTabs");
      var subCategories = ns.poiService.getCategoriesByGroup(activeGroupKey);
      if (subCategories.length <= 1) {
        subTabsEl.hidden = true;
        subTabsEl.innerHTML = "";
        return;
      }
      subTabsEl.hidden = false;
      subTabsEl.innerHTML = subCategories.map(function (cat) {
        return (
          '<a class="search-subtab' + (cat.type === activeType ? " is-active" : "") + '" href="search.html?group=' + activeGroupKey + '&type=' + cat.type + '">' +
          '<i class="fa-solid ' + cat.icon + '"></i>' +
          cat.label +
          "</a>"
        );
      }).join("");
    }

    function renderResult(list) {
      document.getElementById("resultCount").textContent = "共 " + list.length + " 筆結果";
      var listEl = document.getElementById("searchResults");
      var mapEl = document.getElementById("mapView");

      if (currentType === "hsr") {
        ns.hsrSchedule.renderList(listEl, list);
        return;
      }

      if (currentView === "map") {
        listEl.hidden = true;
        mapEl.hidden = false;
        var category = ns.poiService.CATEGORIES.find(function (cat) {
          return cat.type === currentType;
        });
        ns.mapView.render(mapEl, list, category && category.icon);
      } else {
        mapEl.hidden = true;
        listEl.hidden = false;
        ns.poiCardList.renderList(listEl, list, "list");
      }
    }
  });
})();
